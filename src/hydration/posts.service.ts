import { AtpAgent } from "@atproto/api";
import { logger } from "../logger.js";
import { withRetry } from "../utils/retry.js";
import { MOD_DID } from "../config.js";
import { HydratedPost } from "../types.js";

export class PostsService {
  private agent: AtpAgent;
  private limit: (fn: () => Promise<any>) => Promise<any>;

  constructor(
    agent: AtpAgent,
    limit: (fn: () => Promise<any>) => Promise<any>,
  ) {
    this.agent = agent;
    this.limit = limit;
  }

  async hydratePost(uri: string): Promise<HydratedPost | null> {
    try {
      const post = await this.limit(() =>
        withRetry(
          async () => {
            const response = await this.agent.tools.ozone.moderation.getRecord(
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

            return response.data.value;
          },
          { maxAttempts: 3 },
        ),
      );

      if (!post) {
        return null;
      }

      const hydrated: HydratedPost = {
        uri,
        text: post.text || "",
        facets: post.facets,
        embeds: post.embed ? [post.embed] : undefined,
        langs: post.langs,
        tags: post.tags,
        createdAt: post.createdAt,
        isReply: !!post.reply,
      };

      logger.info({ uri }, "Post hydrated successfully");
      return hydrated;
    } catch (error) {
      const isNotFound =
        error?.error === "RecordNotFound" ||
        error?.message?.includes("RecordNotFound");

      if (isNotFound) {
        logger.warn({ uri }, "Post record not found, skipping");
        return null;
      }

      logger.error({ error, uri }, "Failed to hydrate post");
      return null;
    }
  }
}
