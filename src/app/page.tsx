"use client";

import { ApprovalsAssistant } from "@/components/ApprovalsAssistant/ApprovalsAssistant";
import approvals from "@/data/approvals.json";
import type { ApprovalItem } from "@/schemas/approvals";

const queue = approvals as ApprovalItem[];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#132238_0%,_#070b14_55%,_#05070d_100%)] text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">
          Crystal Ball Command Centre
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Approvals
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Pending review queue for digital-twin content. The assistant panel
          (lower right) mirrors the Wave 2 Approvals widget — each action hits a
          real LLM path with streaming, Zod validation, and graceful fallback.
        </p>

        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="grid grid-cols-[1.4fr_0.8fr_1fr_1fr] gap-3 border-b border-white/10 px-4 py-3 text-[11px] uppercase tracking-wide text-slate-500">
            <span>Item</span>
            <span>Type</span>
            <span>Submitted by</span>
            <span>Status</span>
          </div>
          {queue.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1.4fr_0.8fr_1fr_1fr] gap-3 border-b border-white/5 px-4 py-3 text-sm last:border-b-0"
            >
              <span className="font-medium text-slate-100">{item.title}</span>
              <span className="text-slate-400">{item.type}</span>
              <span className="text-slate-400">{item.submittedBy}</span>
              <span className="text-amber-200/90">
                {item.status} — {item.submittedAt.slice(5, 10)}
              </span>
            </div>
          ))}
        </section>
      </div>

      <ApprovalsAssistant />
    </main>
  );
}
