import { agent, isLoggedIn } from "./agent.js";
import { limit } from "./rateLimit.js";
import { logger } from "./logger.js";
import { AppBskyActorDefs } from "@atproto/api";

export const getProfiles = async (
  did: string,
): Promise<AppBskyActorDefs.ProfileViewDetailed | undefined> => {
  try {
    await isLoggedIn;

    let profile: AppBskyActorDefs.ProfileViewDetailed;

    const resp = await limit(() =>
      agent.app.bsky.actor.getProfile({
        actor: did,
      }),
    );

    profile = resp.data;

    if (resp.success) {
      return profile;
    } else {
      logger.info(`Profile not found: ${did}`);
      return;
    }
  } catch (e) {
    const isAccountSuspended = (error: any): boolean => {
      return (
        error?.err?.stack?.Error === "Account has been suspended" &&
        error?.err?.message === "Account has been suspended"
      );
    };

    if (isAccountSuspended(e)) {
      logger.warn(`${did} has been suspended`);
    } else {
      logger.error(e);
    }
  }
};

export function hasProfileLabel(profile: any, labelToFind: string): boolean {
  // Safety check for null or undefined
  if (!profile || !profile.labels) {
    return false;
  }

  try {
    // Get all label values
    const labelValues = profile.labels.map((label: any) => label.value);

    // Check if the array includes our label
    // Don't call the label as a function! Just compare it as a string
    return labelValues.indexOf(labelToFind) !== -1;

    // Alternative approach using a loop to avoid any potential issues
    /*
    for (const label of profile.labels) {
      if (label && label.value === labelToFind) {
        return true;
      }
    }
    return false;
    */
  } catch (error) {
    console.error(`Error checking for label '${labelToFind}':`, error);
    return false;
  }
}
