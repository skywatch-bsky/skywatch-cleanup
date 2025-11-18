import { agent, isLoggedIn } from "./agent.js";
import { postsServiceLimit } from "./rateLimit.js";
import logger from "./logger.js";
import { PostsService } from "./hydration/posts.service.js";

// Initialize service once at module level
const postsService = new PostsService(agent, postsServiceLimit);

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
export const getPostContent = async (uri: string): Promise<string | null> => {
  await isLoggedIn;

  try {
    const hydrated = await postsService.hydratePost(uri);
    return hydrated?.text || null;
  } catch (error) {
    logger.error({ error, uri }, "Failed to get post content");
    return null;
  }
};
