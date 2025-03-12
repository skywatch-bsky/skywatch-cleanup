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
  try {
    await isLoggedIn;

    // Split the URI into its parts.
    // Example URI: "at://did:plc:XYZ/app.bsky.feed.post/3lhlw4gq4uj2t"
    const parts = uri.split("/");
    if (parts.length < 5) {
      console.error("Invalid AT URI format:", uri);
      return null;
    }
    const repo = parts[2]; // the account's DID
    // We ignore parts[3] since it should be "app.bsky.feed.post" and getPost assumes that collection.
    const rkey = parts.slice(4).join("/");

    // Call getPost with the repo and rkey
    const response = await agent.getPost({ repo, rkey });
    // The response is expected to have structure:
    // { uri: string; cid: string; value: Record }
    // We cast value to an object that may contain a "text" field.
    const record = response.value as { text?: string };
    return record.text || null;
  } catch (error) {
    console.error(`Error fetching post content for URI ${uri}:`, error);
    return null;
  }
}
