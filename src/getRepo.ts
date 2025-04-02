import { agent, isLoggedIn } from "./agent.js";
import { limit } from "./rateLimit.js";
import { logger } from "./logger.js";
import { Label } from "@atproto/api/dist/client/types/com/atproto/label/defs.js";
import { MOD_DID } from "./config.js";

export const checkLabels = async (user: string) => {
  await isLoggedIn;

  try {
  const repo = await limit(() =>
    agent.tools.ozone.moderation.getRepo(
      {
        did: user,
      },
      {
        headers: {
          encoding: "application/json",
          role: "moderator",
          "atproto-proxy": `${MOD_DID!}#atproto_labeler`,
          "atproto-accept-labelers": "did:plc:ar7c4by46qjdydhdevvrndac;redact",
        },
      },
    ),
  );

    if (repo.data.labels) {
      const labels: Label[] = repo.data.labels;
      //logger.info(`Labels for ${user}: ${labels.map((label) => label.val)}`);
      return labels;
    }
} catch (e) {
    logger.warn(`Error getting repo for ${user}: ${e}`);
}


};
