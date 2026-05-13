import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Aggregate logic
    const aggregatedPalette: Record<string, number> = {};
    let totalBeads = 0;
    let totalMinutes = 0;

    for (const pattern of patterns) {
      const data = JSON.parse(pattern.analysisJson);
      if (data.palette) {
        data.palette.forEach((item: { label: string; count: number }) => {
          if (!aggregatedPalette[item.label]) {
            aggregatedPalette[item.label] = 0;
          }
          aggregatedPalette[item.label] += item.count;
        });
      }
      if (data.totals) {
        totalBeads += data.totals.totalBeads || 0;
        totalMinutes += data.totals.estimatedMinutes || 0;
      }
    }

    const finalPalette = Object.entries(aggregatedPalette)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

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
  } catch (error: any) {
    console.error("Error aggregating stats:", error);
    return NextResponse.json({ error: "Failed to aggregate stats" }, { status: 500 });
  }
}
