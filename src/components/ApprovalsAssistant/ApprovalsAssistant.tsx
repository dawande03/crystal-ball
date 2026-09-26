"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ActionCard } from "./ActionCard";
import { useAssistantStore } from "@/store/assistantStore";
import { apiHeaders, readSseStream } from "@/lib/sseClient";
import type { ApprovalItem } from "@/schemas/approvals";
import type {
  GreetingResponse,
  HelpResponse,
  SummaryResponse,
  TeachResponse,
} from "@/schemas/ai";

function uid(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ApprovalsAssistant() {
  const {
    open,
    setOpen,
    mode,
    setMode,
    sessionId,
    queue,
    setQueue,
    queueLoading,
    setQueueLoading,
    queueError,
    setQueueError,
    turns,
    appendTurn,
    updateTurn,
    streaming,
    setStreaming,
    error,
    setError,
    summary,
    setSummary,
    greeting,
    setGreeting,
    teach,
    setTeach,
    help,
    setHelp,
    clearConversation,
  } = useAssistantStore();

  const [input, setInput] = useState("");
  const [composerMode, setComposerMode] = useState<"chat" | "help" | "teach" | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadQueue() {
      setQueueLoading(true);
      setQueueError(null);
      try {
        const res = await fetch("/api/approvals");
        if (!res.ok) throw new Error("Failed to load approvals");
        const data = (await res.json()) as ApprovalItem[];
        if (!cancelled) setQueue(data);
      } catch (e) {
        if (!cancelled) {
          setQueueError(e instanceof Error ? e.message : "Queue load failed");
        }
      } finally {
        if (!cancelled) setQueueLoading(false);
      }
    }
    void loadQueue();
    return () => {
      cancelled = true;
    };
  }, [setQueue, setQueueError, setQueueLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, streaming, summary, greeting]);

  async function runSummary() {
    setMode("summary");
    setComposerMode(null);
    setError(null);
    setStreaming(true);
    const assistantId = uid();
    appendTurn({
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    });
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: apiHeaders(sessionId),
      });
      if (res.status === 429) {
        throw new Error("Rate limited — wait a moment and try again.");
      }
      const data = (await res.json()) as SummaryResponse;
      setSummary(data);
      updateTurn(assistantId, {
        content: data.spokenSummary,
        streaming: false,
        source: data.source,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Summary failed";
      setError(msg);
      updateTurn(assistantId, {
        content: msg,
        streaming: false,
        source: "fallback",
      });
    } finally {
      setStreaming(false);
    }
  }

  async function runGreeting() {
    setMode("greeting");
    setComposerMode(null);
    setError(null);
    setStreaming(true);
    const assistantId = uid();
    appendTurn({
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    });
    try {
      const res = await fetch("/api/ai/greeting", {
        method: "POST",
        headers: apiHeaders(sessionId),
      });
      if (res.status === 429) {
        throw new Error("Rate limited — wait a moment and try again.");
      }
      const data = (await res.json()) as GreetingResponse;
      setGreeting(data);
      updateTurn(assistantId, {
        content: data.greeting,
        streaming: false,
        source: data.source,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Greeting failed";
      setError(msg);
      updateTurn(assistantId, {
        content: msg,
        streaming: false,
        source: "fallback",
      });
    } finally {
      setStreaming(false);
    }
  }

  async function runStreamedAction(
    endpoint: "/api/ai/chat" | "/api/ai/help" | "/api/ai/teach",
    body: Record<string, unknown>,
    nextMode: "chat" | "help" | "teach",
    userText: string,
  ) {
    setMode(nextMode);
    setError(null);
    setStreaming(true);

    const userId = uid();
    const assistantId = uid();
    appendTurn({ id: userId, role: "user", content: userText });
    appendTurn({
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    });

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: apiHeaders(sessionId),
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        throw new Error("Rate limited — wait a moment and try again.");
      }

      let assembled = "";
      await readSseStream(res, {
        onToken: (token) => {
          assembled += token;
          updateTurn(assistantId, { content: assembled, streaming: true });
        },
        onResult: (data) => {
          const result = data as {
            reply?: string;
            answer?: string;
            lesson?: string;
            source?: "llm" | "fallback";
          } & Partial<HelpResponse> &
            Partial<TeachResponse>;

          const finalText =
            result.reply ?? result.answer ?? result.lesson ?? assembled;
          updateTurn(assistantId, {
            content: finalText,
            streaming: false,
            source: result.source,
          });
          if ("citations" in result && result.citations) {
            setHelp(result as HelpResponse);
          }
          if ("currentStep" in result && typeof result.currentStep === "number") {
            setTeach(result as TeachResponse);
          }
        },
        onError: (message) => setError(message),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setError(msg);
      updateTurn(assistantId, {
        content: msg,
        streaming: false,
        source: "fallback",
      });
    } finally {
      setStreaming(false);
    }
  }

  function startTalk() {
    setComposerMode("chat");
    setMode("chat");
    setError(null);
    if (!turns.some((t) => t.role === "system" && t.content.includes("Talk"))) {
      appendTurn({
        id: uid(),
        role: "system",
        content: "Talk to me — ask anything about the pending approvals queue.",
      });
    }
  }

  function startHelp() {
    setComposerMode("help");
    setMode("help");
    setError(null);
    appendTurn({
      id: uid(),
      role: "system",
      content: "Help me — ask an operational question grounded in the approval policy.",
    });
  }

  function startTeach() {
    setComposerMode("teach");
    setMode("teach");
    setError(null);
    void runStreamedAction(
      "/api/ai/teach",
      {
        message: "Start the approvals walkthrough from step 1.",
        step: 0,
        history: [],
      },
      "teach",
      "Start teaching me how to review an approval.",
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !composerMode || streaming) return;
    setInput("");

    const history = turns
      .filter((t) => t.role === "user" || t.role === "assistant")
      .map((t) => ({ role: t.role as "user" | "assistant", content: t.content }));

    if (composerMode === "chat") {
      await runStreamedAction(
        "/api/ai/chat",
        { message: text, history },
        "chat",
        text,
      );
    } else if (composerMode === "help") {
      await runStreamedAction("/api/ai/help", { question: text }, "help", text);
    } else {
      await runStreamedAction(
        "/api/ai/teach",
        {
          message: text,
          step: (teach?.currentStep ?? 0) + 1,
          history,
        },
        "teach",
        text,
      );
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-900/40"
      >
        Open Approvals Assistant
      </button>
    );
  }

  return (
    <aside
      data-testid="approvals-assistant"
      className="fixed bottom-4 right-4 z-50 flex h-[min(640px,88vh)] w-[min(400px,94vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220]/95 shadow-2xl shadow-black/50 backdrop-blur"
    >
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-teal-700">
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-950">
            CB
          </span>
          <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b1220] bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-50">
            Approvals Assistant
          </p>
          <p className="truncate text-xs text-slate-400">
            Crystal Ball · {queueLoading ? "Loading queue…" : `${queue.length} pending`}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close assistant"
          onClick={() => setOpen(false)}
          className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
        >
          ✕
        </button>
      </header>

      <div className="grid gap-2 border-b border-white/10 p-3 sm:grid-cols-1">
        <ActionCard
          icon="Σ"
          title="Present me Summary"
          subtitle="Prioritised spoken summary of the queue"
          disabled={streaming}
          active={mode === "summary"}
          onClick={() => void runSummary()}
        />
        <ActionCard
          icon="◎"
          title="Talk to me"
          subtitle="Multi-turn chat about pending approvals"
          disabled={streaming}
          active={mode === "chat"}
          onClick={startTalk}
        />
        <ActionCard
          icon="?"
          title="Help me"
          subtitle="Answers grounded in approval policy"
          disabled={streaming}
          active={mode === "help"}
          onClick={startHelp}
        />
        <ActionCard
          icon="▸"
          title="Teach me"
          subtitle="Step-by-step review walkthrough"
          disabled={streaming}
          active={mode === "teach"}
          onClick={startTeach}
        />
        <ActionCard
          icon="↻"
          title="Replay Greeting"
          subtitle="Fresh context-aware welcome"
          disabled={streaming}
          active={mode === "greeting"}
          onClick={() => void runGreeting()}
        />
      </div>

      <div
        data-testid="assistant-transcript"
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
      >
        {queueError && (
          <p
            data-testid="assistant-error"
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
          >
            {queueError}
          </p>
        )}
        {error && (
          <p
            data-testid="assistant-error"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
          >
            {error}
          </p>
        )}
        {greeting && (
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Greeting tone: {greeting.tone} · source {greeting.source}
          </p>
        )}
        {summary && (
          <ul className="space-y-1 rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-slate-300">
            {summary.prioritized.map((item) => (
              <li key={item.id}>
                <span className="font-medium text-cyan-300">{item.urgency}</span>{" "}
                — {item.title}
              </li>
            ))}
          </ul>
        )}
        {help?.citations?.length ? (
          <p className="text-[10px] text-slate-500">
            Citations: {help.citations.map((c) => c.title).join(" · ")}
          </p>
        ) : null}
        {turns.length === 0 && !streaming && (
          <p className="text-sm text-slate-400">
            Choose an action above. Responses stream token-by-token from the AI layer.
          </p>
        )}
        {turns.map((turn) => (
          <div
            key={turn.id}
            data-testid={turn.streaming ? "streaming-message" : "message"}
            className={[
              "rounded-xl px-3 py-2 text-sm leading-relaxed",
              turn.role === "user"
                ? "ml-6 bg-cyan-500/20 text-cyan-50"
                : turn.role === "system"
                  ? "border border-dashed border-white/15 text-xs text-slate-400"
                  : "mr-4 bg-white/5 text-slate-100",
            ].join(" ")}
          >
            {turn.content || (turn.streaming ? "…" : "")}
            {turn.streaming && (
              <span
                data-testid="streaming-indicator"
                className="ml-1 inline-block h-3 w-1 animate-pulse bg-cyan-300 align-middle"
              />
            )}
            {turn.source === "fallback" && !turn.streaming && (
              <span className="mt-1 block text-[10px] uppercase tracking-wide text-amber-300/80">
                Fallback
              </span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t border-white/10 p-3"
      >
        <div className="flex gap-2">
          <input
            data-testid="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!composerMode || streaming}
            placeholder={
              composerMode
                ? composerMode === "help"
                  ? "Ask a policy question…"
                  : composerMode === "teach"
                    ? "Ask a follow-up…"
                    : "Ask about the queue…"
                : "Select Talk / Help / Teach to type"
            }
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
          />
          <button
            type="submit"
            disabled={!composerMode || streaming || !input.trim()}
            className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <button
          type="button"
          onClick={clearConversation}
          className="mt-2 text-[11px] text-slate-500 hover:text-slate-300"
        >
          Clear conversation
        </button>
      </form>
    </aside>
  );
}
