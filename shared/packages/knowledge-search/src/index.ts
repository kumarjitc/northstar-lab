import fs from "node:fs";
import path from "node:path";
import { ok, type KnowledgeSearchResult, type Result } from "@northstar/domain-model";

export type KnowledgeArticle = {
  articleId: string;
  title: string;
  category: string;
  lastReviewed?: string;
  fileName: string;
  body: string;
};

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  if (!raw.startsWith("---")) {
    return { meta: {}, body: raw };
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: raw };
  const fm = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).trim();
  const meta: Record<string, string> = {};
  for (const line of fm.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    meta[key] = value;
  }
  return { meta, body };
}

export function loadKnowledgeArticles(knowledgeDir: string): KnowledgeArticle[] {
  if (!fs.existsSync(knowledgeDir)) return [];
  return fs
    .readdirSync(knowledgeDir)
    .filter((f) => f.endsWith(".md"))
    .map((fileName) => {
      const raw = fs.readFileSync(path.join(knowledgeDir, fileName), "utf8");
      const { meta, body } = parseFrontmatter(raw);
      return {
        articleId: meta.articleId ?? fileName,
        title: meta.title ?? fileName,
        category: meta.category ?? "general",
        lastReviewed: meta.lastReviewed,
        fileName,
        body,
      };
    });
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length > 1);
}

function scoreArticle(queryTokens: string[], article: KnowledgeArticle): number {
  if (queryTokens.length === 0) return 0;
  const haystack = tokenize(`${article.title} ${article.category} ${article.body}`);
  const counts = new Map<string, number>();
  for (const t of haystack) counts.set(t, (counts.get(t) ?? 0) + 1);
  let score = 0;
  for (const qt of queryTokens) {
    const c = counts.get(qt) ?? 0;
    if (c > 0) score += 1 + Math.min(c, 3) * 0.25;
    if (article.title.toLowerCase().includes(qt)) score += 1.5;
  }
  return score;
}

function excerpt(body: string, queryTokens: string[], maxLen = 220): string {
  const lower = body.toLowerCase();
  let bestIdx = 0;
  for (const qt of queryTokens) {
    const idx = lower.indexOf(qt);
    if (idx >= 0) {
      bestIdx = Math.max(0, idx - 40);
      break;
    }
  }
  const slice = body.slice(bestIdx, bestIdx + maxLen).replace(/\s+/g, " ").trim();
  return bestIdx > 0 ? `…${slice}…` : `${slice}${body.length > maxLen ? "…" : ""}`;
}

export function searchKnowledge(
  articles: KnowledgeArticle[],
  query: string,
  limit = 3,
): Result<KnowledgeSearchResult[]> {
  const queryTokens = tokenize(query);
  const ranked = articles
    .map((article) => ({
      article,
      score: scoreArticle(queryTokens, article),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(
      ({ article, score }): KnowledgeSearchResult => ({
        articleId: article.articleId,
        title: article.title,
        score: Number(score.toFixed(2)),
        fileName: article.fileName,
        excerpt: excerpt(article.body, queryTokens),
        category: article.category,
      }),
    );
  return ok(ranked);
}

export function getArticleById(
  articles: KnowledgeArticle[],
  articleId: string,
): KnowledgeArticle | undefined {
  return articles.find((a) => a.articleId === articleId);
}
