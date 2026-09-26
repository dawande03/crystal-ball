import { HELP_PROMPT_V1 } from "@/prompts/help.v1";
import { HelpResponseSchema, type HelpResponse } from "@/schemas/ai";
import { buildFallbackHelp } from "@/lib/fallbacks";
import { formatChunksForPrompt, retrievePolicyChunks } from "@/lib/rag";
import { streamText, LlmTimeoutError, LlmUnavailableError } from "@/lib/llm/client";

export async function generateHelpAnswer(params: {
  question: string;
  onToken?: (token: string) => void;
  client?: Parameters<typeof streamText>[0]["client"];
  timeoutMs?: number;
}): Promise<HelpResponse> {
  const chunks = retrievePolicyChunks(params.question, 3);
  const citations = chunks.map((c) => ({ chunkId: c.id, title: c.title }));

  try {
    const answer = await streamText({
      system: HELP_PROMPT_V1.system,
      messages: [
        {
          role: "user",
          content: `Policy excerpts:\n${formatChunksForPrompt(chunks)}\n\nOperator question: ${params.question}`,
        },
      ],
      onToken: params.onToken,
      client: params.client,
      timeoutMs: params.timeoutMs,
      maxTokens: 600,
    });

    return HelpResponseSchema.parse({
      answer,
      citations,
      source: "llm",
    });
  } catch (err) {
    if (
      err instanceof LlmTimeoutError ||
      err instanceof LlmUnavailableError ||
      err instanceof Error
    ) {
      const fallback = buildFallbackHelp(params.question, citations);
      params.onToken?.(fallback.answer);
      return fallback;
    }
    const fallback = buildFallbackHelp(params.question, citations);
    params.onToken?.(fallback.answer);
    return fallback;
  }
}
