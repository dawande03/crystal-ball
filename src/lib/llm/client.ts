import Anthropic from "@anthropic-ai/sdk";

export const LLM_TIMEOUT_MS = 8_000;

export class LlmTimeoutError extends Error {
  constructor(message = "LLM call timed out") {
    super(message);
    this.name = "LlmTimeoutError";
  }
}

export class LlmUnavailableError extends Error {
  constructor(message = "LLM unavailable") {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

export type LlmMessage = {
  role: "user" | "assistant";
  content: string;
};

export type CompleteOptions = {
  system: string;
  messages: LlmMessage[];
  maxTokens?: number;
  timeoutMs?: number;
  /** Injected for tests */
  client?: Pick<Anthropic, "messages">;
};

export type StreamOptions = CompleteOptions & {
  onToken?: (token: string) => void;
};

function getClient(override?: CompleteOptions["client"]): Pick<Anthropic, "messages"> {
  if (override) return override;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new LlmUnavailableError("ANTHROPIC_API_KEY is not configured");
  }
  return new Anthropic({ apiKey });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new LlmTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Non-streaming completion with hard timeout. */
export async function completeText(options: CompleteOptions): Promise<string> {
  const client = getClient(options.client);
  const timeoutMs = options.timeoutMs ?? LLM_TIMEOUT_MS;

  const call = client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
    max_tokens: options.maxTokens ?? 1024,
    system: options.system,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const response = await withTimeout(call, timeoutMs);
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  if (!text.trim()) {
    throw new LlmUnavailableError("Empty LLM response");
  }
  return text;
}

/** Streaming completion; still aborts the whole call after timeoutMs. */
export async function streamText(options: StreamOptions): Promise<string> {
  const client = getClient(options.client);
  const timeoutMs = options.timeoutMs ?? LLM_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const stream = client.messages.stream(
      {
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
        max_tokens: options.maxTokens ?? 1024,
        system: options.system,
        messages: options.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      },
      { signal: controller.signal },
    );

    let full = "";
    stream.on("text", (token) => {
      full += token;
      options.onToken?.(token);
    });

    await stream.finalMessage();
    if (!full.trim()) {
      throw new LlmUnavailableError("Empty LLM stream");
    }
    return full;
  } catch (err) {
    if (controller.signal.aborted || (err as Error)?.name === "AbortError") {
      throw new LlmTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in model output");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
