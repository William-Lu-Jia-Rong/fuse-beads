import React from "react";

export interface PatternData {
  palette: { label: string; count: number }[];
  grid: { rows: number; cols: number };
  totals: { totalBeads: number; estimatedMinutes: number };
}

export function ResultCard({
  data,
  title,
  thumbnailUrl,
}: {
  data: PatternData;
  title?: string;
  thumbnailUrl?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-8 max-w-3xl mx-auto">
      <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row gap-8 items-start md:items-center">
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
        <div className="flex-1">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-4">
            {title || "分析结果"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                总颗粒数
              </span>
              <span className="text-2xl font-semibold text-gray-900">
                {data.totals.totalBeads}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                预计时间
              </span>
              <span className="text-2xl font-semibold text-gray-900">
                {data.totals.estimatedMinutes} <span className="text-sm font-normal text-gray-500">分钟</span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                最小网格
              </span>
              <span className="text-2xl font-semibold text-gray-900">
                {data.grid.cols} <span className="text-sm font-normal text-gray-500">×</span> {data.grid.rows}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                颜色种类
              </span>
              <span className="text-2xl font-semibold text-gray-900">
                {data.palette.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 bg-gray-50/50">
        <h3 className="text-sm font-medium text-gray-900 mb-4">颜色明细</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {data.palette.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between"
            >
              <span className="text-sm text-gray-700 truncate mr-2" title={item.label}>
                {item.label}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
