import { agent, isLoggedIn } from "./agent.js";
import { limit } from "./rateLimit.js";
import { MOD_DID } from "./config.js";
import { logger } from "./logger.js";
import { ModEventView } from "@atproto/api/dist/client/types/tools/ozone/moderation/defs.js";
import { POST_CHECKS } from "./constants.js";

export const ActionReportRepo = async (
  did: string,
  label: string,
  comment: string,
) => {
  if (!did || !label || !comment) {
    logger.error("Invalid parameters for AckLabelRepo");
    return;
  }

  logger.info(`Acknowledging report for ${did}`);
  await limit(async () => {
    await isLoggedIn;
    try {
      await agent.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: "tools.ozone.moderation.defs#modEventLabel",
            comment: comment,
            createLabelVals: [label],
            negateLabelVals: [],
          },
          // specify the labeled post by strongRef
          subject: {
            $type: "com.atproto.admin.defs#repoRef",
            did: did,
          },
          // put in the rest of the metadata
          createdBy: `${agent.did}`,
          createdAt: new Date().toISOString(),
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID!}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        },
      );
    } catch (e) {
      logger.error(e);
    }
  });
};

export const CheckReportRepo = async (event: ModEventView) => {
  if (!did) {
    logger.error("Invalid parameters for CheckReportRepo");
    return;
  }

  const labels: string[] = Array.from(
    POST_CHECKS,
    (postCheck) => postCheck.label,
  );

  if (event.createdBy === MOD_DID) {
    logger.info(`Reported by Moderation`);
    if (event.event.hasOwnProperty("comment")) {
      const comment = event.event.comment as string;
      const user = event.subject.did as string;

      // iterate through the labels
      labels.forEach((label) => {
        const checkPosts = POST_CHECKS.find(
          (postCheck) => postCheck.label === label,
        );

        if (checkPosts?.check.test(comment)) {
          if (checkPosts?.whitelist) {
            // False-positive checks
            if (checkPosts?.whitelist.test(comment)) {
              logger.info(`Whitelisted phrase found for: ${comment}`);
              return;
            }
          } else {
            logger.info(`${checkPosts!.label} in comment: ${comment}`);
            ActionReportRepo(
              user,
              `${checkPosts!.label}`,
              `${checkPosts!.comment}`,
            );
          }
        }
      });
    }
  }
};
