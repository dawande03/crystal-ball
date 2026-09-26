import { retrievePolicyChunks } from "@/lib/rag";

describe("retrievePolicyChunks (RAG surface)", () => {
  it("returns safety/SLA chunks for an SLA question", () => {
    const chunks = retrievePolicyChunks(
      "What is the SLA for high urgency approvals?",
      2,
    );
    expect(chunks.length).toBeGreaterThan(0);
    expect(
      chunks.some(
        (c) =>
          /sla/i.test(c.title) ||
          /urgency/i.test(c.text) ||
          /4 hours/i.test(c.text),
      ),
    ).toBe(true);
  });

  it("still returns chunks when the query is empty (safe default)", () => {
    const chunks = retrievePolicyChunks("   ", 3);
    expect(chunks).toHaveLength(3);
  });
});
