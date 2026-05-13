import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizePatternData,
  paletteMergeKey,
  type PaletteEntry,
} from "@/lib/paletteTypes";

export async function POST(request: Request) {
  try {
    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Missing or invalid ids" }, { status: 400 });
    }

    const patterns = await prisma.pattern.findMany({
      where: {
        id: { in: ids.map(Number) },
      },
    });

    const merged = new Map<string, PaletteEntry>();
    let totalMinutes = 0;

    for (const pattern of patterns) {
      const data = normalizePatternData(JSON.parse(pattern.analysisJson));
      if (data.palette) {
        data.palette.forEach((item) => {
          const key = paletteMergeKey(item);
          const prev = merged.get(key);
          if (!prev) {
            merged.set(key, { ...item });
          } else {
            merged.set(key, {
              ...prev,
              count: prev.count + item.count,
            });
          }
        });
      }
      if (data.totals) {
        totalMinutes += data.totals.estimatedMinutes || 0;
      }
    }

    const finalPalette = Array.from(merged.values()).sort((a, b) => b.count - a.count);
    const totalBeads = finalPalette.reduce((s, e) => s + e.count, 0);

    return NextResponse.json({
      success: true,
      data: {
        projectsCount: patterns.length,
        palette: finalPalette,
        totals: {
          totalBeads,
          estimatedMinutes: totalMinutes,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error aggregating stats:", error);
    return NextResponse.json({ error: "Failed to aggregate stats" }, { status: 500 });
  }
}
