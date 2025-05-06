import { logger } from "./logger.js";
import { AckReportRepo, AckReportPost } from "./ackEvents.js";
import { ReportHandlingResult } from "./types.js";
import { SubjectStatusView } from "@atproto/api/dist/client/types/tools/ozone/moderation/defs.js";

export async function handleRepoStatus(
  status: SubjectStatusView,
): Promise<ReportHandlingResult> {
  const id = status.id;

  if (!status.subject.hasOwnProperty("did")) {
    logger.warn(`Event ${id}: DID expected but not found for subject`);
    return { success: false, message: "Missing DID" };
  }

  const user = status.subject.did as string;
  const eventType = status.subject.$type as string;

  // Handle takedowns
  if (status.takendown) {
    logger.info(`Event ${id}: Auto-acknowledging takedown event for ${user}`);
    await AckReportRepo(user, eventType, "Takendown");
    return {
      success: true,
      message: "Takedown acknowledged",
    };
  }

  // Handle invalid handle
  if (status.subjectHandle === "handle.invalid") {
    logger.info(
      `Event ${id}: Auto-acknowledging invalid handle event for ${user}`,
    );
    await AckReportRepo(user, eventType, "Invalid Handle");
    return {
      success: true,
      message: "Invalid handle acknowledged",
    };
  }

  return {
    success: true,
    message: "Status handled successfully",
  };
}
