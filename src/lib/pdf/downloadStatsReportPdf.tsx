"use client";

import { pdf } from "@react-pdf/renderer";
import {
  StatsReportDocument,
  type StatsReportPattern,
  type StatsReportSummary,
} from "./StatsReportDocument";

export async function downloadStatsReportPdf(params: {
  summary: StatsReportSummary;
  patterns: StatsReportPattern[];
}): Promise<void> {
  const generatedAt = new Date().toLocaleString("zh-CN");
  const blob = await pdf(
    <StatsReportDocument
      generatedAt={generatedAt}
      summary={params.summary}
      patterns={params.patterns}
    />
  ).toBlob();

  const safeDate = new Date().toISOString().slice(0, 10);
  const fileName = `拼豆统计_${safeDate}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
