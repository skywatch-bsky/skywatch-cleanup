import { logger } from "./logger.js";
import { getProfiles, hasProfileLabel } from "./getProfiles.js";
import { AckReportRepo, AckReportPost } from "./ackEvents.js";
import { IGNORED_DIDS, ReportCheck } from "./constants.js";
import { ReportHandlingResult } from "./types.js";
import { ModEventView } from "@atproto/api/dist/client/types/tools/ozone/moderation/defs.js";
import {
  createAccountLabel,
  createAccountComment,
  createPostComment,
} from "./moderation.js";
import { checkDescription, checkDisplayName } from "./checkProfiles.js";
import { processClavataEvaluation } from "./clavataPolicy.js";
import { getPostContent } from "./getPosts.js";
import { time } from "console";
import exp from "constants";

export async function handleRepoReport(
  event: ModEventView,
): Promise<ReportHandlingResult> {
  const id = event.id;

  if (!event.subject.hasOwnProperty("did")) {
    logger.warn(`Event ${id}: DID expected but not found for report`);
    return { success: false, message: "Missing DID" };
  }

  const user = event.subject.did as string;
  const eventType = event.subject.$type as string;
  const profile = await getProfiles(user);

  // Handle invalid handle
  if (event.subjectHandle === "handle.invalid") {
    logger.info(
      `Event ${id}: Auto-acknowledging invalid handle event for ${user}`,
    );
    await AckReportRepo(user, eventType, "Invalid Handle");
    return {
      success: true,
      message: "Invalid handle acknowledged",
    };
  }

  // Handle tombstones
  if (event.event.tombstone) {
    logger.info(`Event ${id}: Auto-acknowledging tombstone event for ${user}`);
    await AckReportRepo(user, eventType, "Account Tombstoned.");
    return { success: true, message: "Tombstone acknowledged" };
  }

  // Handle ignored DIDs
  if (IGNORED_DIDS.includes(user)) {
    logger.info(`Ignoring DID: ${user}`);
    await AckReportRepo(
      user,
      eventType,
      `Report for ${user} is out of scope due to being on allowList.`,
    );
    return {
      success: true,
      message: "Ignored DID acknowledged",
    };
  }

  if (event.event.hasOwnProperty("comment")) {
    const comment = event.event.comment as string;
    if (ReportCheck.test(comment)) {
      if (eventType === "com.atproto.admin.defs#repoRef") {
        logger.info(
          `Event ${id}: Comment indicates out of scope report for ${user}`,
        );
        await AckReportRepo(
          user,
          eventType,
          `Report for ${user} is out of scope.`,
        );
        return {
          success: true,
          message: "Evaluated against allow list",
        };
      }
    }

    if (event.event.reportType === "com.atproto.moderation.defs#reasonSexual") {
      logger.info(`Event ${id}: Out of scope content reported for ${user}`);
      await AckReportRepo(
        user,
        eventType,
        `Report for ${user} is out of scope.`,
      );
      return { success: true, message: "Report acknowledged." };
    }

    // Send to processClavataEvaluation
    if (profile?.displayName) {
      const displayName = profile.displayName;
      await checkDisplayName(user, Date.now(), displayName);
    }

    if (profile?.description) {
      const description = profile.description;
      logger.info(`Event ${id}: Sending report for ${user} to Clavata AI`);
      await processClavataEvaluation(
        description,
        user,
        id,
        createAccountComment,
      );

      await checkDescription(user, Date.now(), description);

      return {
        success: true,
        message: "Report sent to Clavata AI and rechecked.",
      };
    }
  }
  return { success: true, message: "Report processed" };
}

// Handle Wencil imports seperately
export async function handleImportReport(
  event: ModEventView,
): Promise<ReportHandlingResult> {
  const id = event.id;

  const user = event.subject.did as string;
  const eventType = event.subject.$type as string;

  // Process Wencil Blocklist
  if (event.createdBy === "did:plc:dbnoyyuzwgps2zr7v2psvp6o") {
    const comment = event.event.comment as string;
    if (comment.includes("post with spam url associated with bot")) {
      logger.info(
        `Event ${id}: Auto-acknowledging experimental event for ${user}`,
      );
      await AckReportRepo(user, eventType, "Experimental Event");
      return {
        success: true,
        message: "Auto-acknowledging report.",
      };
    }

    logger.info(
      `Event ${id}: Labeling report for ${user} due to inclusion on imported blocklist.`,
    );
    await createAccountLabel(
      user,
      "suspect-inauthentic",
      "Imported from https://bsky.app/profile/did:plc:d7nr65djxrudtdg3tslzfiyr/lists/3lcm6ypfdj72r",
    );
    await AckReportRepo(
      user,
      "com.atproto.admin.defs#repoRef",
      `Report is autolabeled.`,
    );
    return {
      success: true,
      message: "Labeled suspected inauthentic.",
    };
  }
  return { success: true, message: "Report processed" };
}

export async function handlePostReport(
  event: ModEventView,
): Promise<ReportHandlingResult> {
  const id = event.id;

  if (!event.subject.hasOwnProperty("uri")) {
    logger.warn(`Event ${id}: URI expected but not found for report`);
    return { success: false, message: "Missing URI" };
  }

  const uri = event.subject.uri as string;
  const cid = event.subject.cid as string;
  const eventType = event.subject.$type as string;

  // Acknowledge tomestoned events
  if (event.event.tombstone) {
    logger.info(
      `Event ${id}: Auto-acknowledging tombstone event for ${uri} with CID ${cid}`,
    );
    await AckReportPost(uri, cid, eventType);
    return { success: true, message: "Tombstone event acknowledged" };
  }

  // Acknowledge out of scope reports
  if (event.event.reportType === "com.atproto.moderation.defs#reasonSexual") {
    logger.info(
      `Event ${id}: Out of scope record reported with ${uri} with CID ${cid}`,
    );
    await AckReportPost(uri, cid, eventType);
    return { success: true, message: "Out of scope report acknowledged" };
  }

  if (event.event.hasOwnProperty("comment")) {
    const comment = event.event.comment as string;
    if (ReportCheck.test(comment)) {
      logger.info(
        `Event ${id}: Comment indicates out of scope record reported with ${uri} with CID ${cid}`,
      );
      await AckReportPost(uri, cid, eventType);
      return {
        success: true,
        message: "Out of scope report acknowledged",
      };
    }
  }

  const user = uri.split("/")[2];
  // Right now have only implemented this for posts
  // other reportable content types will need to be added
  if (uri.split("/")[3] == "app.bsky.feed.post") {
    const post = await getPostContent(uri);
    // Like above, we are erring on the side of annotating anything that is reported
    if (post) {
      await processClavataEvaluation(post, uri, id, (uri, comment) =>
        createPostComment(uri, cid, comment),
      );
    }
  }
  return { success: true, message: "Post processed" };
}
