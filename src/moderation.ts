import { agent, isLoggedIn } from "./agent.js";
import { MOD_DID } from "./config.js";
import { limit } from "./rateLimit.js";
import logger from "./logger.js";

export const createPostLabel = async (
  uri: string,
  cid: string,
  label: string,
  comment: string
) => {
  await isLoggedIn;
  await limit(async () => {
    try {
      return agent.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: "tools.ozone.moderation.defs#modEventLabel",
            comment: comment,
            createLabelVals: [label],
            negateLabelVals: [],
          },
          // specify the labeled post by strongRef
          subject: {
            $type: "com.atproto.repo.strongRef",
            uri: uri,
            cid: cid,
          },
          // put in the rest of the metadata
          createdBy: `${agent.did}`,
          createdAt: new Date().toISOString(),
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID!}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        }
      );
    } catch (e) {
      console.error(e);
    }
  });
};

export const createAccountLabel = async (
  did: string,
  label: string,
  comment: string
) => {
  await isLoggedIn;
  await limit(async () => {
    try {
      await agent.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: "tools.ozone.moderation.defs#modEventLabel",
            comment: comment,
            createLabelVals: [label],
            negateLabelVals: [],
          },
          // specify the labeled post by strongRef
          subject: {
            $type: "com.atproto.admin.defs#repoRef",
            did: did,
          },
          // put in the rest of the metadata
          createdBy: `${agent.did}`,
          createdAt: new Date().toISOString(),
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID!}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        }
      );
    } catch (e) {
      console.error(e);
    }
  });
};

export const createAccountComment = async (did: string, comment: string) => {
  await isLoggedIn;
  await limit(async () => {
    try {
      await agent.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: "tools.ozone.moderation.defs#modEventComment",
            comment: comment,
          },
          // specify the labeled post by strongRef
          subject: {
            $type: "com.atproto.admin.defs#repoRef",
            did: did,
          },
          // put in the rest of the metadata
          createdBy: `${agent.did}`,
          createdAt: new Date().toISOString(),
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID!}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        }
      );
    } catch (e) {
      console.error(e);
    }
  });
};

export const createPostComment = async (
  uri: string,
  cid: string,
  comment: string
) => {
  await isLoggedIn;
  await limit(async () => {
    try {
      await agent.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: "tools.ozone.moderation.defs#modEventComment",
            comment: comment,
          },
          // For posts, use a strongRef instead of a repoRef that requires a DID.
          subject: {
            $type: "com.atproto.repo.strongRef",
            uri: uri,
            cid: cid,
          },
          createdBy: `${agent.did}`,
          createdAt: new Date().toISOString(),
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID!}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        }
      );
    } catch (e) {
      console.error(e);
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
            comment: comment,
            reportType: "com.atproto.moderation.defs#reasonOther",
          },
          // specify the labeled post by strongRef
          subject: {
            $type: "com.atproto.admin.defs#repoRef",
            did: did,
          },
          // put in the rest of the metadata
          createdBy: `${agent.did}`,
          createdAt: new Date().toISOString(),
        },
        {
          encoding: "application/json",
          headers: {
            "atproto-proxy": `${MOD_DID!}#atproto_labeler`,
            "atproto-accept-labelers":
              "did:plc:ar7c4by46qjdydhdevvrndac;redact",
          },
        }
      );
    } catch (e) {
      console.error(e);
    }
  });
};
