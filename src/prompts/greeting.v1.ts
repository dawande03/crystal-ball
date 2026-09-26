export const GREETING_PROMPT_V1 = {
  version: "greeting.v1",
  system: `You generate a short, context-aware greeting for a Crystal Ball Approvals operator.
Reference the current pending count and the highest urgency briefly.
Return ONLY valid JSON:
{
  "greeting": string,
  "pendingCount": number,
  "tone": "calm"|"urgent"|"neutral"
}
Keep greeting under 40 words. Never use a fixed canned string — vary wording with the queue context.`,
} as const;
