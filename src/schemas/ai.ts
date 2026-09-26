import { z } from "zod";
import { UrgencySchema } from "./approvals";

/** Structured summary returned by Present me Summary */
export const SummaryItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  urgency: UrgencySchema,
  reason: z.string().min(1),
});

export const SummaryResponseSchema = z.object({
  spokenSummary: z.string().min(1),
  pendingCount: z.number().int().nonnegative(),
  prioritized: z.array(SummaryItemSchema).default([]),
  staleHints: z.array(z.string()).default([]),
  source: z.enum(["llm", "fallback"]),
});

export const GreetingResponseSchema = z.object({
  greeting: z.string().min(1),
  pendingCount: z.number().int().nonnegative(),
  tone: z.enum(["calm", "urgent", "neutral"]),
  source: z.enum(["llm", "fallback"]),
});

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(ChatMessageSchema).max(20).default([]),
  sessionId: z.string().min(1).optional(),
});

export const ChatResponseSchema = z.object({
  reply: z.string().min(1),
  source: z.enum(["llm", "fallback"]),
});

export const HelpRequestSchema = z.object({
  question: z.string().min(1).max(2000),
  sessionId: z.string().min(1).optional(),
});

export const HelpResponseSchema = z.object({
  answer: z.string().min(1),
  citations: z.array(
    z.object({
      chunkId: z.string(),
      title: z.string(),
    }),
  ),
  source: z.enum(["llm", "fallback"]),
});

export const TeachRequestSchema = z.object({
  message: z.string().min(1).max(2000).optional(),
  step: z.number().int().nonnegative().optional(),
  history: z.array(ChatMessageSchema).max(20).default([]),
  sessionId: z.string().min(1).optional(),
});

export const TeachResponseSchema = z.object({
  lesson: z.string().min(1),
  currentStep: z.number().int().nonnegative(),
  totalSteps: z.number().int().positive(),
  nextHint: z.string().optional(),
  source: z.enum(["llm", "fallback"]),
});

export type SummaryResponse = z.infer<typeof SummaryResponseSchema>;
export type GreetingResponse = z.infer<typeof GreetingResponseSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type HelpRequest = z.infer<typeof HelpRequestSchema>;
export type HelpResponse = z.infer<typeof HelpResponseSchema>;
export type TeachRequest = z.infer<typeof TeachRequestSchema>;
export type TeachResponse = z.infer<typeof TeachResponseSchema>;
