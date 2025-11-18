import { AtpAgent, AppBskyActorDefs } from "@atproto/api";
import { logger } from "../logger.js";
import { withRetry } from "../utils/retry.js";

export class ProfilesService {
  private agent: AtpAgent;
  private limit: (fn: () => Promise<any>) => Promise<any>;

  constructor(
    agent: AtpAgent,
    limit: (fn: () => Promise<any>) => Promise<any>,
  ) {
    this.agent = agent;
    this.limit = limit;
  }

  async hydrateProfile(did: string): Promise<AppBskyActorDefs.ProfileViewDetailed | null> {
    try {
      const profile = await this.limit(() =>
        withRetry(
          async () => {
            const resp = await this.agent.app.bsky.actor.getProfile({
              actor: did,
            });

            if (!resp.success || !resp.data) {
              logger.warn({ did }, "Failed to fetch profile");
              return null;
            }

            return resp.data;
          },
          { maxAttempts: 3 },
        ),
      );

      if (!profile) {
        return null;
      }

      logger.info({ did, handle: profile.handle }, "Profile hydrated successfully");
      return profile;
    } catch (error: any) {
      const isSuspended =
        error?.message === "Account has been suspended" ||
        error?.error === "AccountTakedown" ||
        error?.error === "AccountNotFound";

      if (isSuspended) {
        logger.warn({ did }, "Account is suspended or not found");
        return null;
      }

      logger.error({ error, did }, "Failed to hydrate profile");
      return null;
    }
  }

  hasLabel(profile: AppBskyActorDefs.ProfileViewDetailed, labelValue: string): boolean {
    if (!profile?.labels || !Array.isArray(profile.labels)) {
      return false;
    }
    return profile.labels.some((label: any) => label.val === labelValue);
  }
}
