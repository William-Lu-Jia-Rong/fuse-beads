/** Single color row in analysis JSON (stored in DB). */
export interface PaletteEntry {
  /** 品牌或通用色号，如 Perler 字母数字；未知可为 "—" */
  code: string;
  /** 简体中文颜色名 */
  nameZh: string;
  count: number;
  /** 旧数据仅有英文 label 时由解析层写入 nameZh，此项可不存在 */
  label?: string;
}

export interface PatternData {
  palette: PaletteEntry[];
  grid: { rows: number; cols: number };
  totals: { totalBeads: number; estimatedMinutes: number };
}

function toNonNegativeInt(n: unknown): number {
  if (typeof n === "number" && Number.isFinite(n)) {
    return Math.max(0, Math.floor(n));
  }
  const parsed = parseInt(String(n ?? "").trim(), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

/** Normalize legacy palette rows (only `label`) for display & merge. */
export function normalizePaletteEntry(raw: {
  code?: string | number | null;
  nameZh?: string | null;
  label?: string | null;
  count?: number | string | null;
}): PaletteEntry {
  const nameZh =
    (raw.nameZh && String(raw.nameZh).trim()) ||
    (raw.label && String(raw.label).trim()) ||
    "未命名";
  const code =
    raw.code !== undefined && raw.code !== null && String(raw.code).trim() !== ""
      ? String(raw.code).trim()
      : "";
  return {
    code: code || "—",
    nameZh,
    count: toNonNegativeInt(raw.count),
    ...(raw.label && !raw.nameZh ? { label: String(raw.label) } : {}),
  };
}

/**
 * Align `totals.totalBeads` with the sum of `palette[].count`.
 * The analysis model often returns a headline total that does not match the per-color counts.
 */
export function reconcilePatternTotals(data: PatternData): PatternData {
  const sum = data.palette.reduce((s, e) => {
    const n = Number(e.count);
    return s + (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
  }, 0);
  const prevTotal = Math.max(
    0,
    Math.floor(Number(data.totals.totalBeads)) || 0
  );
  const prevMinutes = Math.max(
    0,
    Math.floor(Number(data.totals.estimatedMinutes)) || 0
  );

  if (sum === 0) {
    return {
      ...data,
      totals: {
        totalBeads: prevTotal,
        estimatedMinutes: prevMinutes,
      },
    };
  }

  let estimatedMinutes: number;
  if (prevTotal > 0 && prevMinutes > 0) {
    estimatedMinutes = Math.max(1, Math.round((sum * prevMinutes) / prevTotal));
  } else {
    estimatedMinutes = Math.max(1, Math.floor(sum / 10));
  }

  return {
    ...data,
    totals: {
      totalBeads: sum,
      estimatedMinutes,
    },
  };
}

export function normalizePatternData(data: unknown): PatternData {
  const d = data as PatternData & { palette?: unknown[] };
  const palette = Array.isArray(d.palette)
    ? d.palette.map((row) =>
        normalizePaletteEntry(row as Parameters<typeof normalizePaletteEntry>[0])
      )
    : [];
  const base: PatternData = {
    palette,
    grid: d.grid ?? { rows: 0, cols: 0 },
    totals: d.totals ?? { totalBeads: 0, estimatedMinutes: 0 },
  };
  return reconcilePatternTotals(base);
}

/** Merge key: same 色号优先合并；否则按中文名 */
export function paletteMergeKey(entry: Pick<PaletteEntry, "code" | "nameZh">): string {
  const c = entry.code?.trim();
  if (c && c !== "—" && c !== "待定") return `c:${c}`;
  return `n:${entry.nameZh}`;
}
