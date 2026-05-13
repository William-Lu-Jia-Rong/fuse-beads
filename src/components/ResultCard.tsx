"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { PatternData } from "@/lib/paletteTypes";
import { normalizePatternData } from "@/lib/paletteTypes";
export type { PatternData } from "@/lib/paletteTypes";

export type ResultCardProps = {
  analysisJson: string;
  patternId?: number;
  title?: string;
  thumbnailUrl?: string;
  /** Called after a successful save so parent can refresh `analysisJson`. */
  onSaved?: (analysisJson: string) => void;
};

export function ResultCard({
  analysisJson,
  patternId,
  title,
  thumbnailUrl,
  onSaved,
}: ResultCardProps) {
  const [local, setLocal] = useState<PatternData>(() =>
    normalizePatternData(JSON.parse(analysisJson))
  );
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const localRef = useRef(local);
  localRef.current = local;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(normalizePatternData(JSON.parse(analysisJson)));
    setDirty(false);
    setSaveStatus("idle");
  }, [analysisJson]);

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const t = setTimeout(() => setSaveStatus("idle"), 2000);
    return () => clearTimeout(t);
  }, [saveStatus]);

  const persistIfDirty = useCallback(async () => {
    const id = patternId;
    if (!id || !dirtyRef.current) return;
    setSaveStatus("saving");
    try {
      const body = localRef.current;
      const res = await fetch(`/api/patterns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: body }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        data?: unknown;
      };
      if (!res.ok) throw new Error(payload.error || "保存失败");
      const next = normalizePatternData(payload.data);
      const jsonStr = JSON.stringify(next);
      onSavedRef.current?.(jsonStr);
      setLocal(next);
      setDirty(false);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [patternId]);

  useEffect(() => {
    if (!patternId || !dirty) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void persistIfDirty();
    }, 700);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [local, dirty, patternId, persistIfDirty]);

  function updateCount(index: number, raw: string) {
    const parsed = parseInt(raw, 10);
    const count = Number.isFinite(parsed) ? Math.max(0, Math.min(999_999, parsed)) : 0;
    const nextPalette = local.palette.map((row, i) =>
      i === index ? { ...row, count } : row
    );
    setLocal(normalizePatternData({ ...local, palette: nextPalette }));
    setDirty(true);
  }

  function handleBlurPersist() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    void persistIfDirty();
  }

  const saveHint =
    !patternId ? (
      <span className="text-xs text-gray-400">未关联记录时仅本地预览；分析完成后会自动写入数据库。</span>
    ) : saveStatus === "saving" ? (
      <span className="text-xs text-amber-700">正在保存…</span>
    ) : saveStatus === "saved" ? (
      <span className="text-xs text-emerald-700">已保存</span>
    ) : saveStatus === "error" ? (
      <span className="text-xs text-red-600">保存失败，请检查网络后重试</span>
    ) : dirty ? (
      <span className="text-xs text-gray-500">将自动保存</span>
    ) : (
      <span className="text-xs text-gray-400">可直接修改数量；失焦或约 0.7 秒后自动保存</span>
    );

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-200 mt-8 w-full max-w-3xl mx-auto min-w-0"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row gap-8 items-start md:items-center min-w-0">
        {thumbnailUrl && (
          <div className="w-32 h-32 shrink-0 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt="Thumbnail"
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <div className="flex-1 min-w-0 w-full">
          <h2
            className="text-2xl font-semibold tracking-tight text-gray-900 mb-4 break-words [overflow-wrap:anywhere]"
            title={title}
          >
            {title || "分析结果"}
          </h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 break-words">
                总颗粒数
              </span>
              <span className="text-2xl font-semibold text-gray-900">
                {local.totals.totalBeads}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 break-words">
                预计时间
              </span>
              <span className="text-2xl font-semibold text-gray-900">
                {local.totals.estimatedMinutes}{" "}
                <span className="text-sm font-normal text-gray-500">分钟</span>
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 break-words">
                最小网格
              </span>
              <span className="text-2xl font-semibold text-gray-900">
                {local.grid.cols}{" "}
                <span className="text-sm font-normal text-gray-500">×</span> {local.grid.rows}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 break-words">
                颜色种类
              </span>
              <span className="text-2xl font-semibold text-gray-900">
                {local.palette.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 bg-gray-50/50 min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h3 className="text-sm font-medium text-gray-900">颜色明细</h3>
          {saveHint}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          {local.palette.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-200 rounded-lg p-3 flex items-start justify-between gap-2 min-w-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate" title={item.nameZh}>
                  {item.nameZh}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-0.5 truncate" title={item.code}>
                  色号 {item.code}
                </p>
              </div>
              <label className="flex flex-col items-end gap-0.5 shrink-0">
                <span className="text-[10px] uppercase tracking-wide text-gray-400">数量</span>
                <input
                  type="number"
                  min={0}
                  max={999999}
                  inputMode="numeric"
                  className="w-[5.5rem] rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm font-semibold text-gray-900 tabular-nums text-right shadow-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                  value={item.count}
                  onChange={(e) => updateCount(idx, e.target.value)}
                  onBlur={patternId ? handleBlurPersist : undefined}
                />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
