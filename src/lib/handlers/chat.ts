import { CHAT_PROMPT_V1 } from "@/prompts/chat.v1";
import type { ApprovalItem } from "@/schemas/approvals";
import type { ChatMessageSchema } from "@/schemas/ai";
import type { z } from "zod";
import { buildFallbackChat } from "@/lib/fallbacks";
import { streamText, LlmTimeoutError, LlmUnavailableError } from "@/lib/llm/client";

type ChatMessage = z.infer<typeof ChatMessageSchema>;

export async function generateChatReply(params: {
  queue: ApprovalItem[];
  message: string;
  history: ChatMessage[];
  onToken?: (token: string) => void;
  client?: Parameters<typeof streamText>[0]["client"];
  timeoutMs?: number;
}): Promise<{ reply: string; source: "llm" | "fallback" }> {
  try {
    const history = params.history.slice(-10);
    const reply = await streamText({
      system: `${CHAT_PROMPT_V1.system}\n\nCurrent queue JSON:\n${JSON.stringify(params.queue)}`,
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: params.message },
      ],
      onToken: params.onToken,
      client: params.client,
      timeoutMs: params.timeoutMs,
      maxTokens: 700,
    });
    return { reply, source: "llm" };
  } catch (err) {
    if (
      err instanceof LlmTimeoutError ||
      err instanceof LlmUnavailableError ||
      err instanceof Error
    ) {
      const reply = buildFallbackChat(params.queue);
      params.onToken?.(reply);
      return { reply, source: "fallback" };
    }
    const reply = buildFallbackChat(params.queue);
    params.onToken?.(reply);
    return { reply, source: "fallback" };
  }
}
