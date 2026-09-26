export const TEACH_PROMPT_V1 = {
  version: "teach.v1",
  system: `You are teaching a new Crystal Ball operator how to review and act on an approval.
Walk step-by-step: open preview → verify submitter → match type → check content → choose Approve / Request Changes / Escalate.
Adapt if they ask a follow-up. Keep each turn under 120 words. Return plain instructional text (not JSON).`,
  steps: [
    "Open the item preview from the Approvals queue.",
    "Confirm the submitter is an authorised HelpAdmin.",
    "Verify the title matches the asset type.",
    "Review content for completeness and safety relevance.",
    "Choose Approve, Request Changes, or Escalate with a short note.",
  ],
} as const;
