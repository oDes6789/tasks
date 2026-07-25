/** Goal lines + per-goal progress, stored as JSON (with legacy text fallback). */

export interface GoalItem {
  text: string;
}

export interface ProgressItem {
  status: string;
  result: string;
  link: string;
}

export const PROGRESS_STATUS_OPTIONS = ["Done", "Doing", "Pending"] as const;

const NUMBERED_HEAD_RE = /^\s*(\d+)[\.\)]\s*(.*)$/;
const STATUS_BRACKET_RE = /^\[([^\]]*)\]\s*(.*)$/;
const RESULT_LINE_RE = /^result\s*:\s*(.*)$/i;
const LINK_LINE_RE = /^link\s*:\s*(.*)$/i;
const LINK_ONLY_RE = /^(?:link\s*:\s*)?(https?:\/\/\S+)\s*$/i;

function emptyProgressItem(): ProgressItem {
  return { status: "", result: "", link: "" };
}

function ensureCount(items: ProgressItem[], count: number): ProgressItem[] {
  const next = items.map((item) => ({ ...item }));
  while (next.length < count) next.push(emptyProgressItem());
  return next.slice(0, Math.max(count, 0));
}

function normalizeProgressItem(raw: unknown): ProgressItem {
  if (!raw || typeof raw !== "object") return emptyProgressItem();
  const obj = raw as Record<string, unknown>;
  return {
    status: String(obj.status ?? "").trim(),
    result: String(obj.result ?? "").trim(),
    link: String(obj.link ?? "").trim()
  };
}

function tryParseJson(raw: string): unknown | null {
  const text = raw.trim();
  if (!text || (text[0] !== "[" && text[0] !== "{")) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function parseGoalItems(goals: string): GoalItem[] {
  const raw = goals ?? "";
  const json = tryParseJson(raw);
  if (Array.isArray(json)) {
    return json
      .map((item) => {
        if (typeof item === "string") return { text: item.trim() };
        if (item && typeof item === "object" && "text" in item) {
          return { text: String((item as { text: unknown }).text ?? "").trim() };
        }
        return { text: "" };
      })
      .filter((item) => item.text);
  }

  // Only a new numbered line (1. / 2.) starts a goal.
  // Continuation lines (+ …, notes, blank-ish body) stay in the same goal.
  const items: GoalItem[] = [];
  let currentLines: string[] | null = null;

  for (const line of raw.split(/\r?\n/)) {
    const numbered = line.match(NUMBERED_HEAD_RE);
    if (numbered) {
      if (currentLines) {
        const text = currentLines.join("\n").trim();
        if (text) items.push({ text });
      }
      currentLines = [numbered[2] ?? ""];
      continue;
    }

    if (currentLines) {
      currentLines.push(line);
      continue;
    }

    if (line.trim()) {
      // Legacy free text before any "1." — start first goal.
      currentLines = [line.trim()];
    }
  }

  if (currentLines) {
    const text = currentLines.join("\n").trim();
    if (text) items.push({ text });
  }

  return items;
}

/** Numbered list; body lines under each number are kept as one goal. */
export function serializeGoalItems(items: GoalItem[]): string {
  return items
    .map((item) => item.text.replace(/\s+$/g, "").replace(/^\s+/g, ""))
    .filter(Boolean)
    .map((text, i) => {
      const lines = text.split(/\r?\n/);
      const firstRaw = lines[0] ?? "";
      const firstMatch = firstRaw.match(NUMBERED_HEAD_RE);
      const first = (firstMatch ? firstMatch[2] : firstRaw).trimEnd();
      const rest = lines.slice(1);
      return [`${i + 1}. ${first}`.trimEnd(), ...rest].join("\n");
    })
    .join("\n");
}

function parseProgressBlock(body: string): ProgressItem {
  const item = emptyProgressItem();
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return item;

  let first = lines[0];
  const statusMatch = first.match(STATUS_BRACKET_RE);
  if (statusMatch) {
    item.status = statusMatch[1].trim();
    first = statusMatch[2].trim();
  }

  const resultParts: string[] = [];
  if (first) {
    const asResult = first.match(RESULT_LINE_RE);
    const asLink = first.match(LINK_LINE_RE);
    const linkOnly = first.match(LINK_ONLY_RE);
    if (asResult) resultParts.push(asResult[1]);
    else if (asLink) item.link = asLink[1].trim();
    else if (linkOnly) item.link = linkOnly[1];
    else resultParts.push(first);
  }

  for (const line of lines.slice(1)) {
    const asResult = line.match(RESULT_LINE_RE);
    if (asResult) {
      resultParts.push(asResult[1]);
      continue;
    }
    const asLink = line.match(LINK_LINE_RE);
    if (asLink) {
      item.link = asLink[1].trim();
      continue;
    }
    const linkOnly = line.match(LINK_ONLY_RE);
    if (linkOnly && !item.link) {
      item.link = linkOnly[1];
      continue;
    }
    resultParts.push(line);
  }

  item.result = resultParts.join("\n").trim();
  return item;
}

function parseLegacyProgressItems(progress: string, goalCount: number): ProgressItem[] {
  const count = Math.max(goalCount, 0);
  const raw = progress.trim();
  if (!raw) return ensureCount([], count);

  const lines = raw.split(/\r?\n/);
  const blocks = new Map<number, string[]>();
  let currentIndex: number | null = null;
  const orphan: string[] = [];

  for (const line of lines) {
    const head = line.match(NUMBERED_HEAD_RE);
    if (head) {
      currentIndex = Math.max(0, Number(head[1]) - 1);
      const rest = head[2] ?? "";
      const existing = blocks.get(currentIndex) ?? [];
      existing.push(rest);
      blocks.set(currentIndex, existing);
      continue;
    }
    if (currentIndex != null) {
      const existing = blocks.get(currentIndex) ?? [];
      existing.push(line);
      blocks.set(currentIndex, existing);
    } else if (line.trim()) {
      orphan.push(line);
    }
  }

  if (!blocks.size && orphan.length) {
    const fallback = ensureCount([], Math.max(count, 1));
    fallback[0] = {
      status: "",
      result: orphan.join("\n").trim(),
      link: ""
    };
    return ensureCount(fallback, count);
  }

  const maxIndex = Math.max(count - 1, ...blocks.keys(), -1);
  const items = ensureCount([], Math.max(count, maxIndex + 1));
  for (const [index, bodyLines] of blocks) {
    if (index < 0 || index >= items.length) continue;
    items[index] = parseProgressBlock(bodyLines.join("\n"));
  }
  return ensureCount(items, count);
}

/**
 * Parse progress into slots aligned with goalCount.
 * Prefers JSON array; falls back to legacy numbered text.
 */
export function parseProgressItems(progress: string, goalCount: number): ProgressItem[] {
  const count = Math.max(goalCount, 0);
  const raw = (progress ?? "").trim();
  if (!raw) return ensureCount([], count);

  const json = tryParseJson(raw);
  if (Array.isArray(json)) {
    const items = json.map(normalizeProgressItem);
    return ensureCount(items, count);
  }

  return parseLegacyProgressItems(raw, count);
}

/** Persist progress as a JSON array of { status, result, link }. */
export function serializeProgressItems(items: ProgressItem[]): string {
  const normalized = items.map((item) => ({
    status: item.status.trim(),
    result: item.result.trim(),
    link: item.link.trim()
  }));
  const hasContent = normalized.some((item) => item.status || item.result || item.link);
  return hasContent ? JSON.stringify(normalized) : "";
}
