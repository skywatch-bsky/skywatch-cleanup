import { agent, isLoggedIn } from "./agent.js";
import { limit } from "./rateLimit.js";
import { logger } from "./logger.js";
import { userReport } from "./types.js";

export const getProfiles = async (did: string) => {
  try {
    await isLoggedIn;

    const profile = await limit(() =>
      agent.app.bsky.actor.getProfile({
        actor: did,
      }),
    );

    if (profile.success) {
      const user: userReport = {
        did: profile.data.did,
        displayName: profile.data.displayName,
        description: profile.data.description,
      };
      return user;
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
