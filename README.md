# Crystal Ball Command Centre — Approvals Assistant

Wave 2 take-home: an Approvals assistant panel (UI → Express API → Claude → tests) matching the OomniEye-style workflow widget.

## Stack

| Layer | Choice |
|--------|--------|
| Frontend | React 19 + Next.js 15 (App Router), Zustand |
| Backend | **Express + TypeScript** (Next.js rewrites `/api/*` → API). Lightweight substitute for a separate MERN API host — same handlers are exercised by Supertest. |
| LLM | Anthropic Claude (server-side only) |
| Validation | Zod schemas (`src/schemas/*`) + hand-written OpenAPI contract |
| RAG | In-memory keyword retrieval over 5 policy chunks (`src/lib/rag.ts`) |
| Tests | Jest unit + Supertest integration + Vitest/Testing Library component |

## Setup

```bash
cp .env.example .env.local
# set ANTHROPIC_API_KEY=sk-ant-...
npm install
npm run dev
```

- Web: http://localhost:3000  
- API: http://localhost:4000  

Without an API key, every AI action still works via **deterministic fallbacks** (urgency-sorted queue / policy retrieval hints) so the UI never freezes.

```bash
npm test
```

## Five actions

1. **Present me Summary** — structured JSON summary (Zod-validated), prioritised by urgency  
2. **Talk to me** — multi-turn SSE chat about the seeded queue  
3. **Help me** — policy-grounded RAG answer with citations  
4. **Teach me** — adaptive walkthrough (follow-ups supported)  
5. **Replay Greeting** — regenerated context-aware greeting (not a fixed string)

Prompts live in versioned exports under `src/prompts/*.ts`.

## AI judgment (README requirement)

**AI-necessary:** Summary wording & prioritisation rationale, free-form Talk/Teach dialogue, Help answers that synthesise policy chunks into operator language, and Replay Greeting (must vary with live queue context). These need judgment, paraphrase, and multi-turn adaptation that templates alone handle poorly.

**AI-unnecessary (and fallback when LLM fails):** Sorting the queue by urgency/time, counting pending items, retrieving policy chunks by keyword overlap, and emitting the five static teach steps. Those are deterministic; the UI can stay useful without a model.

**Fallback design:** Every LLM call has an **8s timeout**. Timeouts, missing keys, empty/invalid model output, or Zod parse failures return `source: "fallback"` payloads (never a raw 500 / frozen spinner). Streaming endpoints still emit tokens from the fallback text so the panel keeps moving. Rate limiting: `express-rate-limit` per IP plus a per-`x-session-id` in-memory throttle (20/min) on `/api/ai/*`.

**With more time:** real embeddings + pgvector for Help me, persisted conversation sessions, and OpenAPI-generated client types from the Zod schemas.

## Project map

```
src/data/          approvals fixture + policy note/chunks
src/prompts/       versioned prompt modules
src/schemas/       Zod + OpenAPI contract
src/lib/handlers/  AI decision layer (mocked in unit tests)
src/server/        Express app (Supertest target)
src/components/    Approvals assistant panel
tests/             unit / integration / component
```
