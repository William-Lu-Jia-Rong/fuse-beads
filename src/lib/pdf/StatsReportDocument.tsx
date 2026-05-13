import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { PatternData, PaletteEntry } from "@/lib/paletteTypes";

export type StatsReportPattern = {
  id: number;
  title: string;
  createdAt: string;
  thumbnailUrl: string | null;
  data: PatternData;
};

export type StatsReportSummary = {
  projectsCount: number;
  palette: PaletteEntry[];
  totals: { totalBeads: number; estimatedMinutes: number };
};

export type StatsReportProps = {
  generatedAt: string;
  summary: StatsReportSummary;
  patterns: StatsReportPattern[];
};

const PALETTE_CHUNK = 22;
const SUMMARY_PALETTE_CHUNK = 26;

function chunkPalette<T>(rows: T[], size: number): T[][] {
  if (rows.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    out.push(rows.slice(i, i + size));
  }
  return out;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Noto",
    fontSize: 10,
    lineHeight: 1.35,
    color: "#1d1d1f",
    paddingTop: 44,
    paddingBottom: 44,
    paddingHorizontal: 48,
    backgroundColor: "#ffffff",
  },
  brand: {
    fontSize: 9,
    color: "#86868b",
    letterSpacing: 0.5,
    marginBottom: 28,
  },
  h1: {
    fontSize: 22,
    fontWeight: 400,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 9,
    color: "#86868b",
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 9,
    color: "#86868b",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  statBox: {
    width: "31%",
    backgroundColor: "#f5f5f7",
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  statValue: {
    fontSize: 26,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  statCaption: {
    fontSize: 9,
    color: "#6e6e73",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d2d2d7",
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8e8ed",
    paddingVertical: 7,
  },
  colNameZh: { flex: 1, paddingRight: 6 },
  colCode: { width: 76, fontSize: 9, color: "#424245" },
  colCount: { width: 44, textAlign: "right" },
  headerText: { fontSize: 9, color: "#86868b" },
  patternTitle: {
    fontSize: 15,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  patternDate: {
    fontSize: 8,
    color: "#86868b",
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: "row",
    marginBottom: 18,
    alignItems: "flex-start",
  },
  thumbWrap: {
    width: 148,
    height: 148,
    marginRight: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8e8ed",
    backgroundColor: "#f5f5f7",
    overflow: "hidden",
  },
  thumb: {
    width: 148,
    height: 148,
    objectFit: "contain",
  },
  metaGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metaChip: {
    width: "47%",
    marginBottom: 8,
    backgroundColor: "#f5f5f7",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metaChipLabel: { fontSize: 7, color: "#86868b", marginBottom: 3 },
  metaChipValue: { fontSize: 12 },
  contLabel: {
    fontSize: 9,
    color: "#86868b",
    marginBottom: 8,
    marginTop: 4,
  },
});

function SinglePatternPage({
  pattern,
  rows,
  chunkIndex,
  totalChunks,
}: {
  pattern: StatsReportPattern;
  rows: PaletteEntry[];
  chunkIndex: number;
  totalChunks: number;
}) {
  const { data, title, createdAt, thumbnailUrl } = pattern;
  const dateStr = new Date(createdAt).toLocaleString("zh-CN");
  const isFirst = chunkIndex === 0;

  return (
    <Page size="A4" style={styles.page}>
      {isFirst ? (
        <>
          <Text style={styles.brand}>FUSE BEADS · 单图明细</Text>
          <Text style={styles.patternTitle}>{title}</Text>
          <Text style={styles.patternDate}>保存于 {dateStr}</Text>

          <View style={styles.heroRow}>
            {thumbnailUrl ? (
              <View style={styles.thumbWrap}>
                <Image src={thumbnailUrl} style={styles.thumb} />
              </View>
            ) : (
              <View style={styles.thumbWrap} />
            )}
            <View style={styles.metaGrid}>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>最小网格（列 × 行）</Text>
                <Text style={styles.metaChipValue}>
                  {String(data.grid.cols)} × {String(data.grid.rows)}
                </Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>总颗粒数</Text>
                <Text style={styles.metaChipValue}>{String(data.totals.totalBeads)}</Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>预计时间（分钟）</Text>
                <Text style={styles.metaChipValue}>
                  {String(data.totals.estimatedMinutes)}
                </Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>颜色种类</Text>
                <Text style={styles.metaChipValue}>{String(data.palette.length)}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>颜色明细</Text>
        </>
      ) : (
        <>
          <Text style={styles.brand}>续页</Text>
          <Text style={styles.patternTitle}>
            {title}
            {totalChunks > 1
              ? `（续 ${String(chunkIndex + 1)} / ${String(totalChunks)}）`
              : ""}
          </Text>
          <Text style={styles.contLabel}>颜色明细（续）</Text>
        </>
      )}

      <View style={styles.tableHeader}>
        <Text style={[styles.colNameZh, styles.headerText]}>中文名</Text>
        <Text style={[styles.colCode, styles.headerText]}>色号</Text>
        <Text style={[styles.colCount, styles.headerText]}>数量</Text>
      </View>
      {rows.map((row, i) => (
        <View key={i} style={styles.tableRow} wrap={false}>
          <Text style={styles.colNameZh}>{String(row.nameZh)}</Text>
          <Text style={styles.colCode}>{String(row.code)}</Text>
          <Text style={styles.colCount}>{String(row.count)}</Text>
        </View>
      ))}
    </Page>
  );
}

export function StatsReportDocument(props: StatsReportProps) {
  const { generatedAt, summary, patterns } = props;
  const summaryChunks = chunkPalette(summary.palette, SUMMARY_PALETTE_CHUNK);

  return (
    <Document
      title="拼豆统计报告"
      author="Fuse Beads"
      subject="历史与统计导出"
      language="zh-CN"
    >
      {summaryChunks.map((rows, chunkIndex) => (
        <Page key={`summary-${chunkIndex}`} size="A4" style={styles.page}>
          {chunkIndex === 0 ? (
            <>
              <Text style={styles.brand}>FUSE BEADS</Text>
              <Text style={styles.h1}>拼豆统计报告</Text>
              <Text style={styles.sub}>生成时间 · {generatedAt}</Text>

              <Text style={styles.sectionLabel}>总计</Text>
              <View style={styles.statRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statCaption}>包含图纸数</Text>
                  <Text style={styles.statValue}>{String(summary.projectsCount)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statCaption}>合计颗粒数</Text>
                  <Text style={styles.statValue}>{String(summary.totals.totalBeads)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statCaption}>预估总时间（分钟）</Text>
                  <Text style={styles.statValue}>
                    {String(summary.totals.estimatedMinutes)}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionLabel}>合并颜色需求</Text>
            </>
          ) : (
            <>
              <Text style={styles.brand}>FUSE BEADS</Text>
              <Text style={styles.h1}>拼豆统计报告（续）</Text>
              <Text style={styles.sub}>
                合并颜色需求 · 第 {String(chunkIndex + 1)} / {String(summaryChunks.length)} 页
              </Text>
            </>
          )}

          <View style={styles.tableHeader}>
            <Text style={[styles.colNameZh, styles.headerText]}>中文名</Text>
            <Text style={[styles.colCode, styles.headerText]}>色号</Text>
            <Text style={[styles.colCount, styles.headerText]}>数量</Text>
          </View>
          {rows.map((row, i) => (
            <View key={i} style={styles.tableRow} wrap={false}>
              <Text style={styles.colNameZh}>{String(row.nameZh)}</Text>
              <Text style={styles.colCode}>{String(row.code)}</Text>
              <Text style={styles.colCount}>{String(row.count)}</Text>
            </View>
          ))}
        </Page>
      ))}
      {patterns.flatMap((p) => {
        const chunks = chunkPalette(p.data.palette, PALETTE_CHUNK);
        const totalChunks = chunks.length;
        return chunks.map((rows, chunkIndex) => (
          <SinglePatternPage
            key={`${p.id}-${chunkIndex}`}
            pattern={p}
            rows={rows}
            chunkIndex={chunkIndex}
            totalChunks={totalChunks}
          />
        ));
      })}
    </Document>
  );
}
