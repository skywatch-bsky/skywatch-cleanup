import { SubjectStatusView } from "@atproto/api/dist/client/types/tools/ozone/moderation/defs.js";

export interface PolicyConfig {
  label: string;
  tolabel: boolean;
  policy: string;
}

export interface userReport {
  did: SubjectStatusView["did"];
  displayName?: string;
  description?: string;
  handle?: string;
}

export interface ReportHandlingResult {
  success: boolean;
  message: string;
}

export interface Report {
  ozone_id: number;
  id: string;
  type: string;
  reviewState: string;
  createdAt: string;
  updatedAt: string;
  lastReportedAt: string;
  takendown: boolean;
  labels: string[];
  content: string;
}

export interface Checks {
  label: string;
  comment: string;
  description?: boolean;
  displayName?: boolean;
  reportAcct: boolean;
  commentAcct: boolean;
  toLabel: boolean;
  check: RegExp;
  whitelist?: RegExp;
  ignoredDIDs?: string[];
  starterPacks?: string[];
  knownVectors?: string[];
}

export interface List {
  label: string;
  rkey: string;
}

export interface CheckList {
  did: string;
  rkey: string;
}

export interface PostRecord {
  text: string;
  facets?: Array<{
    index: {
      byteStart: number;
      byteEnd: number;
    };
    features: any[];
  }>;
  embed?: {
    $type: string;
    [key: string]: any;
  };
  langs?: string[];
  tags?: string[];
  createdAt: string;
  reply?: {
    root: {
      uri: string;
      cid: string;
    };
    parent: {
      uri: string;
      cid: string;
    };
  };
}

export interface HydratedPost {
  uri: string;
  text: string;
  facets?: PostRecord["facets"];
  embeds?: PostRecord["embed"][];
  langs?: string[];
  tags?: string[];
  createdAt: string;
  isReply: boolean;
}

export interface HydratedProfile {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}
