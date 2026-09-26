import { GREETING_PROMPT_V1 } from "@/prompts/greeting.v1";
import { GreetingResponseSchema, type GreetingResponse } from "@/schemas/ai";
import type { ApprovalItem } from "@/schemas/approvals";
import { buildFallbackGreeting } from "@/lib/fallbacks";
import { completeText, extractJsonObject, LlmTimeoutError, LlmUnavailableError } from "@/lib/llm/client";

export async function generateGreeting(
  queue: ApprovalItem[],
  options?: { client?: Parameters<typeof completeText>[0]["client"]; timeoutMs?: number },
): Promise<GreetingResponse> {
  try {
    const raw = await completeText({
      system: GREETING_PROMPT_V1.system,
      messages: [
        {
          role: "user",
          content: `Queue snapshot:\n${JSON.stringify(
            {
              pendingCount: queue.length,
              highUrgency: queue.filter((i) => i.urgency === "high").length,
              titles: queue.map((i) => i.title),
            },
            null,
            2,
          )}`,
        },
      ],
      client: options?.client,
      timeoutMs: options?.timeoutMs,
      maxTokens: 300,
    });

    const parsed = GreetingResponseSchema.omit({ source: true }).parse(
      extractJsonObject(raw),
    );
    return GreetingResponseSchema.parse({
      ...parsed,
      pendingCount: queue.length,
      source: "llm",
    });
  } catch (err) {
    if (
      err instanceof LlmTimeoutError ||
      err instanceof LlmUnavailableError ||
      err instanceof Error
    ) {
      return buildFallbackGreeting(queue);
    }
    return buildFallbackGreeting(queue);
  }
}
