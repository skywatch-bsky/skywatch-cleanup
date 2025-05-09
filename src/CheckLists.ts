import { agent, isLoggedIn } from "./agent.js";
import { limit } from "./rateLimit.js";
import { CHECKLISTS } from "./constants.js";
import { logger } from "./logger.js";
import { IGNORED_DIDS, LabelCheck, getModHeaders } from "./constants.js";
import { checkLabels } from "./getRepo.js";
import { AppBskyGraphList, ComAtprotoRepoListRecords } from "@atproto/api";

export const getListMembers = async (listURI: string) => {
  try {
    await isLoggedIn;
    console.log("Authentication confirmed");

    let current_cursor: string | undefined = undefined;
    let members: any[] = [];

    do {
      console.log("Fetching list members...");
      const list_members = await limit(() =>
        agent.app.bsky.graph.getList({
          list: listURI,
          limit: 100,
          cursor: current_cursor,
        }),
      );

      current_cursor = list_members.data.cursor;
      console.log(`Processing ${list_members.data.items.length} members`);
      members = members.concat(list_members.data.items);
    } while (current_cursor !== undefined && current_cursor !== "");

    return members;
  } catch (e) {
    if (e.error === "RepoNotFound") {
      logger.warn(`Repo not found`);
      continue;
    } else {
      logger.error(e);
    }
  }

  const Lists = CHECKLISTS.map((item) => {
    const { did, rkey } = item;
    return `at://${did}/app.bsky.graph.list/${rkey}`;
  });

  logger.info(`Lists to check: ${Lists}`);

  (async () => {
    for (const list of Lists) {
      logger.info(list);
      try {
        await limit(async () => {
          const members = await limit(() => getListMembers(list));
          if (members) {
            for (const item of members) {
              const memberDID = item.subject.did as string;
              processDIDs(memberDID, list, "suspect-inauthentic");
            }
          }
        });
      } catch (e) {
        if (e.error === "RepoNotFound") {
          logger.warn(`Repo not found`);
          continue;
        } else {
          logger.error(e);
        }
      }
    }
  })();

  async function processDIDs(
    memberDID: string,
    listURI: string,
    checklabel: string,
  ) {
    const repoLabels = await checkLabels(memberDID);

    for (const label of repoLabels || []) {
      const value = label.val;
      if (LabelCheck.includes(value)) {
        logger.info(`Found ${value} on ${memberDID}.`);
        return;
      } else {
        logger.info(`${memberDID} not labeled with ${checklabel}`);
        try {
          await limit(() =>
            agent.tools.ozone.moderation.emitEvent(
              {
                event: {
                  $type: "tools.ozone.moderation.defs#modEventLabel",
                  comment: `Auto-labeling ${checklabel} for ${memberDID}: Imported from ${listURI}.`,
                  createLabelVals: [checklabel],
                  negateLabelVals: [],
                },
                // specify the labeled post by strongRef
                subject: {
                  $type: "com.atproto.admin.defs#repoRef",
                  did: memberDID,
                },
                // put in the rest of the metadata
                createdBy: `${agent.did}`,
                createdAt: new Date().toISOString(),
              },
              { headers: getModHeaders() },
            ),
          );
        } catch (e) {
          logger.warn(e);
        }
      }
    }
  }
};
