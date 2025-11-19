import { agent, isLoggedIn } from "../agent.js";
import { limit } from "../rateLimit.js";
import logger from "../logger.js";
import { MOD_DID } from "../config.js";

export const createPostLabel = async (
  uri: string,
  cid: string,
  label: string,
  comment: string,
) => {
  await isLoggedIn;

  await limit(async () => {
    try {
      const event: {
        $type: string;
        comment: string;
        createLabelVals: string[];
        negateLabelVals: string[];
      } = {
        $type: "tools.ozone.moderation.defs#modEventLabel",
        comment,
        createLabelVals: [label],
        negateLabelVals: [],
      };

      await agent.tools.ozone.moderation.emitEvent(
        {
          event,
          // specify the labeled post by strongRef
          subject: {
            $type: "com.atproto.repo.strongRef",
            uri,
            cid,
          },
          // put in the rest of the metadata
          createdBy: agent.did ?? "",
          createdAt: new Date().toISOString(),
          modTool: {
            name: "skywatch/skywatch-cleanup",
            meta: {
              time: new Date().toISOString(),
              externalUrl: `https://pdsls.dev/${uri}`,
            },
          },
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        },
      );
    } catch (error) {
      logger.warn("Error creating post report:", error);
    }
  });
};

export const createPostReport = async (
  uri: string,
  cid: string,
  comment: string,
) => {
  await isLoggedIn;
  await limit(async () => {
    try {
      return await agent.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: "tools.ozone.moderation.defs#modEventReport",
            comment,
            reportType: "com.atproto.moderation.defs#reasonOther",
          },
          // specify the labeled post by strongRef
          subject: {
            $type: "com.atproto.repo.strongRef",
            uri,
            cid,
          },
          // put in the rest of the metadata
          createdBy: agent.did ?? "",
          createdAt: new Date().toISOString(),
          modTool: {
            name: "skywatch/skywatch-cleanup",
            meta: {
              time: new Date().toISOString(),
              externalUrl: `https://pdsls.dev/${uri}`,
            },
          },
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        },
      );
    } catch (e) {
      logger.error(
        { process: "MODERATION", error: e },
        "Failed to create post label",
      );
    }
  });
};

export const createPostComment = async (
  uri: string,
  cid: string,
  comment: string,
) => {
  await isLoggedIn;

  await limit(async () => {
    try {
      const event: {
        $type: string;
        comment: string;
      } = {
        $type: "tools.ozone.moderation.defs#modEventComment",
        comment,
      };

      await agent.tools.ozone.moderation.emitEvent(
        {
          event,
          // specify the labeled post by strongRef
          subject: {
            $type: "com.atproto.repo.strongRef",
            uri,
            cid,
          },
          // put in the rest of the metadata
          createdBy: agent.did ?? "",
          createdAt: new Date().toISOString(),
          modTool: {
            name: "skywatch/skywatch-cleanup",
            meta: {
              time: new Date().toISOString(),
              externalUrl: `https://pdsls.dev/${uri}`,
            },
          },
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        },
      );
    } catch (error) {
      logger.warn("Error creating post report:", error);
    }
  });
};

export const createPostTag = async (
  uri: string,
  cid: string,
  tag: string,
  comment: string,
) => {
  await isLoggedIn;

  await limit(async () => {
    try {
      const event: {
        $type: string;
        tag: string[];
        comment: string;
      } = {
        $type: "tools.ozone.moderation.defs#modEventTag",
        tag: [tag],
        comment,
      };

      await agent.tools.ozone.moderation.emitEvent(
        {
          event,
          // specify the labeled post by strongRef
          subject: {
            $type: "com.atproto.repo.strongRef",
            uri,
            cid,
          },
          // put in the rest of the metadata
          createdBy: agent.did ?? "",
          createdAt: new Date().toISOString(),
          modTool: {
            name: "skywatch/skywatch-cleanup",
            meta: {
              time: new Date().toISOString(),
              externalUrl: `https://pdsls.dev/${uri}`,
            },
          },
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        },
      );
    } catch (error) {
      logger.warn("Error creating post report:", error);
    }
  });
};

export const createAccountLabel = async (
  did: string,
  label: string,
  comment: string,
) => {
  await isLoggedIn;

  logger.info({ process: "MODERATION", did, label }, "Labeling account");

  await limit(async () => {
    try {
      await agent.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: "tools.ozone.moderation.defs#modEventLabel",
            comment,
            createLabelVals: [label],
            negateLabelVals: [],
          },
          // specify the labeled post by strongRef
          subject: {
            $type: "com.atproto.admin.defs#repoRef",
            did,
          },
          // put in the rest of the metadata
          createdBy: agent.did ?? "",
          createdAt: new Date().toISOString(),
          modTool: {
            name: "skywatch/skywatch-cleanup",
            meta: {
              time: new Date().toISOString(),
              externalUrl: `https://pdsls.dev/at://${did}`,
            },
          },
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        },
      );
    } catch (e) {
      logger.error(
        { process: "MODERATION", error: e },
        "Failed to create account label",
      );
    }
  });
};

export const createAccountComment = async (
  did: string,
  comment: string,
  atURI: string,
) => {
  await isLoggedIn;
  logger.info({ process: "MODERATION", did, atURI }, "Commenting on account");

  await limit(async () => {
    try {
      await agent.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: "tools.ozone.moderation.defs#modEventComment",
            comment,
          },
          // specify the labeled post by strongRef
          subject: {
            $type: "com.atproto.admin.defs#repoRef",
            did,
          },
          // put in the rest of the metadata
          createdBy: agent.did ?? "",
          createdAt: new Date().toISOString(),
          modTool: {
            name: "skywatch/skywatch-cleanup",
            meta: {
              time: new Date().toISOString(),
              externalUrl: `https://pdsls.dev/at://${did}`,
            },
          },
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        },
      );
    } catch (e) {
      logger.error(
        { process: "MODERATION", error: e },
        "Failed to create account comment",
      );
    }
  });
};

export const createAccountReport = async (did: string, comment: string) => {
  await isLoggedIn;
  await limit(async () => {
    try {
      await agent.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: "tools.ozone.moderation.defs#modEventReport",
            comment,
            reportType: "com.atproto.moderation.defs#reasonOther",
          },
          // specify the labeled post by strongRef
          subject: {
            $type: "com.atproto.admin.defs#repoRef",
            did,
          },
          // put in the rest of the metadata
          createdBy: agent.did ?? "",
          createdAt: new Date().toISOString(),
          modTool: {
            name: "skywatch/skywatch-cleanup",
            meta: {
              time: new Date().toISOString(),
              externalUrl: `https://pdsls.dev/at://${did}`,
            },
          },
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        },
      );
    } catch (e) {
      logger.error(
        { process: "MODERATION", error: e },
        "Failed to create account report",
      );
    }
  });
};

export const createAccountTag = async (
  did: string,
  tag: string,
  comment: string,
) => {
  await isLoggedIn;
  await limit(async () => {
    try {
      await agent.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: "tools.ozone.moderation.defs#modEventTag ",
            tag: [tag],
            comment,
          },
          // specify the labeled post by strongRef
          subject: {
            $type: "com.atproto.admin.defs#repoRef",
            did,
          },
          // put in the rest of the metadata
          createdBy: agent.did ?? "",
          createdAt: new Date().toISOString(),
          modTool: {
            name: "skywatch/skywatch-cleanup",
            meta: {
              time: new Date().toISOString(),
              externalUrl: `https://pdsls.dev/at://${did}`,
            },
          },
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        },
      );
    } catch (e) {
      logger.error(
        { process: "MODERATION", error: e },
        "Failed to create account report",
      );
    }
  });
};
