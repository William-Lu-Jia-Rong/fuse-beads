import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      return NextResponse.json({ configured: false, maskedKey: null, baseUrl: null });
    }

    const hasKey = !!settings.apiKey;
    let maskedKey = null;

    if (hasKey && settings.apiKey) {
      if (settings.apiKey.length > 8) {
        maskedKey =
          settings.apiKey.substring(0, 3) +
          "..." +
          settings.apiKey.substring(settings.apiKey.length - 4);
      } else {
        maskedKey = "***";
      }
    }

    return NextResponse.json({
      configured: hasKey,
      maskedKey,
      baseUrl: settings.baseUrl || null,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, baseUrl, action } = body;

    // Optional: add a tiny validation
    if (action === "clear") {
      await prisma.appSettings.upsert({
        where: { id: 1 },
        update: { apiKey: null, baseUrl: null },
        create: { id: 1, apiKey: null, baseUrl: null },
      });
      return NextResponse.json({ success: true, message: "Settings cleared" });
    }

    if (typeof apiKey !== "string") {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 400 });
    }

    await prisma.appSettings.upsert({
      where: { id: 1 },
      update: { apiKey, baseUrl: baseUrl || null },
      create: { id: 1, apiKey, baseUrl: baseUrl || null },
    });

    return NextResponse.json({ success: true, message: "Settings saved" });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
