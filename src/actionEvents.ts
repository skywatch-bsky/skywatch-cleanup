import { agent, isLoggedIn } from "./agent.js";
import { limit } from "./rateLimit.js";
import { MOD_DID } from "./config.js";
import { logger } from "./logger.js";
import {
  ModEventView,
  ModEventLabel,
} from "@atproto/api/dist/client/types/tools/ozone/moderation/defs.js";
import { RepoRef } from "@atproto/api/dist/client/types/com/atproto/admin/defs.js";
import { POST_CHECKS, getModHeaders } from "./constants.js";

export const ActionReportRepo = async (
  did: string,
  label: string,
  comment: string,
) => {
  if (!did || !label || !comment) {
    logger.error(
      "ActionReportRepo: Invalid parameters. 'did', 'label', or 'comment' is missing.",
    );
    return;
  }

  logger.info(
    `ActionReportRepo: Initiating report for DID ${did} with label "${label}" and mod comment "${comment}"`,
  );
  await limit(async () => {
    try {
      await isLoggedIn; // Ensures agent is ready and agent.did is available
      await agent.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: "tools.ozone.moderation.defs#modEventLabel",
            comment: comment,
            createLabelVals: [label],
            negateLabelVals: [],
          },
          subject: {
            $type: "com.atproto.admin.defs#repoRef",
            did: did,
          },
          createdBy: agent.did!, // Assuming isLoggedIn ensures agent.did is set
          createdAt: new Date().toISOString(),
        },
        { headers: getModHeaders() },
      );
      logger.info(
        `ActionReportRepo: Successfully emitted event for DID ${did}, label "${label}"`,
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logger.error(
        `ActionReportRepo: Failed to emit event for DID ${did}, label "${label}". Error: ${errorMessage}`,
      );
    }
  });
};

export const CheckReportRepo = async (event: ModEventView) => {
  // Validate event and ensure the subject is a RepoRef with a DID
  if (
    !event ||
    !event.subject ||
    event.subject.$type !== "com.atproto.admin.defs#repoRef"
  ) {
    logger.warn(
      "CheckReportRepo: Event subject is not a valid RepoRef. Skipping.",
    );
    return;
  }

  const subjectRepoRef = event.subject as RepoRef;
  const userDid = subjectRepoRef.did;

  if (!userDid) {
    logger.error(
      "CheckReportRepo: Valid RepoRef subject found, but DID is missing. Skipping.",
    );
    return;
  }

  // Only process events created by the configured MOD_DID
  if (event.createdBy !== MOD_DID) {
    logger.info(
      `CheckReportRepo: Event created by ${event.createdBy} (not MOD_DID). Skipping.`,
    );
    return;
  }

  // Extract comment from the event if available
  let eventComment: string | undefined = undefined;
  if (
    "comment" in event.event &&
    typeof event.event.comment === "string" &&
    event.event.comment.trim() !== ""
  ) {
    eventComment = event.event.comment;
  }

  if (!eventComment) {
    logger.info(
      "CheckReportRepo: No actionable comment found in the event. Skipping.",
    );
    return;
  }

  logger.info(
    `CheckReportRepo: Processing event for user ${userDid} regarding comment: "${eventComment}"`,
  );

  // Iterate through POST_CHECKS to find matching patterns
  for (const postCheck of POST_CHECKS) {
    if (postCheck.check.test(eventComment)) {
      // Found a matching pattern
      if (postCheck.whitelist && postCheck.whitelist.test(eventComment)) {
        logger.info(
          `CheckReportRepo: Whitelisted phrase found for label "${postCheck.label}" in comment: "${eventComment}". No action taken for this rule.`,
        );
        // Continue to the next postCheck rule
        continue;
      } else {
        // Pattern matched and not whitelisted (or no whitelist defined)
        logger.info(
          `CheckReportRepo: Pattern for label "${postCheck.label}" matched in comment: "${eventComment}". Applying moderation action.`,
        );
        ActionReportRepo(userDid, postCheck.label, postCheck.comment);
        // Assuming we process all matching rules; if only the first match should trigger, add 'break;' here.
      }
    }
  }
};
