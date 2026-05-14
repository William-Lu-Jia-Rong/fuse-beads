import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePaletteEntry, normalizePatternData } from "@/lib/paletteTypes";
import { beadVendorPromptSection, normalizeBeadVendor } from "@/lib/beadVendors";
import OpenAI from "openai";
import { z } from "zod";

const rawPaletteRow = z.object({
  code: z.union([z.string(), z.number()]).optional().nullable(),
  nameZh: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
  count: z.coerce.number(),
});

const analysisSchema = z.object({
  palette: z
    .array(rawPaletteRow)
    .transform((rows) => rows.map((r) => normalizePaletteEntry(r))),
  grid: z.object({
    rows: z.number(),
    cols: z.number(),
  }),
  totals: z.object({
    totalBeads: z.number(),
    estimatedMinutes: z.number(),
  }),
});

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageBase64, title, beadVendor: bodyVendor } = body;

    if (!imageBase64 || !title) {
      return NextResponse.json({ error: "Missing imageBase64 or title" }, { status: 400 });
    }

    // 1. Fetch settings to get API key
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    const beadVendor = normalizeBeadVendor(bodyVendor ?? settings?.beadVendor);
    if (!settings || !settings.apiKey) {
      return NextResponse.json({ error: "OpenAI API Key not configured" }, { status: 401 });
    }

    // 2. Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.baseUrl || undefined,
    });

    // Extract base64 part if it has data URI prefix
    const base64Data = imageBase64.includes("base64,")
      ? imageBase64.split("base64,")[1]
      : imageBase64;
    const mimeType = imageBase64.startsWith("data:")
      ? imageBase64.split(";")[0].split(":")[1]
      : "image/jpeg";

    // 3. Call OpenAI
    const prompt = `
You are an expert at analyzing fuse bead (拼豆) patterns from a screenshot (may be Perler, Hama, MARD, Artkal, COCO, etc.).
${beadVendorPromptSection(beadVendor)}
Return ONLY a JSON object (no markdown) with this exact shape:
{
  "palette": [
    {
      "code": "Official catalog code string for the selected vendor mode (see rules above). If unreadable, use 待定.",
      "nameZh": "简体中文颜色名（如 黄色、浅绿、深绿、肤色），与图或该品牌色卡一致；不要用英文",
      "count": 123
    }
  ],
  "grid": {
    "rows": number,
    "cols": number
  },
  "totals": {
    "totalBeads": number,
    "estimatedMinutes": number
  }
}

## How to get accurate "count" (read this order — very important)

Many pattern sheets **print the bead counts on the image itself**. You MUST prioritize those over guessing from the pixel grid.

1. **First, scan the whole image for any printed or handwritten quantity data**, including but not limited to:
   - 材料表 / 配色表 / 用量表 / 颜色对照表 / 图例（色号或色块旁的数字）
   - 表格：列如「色号、颜色名、数量、颗数、用量」
   - 每个颜色一行旁写的数字（如 A5 151、黑色 586、×32）
   - 电商截图里的「颜色及用量」「共需豆子」等文字区块
   - 图纸角落、侧边、底部的汇总列表
2. **If you find a clear table or list that matches this pattern's colors**, set each palette entry's "count" to **exactly those printed numbers** (transcribe digit-by-digit; watch for OCR-like confusions: 0/O, 1/l, 6/8, 5/S).
3. **Only when the image has NO usable printed counts** (or only partial rows): estimate missing colors by counting filled pegs of that color on the grid. If both exist, **prefer the printed numbers** when they clearly refer to this same design; use grid counting only to fill gaps or resolve ties when the print is unreadable.
4. **If printed totals and printed per-color rows disagree**, prefer the **per-color row values** that belong to the main material list, and make "totals.totalBeads" equal the sum of your final palette counts (after reconciliation logic on the server, but you should still self-check).

## Other rules

- Every palette entry MUST include both "code" and "nameZh" (简体中文).
- "count" = number of beads of that color for this project (from print first, else grid).
- "totals.totalBeads" MUST exactly equal the sum of all palette "count" values (no rounding drift).
- grid rows/cols = minimum bounding pegboard size (ignore empty margin).
- For backwards compatibility you may also include "label" as English, but nameZh is required for display.
Do not wrap in markdown. Output raw JSON only.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请先完整查看整张图：若有印刷或表格形式的「各颜色用量/颗数」，必须优先按该标注填写 palette 里每种颜色的 count；只有在图上确实没有可靠用量标注时，再靠数格子估算。然后输出要求的 JSON。",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // 4. Parse and validate JSON
    const parsedData = JSON.parse(content);
    const validatedData = analysisSchema.parse(parsedData);
    const dataToSave = normalizePatternData(validatedData);

    // 5. Save to database
    const pattern = await prisma.pattern.create({
      data: {
        title: title || "Unnamed Pattern",
        thumbnailUrl: imageBase64, // Storing full base64 as thumbnail for now, can be optimized later
        analysisJson: JSON.stringify(dataToSave),
        beadVendor,
      },
    });

    return NextResponse.json({ success: true, pattern, data: dataToSave });
  } catch (error: any) {
    console.error("Error analyzing pattern:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid analysis format from AI", details: (error as any).errors }, { status: 502 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to analyze pattern" },
      { status: 500 }
    );
  }
}
