import { TEACH_PROMPT_V1 } from "@/prompts/teach.v1";
import { TeachResponseSchema, type TeachResponse } from "@/schemas/ai";
import type { z } from "zod";
import type { ChatMessageSchema } from "@/schemas/ai";
import { buildFallbackTeach } from "@/lib/fallbacks";
import { streamText, LlmTimeoutError, LlmUnavailableError } from "@/lib/llm/client";

type ChatMessage = z.infer<typeof ChatMessageSchema>;

export async function generateTeachLesson(params: {
  message?: string;
  step?: number;
  history: ChatMessage[];
  onToken?: (token: string) => void;
  client?: Parameters<typeof streamText>[0]["client"];
  timeoutMs?: number;
}): Promise<TeachResponse> {
  const step = params.step ?? 0;
  const totalSteps = TEACH_PROMPT_V1.steps.length;
  const currentStep = Math.min(Math.max(step, 0), totalSteps - 1);

  try {
    const lesson = await streamText({
      system: `${TEACH_PROMPT_V1.system}\nCanonical steps:\n${TEACH_PROMPT_V1.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      messages: [
        ...params.history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        {
          role: "user" as const,
          content:
            params.message?.trim() ||
            `Start or continue the walkthrough at step ${currentStep + 1}.`,
        },
      ],
      onToken: params.onToken,
      client: params.client,
      timeoutMs: params.timeoutMs,
      maxTokens: 600,
    });

    return TeachResponseSchema.parse({
      lesson,
      currentStep,
      totalSteps,
      nextHint:
        currentStep < totalSteps - 1
          ? TEACH_PROMPT_V1.steps[currentStep + 1]
          : undefined,
      source: "llm",
    });
  } catch (err) {
    if (
      err instanceof LlmTimeoutError ||
      err instanceof LlmUnavailableError ||
      err instanceof Error
    ) {
      const fallback = buildFallbackTeach(currentStep);
      params.onToken?.(fallback.lesson);
      return fallback;
    }
    const fallback = buildFallbackTeach(currentStep);
    params.onToken?.(fallback.lesson);
    return fallback;
  }
}
