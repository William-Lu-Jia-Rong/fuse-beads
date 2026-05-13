import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { z } from "zod";

// Expected JSON schema from OpenAI
const analysisSchema = z.object({
  palette: z.array(
    z.object({
      label: z.string(),
      count: z.number(),
    })
  ),
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
You are an expert at analyzing fuse bead (拼豆) patterns.
I will provide an image of a fuse bead pattern.
Please analyze it and return ONLY a JSON object with the following structure:
{
  "palette": [
    { "label": "Color Name or approximate color", "count": 123 }
  ],
  "grid": {
    "rows": number, // The minimum bounding grid rows
    "cols": number  // The minimum bounding grid columns
  },
  "totals": {
    "totalBeads": number, // Sum of all beads
    "estimatedMinutes": number // Rough estimation of minutes to make this pattern (e.g., 1 bead = 5 seconds)
  }
}
Do not include markdown blocks like \`\`\`json. Output raw JSON only.
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

    // 5. Save to database
    const pattern = await prisma.pattern.create({
      data: {
        title: title || "Unnamed Pattern",
        thumbnailUrl: imageBase64, // Storing full base64 as thumbnail for now, can be optimized later
        analysisJson: JSON.stringify(validatedData),
      },
    });

    return NextResponse.json({ success: true, pattern, data: validatedData });
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
