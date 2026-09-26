import policyChunks from "@/data/policy-chunks.json";

export type PolicyChunk = {
  id: string;
  title: string;
  text: string;
};

const chunks = policyChunks as PolicyChunk[];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/** Simple keyword overlap retrieval — demonstrates RAG without a vector DB. */
export function retrievePolicyChunks(query: string, topK = 3): PolicyChunk[] {
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) return chunks.slice(0, topK);

  const scored = chunks.map((chunk) => {
    const titleTokens = tokenize(chunk.title);
    const bodyTokens = tokenize(chunk.text);
    let score = 0;
    for (const t of titleTokens) {
      if (qTokens.has(t)) score += 3;
    }
    for (const t of bodyTokens) {
      if (qTokens.has(t)) score += 1;
    }
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const positive = scored.filter((s) => s.score > 0);
  const selected = (positive.length ? positive : scored).slice(0, topK);
  return selected.map((s) => s.chunk);
}

export function formatChunksForPrompt(selected: PolicyChunk[]): string {
  return selected
    .map((c) => `[${c.id} | ${c.title}]\n${c.text}`)
    .join("\n\n");
}
