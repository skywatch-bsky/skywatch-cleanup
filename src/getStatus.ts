import { agent, isLoggedIn } from "./agent.js";
import { limit } from "./rateLimit.js";
import { logger } from "./logger.js";
import { ToolsOzoneModerationDefs } from "@atproto/api";
import { AckReportRepo, AckReportPost } from "./ackEvents.js";
import { MOD_DID } from "./config.js";

export const getStatus = async (
  startDate: string,
  stopDate: string,
): Promise<ToolsOzoneModerationDefs.SubjectStatusView[] | undefined> => {
  if (!startDate || !stopDate) {
    throw new Error("Both startDate and stopDate are required");
  }

  const getModHeaders = () => ({
    encoding: "application/json",
    role: "moderator",
    "atproto-proxy": `${MOD_DID!}#atproto_labeler`,
    "atproto-accept-labelers": "did:plc:ar7c4by46qjdydhdevvrndac;redact",
  });

  try {
    await isLoggedIn;
    logger.info("Authentication confirmed");

    let currentCursor: string | undefined;
    let statuses: ToolsOzoneModerationDefs.SubjectStatusView[] = [];

    do {
      logger.info(`Fetching statuses with cursor: ${currentCursor}`);
      const resp = await limit(() =>
        agent.tools.ozone.moderation.queryStatuses(
          {
            reportedBefore: startDate,
            reportedAfter: stopDate,
            limit: 100,
            cursor: currentCursor,
            includeMuted: true,
            sortField: "lastReportedAt",
            sortDirection: "desc",
          },
          { headers: getModHeaders() },
        ),
      );

      currentCursor = resp.data.cursor;
      statuses = statuses.concat(resp.data.subjectStatuses);

      logger.info(`Reports found: ${statuses.length}`);
    } while (currentCursor);
    return statuses;
  } catch (e) {
    logger.error(e);
  }
};

export const checkStatus = async (
  subject: string,
  startDate: string,
  stopDate: string,
): Promise<ToolsOzoneModerationDefs.SubjectStatusView[] | undefined> => {
  const getModHeaders = () => ({
    encoding: "application/json",
    role: "moderator",
    "atproto-proxy": `${MOD_DID!}#atproto_labeler`,
    "atproto-accept-labelers": "did:plc:ar7c4by46qjdydhdevvrndac;redact",
  });

  try {
    await isLoggedIn;
    logger.info("Authentication confirmed");

    let currentCursor: string | undefined;
    let statuses: ToolsOzoneModerationDefs.SubjectStatusView[] = [];

    do {
      logger.info(`Fetching statuses with cursor: ${currentCursor}`);
      const resp = await limit(() =>
        agent.tools.ozone.moderation.queryStatuses(
          {
            subject: subject,
            reviewedBefore: startDate,
            reviewedAfter: stopDate,
            cursor: currentCursor,
            reviewState: "tools.ozone.moderation.defs#reviewOpen",
          },
          { headers: getModHeaders() },
        ),
      );

      currentCursor = resp.data.cursor;
      statuses = resp.data.subjectStatuses;
      const remainingStatuses = [];

      for (const status of statuses) {
        const handle = status.subjectRepoHandle;
        const id = status.id;
        let acknowledged = false;

        if (handle === "handle.invalid") {
          logger.info(
            `${id} Auto-acknowledging handle.invalid event for ${subject}`,
          );
          if (status.subject.did) {
            const did = status.subject.did as string;
            await AckReportRepo(
              did,
              "com.atproto.admin.defs#repoRef",
              "Handle invalid.",
            );
            acknowledged = true;
          }
          if (status.subject.uri) {
            const uri = status.subject.uri as string;
            await AckReportPost(
              uri,
              "com.atproto.repo.strongRef",
              "Handle invalid.",
            );
            acknowledged = true;
          }
        }

        if (!acknowledged) {
          remainingStatuses.push(status);
        }
      }

      statuses = remainingStatuses;

      logger.info(`Reports found: ${statuses.length}`);
    } while (currentCursor);
    return statuses;
  } catch (e) {
    logger.error(e);
  }
};
