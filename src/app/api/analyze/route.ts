import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePaletteEntry, normalizePatternData } from "@/lib/paletteTypes";
import OpenAI from "openai";
import { z } from "zod";

const rawPaletteRow = z.object({
  code: z.union([z.string(), z.number()]).optional().nullable(),
  nameZh: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
  count: z.number(),
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
    const { imageBase64, title } = await request.json();

    if (!imageBase64 || !title) {
      return NextResponse.json({ error: "Missing imageBase64 or title" }, { status: 400 });
    }

    // 1. Fetch settings to get API key
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
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
You are an expert at analyzing fuse bead (拼豆 / Perler / Hama style) patterns from a screenshot.
Return ONLY a JSON object (no markdown) with this exact shape:
{
  "palette": [
    {
      "code": "色号：优先 Perler 官方字母数字编号（如 A01、E11）；若无法辨认则写最接近的常见编号，仍不确定则写 待定",
      "nameZh": "简体中文颜色名（如 黄色、浅绿、深绿、肤色），不要用英文",
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
Rules:
- Every palette entry MUST include both "code" and "nameZh" (简体中文).
- "count" is bead count for that color in the pattern.
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
