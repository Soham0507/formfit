import { tools, type Tool } from "../data/catalog.js";

export interface MatchedLine {
  rawLine: string;
  tool: Tool | null;
  matchType: "exact" | "fuzzy" | "none";
  score: number; // 0..1, 1 = exact
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function similarity(a: string, b: string): number {
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length, 1);
  return 1 - dist / maxLen;
}

const FUZZY_THRESHOLD = 0.55;

export function parseToolListText(text: string): string[] {
  return text
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function matchLine(rawLine: string): MatchedLine {
  const normalized = rawLine.trim();

  const exactByPartNumber = tools.find(
    (t) => t.partNumber.toLowerCase() === normalized.toLowerCase()
  );
  if (exactByPartNumber) {
    return { rawLine, tool: exactByPartNumber, matchType: "exact", score: 1 };
  }

  const exactByName = tools.find((t) => t.name.toLowerCase() === normalized.toLowerCase());
  if (exactByName) {
    return { rawLine, tool: exactByName, matchType: "exact", score: 1 };
  }

  let best: Tool | null = null;
  let bestScore = 0;
  for (const t of tools) {
    const byName = similarity(normalized, t.name);
    const byPartNumber = similarity(normalized, t.partNumber);
    const score = Math.max(byName, byPartNumber);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  if (best && bestScore >= FUZZY_THRESHOLD) {
    return { rawLine, tool: best, matchType: "fuzzy", score: bestScore };
  }

  return { rawLine, tool: null, matchType: "none", score: bestScore };
}

export function matchToolList(text: string): MatchedLine[] {
  return parseToolListText(text).map(matchLine);
}
