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

/** Normalize legacy palette rows (only `label`) for display & merge. */
export function normalizePaletteEntry(raw: {
  code?: string | number | null;
  nameZh?: string | null;
  label?: string | null;
  count: number;
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
    count: raw.count,
    ...(raw.label && !raw.nameZh ? { label: String(raw.label) } : {}),
  };
}

export function normalizePatternData(data: unknown): PatternData {
  const d = data as PatternData & { palette?: unknown[] };
  const palette = Array.isArray(d.palette)
    ? d.palette.map((row) =>
        normalizePaletteEntry(row as Parameters<typeof normalizePaletteEntry>[0])
      )
    : [];
  return {
    palette,
    grid: d.grid ?? { rows: 0, cols: 0 },
    totals: d.totals ?? { totalBeads: 0, estimatedMinutes: 0 },
  };
}

/** Merge key: same 色号优先合并；否则按中文名 */
export function paletteMergeKey(entry: Pick<PaletteEntry, "code" | "nameZh">): string {
  const c = entry.code?.trim();
  if (c && c !== "—" && c !== "待定") return `c:${c}`;
  return `n:${entry.nameZh}`;
}
