import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { ApprovalsAssistant } from "@/components/ApprovalsAssistant/ApprovalsAssistant";
import { useAssistantStore } from "@/store/assistantStore";

function resetStore() {
  useAssistantStore.setState({
    open: true,
    mode: "idle",
    sessionId: "vitest-session",
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
  });
}

function summaryButton() {
  return screen.getAllByRole("button", { name: /Present me Summary/i })[0];
}

describe("ApprovalsAssistant panel", () => {
  beforeEach(() => {
    resetStore();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows loading state while the queue is fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );

    render(<ApprovalsAssistant />);
    expect(screen.getByText(/Loading queue/i)).toBeInTheDocument();
  });

  it("renders streaming indicator while summary is in flight", async () => {
    let resolveSummary: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/approvals")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/api/ai/summary")) {
        return new Promise<Response>((resolve) => {
          resolveSummary = resolve;
        });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ApprovalsAssistant />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading queue/i)).not.toBeInTheDocument();
    });

    fireEvent.click(summaryButton());

    await waitFor(() => {
      expect(screen.getByTestId("streaming-indicator")).toBeInTheDocument();
    });

    resolveSummary?.(
      new Response(
        JSON.stringify({
          spokenSummary: "Queue is clear.",
          pendingCount: 0,
          prioritized: [],
          staleHints: [],
          source: "llm",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await waitFor(() => {
      expect(screen.getByText(/Queue is clear/i)).toBeInTheDocument();
    });
  });

  it("surfaces an error state when the AI request fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/approvals")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.includes("/api/ai/summary")) {
        return new Response("boom", { status: 503 });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ApprovalsAssistant />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading queue/i)).not.toBeInTheDocument();
    });

    fireEvent.click(summaryButton());

    await waitFor(() => {
      expect(screen.getByTestId("assistant-error")).toBeInTheDocument();
    });
  });
});
