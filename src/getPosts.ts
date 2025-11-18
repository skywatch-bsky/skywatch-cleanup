import { agent, isLoggedIn } from "./agent.js";
import { limit } from "./rateLimit.js";
import { MOD_DID } from "./config.js";
import logger from "./logger.js";
import { isRecordNotFoundError } from "./utils/retry.js";

/**
 * Retrieves the text content of a post record from its AT URI.
 *
 * The expected format of the URI is:
 *   at://<DID>/<COLLECTION>/<RKEY>
 *
 * For post records, COLLECTION is expected to be "app.bsky.feed.post".
 *
 * @param uri - The AT URI of the post record.
 * @returns The post text, or null if not found.
 */

export const getPostContent = async (
  uri: string,
): Promise<string | null> => {
  await isLoggedIn;
  return await limit(async () => {
    try {
      const response = await agent.tools.ozone.moderation.getRecord(
        { uri },
        {
          headers: {
            "atproto-proxy": `${MOD_DID}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        },
      );

      if (!response.data?.value) {
        logger.warn({ uri }, "Failed to fetch post record");
        return null;
      }

      return response.data.value.text || null;
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        logger.warn({ uri }, "Post record not found, skipping");
        return null;
      }
      logger.error({ error, uri }, "Failed to fetch post content");
      return null;
    }
  });
};
