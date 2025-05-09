import { logger } from "./logger.js";
import { AUTOACK_PERIOD } from "./config.js";
import { getEvents } from "./getEvents.js";
import {
  handleRepoReport,
  handlePostReport,
  handleImportReport,
} from "./handleEvents.js";
import { handleRepoStatus } from "./handleStatus.js";
import {
  ModEventView,
  SubjectStatusView,
} from "@atproto/api/dist/client/types/tools/ozone/moderation/defs.js";
import { getStatus } from "./getStatus.js";

let isRunning = true;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  process.on("SIGINT", () => {
    console.log("Received SIGINT. Graceful shutdown...");
    isRunning = false;
  });

  while (isRunning) {
    logger.info("Starting periodic run at:", new Date().toISOString());

    const startDate = new Date(Date.now()).toISOString();
    const stopDate = new Date(Date.now() - AUTOACK_PERIOD).toISOString();
    logger.info(`Checking for reports between ${startDate} and ${stopDate}`);

    const statuses = await getStatus(startDate, stopDate);
    if (statuses) {
      logger.info(`Found ${statuses.length} statuses`);
      try {
        await Promise.all(
          statuses?.map(async (status: SubjectStatusView) => {
            await handleRepoStatus(status);
          }),
        );
      } catch (e) {
        logger.error("Error handling statuses", e);
      }
    } else {
      logger.info("No statuses found");
    }

    const events = await getEvents(startDate, stopDate);
    if (events) {
      try {
        await Promise.all(
          events?.map(async (event: ModEventView) => {
            // Check for open reports
            if (
              event.event.$type === "tools.ozone.moderation.defs#modEventReport"
            ) {
              // Check for reports on user accounts
              if (event.subject.$type === "com.atproto.admin.defs#repoRef") {
                // await handleRepoReport(event);
                await handleImportReport(event);
              } else if (event.subject.$type === "com.atproto.repo.strongRef") {
                // Check for reports on records
                // await handlePostReport(event);
              }
            }
          }) ?? [],
        );
      } catch (e) {
        logger.error(e);
      }
    }

    logger.info("Finished run at:", new Date().toISOString());

    if (isRunning) {
      logger.info(`Sleeping for ${AUTOACK_PERIOD}`);
      await sleep(AUTOACK_PERIOD);
    }
  }
}

try {
  main();
} catch (e) {
  logger.error(e);
  process.exit(1);
}
