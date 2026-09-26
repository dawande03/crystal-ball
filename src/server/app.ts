import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { getApprovalQueue } from "@/lib/queue";
import { checkRateLimit } from "@/lib/rateLimit";
import { generateSummary } from "@/lib/handlers/summary";
import { generateGreeting } from "@/lib/handlers/greeting";
import { generateChatReply } from "@/lib/handlers/chat";
import { generateHelpAnswer } from "@/lib/handlers/help";
import { generateTeachLesson } from "@/lib/handlers/teach";
import {
  ChatRequestSchema,
  HelpRequestSchema,
  TeachRequestSchema,
} from "@/schemas/ai";
import { asyncHandler, createSseWriter } from "./sse";

function sessionKey(req: Request): string {
  const header = req.header("x-session-id");
  if (header && header.trim()) return header.trim();
  return req.ip || "anonymous";
}

function sessionThrottle(req: Request, res: Response, next: NextFunction): void {
  const result = checkRateLimit(sessionKey(req));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  if (!result.allowed) {
    res.status(429).json({
      error: "Too many AI requests for this session. Please wait a moment.",
      retryAfterMs: result.retryAfterMs,
    });
    return;
  }
  next();
}

/** Shared Express app — used by the API server and Supertest integration tests. */
export function createApp(): Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "32kb" }));

  // Coarse IP limiter (assignment: present and explained — not production-grade)
  const ipLimiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests from this IP." },
  });
  app.use("/api/ai", ipLimiter);
  app.use("/api/ai", sessionThrottle);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/approvals", (_req, res) => {
    res.json(getApprovalQueue());
  });

  app.post(
    "/api/ai/summary",
    asyncHandler(async (_req, res) => {
      const queue = getApprovalQueue();
      const summary = await generateSummary(queue);
      res.json(summary);
    }),
  );

  app.post(
    "/api/ai/greeting",
    asyncHandler(async (_req, res) => {
      const queue = getApprovalQueue();
      const greeting = await generateGreeting(queue);
      res.json(greeting);
    }),
  );

  app.post(
    "/api/ai/chat",
    asyncHandler(async (req, res) => {
      const body = ChatRequestSchema.parse(req.body);
      const queue = getApprovalQueue();
      const sse = createSseWriter(res);
      const result = await generateChatReply({
        queue,
        message: body.message,
        history: body.history,
        onToken: (token) => sse.writeToken(token),
      });
      sse.writeEvent("result", result);
      sse.end();
    }),
  );

  app.post(
    "/api/ai/help",
    asyncHandler(async (req, res) => {
      const body = HelpRequestSchema.parse(req.body);
      const sse = createSseWriter(res);
      const result = await generateHelpAnswer({
        question: body.question,
        onToken: (token) => sse.writeToken(token),
      });
      sse.writeEvent("result", result);
      sse.end();
    }),
  );

  app.post(
    "/api/ai/teach",
    asyncHandler(async (req, res) => {
      const body = TeachRequestSchema.parse(req.body);
      const sse = createSseWriter(res);
      const result = await generateTeachLesson({
        message: body.message,
        step: body.step,
        history: body.history,
        onToken: (token) => sse.writeToken(token),
      });
      sse.writeEvent("result", result);
      sse.end();
    }),
  );

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err && typeof err === "object" && "name" in err && err.name === "ZodError") {
      res.status(400).json({ error: "Invalid request", details: err });
      return;
    }
    console.error(err);
    // Never surface raw 500 for AI stalls — graceful JSON degradation envelope
    res.status(200).json({
      error: "Something went wrong handling the AI request.",
      source: "fallback",
      reply: "The assistant hit an unexpected error. Please retry, or use the queue list manually.",
    });
  });

  return app;
}
