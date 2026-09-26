import { SUMMARY_PROMPT_V1 } from "@/prompts/summary.v1";
import {
  SummaryResponseSchema,
  type SummaryResponse,
} from "@/schemas/ai";
import type { ApprovalItem } from "@/schemas/approvals";
import { buildFallbackSummary } from "@/lib/fallbacks";
import { completeText, extractJsonObject, LlmTimeoutError, LlmUnavailableError } from "@/lib/llm/client";

export async function generateSummary(
  queue: ApprovalItem[],
  options?: { client?: Parameters<typeof completeText>[0]["client"]; timeoutMs?: number },
): Promise<SummaryResponse> {
  if (!queue.length) {
    return buildFallbackSummary(queue);
  }

  try {
    const raw = await completeText({
      system: SUMMARY_PROMPT_V1.system,
      messages: [
        {
          role: "user",
          content: `Pending approvals queue JSON:\n${JSON.stringify(queue, null, 2)}`,
        },
      ],
      client: options?.client,
      timeoutMs: options?.timeoutMs,
      maxTokens: 900,
    });

    const parsed = SummaryResponseSchema.omit({ source: true }).parse(
      extractJsonObject(raw),
    );

    return SummaryResponseSchema.parse({ ...parsed, source: "llm" });
  } catch (err) {
    if (
      err instanceof LlmTimeoutError ||
      err instanceof LlmUnavailableError ||
      err instanceof Error
    ) {
      return buildFallbackSummary(queue);
    }
    return buildFallbackSummary(queue);
  }
}
