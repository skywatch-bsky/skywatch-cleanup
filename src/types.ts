import { SubjectStatusView } from "@atproto/api/dist/client/types/tools/ozone/moderation/defs.js";
import { lexXrpcError } from "@atproto/lexicon";

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

interface Report {
  id: number;
  reviewState: string;
  createdAt: string;
  updatedAt: string;
  lastReportedAt: string;
  takendown: boolean;
  subjectRepoHandle: string;
  subjectBlobCids: string[];
  tags: string[];
  subject: {
    $type: string;
    did: string;
  };
  hosting: {
    $type: string;
    status: string;
  };
}

export interface Checks {
  label: string;
  comment: string;
  description?: boolean;
  displayName?: boolean;
  reportOnly: boolean;
  commentOnly: boolean;
  check: RegExp;
  whitelist?: RegExp;
  ignoredDIDs?: string[];
}

export interface List {
  label: string;
  rkey: string;
}

export interface CheckList {
  did: string;
  rkey: string;
}
