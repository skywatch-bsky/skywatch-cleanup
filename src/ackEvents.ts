import { agent, isLoggedIn } from "./agent.js";
import { limit } from "./rateLimit.js";
import { MOD_DID } from "./config.js";
import { logger } from "./logger.js";

export const AckReportRepo = async (did: string, subjectType: string, cmt: string) => {
  if (!did || !subjectType) {
    logger.error("Invalid parameters for AckReportRepo");
    return;
  }

  logger.info(`Acknowledging report for ${did}`);
  await limit(async () => {
    await isLoggedIn;
    try {
      agent.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: "tools.ozone.moderation.defs#modEventAcknowledge",
            comment: cmt,
          },
          subject: {
            $type: subjectType,
            did: did,
          },
          createdBy: `${agent.did}`,
          createdAt: new Date().toISOString(),
        },
        {
          headers: {
            encoding: "application/json",
            role: "moderator",
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

export const AckReportPost = async (
  uri: string,
  cid: string,
  subjectType: string,
) => {
  await limit(async () => {
    if (!uri || !cid || !subjectType) {
      logger.error("Invalid parameters for AckReportRepo");
      return;
    }

    logger.info(`Acknowledging report for ${uri}`);
    await isLoggedIn;
    try {
      agent.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: "tools.ozone.moderation.defs#modEventAcknowledge",
            comment: `Report for ${uri} is out of scope.`,
          },
          subject: {
            $type: subjectType,
            uri: uri,
            cid: cid,
          },
          createdBy: `${agent.did}`,
          createdAt: new Date().toISOString(),
        },
        {
          headers: {
            encoding: "application/json",
            role: "moderator",
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
