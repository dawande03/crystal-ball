import request from "supertest";
import { createApp } from "@/server/app";
import { resetRateLimits } from "@/lib/rateLimit";
import * as llm from "@/lib/llm/client";

jest.mock("@/lib/llm/client", () => {
  const actual = jest.requireActual("@/lib/llm/client");
  return {
    ...actual,
    completeText: jest.fn(),
    streamText: jest.fn(),
  };
});

const mockedComplete = llm.completeText as jest.MockedFunction<typeof llm.completeText>;

describe("POST /api/ai/summary", () => {
  beforeEach(() => {
    resetRateLimits();
    mockedComplete.mockReset();
  });

  it("success path: returns Zod-validated structured summary from LLM", async () => {
    mockedComplete.mockResolvedValue(
      JSON.stringify({
        spokenSummary: "Four approvals pending. Start with safety and onboarding.",
        pendingCount: 4,
        prioritized: [
          {
            id: "apr-001",
            title: "Site Patrol Onboarding & Checklists",
            urgency: "high",
            reason: "Onboarding blocks activation",
          },
          {
            id: "apr-003",
            title: "Safety Equipment & Sensor Specs",
            urgency: "high",
            reason: "Safety specs first",
          },
          {
            id: "apr-002",
            title: "Level 2 Drone Patrol Video",
            urgency: "medium",
            reason: "Demo video",
          },
          {
            id: "apr-004",
            title: "360° Spatial Zone Layout & Camera Map",
            urgency: "low",
            reason: "Layout map",
          },
        ],
        staleHints: [],
      }),
    );

    const app = createApp();
    const res = await request(app)
      .post("/api/ai/summary")
      .set("x-session-id", "test-success")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("llm");
    expect(res.body.pendingCount).toBe(4);
    expect(res.body.prioritized).toHaveLength(4);
    expect(res.body.spokenSummary).toMatch(/pending/i);
  });

  it("fallback/timeout path: never returns a raw 500 when the LLM stalls", async () => {
    mockedComplete.mockImplementation(async () => {
      throw new llm.LlmTimeoutError();
    });

    const app = createApp();
    const res = await request(app)
      .post("/api/ai/summary")
      .set("x-session-id", "test-timeout")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("fallback");
    expect(res.body.pendingCount).toBe(4);
    expect(typeof res.body.spokenSummary).toBe("string");
    expect(res.body.spokenSummary.length).toBeGreaterThan(0);
  });
});
