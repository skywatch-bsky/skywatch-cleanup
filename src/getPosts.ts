import { agent, isLoggedIn } from "./agent.js";

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
export async function getPostContent(uri: string): Promise<string | null> {
  await isLoggedIn;
  try {
    // Split the URI into its parts.
    // e.g. "at://did:plc:XYZ/app.bsky.feed.post/3lhlw4gq4uj2t"
    const parts = uri.split("/");
    if (parts.length < 5) {
      console.error("Invalid AT URI format:", uri);
      return null;
    }
    const repo = parts[2]; // DID of the account
    const collection = parts[3]; // Expected to be "app.bsky.feed.post"
    // In case the record key contains additional slashes, join all remaining parts.
    const rkey = parts.slice(4).join("/");

    // Use your AtpAgent instance (assumed to be named `agent`) to fetch the record.
    // Adjust the call parameters if your agent's API differs.
    const response = await agent.getRecord({ repo, collection, rkey });
    // Depending on your API, the post content may be located under response.data.record.text
    const postText = response.data.record?.text;
    return postText || null;
  } catch (error) {
    console.error(`Error fetching post content for URI ${uri}:`, error);
    return null;
  }
}
