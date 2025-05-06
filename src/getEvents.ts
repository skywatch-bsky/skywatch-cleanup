import { agent, isLoggedIn } from "./agent.js";
import { limit } from "./rateLimit.js";
import { MOD_DID } from "./config.js";
import { ToolsOzoneModerationDefs } from "@atproto/api";
import { logger } from "./logger.js";

// the number of days or hours to go back in time, expressed as an ISOstring
// let stopDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
export const getEvents = async (
  startDate: string,
  stopDate: string,
): Promise<ToolsOzoneModerationDefs.ModEventView[] | undefined> => {
  try {
    await isLoggedIn;
    logger.info("Authentication confirmed");

    let currentCursor: string | undefined;
    let reports: ToolsOzoneModerationDefs.ModEventView[] = [];

    const getModHeaders = () => ({
      encoding: "application/json",
      role: "moderator",
      "atproto-proxy": `${MOD_DID!}#atproto_labeler`,
      "atproto-accept-labelers": "did:plc:ar7c4by46qjdydhdevvrndac;redact",
    });

    do {
      logger.info(`Fetching reports with cursor: ${currentCursor}`);
      const res = await limit(() =>
        agent.tools.ozone.moderation.queryEvents(
          {
            limit: 100,
            cursor: currentCursor,
            includeAllUserRecords: false,
            types: ["tools.ozone.moderation.defs#modEventReport"],
            createdBefore: startDate,
            createdAfter: stopDate,
          },
          { headers: getModHeaders() },
        ),
      );

      currentCursor = res.data.cursor;
      reports = reports.concat(res.data.events); // Append new results to existing array

      logger.info(`Reports found: ${reports.length}`);
    } while (currentCursor);
    return reports;
  } catch (e) {
    logger.error(e);
  }
};
