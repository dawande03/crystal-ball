/**
 * Hand-written OpenAPI-first contract for Crystal Ball Approvals AI API.
 * Validated at runtime with Zod schemas in ./ai.ts and ./approvals.ts.
 */
export const openApiContract = {
  openapi: "3.0.3",
  info: {
    title: "Crystal Ball Approvals Assistant API",
    version: "1.0.0",
    description:
      "AI-backed endpoints for the Approvals assistant panel. Schemas are enforced with Zod before responses reach the UI.",
  },
  paths: {
    "/api/approvals": {
      get: {
        summary: "List pending approval queue",
        responses: {
          "200": { description: "ApprovalItem[]" },
        },
      },
    },
    "/api/ai/summary": {
      post: {
        summary: "Present me Summary — prioritized spoken summary",
        responses: {
          "200": { description: "SummaryResponse (Zod-validated JSON)" },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/api/ai/chat": {
      post: {
        summary: "Talk to me — multi-turn queue conversation (SSE stream)",
        requestBody: { description: "ChatRequest" },
        responses: {
          "200": { description: "text/event-stream token deltas + final ChatResponse" },
        },
      },
    },
    "/api/ai/help": {
      post: {
        summary: "Help me — policy-grounded RAG answer (SSE)",
        requestBody: { description: "HelpRequest" },
        responses: {
          "200": { description: "SSE + final HelpResponse with citations" },
        },
      },
    },
    "/api/ai/teach": {
      post: {
        summary: "Teach me — adaptive walkthrough (SSE)",
        requestBody: { description: "TeachRequest" },
        responses: {
          "200": { description: "SSE + final TeachResponse" },
        },
      },
    },
    "/api/ai/greeting": {
      post: {
        summary: "Replay Greeting — context-aware greeting",
        responses: {
          "200": { description: "GreetingResponse" },
        },
      },
    },
  },
} as const;
