import { agent, isLoggedIn } from "./agent.js";
import { profilesServiceLimit } from "./rateLimit.js";
import { logger } from "./logger.js";
import { AppBskyActorDefs } from "@atproto/api";
import { ProfilesService } from "./hydration/profiles.service.js";

// Initialize service once at module level
const profilesService = new ProfilesService(agent, profilesServiceLimit);

export const getProfiles = async (
  did: string,
): Promise<AppBskyActorDefs.ProfileViewDetailed | undefined> => {
  try {
    await isLoggedIn;

    const hydrated = await profilesService.hydrateProfile(did);

    if (!hydrated) {
      logger.info({ did }, "Profile not found");
      return undefined;
    }

    // Reconstruct the AppBskyActorDefs.ProfileViewDetailed object
    // by returning the result from the underlying API call
    const resp = await agent.app.bsky.actor.getProfile({
      actor: did,
    });

    if (resp.success) {
      return resp.data;
    } else {
      logger.info({ did }, "Profile not found");
      return undefined;
    }
  } catch (e) {
    const error = e as any;
    const isSuspended =
      error?.message === "Account has been suspended" ||
      error?.error === "AccountTakedown";

    if (!isSuspended) {
      logger.error({ error, did }, "Failed to fetch profile");
    } else {
      logger.warn({ did }, "Account is suspended");
    }
    return undefined;
  }
};

export function hasProfileLabel(profile: any, labelToFind: string): boolean {
  if (!profile?.labels || !Array.isArray(profile.labels)) {
    return false;
  }

  return profile.labels.some((label: any) => label.value === labelToFind);
}
