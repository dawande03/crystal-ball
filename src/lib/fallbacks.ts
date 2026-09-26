import type { ApprovalItem } from "@/schemas/approvals";
import type {
  GreetingResponse,
  HelpResponse,
  SummaryResponse,
  TeachResponse,
} from "@/schemas/ai";
import { TEACH_PROMPT_V1 } from "@/prompts/teach.v1";

const urgencyRank: Record<ApprovalItem["urgency"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortByUrgency(queue: ApprovalItem[]): ApprovalItem[] {
  return [...queue].sort((a, b) => {
    const u = urgencyRank[a.urgency] - urgencyRank[b.urgency];
    if (u !== 0) return u;
    return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
  });
}

export function buildFallbackSummary(queue: ApprovalItem[]): SummaryResponse {
  const prioritized = sortByUrgency(queue);
  const high = prioritized.filter((i) => i.urgency === "high");
  const spokenSummary =
    queue.length === 0
      ? "You have no pending approvals right now."
      : `You have ${queue.length} pending approval${queue.length === 1 ? "" : "s"}. ` +
        (high.length
          ? `Start with ${high.map((i) => i.title).join(" and ")}, marked high urgency.`
          : `Next up is ${prioritized[0].title}.`);

  return {
    spokenSummary,
    pendingCount: queue.length,
    prioritized: prioritized.map((item) => ({
      id: item.id,
      title: item.title,
      urgency: item.urgency,
      reason:
        item.urgency === "high"
          ? "High urgency — policy prioritises safety and onboarding first."
          : `Queued as ${item.urgency} urgency by submission order.`,
    })),
    staleHints:
      queue.length > 0
        ? ["AI unavailable — showing deterministic urgency ranking."]
        : [],
    source: "fallback",
  };
}

export function buildFallbackGreeting(queue: ApprovalItem[]): GreetingResponse {
  const high = queue.filter((i) => i.urgency === "high").length;
  return {
    greeting:
      queue.length === 0
        ? "Welcome back. Your approvals queue is clear."
        : `Welcome back. ${queue.length} item${queue.length === 1 ? "" : "s"} await review` +
          (high ? `, including ${high} high-urgency.` : "."),
    pendingCount: queue.length,
    tone: high > 0 ? "urgent" : queue.length > 0 ? "neutral" : "calm",
    source: "fallback",
  };
}

export function buildFallbackHelp(question: string, citations: HelpResponse["citations"]): HelpResponse {
  const top = citations[0];
  return {
    answer: top
      ? `Based on the approval policy (${top.title}): please review the referenced section for “${question.slice(0, 80)}”. AI is temporarily unavailable, so this is a retrieval-only hint.`
      : `I could not find a matching policy section for that question. Escalate to Shift Lead if needed. (AI unavailable.)`,
    citations,
    source: "fallback",
  };
}

export function buildFallbackTeach(step = 0): TeachResponse {
  const steps = TEACH_PROMPT_V1.steps;
  const currentStep = Math.min(Math.max(step, 0), steps.length - 1);
  return {
    lesson: `Step ${currentStep + 1} of ${steps.length}: ${steps[currentStep]}`,
    currentStep,
    totalSteps: steps.length,
    nextHint:
      currentStep < steps.length - 1
        ? `Next: ${steps[currentStep + 1]}`
        : "You have completed the walkthrough. Ask a follow-up anytime.",
    source: "fallback",
  };
}

export function buildFallbackChat(queue: ApprovalItem[]): string {
  const sorted = sortByUrgency(queue);
  if (!sorted.length) return "There are no pending approvals in the queue right now.";
  const first = sorted[0];
  return `AI is temporarily unavailable. Deterministic guidance: attend to “${first.title}” first (${first.urgency} urgency, submitted ${first.submittedAt.slice(0, 10)}).`;
}
