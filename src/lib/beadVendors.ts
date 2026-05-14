/**
 * 拼豆色号供应商 / 色卡体系。分析结果中的 `code` 与 `nameZh` 须与所选体系一致。
 */

export const BEAD_VENDOR_IDS = [
  "mard",
  "perler",
  "hama",
  "artkal",
  "coco",
  "pando",
  "mixed",
] as const;

export type BeadVendorId = (typeof BEAD_VENDOR_IDS)[number];

export const BEAD_VENDOR_OPTIONS: {
  id: BeadVendorId;
  nameZh: string;
  hint: string;
}[] = [
  {
    id: "mard",
    nameZh: "MARD（漫豆）",
    hint: "MARD 官方色卡编号与中文色名",
  },
  {
    id: "perler",
    nameZh: "Perler",
    hint: "字母+数字官方色号（如 A01、E11）",
  },
  {
    id: "hama",
    nameZh: "Hama",
    hint: "Hama 条纹/ MIDI 等线型对应编号体系",
  },
  {
    id: "artkal",
    nameZh: "Artkal",
    hint: "A/B/C/S 等系列色号",
  },
  {
    id: "coco",
    nameZh: "COCO",
    hint: "COCO 豆官方色号",
  },
  {
    id: "pando",
    nameZh: "Pando / 潘豆等",
    hint: "Pando 等品牌既定色号",
  },
  {
    id: "mixed",
    nameZh: "未指定 / 自动辨认",
    hint: "按图上印刷或可辨认品牌推断，不强制单一体系",
  },
];

export function normalizeBeadVendor(input: unknown): BeadVendorId {
  const s = typeof input === "string" ? input.toLowerCase().trim() : "";
  if ((BEAD_VENDOR_IDS as readonly string[]).includes(s)) {
    return s as BeadVendorId;
  }
  return "mixed";
}

/** 注入到分析 system prompt 的「色号体系」段落（英文指令，模型遵循更好） */
export function beadVendorPromptSection(vendor: BeadVendorId): string {
  const common = `
## Bead vendor / color code system (MANDATORY)

The user selected vendor mode: **${vendor}**. Every palette row MUST follow this vendor's real-world color system for "code" and Chinese "nameZh".

Rules for ALL modes:
- Never invent codes that do not exist in that vendor's official chart. If the image shows another brand's table, transcribe counts but set "code" to "待定" and keep "nameZh" faithful to the print; do NOT relabel as the selected vendor unless the print clearly matches that vendor.
- If the image shows the vendor logo / column header (e.g. MARD / Perler), treat that as authoritative for code format.
- "code" must be the vendor-facing catalog code string (keep leading zeros / hyphens as printed). "nameZh" must be 简体中文常用色名，与所选品牌色卡或图上一致；不要用英文当 nameZh。
`;

  const byVendor: Record<BeadVendorId, string> = {
    mard: `
### MARD（漫豆）
- Use **only MARD official color numbers and naming** as on MARD charts / Taobao detail sheets (e.g. numeric or brand-specific codes printed for MARD beans). Match the exact string style shown for MARD on this image.
- **Do not** output Perler-style codes (e.g. A01, F15) as MARD unless the image explicitly labels them as cross-walked MARD equivalents.
- If only a color swatch without readable MARD code, use "待定" for code and describe the swatch color in nameZh.
`,
    perler: `
### Perler
- "code" = Perler-style official alphanumeric (e.g. A01, E11, P04). Prefer what is printed on the pattern for Perler.
- Do not substitute Hama-only numbering as Perler codes.
`,
    hama: `
### Hama
- "code" = Hama catalog numbers as printed (strip/board size context if visible). Use the numbering style from the Hama material list on the image.
`,
    artkal: `
### Artkal
- "code" = Artkal series codes (A-/B-/C-/S- etc.) exactly as on Artkal charts or the image's table.
`,
    coco: `
### COCO
- "code" = COCO official codes as printed on COCO reference / this image.
`,
    pando: `
### Pando / 潘豆等
- "code" = the brand's printed code style (e.g. Pando sheet). Follow the image's legend first.
`,
    mixed: `
### Mixed / auto
- Detect the brand from logos, headers, or table columns on the image. Use that brand's code system consistently for all rows in this JSON output.
- If multiple brands appear, prefer the one that owns the main color table. If unclear, use the most complete printed table and "待定" only where unreadable.
`,
  };

  return common + byVendor[vendor];
}
