"use client";

export async function readSseStream(
  response: Response,
  handlers: {
    onToken?: (token: string) => void;
    onResult?: (data: unknown) => void;
    onError?: (message: string) => void;
  },
): Promise<void> {
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split("\n");
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (event === "token" && typeof parsed.token === "string") {
          handlers.onToken?.(parsed.token);
        } else if (event === "result") {
          handlers.onResult?.(parsed);
        } else if (event === "error" && typeof parsed.error === "string") {
          handlers.onError?.(parsed.error);
        }
      } catch {
        // ignore malformed chunk
      }
    }
  }
}

export function apiHeaders(sessionId: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-session-id": sessionId,
  };
}
