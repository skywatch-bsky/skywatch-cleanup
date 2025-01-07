import { logger } from "./logger.js";
import { getProfiles } from "./getProfiles.js";
import { AckReportRepo, AckReportPost } from "./ackEvents.js";
import { checkLabels } from "./getRepo.js";
import { AUTOACK_PERIOD, MOD_DID } from "./config.js";
import { IGNORED_DIDS, ReportCheck, LabelCheck } from "./constants.js";
import { getEvents } from "./getEvents.js";
import { ModEventView } from "@atproto/api/dist/client/types/tools/ozone/moderation/defs.js";

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

    const events = await getEvents(startDate, stopDate);

    try {
      await Promise.all(
        events?.map(async (event: ModEventView) => {
          if ((event.event.status = "tools.ozone.moderation.defs#reviewOpen")) {
            // Check for reports on user accounts
            if (event.subject.$type === "com.atproto.admin.defs#repoRef") {
              const id = event.id;
              if (event.subject.hasOwnProperty("did")) {
                const user = event.subject.did as string;
                if (event.event.tombstone) {
                  logger.info(
                    `Event ${id}: Auto-acknowledging tombstone event for ${user}`,
                  );
                  await AckReportRepo(user, event.subject.$type);
                } else if (!event.event.tombstone) {
                  const repoLabels = await checkLabels(user);

                  for (const label of repoLabels || []) {
                    const value = label.val;
                    if (LabelCheck.includes(value)) {
                      logger.info(
                        `${id}, Found ${value} on ${user}. Acknowledging`,
                      );
                      await AckReportRepo(
                        user,
                        "com.atproto.admin.defs#repoRef",
                      );
                    }
                  }
                } else if (
                  event.event.reportType ===
                  "com.atproto.moderation.defs#reasonSexual"
                ) {
                  logger.info(
                    `Event ${id}: Out of scope content reported for ${user}`,
                  );
                  await AckReportRepo(user, event.subject.$type);
                } else if (event.event.hasOwnProperty("comment")) {
                  const comment = event.event.comment as string;
                  if (ReportCheck.test(comment)) {
                    if (
                      event.subject.$type === "com.atproto.admin.defs#repoRef"
                    ) {
                      logger.info(
                        `Event ${id}: Comment indicates out of scope report for ${user}`,
                      );
                      await AckReportRepo(user, event.subject.$type);
                    }
                  }
                } else if (IGNORED_DIDS.includes(user)) {
                  logger.info(`Ignoring DID: ${user}`);
                  await AckReportRepo(user, event.subject.$type);
                } else {
                  const profile = await getProfiles(user);
                  if (profile?.description) {
                    if (ReportCheck.test(profile.description)) {
                      logger.info(
                        `Event ${id}: Comment indicates out of scope report for ${user}`,
                      );
                      await AckReportRepo(user, event.subject.$type);
                    }
                  }
                }
              } else {
                logger.warn(
                  `Event ${id}: DID expected but not found for report`,
                );
              }
            }

            // Check for reports on records
            if (event.subject.$type === "com.atproto.repo.strongRef") {
              const id = event.id;
              if (event.subject.hasOwnProperty("uri")) {
                const uri = event.subject.uri as string;
                const cid = event.subject.cid as string;
                const user = uri.split("/")[2];
                if (event.event.tombstone) {
                  logger.info(
                    `Event ${id}: Auto-acknowledging tombstone event for ${uri} with CID ${cid}`,
                  );
                  await AckReportPost(uri, cid, event.subject.$type);
                } else if (
                  event.event.reportType ===
                  "com.atproto.moderation.defs#reasonSexual"
                ) {
                  logger.info(
                    `Event ${id}: Out of scope record reported with ${uri} with CID ${cid}`,
                  );
                  await AckReportPost(uri, cid, event.subject.$type);
                } else if (event.event.hasOwnProperty("comment")) {
                  const comment = event.event.comment as string;
                  if (ReportCheck.test(comment)) {
                    logger.info(
                      `Event ${id}: Comment indicates out of scope record reported with ${uri} with CID ${cid}`,
                    );
                    await AckReportPost(uri, cid, event.subject.$type);
                  }
                } else if (IGNORED_DIDS.includes(user)) {
                  logger.info(`Event ${id}:Ignoring DID: ${user}`);
                  await AckReportRepo(user, event.subject.$type);
                }
              } else {
                logger.warn(
                  `Event ${id}: URI expected but not found for report`,
                );
              }
            }

            // Check for Reports that can be actioned
            /*
            if (event.subject.$type === "com.atproto.admin.defs#repoRef") {
              const id = event.id;
              if (event.subject.hasOwnProperty("did")) {
                const user = event.subject.did as string;
                // Check for reports on user accounts
                if (event.event.tombstone) {
                  return;
                } else if (
                  event.createdBy === MOD_DID &&
                  !IGNORED_DIDS.includes(user)
                ) {
                  await CheckReportRepo(event);
                }
              }
              } */

            // Fin
          }
        }) ?? [],
      );
    } catch (e) {
      logger.error(e);
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
