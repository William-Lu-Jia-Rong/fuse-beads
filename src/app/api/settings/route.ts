import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeBeadVendor } from "@/lib/beadVendors";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: 1 },
    });

    const beadVendor = normalizeBeadVendor(settings?.beadVendor);

    if (!settings) {
      return NextResponse.json({
        configured: false,
        maskedKey: null,
        baseUrl: null,
        beadVendor,
      });
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
      beadVendor: normalizeBeadVendor(settings.beadVendor),
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

    const existing = await prisma.appSettings.findUnique({ where: { id: 1 } });

    if (action === "clear") {
      await prisma.appSettings.upsert({
        where: { id: 1 },
        update: { apiKey: null, baseUrl: null },
        create: {
          id: 1,
          apiKey: null,
          baseUrl: null,
          beadVendor: normalizeBeadVendor(existing?.beadVendor),
        },
      });
      return NextResponse.json({ success: true, message: "Settings cleared" });
    }

    let nextKey = existing?.apiKey ?? null;
    const trimmedKey = typeof apiKey === "string" ? apiKey.trim() : "";
    if (trimmedKey) nextKey = trimmedKey;

    let nextBase = existing?.baseUrl ?? null;
    if (typeof baseUrl === "string") {
      nextBase = baseUrl.trim() || null;
    }

    let nextVendor = normalizeBeadVendor(existing?.beadVendor);
    if (typeof body.beadVendor === "string") {
      nextVendor = normalizeBeadVendor(body.beadVendor);
    }

    await prisma.appSettings.upsert({
      where: { id: 1 },
      update: {
        apiKey: nextKey,
        baseUrl: nextBase,
        beadVendor: nextVendor,
      },
      create: {
        id: 1,
        apiKey: nextKey,
        baseUrl: nextBase,
        beadVendor: nextVendor,
      },
    });

    return NextResponse.json({ success: true, message: "Settings saved" });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
