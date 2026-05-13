import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePatternData } from "@/lib/paletteTypes";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: raw } = await context.params;
    const id = Number(raw);
    if (!Number.isFinite(id) || id < 1) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = (await request.json()) as { analysis?: unknown };
    if (!body.analysis || typeof body.analysis !== "object") {
      return NextResponse.json({ error: "Missing analysis" }, { status: 400 });
    }

    const normalized = normalizePatternData(body.analysis);

    await prisma.pattern.update({
      where: { id },
      data: { analysisJson: JSON.stringify(normalized) },
    });

    return NextResponse.json({ success: true, data: normalized });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e
        ? (e as { code?: string }).code
        : undefined;
    if (code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("PATCH /api/patterns/[id]:", e);
    return NextResponse.json({ error: "Failed to update pattern" }, { status: 500 });
  }
}
