import { logger } from "./logger.js";
import { getProfiles, hasProfileLabel } from "./getProfiles.js";
import {
  IGNORED_DIDS,
  ReportCheck,
  POLICIES,
  GLOBAL_ALLOW,
} from "./constants.js";
import { ReportHandlingResult } from "./types.js";
import { ModEventView } from "@atproto/api/dist/client/types/tools/ozone/moderation/defs.js";
import {
  createPostLabel,
  createPostComment,
  createAccountLabel,
  createAccountComment,
  createAccountReport,
  createPostTag,
  createAccountTag,
} from "./events/moderation.js";
import { getPostContent } from "./getPosts.js";
import { loadPolicy } from "./loader.js";
import { createChatCompletion } from "./ollama.js";
import { MODEL } from "./config.js";
import { AckReportRepo, AckReportPost } from "./events/ackEvents.js";

async function evaluateContentPolicy(
  policyName: string,
  content: string,
): Promise<{ flag?: number; reason: string } | null> {
  try {
    const policy = loadPolicy(policyName);

    const response = await createChatCompletion({
      model: MODEL,
      messages: [
        { role: "system", content: policy.policy },
        { role: "user", content },
      ],
    });

    return response.choices[0].message;
  } catch (error) {
    logger.warn(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error evaluating content policy",
    );
    // Silently return null - these are often expected errors (suspended accounts, Ollama timeouts)
    return null;
  }
}

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

  if (GLOBAL_ALLOW.includes(user)) {
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

  // Acknowledge tomestoned events
  if (event.event.hasOwnProperty("tag")) {
    const tag = event.event.tag as string;
    if (tag === "triaged") {
      logger.info(
        `Event ${id}: Auto-acknowledging previously reviewed event for ${user} with tag: ${tag}`,
      );
      await AckReportRepo(
        user,
        eventType,
        `Event ${id}: Auto-acknowledging previously reviewed event for ${user} with tag: ${tag}`,
      );
      return { success: true, message: "Tag event acknowledged" };
    }
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

    const profile = await getProfiles(user);
    if (profile?.description) {
      const description = profile.description;
      for (const checkPolicy of POLICIES) {
        const policy = loadPolicy(checkPolicy);
        const result = await evaluateContentPolicy(policy.label, description);
        logger.info(`Event ${id}: Evaluated against ${policy.label}`);

        if (result) {
          logger.info(result);
          if (result.flag === 1) {
            void createAccountLabel(
              user,
              `${policy.label}`,
              `${result.reason}`,
            );
          }
        }
      }
    }
    // void createAccountTag(user, "triaged", "");
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
    await AckReportPost(
      uri,
      cid,
      eventType,
      `Event ${id}: Auto-acknowledging tombstone event for ${uri} with CID ${cid}`,
    );
    return { success: true, message: "Tombstone event acknowledged" };
  }

  // Acknowledge tomestoned events
  if (event.event.hasOwnProperty("tag")) {
    const tag = event.event.tag as string;
    if (tag === "triaged") {
      logger.info(
        `Event ${id}: Auto-acknowledging previously reviewed event for ${uri} with tag: ${tag}`,
      );
      await AckReportPost(
        uri,
        cid,
        eventType,
        `Event ${id}: Auto-acknowledging previously reviewed event for ${uri} with tag: ${tag}`,
      );
      return { success: true, message: "Tag event acknowledged" };
    }
  }

  // Acknowledge out of scope reports
  if (event.event.reportType === "com.atproto.moderation.defs#reasonSexual") {
    logger.info(
      `Event ${id}: Out of scope record reported with ${uri} with CID ${cid}`,
    );
    await AckReportPost(
      uri,
      cid,
      eventType,
      `Event ${id}: Out of scope record reported with ${uri} with CID ${cid}`,
    );
    return { success: true, message: "Out of scope report acknowledged" };
  }

  if (event.event.hasOwnProperty("comment")) {
    const comment = event.event.comment as string;
    if (ReportCheck.test(comment)) {
      logger.info(
        `Event ${id}: Comment indicates out of scope record reported with ${uri} with CID ${cid}`,
      );
      await AckReportPost(
        uri,
        cid,
        eventType,
        `Event ${id}: Comment indicates out of scope record reported with ${uri} with CID ${cid}`,
      );
      return {
        success: true,
        message: "Out of scope report acknowledged",
      };
    }
  }

  const user = uri.split("/")[2];
  const contentType = uri.split("/")[3];

  logger.info({ uri, contentType }, "Processing post report");

  // Right now have only implemented this for posts
  // other reportable content types will need to be added
  if (contentType == "app.bsky.feed.post") {
    const post = await getPostContent(uri);
    // Like above, we are erring on the side of annotating anything that is reported
    //

    if (post) {
      for (const checkPolicy of POLICIES) {
        const policy = loadPolicy(checkPolicy);
        const result = await evaluateContentPolicy(policy.label, post);

        if (result) {
          logger.info(result);
          if (result.flag === 1) {
            void createPostLabel(
              uri,
              cid,
              `${policy.label}`,
              `${result.reason}`,
            );
            void createAccountReport(
              user,
              `Post at ${uri} classified as ${policy.label} for ${result.reason}`,
            );
          } else if (result.flag === 0) {
            void createPostComment(
              uri,
              cid,
              `Post at ${uri} reviewed by gpt-oss-safeguard and not classified as ${policy.label} for reason: ${result.reason}`,
            );
          }
        }
      }
    } else {
      logger.warn(
        { uri },
        "Post content not found or unable to retrieve",
      );
    }
  } else {
    logger.info(
      { uri, contentType },
      "Unsupported content type, skipping post processing",
    );
  }
  return { success: true, message: "Post processed" };
}
