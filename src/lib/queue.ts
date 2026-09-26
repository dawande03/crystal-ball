import approvalsFixture from "@/data/approvals.json";
import { ApprovalQueueSchema, type ApprovalItem } from "@/schemas/approvals";

let cached: ApprovalItem[] | null = null;

export function getApprovalQueue(): ApprovalItem[] {
  if (!cached) {
    cached = ApprovalQueueSchema.parse(approvalsFixture);
  }
  return cached;
}

/** Test helper — clear cache between tests if fixture is mutated. */
export function resetApprovalQueueCache(): void {
  cached = null;
}
