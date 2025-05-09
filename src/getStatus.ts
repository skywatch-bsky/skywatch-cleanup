import { agent, isLoggedIn } from "./agent.js";
import { limit } from "./rateLimit.js";
import { logger } from "./logger.js";
import {
  ToolsOzoneModerationDefs,
  ComAtprotoAdminDefs,
  ComAtprotoRepoStrongRef,
} from "@atproto/api"; // Added ComAtproto types
import { AckReportRepo, AckReportPost } from "./ackEvents.js";
import { getModHeaders } from "./constants.js";

export const getStatus = async (
  startDate: string, // Assuming this is the EARLIER date
  stopDate: string, // Assuming this is the LATER date
): Promise<ToolsOzoneModerationDefs.SubjectStatusView[]> => {
  if (!startDate || !stopDate) {
    throw new Error("Both startDate and stopDate are required");
  }

  try {
    await isLoggedIn;
    logger.info("Authentication confirmed for getStatus");

    let currentCursor: string | undefined;
    let allStatuses: ToolsOzoneModerationDefs.SubjectStatusView[] = [];

    do {
      logger.info(
        `getStatus: Fetching statuses with cursor: ${currentCursor || "initial"}`,
      );
      const resp = await limit(() =>
        agent.tools.ozone.moderation.queryStatuses(
          {
            // Corrected date parameter usage:
            reportedAfter: startDate, // Start of the reporting window
            reportedBefore: stopDate, // End of the reporting window
            limit: 100,
            cursor: currentCursor,
            includeMuted: true,
            sortField: "lastReportedAt",
            sortDirection: "desc",
          },
          { headers: getModHeaders() },
        ),
      );

      if (resp.data.subjectStatuses.length > 0) {
        allStatuses = allStatuses.concat(resp.data.subjectStatuses);
      }
      currentCursor = resp.data.cursor;
      logger.info(
        `getStatus: Fetched ${resp.data.subjectStatuses.length} statuses. Total so far: ${allStatuses.length}`,
      );
    } while (currentCursor);

    logger.info(
      `getStatus: Finished fetching. Total statuses found: ${allStatuses.length}`,
    );
    return allStatuses;
  } catch (e) {
    logger.error("getStatus: Error fetching statuses", e);
    return []; // Return empty array on error
  }
};

export const checkStatus = async (
  subject: string,
  startDate: string, // Assuming this is the EARLIER date for reviewedAfter
  stopDate: string, // Assuming this is the LATER date for reviewedBefore
): Promise<ToolsOzoneModerationDefs.SubjectStatusView[]> => {
  if (!subject) {
    throw new Error("Subject is required");
  }
  if (!startDate || !stopDate) {
    // While the API might allow omitting these, the function signature implies they are part of the query logic
    logger.warn(
      "checkStatus: startDate or stopDate not provided, fetching all open reviews for the subject which might be a lot.",
    );
  }

  try {
    await isLoggedIn;
    logger.info(
      `Authentication confirmed for checkStatus (subject: ${subject})`,
    );

    let currentCursor: string | undefined;
    let fetchedStatuses: ToolsOzoneModerationDefs.SubjectStatusView[] = [];

    // Step 1: Fetch all relevant statuses first
    do {
      logger.info(
        `checkStatus: Fetching statuses for subject ${subject} with cursor: ${currentCursor || "initial"}`,
      );
      const resp = await limit(() =>
        agent.tools.ozone.moderation.queryStatuses(
          {
            subject: subject,
            // Corrected date parameter usage:
            reviewedAfter: startDate, // Start of the review window
            reviewedBefore: stopDate, // End of the review window
            cursor: currentCursor,
            reviewState: "tools.ozone.moderation.defs#reviewOpen",
            limit: 100, // Max limit, adjust if API allows more and it's beneficial
          },
          { headers: getModHeaders() },
        ),
      );

      if (resp.data.subjectStatuses.length > 0) {
        fetchedStatuses = fetchedStatuses.concat(resp.data.subjectStatuses);
      }
      currentCursor = resp.data.cursor;
      logger.info(
        `checkStatus: Fetched ${resp.data.subjectStatuses.length} statuses for subject ${subject}. Total so far: ${fetchedStatuses.length}`,
      );
    } while (currentCursor);

    logger.info(
      `checkStatus: Finished fetching. Total statuses found for subject ${subject}: ${fetchedStatuses.length}. Now processing...`,
    );

    // Step 2: Process fetched statuses for acknowledgements and filtering
    const remainingStatuses: ToolsOzoneModerationDefs.SubjectStatusView[] = [];
    for (const status of fetchedStatuses) {
      const handle = status.subjectRepoHandle;
      const id = status.id; // Assuming status.id is the report ID or a unique identifier for the status entry
      let acknowledged = false;

      if (handle === "handle.invalid") {
        logger.info(
          `checkStatus: Found 'handle.invalid' for subject ${subject}, status ID ${id}. Attempting auto-acknowledgement.`,
        );

        // Check the type of the subject to decide which AckReport function to call
        if (
          ComAtprotoAdminDefs.isRepoRef(status.subject) &&
          status.subject.did
        ) {
          logger.info(
            `checkStatus: Auto-acknowledging 'handle.invalid' REPO event for DID: ${status.subject.did}`,
          );
          await AckReportRepo(
            status.subject.did,
            "com.atproto.admin.defs#repoRef", // This is the $type
            "Handle invalid (auto-acknowledged).",
          );
          acknowledged = true;
        } else if (
          ComAtprotoRepoStrongRef.isMain(status.subject) &&
          status.subject.uri
        ) {
          // Check if it's a strong ref to a post/record
          logger.info(
            `checkStatus: Auto-acknowledging 'handle.invalid' POST/RECORD event for URI: ${status.subject.uri}`,
          );
          await AckReportPost(
            status.subject.uri,
            "com.atproto.repo.strongRef", // This is the $type
            "Handle invalid (auto-acknowledged).",
          );
          acknowledged = true;
        } else {
          logger.warn(
            `checkStatus: Could not auto-acknowledge 'handle.invalid' for status ID ${id}. Subject details: ${JSON.stringify(status.subject)}`,
          );
        }
      }

      if (!acknowledged) {
        remainingStatuses.push(status);
      } else {
        logger.info(
          `checkStatus: Status ID ${id} for subject ${subject} was acknowledged and will be filtered out.`,
        );
      }
    }

    logger.info(
      `checkStatus: Processing complete for subject ${subject}. Returning ${remainingStatuses.length} non-acknowledged statuses.`,
    );
    return remainingStatuses;
  } catch (e) {
    logger.error(
      `checkStatus: Error processing statuses for subject ${subject}`,
      e,
    );
    return []; // Return empty array on error
  }
};
