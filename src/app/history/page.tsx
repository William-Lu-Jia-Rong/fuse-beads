"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Loader2, Trash2, PieChart, FileDown } from "lucide-react";
import { ResultCard, PatternData } from "@/components/ResultCard";
import type { StatsReportPattern } from "@/lib/pdf/StatsReportDocument";
import type { PaletteEntry } from "@/lib/paletteTypes";
import { normalizePatternData } from "@/lib/paletteTypes";

type HistoryItem = {
  id: number;
  title: string;
  createdAt: string;
  thumbnailUrl: string;
  analysisJson: string;
  beadVendor?: string | null;
};

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [statsLoading, setStatsLoading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [statsData, setStatsData] = useState<{
    projectsCount: number;
    palette: PaletteEntry[];
    totals: { totalBeads: number; estimatedMinutes: number };
  } | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (err) {
      toast.error("无法加载历史记录");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("确定要删除这条记录吗？")) return;
    try {
      const res = await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("删除失败");
      toast.success("已删除");
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (expandedId === id) setExpandedId(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error("请先勾选要删除的记录");
      return;
    }
    const ids = Array.from(selectedIds);
    if (!confirm(`确定删除所选的 ${ids.length} 条记录？此操作不可恢复。`)) return;

    setBulkDeleting(true);
    try {
      for (const id of ids) {
        const res = await fetch("/api/history", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) throw new Error("删除失败");
      }
      toast.success(`已删除 ${ids.length} 条`);
      setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
      setSelectedIds(new Set());
      setExpandedId((cur) => (cur != null && ids.includes(cur) ? null : cur));
      setStatsData(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "删除失败";
      toast.error(msg);
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleAggregateStats = async () => {
    if (selectedIds.size === 0) {
      toast.error("请先选择要统计的图纸");
      return;
    }

    setStatsLoading(true);
    setStatsData(null);
    try {
      const res = await fetch("/api/stats/aggregate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatsData(data.data);
      
      // Scroll to stats
      setTimeout(() => {
        document.getElementById("stats-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      toast.error(err.message || "统计失败");
    } finally {
      setStatsLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!statsData) return;
    setPdfExporting(true);
    try {
      const idOrder = Array.from(selectedIds);
      const patterns: StatsReportPattern[] = [];
      for (const id of idOrder) {
        const item = items.find((i) => i.id === id);
        if (!item) continue;
        try {
          const data = normalizePatternData(JSON.parse(item.analysisJson));
          patterns.push({
            id: item.id,
            title: item.title,
            createdAt: item.createdAt,
            thumbnailUrl: item.thumbnailUrl || null,
            data,
          });
        } catch {
          /* skip invalid */
        }
      }
      const { downloadStatsReportPdf } = await import(
        "@/lib/pdf/downloadStatsReportPdf"
      );
      await downloadStatsReportPdf({
        summary: {
          projectsCount: statsData.projectsCount,
          palette: statsData.palette,
          totals: statsData.totals,
        },
        patterns,
      });
      toast.success("已导出 PDF");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "导出失败";
      toast.error(msg);
    } finally {
      setPdfExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">历史与统计</h1>
          <p className="text-gray-500 text-sm">
            共 {items.length} 个历史项目。多选项目以进行颜色与耗时合计。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-sm font-medium text-gray-600 hover:text-black px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {selectedIds.size === items.length && items.length > 0 ? "取消全选" : "全选"}
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || bulkDeleting}
            className="text-sm font-medium text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent flex items-center gap-1.5"
          >
            {bulkDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Trash2 className="w-4 h-4 shrink-0" />
            )}
            删除所选
            {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </button>
          <button
            type="button"
            onClick={handleAggregateStats}
            disabled={selectedIds.size === 0 || statsLoading}
            className="bg-[#1d1d1f] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#333336] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {statsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PieChart className="w-4 h-4" />}
            合并统计 ({selectedIds.size})
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-200">
          <p className="text-gray-400">暂无历史记录</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isExpanded = expandedId === item.id;
            let parsedData: PatternData | null = null;
            try {
              parsedData = normalizePatternData(JSON.parse(item.analysisJson));
            } catch (e) {}

            return (
              <div
                key={item.id}
                className={`flex flex-col min-w-0 ${isExpanded ? "col-span-full" : ""}`}
              >
                <div
                  className={`relative bg-white border rounded-2xl p-4 cursor-pointer transition-all ${
                    isSelected ? "border-[#0066cc] ring-1 ring-[#0066cc]" : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div
                    className="absolute top-3 left-3 w-5 h-5 rounded border flex items-center justify-center bg-white z-10"
                    onClick={(e) => toggleSelect(item.id, e)}
                    style={{
                      borderColor: isSelected ? "#0066cc" : "#d1d5db",
                      backgroundColor: isSelected ? "#0066cc" : "white",
                    }}
                  >
                    {isSelected && (
                      <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5 text-white">
                        <path d="M3 7.5L5.5 10L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <button
                    type="button"
                    title="删除此记录"
                    className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-gray-200 bg-white/95 px-2 py-1 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={(e) => handleDelete(item.id, e)}
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    删除
                  </button>

                  <div className="w-full aspect-square bg-gray-50 rounded-xl overflow-hidden mb-4 mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {item.thumbnailUrl && <img src={item.thumbnailUrl} className="w-full h-full object-contain" alt={item.title} />}
                  </div>
                  <h3 className="font-semibold text-gray-900 truncate text-sm">{item.title}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    {parsedData && (
                      <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {parsedData.totals.totalBeads} 颗
                      </span>
                    )}
                  </div>
                </div>

                {isExpanded && parsedData && (
                  <div className="mt-4 mb-6 w-full min-w-0 animate-in slide-in-from-top-2 duration-300 space-y-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        删除此项目
                      </button>
                    </div>
                    <ResultCard
                      analysisJson={item.analysisJson}
                      patternId={item.id}
                      title={item.title}
                      thumbnailUrl={item.thumbnailUrl}
                      savedBeadVendor={item.beadVendor}
                      onSaved={(json) => {
                        setItems((prev) =>
                          prev.map((x) => (x.id === item.id ? { ...x, analysisJson: json } : x))
                        );
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {statsData && (
        <div id="stats-section" className="bg-white rounded-3xl p-8 border border-[#0066cc]/20 shadow-sm mb-12 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0066cc]/10 text-[#0066cc] flex items-center justify-center shrink-0">
                <PieChart className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                汇总统计 ({statsData.projectsCount} 个项目)
              </h2>
            </div>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={pdfExporting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1d1d1f] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#333336] disabled:opacity-50"
            >
              {pdfExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              导出 PDF
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
             <div className="bg-gray-50 rounded-2xl p-6">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider block mb-2">总计颗粒</span>
                <span className="text-4xl font-bold text-gray-900">{statsData.totals.totalBeads}</span>
             </div>
             <div className="bg-gray-50 rounded-2xl p-6">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider block mb-2">预估总时间</span>
                <span className="text-4xl font-bold text-gray-900">{statsData.totals.estimatedMinutes} <span className="text-base font-normal text-gray-500">分钟</span></span>
             </div>
          </div>

          <h3 className="text-sm font-medium text-gray-900 mb-4">合并颜色清单</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {statsData.palette.map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-lg p-3 flex items-start justify-between gap-2 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate" title={item.nameZh}>
                    {item.nameZh}
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5 truncate" title={item.code}>
                    色号 {item.code}
                  </p>
                </div>
                <span className="text-sm font-bold text-gray-900 tabular-nums shrink-0">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
