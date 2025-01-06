import { SubjectStatusView } from "@atproto/api/dist/client/types/tools/ozone/moderation/defs.js";
import { lexXrpcError } from "@atproto/lexicon";

export interface userReport {
  did: SubjectStatusView["did"];
  displayName?: string;
  description?: string;
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
