import { generateSummary } from "@/lib/handlers/summary";
import type { ApprovalItem } from "@/schemas/approvals";
import { SummaryResponseSchema } from "@/schemas/ai";

const sampleQueue: ApprovalItem[] = [
  {
    id: "apr-001",
    title: "Site Patrol Onboarding & Checklists",
    type: "Folder",
    submittedBy: "Sam HelpAdmin",
    status: "Pending Review",
    submittedAt: "2025-09-18T09:15:00.000Z",
    urgency: "high",
    tags: ["onboarding"],
  },
  {
    id: "apr-002",
    title: "Level 2 Drone Patrol Video",
    type: "Demo Video",
    submittedBy: "Alex HelpAdmin",
    status: "Pending Review",
    submittedAt: "2025-09-18T11:42:00.000Z",
    urgency: "medium",
    tags: ["drone"],
  },
];

describe("generateSummary (prompt/response handler)", () => {
  it("validates structured LLM JSON before returning to callers", async () => {
    const mockClient = {
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                spokenSummary:
                  "Two items pending. Start with Site Patrol Onboarding — high urgency.",
                pendingCount: 2,
                prioritized: [
                  {
                    id: "apr-001",
                    title: "Site Patrol Onboarding & Checklists",
                    urgency: "high",
                    reason: "Safety/onboarding priority",
                  },
                  {
                    id: "apr-002",
                    title: "Level 2 Drone Patrol Video",
                    urgency: "medium",
                    reason: "Lower urgency video review",
                  },
                ],
                staleHints: [],
              }),
            },
          ],
        }),
      },
    };

    const result = await generateSummary(sampleQueue, {
      // @ts-expect-error partial Anthropic mock
      client: mockClient,
    });

    expect(SummaryResponseSchema.parse(result).source).toBe("llm");
    expect(result.pendingCount).toBe(2);
    expect(result.prioritized[0].id).toBe("apr-001");
    expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
  });

  it("rejects broken AI response shapes and falls back instead of leaking raw text", async () => {
    const mockClient = {
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: "here is a summary without json lol",
            },
          ],
        }),
      },
    };

    const result = await generateSummary(sampleQueue, {
      // @ts-expect-error partial Anthropic mock
      client: mockClient,
    });

    expect(result.source).toBe("fallback");
    expect(result.prioritized.length).toBe(2);
    expect(result.spokenSummary).toMatch(/pending approval/i);
  });
});
