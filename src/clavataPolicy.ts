// clavataPolicy.ts
import { logger } from "./logger.js";

// This module calls the Clavata Create‑Jobs API and extracts matched labels.
// API docs: https://api.docs.clavata.net/#tag/Create-Jobs

// JWT token for Clavata API access
const CLAVATA_AUTH_TOKEN = process.env.CLAVATA_AUTH_TOKEN ?? "";
// The fixed policy ID to use found in the Clavata policy dashboard
const POLICY_ID = process.env.POLICY_ID ?? "";
// Base endpoint for the Clavata Create‑Jobs API (adjust if necessary)
const CLAVATA_ENDPOINT = "https://gateway.app.clavata.ai:8443/v1/jobs";

/** Possible outcomes from a section evaluation */
export type Outcome =
  | "OUTCOME_UNSPECIFIED"
  | "OUTCOME_TRUE"
  | "OUTCOME_FALSE"
  | "OUTCOME_FAILED";

/** Represents a section report returned in a job result */
export interface SectionReport {
  name: string;
  message: string;
  result: Outcome;
}

/** Represents a policy report returned for a content item */
export interface Report {
  result: Outcome;
  sectionEvaluationReports: SectionReport[];
}

/** A result for a single submitted content item */
export interface Result {
  report: Report;
}

/** A Job as returned by Clavata */
export interface Job {
  status:
    | "JOB_STATUS_UNSPECIFIED"
    | "JOB_STATUS_PENDING"
    | "JOB_STATUS_RUNNING"
    | "JOB_STATUS_COMPLETED"
    | "JOB_STATUS_FAILED"
    | "JOB_STATUS_CANCELED";
  results: Result[];
  created: string; // ISO date string
  updated: string; // ISO date string
  completed: string; // ISO date string
}

/** The response structure from Clavata Create‑Job API */
export interface CreateJobResponse {
  job: Job;
}

/** The content data to send for evaluation */
export interface ContentData {
  text: string;
}

/** The payload for a job request */
export interface JobRequest {
  content_data: ContentData[];
  policy_id: string;
  wait_for_completion: boolean;
}

/**
 * Sends the provided text to the Clavata Create‑Jobs API.
 *
 * @param text - The text content to evaluate.
 * @returns A Promise resolving to the Job returned by Clavata.
 * @throws An error if the API call fails.
 */
export async function createJob(text: string): Promise<Job> {
  const payload: JobRequest = {
    content_data: [{ text }],
    policy_id: POLICY_ID,
    wait_for_completion: true,
  };

  const response = await fetch(CLAVATA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CLAVATA_AUTH_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Clavata API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data: CreateJobResponse = await response.json();
  return data.job;
}

/**
 * Evaluates the provided text against Clavata policy and returns any matching labels.
 *
 * @param text - The text to evaluate.
 * @returns A Promise resolving to an array of label names that matched.
 * @throws An error if the evaluation fails or no results are returned.
 */
export async function evaluateClavataPolicy(text: string): Promise<string[]> {
  const job = await createJob(text);

  if (!job.results || job.results.length === 0) {
    throw new Error("No results from Clavata API");
  }

  // For simplicity, use the first result's report
  const report = job.results[0].report;

  if (report.result === "OUTCOME_FAILED") {
    throw new Error("Policy evaluation failed.");
  }

  // Extract labels from each section where the outcome is true.
  const matchedLabels = report.sectionEvaluationReports
    .filter((section) => section.result === "OUTCOME_TRUE")
    .map((section) => section.name);

  return matchedLabels;
}

/**
 * A helper function to run Clavata evaluation.
 * If labels are returned, it creates annotations using the provided label creator.
 *
 * @param text The text to evaluate.
 * @param identifier The user DID or record URI to annotate.
 * @param eventId The current event id (for logging).
 */
async function processClavataEvaluation(
  text: string,
  identifier: string,
  eventId: number,
  commentFn: (id: string, comment: string) => Promise<void>
): Promise<void> {
  try {
    const labels = await evaluateClavataPolicy(text);
    if (labels.length > 0) {
      logger.info(
        `Event ${eventId}: Clavata policy matched for ${identifier}: ${labels.join(", ")}`
      );
      // Create an annotation for each matched label.
      if (labels.length > 0) {
        const commentMessage = `Clavata evaluation identified the following labels: ${labels.join(", ")}`;
        logger.info(
          `Event ${eventId}: Commenting on ${identifier} with: ${commentMessage}`
        );
        await commentFn(identifier, commentMessage);
      } else {
        logger.info(`Event ${eventId}: No Clavata match for ${identifier}.`);
      }
    }
  } catch (error) {
    logger.error(
      `Error during Clavata evaluation for ${identifier} in event ${eventId}: ${error}`
    );
  }
}

export { processClavataEvaluation };
