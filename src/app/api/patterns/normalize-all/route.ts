import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePatternData } from "@/lib/paletteTypes";
import { normalizeBeadVendor } from "@/lib/beadVendors";

/**
 * 对库内全部图案的 palette 做与线上一致的规范化（空色号、label→nameZh、合计对齐），
 * 并为缺少 beadVendor 的旧记录补默认 mixed。
 */
export async function POST() {
  try {
    const patterns = await prisma.pattern.findMany({
      select: { id: true, analysisJson: true, beadVendor: true },
    });

    let updated = 0;
    for (const p of patterns) {
      let normalized;
      try {
        normalized = normalizePatternData(JSON.parse(p.analysisJson));
      } catch {
        continue;
      }
      const nextJson = JSON.stringify(normalized);

      const data: { analysisJson?: string; beadVendor?: string } = {};
      if (nextJson !== p.analysisJson) {
        data.analysisJson = nextJson;
      }
      const v = p.beadVendor?.trim();
      if (!v) {
        data.beadVendor = "mixed";
      } else {
        const nv = normalizeBeadVendor(v);
        if (nv !== v) {
          data.beadVendor = nv;
        }
      }

      if (Object.keys(data).length === 0) continue;

      await prisma.pattern.update({
        where: { id: p.id },
        data,
      });
      updated++;
    }

    return NextResponse.json({
      success: true,
      total: patterns.length,
      updated,
    });
  } catch (e) {
    console.error("POST /api/patterns/normalize-all:", e);
    return NextResponse.json({ error: "Failed to normalize patterns" }, { status: 500 });
  }
}
