import { agent, isLoggedIn } from "./agent.js";
import { limit } from "./rateLimit.js";
import { MOD_DID } from "./config.js";
import { ToolsOzoneModerationDefs } from "@atproto/api";
import { logger } from "./logger.js";

// the number of days or hours to go back in time, expressed as an ISOstring
// let stopDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
export const getEvents = async (startDate: string, stopDate: string) => {
  try {
    await isLoggedIn;
    logger.info("Authentication confirmed");

    let current_cursor: string | undefined;
    let reports: ToolsOzoneModerationDefs.ModEventView[] = [];

    do {
      logger.info(`Fetching reports with cursor: ${current_cursor}`);
      const res = await limit(() =>
        agent.tools.ozone.moderation.queryEvents(
          {
            limit: 100,
            cursor: current_cursor,
            includeAllUserRecords: false,
            types: ["tools.ozone.moderation.defs#modEventReport"],
            createdBefore: startDate,
            createdAfter: stopDate,
          },
          {
            headers: {
              role: "moderator",
              "atproto-proxy": `${MOD_DID!}#atproto_labeler`,
            },
          },
        ),
      );

      current_cursor = res.data.cursor;
      reports = reports.concat(res.data.events); // Append new results to existing array

      logger.info(`Reports found: ${reports.length}`);
    } while (current_cursor);
    return reports;
  } catch (e) {
    logger.error(e);
  }
};

export const getStatuses = async (startDate: string, stopDate: string) => {
  try {
    await isLoggedIn;
    logger.info("Authentication confirmed");

    let current_cursor: string | undefined;
    let reports: ToolsOzoneModerationDefs.SubjectStatusView[] = [];

    do {
      logger.info(`Fetching reports with cursor: ${current_cursor}`);
      const res = await limit(() =>
        agent.tools.ozone.moderation.queryStatuses(
          {
            limit: 100,
            cursor: current_cursor,
            includeAllUserRecords: false,
            reviewState: "tools.ozone.moderation.defs#reviewOpen",
            reportedBefore: startDate,
            reportedAfter: stopDate,
          },
          {
            headers: {
              role: "moderator",
              "atproto-proxy": `${MOD_DID!}#atproto_labeler`,
            },
          },
        ),
      );

      current_cursor = res.data.cursor;
      reports = reports.concat(res.data.subjectStatuses);

      logger.info(`Reports found: ${reports.length}`);
    } while (current_cursor);
    return reports;
  } catch (e) {
    logger.error(e);
  }
};
