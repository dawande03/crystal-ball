"use client";

import { create } from "zustand";
import type { ApprovalItem } from "@/schemas/approvals";
import type {
  GreetingResponse,
  HelpResponse,
  SummaryResponse,
  TeachResponse,
} from "@/schemas/ai";

export type AssistantMode =
  | "idle"
  | "summary"
  | "chat"
  | "help"
  | "teach"
  | "greeting";

export type ChatTurn = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
  source?: "llm" | "fallback";
};

type AssistantState = {
  open: boolean;
  mode: AssistantMode;
  sessionId: string;
  queue: ApprovalItem[];
  queueLoading: boolean;
  queueError: string | null;
  turns: ChatTurn[];
  streaming: boolean;
  error: string | null;
  summary: SummaryResponse | null;
  greeting: GreetingResponse | null;
  teach: TeachResponse | null;
  help: HelpResponse | null;
  setOpen: (open: boolean) => void;
  setMode: (mode: AssistantMode) => void;
  setQueue: (queue: ApprovalItem[]) => void;
  setQueueLoading: (v: boolean) => void;
  setQueueError: (e: string | null) => void;
  appendTurn: (turn: ChatTurn) => void;
  updateTurn: (id: string, patch: Partial<ChatTurn>) => void;
  setStreaming: (v: boolean) => void;
  setError: (e: string | null) => void;
  setSummary: (s: SummaryResponse | null) => void;
  setGreeting: (g: GreetingResponse | null) => void;
  setTeach: (t: TeachResponse | null) => void;
  setHelp: (h: HelpResponse | null) => void;
  clearConversation: () => void;
};

function makeSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}`;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  open: true,
  mode: "idle",
  sessionId: makeSessionId(),
  queue: [],
  queueLoading: false,
  queueError: null,
  turns: [],
  streaming: false,
  error: null,
  summary: null,
  greeting: null,
  teach: null,
  help: null,
  setOpen: (open) => set({ open }),
  setMode: (mode) => set({ mode }),
  setQueue: (queue) => set({ queue }),
  setQueueLoading: (queueLoading) => set({ queueLoading }),
  setQueueError: (queueError) => set({ queueError }),
  appendTurn: (turn) => set((s) => ({ turns: [...s.turns, turn] })),
  updateTurn: (id, patch) =>
    set((s) => ({
      turns: s.turns.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  setStreaming: (streaming) => set({ streaming }),
  setError: (error) => set({ error }),
  setSummary: (summary) => set({ summary }),
  setGreeting: (greeting) => set({ greeting }),
  setTeach: (teach) => set({ teach }),
  setHelp: (help) => set({ help }),
  clearConversation: () =>
    set({
      turns: [],
      error: null,
      summary: null,
      teach: null,
      help: null,
      mode: "idle",
    }),
}));
