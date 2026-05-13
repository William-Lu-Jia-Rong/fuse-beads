"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { UploadCloud, Loader2, X, Plus } from "lucide-react";
import { ResultCard } from "@/components/ResultCard";
import {
  loadAnalyzeQueue,
  saveAnalyzeQueue,
  clearAnalyzeQueue,
  type StoredAnalyzeJob,
} from "@/lib/analyzeQueueDb";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_QUEUE = 30;

type JobStatus = "pending" | "analyzing" | "done" | "error";

type AnalyzeJob = {
  id: string;
  title: string;
  preview: string;
  status: JobStatus;
  errorMessage?: string;
  patternId?: number;
  analysisJson?: string;
};

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

function newJobId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function Home() {
  const [jobs, setJobs] = useState<AnalyzeJob[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const restoreToastShownRef = useRef(false);

  const queueWorkKey = useMemo(
    () =>
      jobs
        .filter((j) => j.status === "pending" || j.status === "analyzing")
        .map((j) => `${j.id}:${j.status}`)
        .join("|"),
    [jobs]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragLeaveTimerRef.current) {
      clearTimeout(dragLeaveTimerRef.current);
      dragLeaveTimerRef.current = null;
    }
    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
      setIsDragging(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes("Files")) return;
    if (dragLeaveTimerRef.current) {
      clearTimeout(dragLeaveTimerRef.current);
      dragLeaveTimerRef.current = null;
    }
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragLeaveTimerRef.current) clearTimeout(dragLeaveTimerRef.current);
    dragLeaveTimerRef.current = setTimeout(() => {
      dragLeaveTimerRef.current = null;
      setIsDragging(false);
    }, 100);
  };

  const enqueueFiles = useCallback(async (fileList: FileList | File[]) => {
    const raw = Array.from(fileList);
    const images = raw.filter((f) => f.type.startsWith("image/"));
    const nonImages = raw.length - images.length;
    if (nonImages > 0) {
      toast.error(`已跳过 ${nonImages} 个非图片文件`);
    }
    const valid: File[] = [];
    for (const f of images) {
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name} 超过 5MB，已跳过`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) return;

    const room = MAX_QUEUE - jobsRef.current.length;
    if (room <= 0) {
      toast.error(`队列已满（最多 ${MAX_QUEUE} 张），请先清空或等待完成`);
      return;
    }
    const take = valid.slice(0, room);
    if (valid.length > room) {
      toast.error(`最多再排队 ${room} 张，其余已忽略`);
    }

    try {
      const previews = await Promise.all(take.map((f) => readFileAsDataURL(f)));
      const additions: AnalyzeJob[] = take.map((f, i) => ({
        id: newJobId(),
        title: f.name || "未命名图纸",
        preview: previews[i],
        status: "pending" as const,
      }));
      setJobs((prev) => {
        const r = MAX_QUEUE - prev.length;
        if (r <= 0) return prev;
        return [...prev, ...additions.slice(0, r)];
      });
      toast.success(`已加入 ${take.length} 张，将依次自动分析`);
    } catch {
      toast.error("读取图片失败");
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragLeaveTimerRef.current) {
      clearTimeout(dragLeaveTimerRef.current);
      dragLeaveTimerRef.current = null;
    }
    setIsDragging(false);
    const list = e.dataTransfer.files;
    if (list?.length) void enqueueFiles(list);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (list?.length) void enqueueFiles(list);
    e.target.value = "";
  };

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const clearFinished = () => {
    setJobs((prev) => prev.filter((j) => j.status === "pending" || j.status === "analyzing"));
  };

  const clearAll = () => {
    if (jobs.some((j) => j.status === "analyzing")) {
      toast.error("请等待当前分析完成后再清空");
      return;
    }
    if (!confirm("确定清空队列与结果列表？")) return;
    void clearAnalyzeQueue();
    setJobs([]);
  };

  useEffect(() => {
    return () => {
      if (dragLeaveTimerRef.current) clearTimeout(dragLeaveTimerRef.current);
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const raw = await loadAnalyzeQueue();
      if (raw && raw.length > 0) {
        const restored: AnalyzeJob[] = raw.map((row) => {
          const status = row.status as JobStatus;
          if (status === "analyzing") {
            return { ...(row as AnalyzeJob), status: "pending" };
          }
          return row as AnalyzeJob;
        });
        setJobs(restored);
        if (!restoreToastShownRef.current) {
          restoreToastShownRef.current = true;
          toast("已恢复上次未完成的分析队列", { icon: "📂" });
        }
      }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      void saveAnalyzeQueue(jobs as unknown as StoredAnalyzeJob[]);
    }, 400);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [jobs, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    void (async () => {
      if (inFlightRef.current) return;

      const cur = jobsRef.current;
      if (cur.some((j) => j.status === "analyzing")) return;
      const next = cur.find((j) => j.status === "pending");
      if (!next) return;

      inFlightRef.current = true;
      const jobId = next.id;
      const title = next.title;
      const imageBase64 = next.preview;

      try {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status: "analyzing" as const } : j))
        );
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, imageBase64 }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "分析失败");
        }
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: "done" as const,
                  patternId: data.pattern.id,
                  analysisJson: data.pattern.analysisJson,
                }
              : j
          )
        );
        toast.success(`已完成：${title}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "分析失败";
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId && j.status === "analyzing"
              ? { ...j, status: "error" as const, errorMessage: msg }
              : j
          )
        );
        toast.error(`${title}：${msg}`);
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [queueWorkKey, hydrated]);

  const pendingCount = jobs.filter((j) => j.status === "pending").length;
  const analyzingCount = jobs.filter((j) => j.status === "analyzing").length;
  const hasJobs = jobs.length > 0;

  const dropZoneClass = `rounded-2xl border-2 border-dashed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${
    isDragging ? "border-[#0066cc] bg-[#0066cc]/5" : "border-gray-300 hover:bg-gray-50"
  }`;

  return (
    <div className="max-w-3xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">智能分析拼豆图纸</h1>
        <p className="text-lg text-gray-500">
          支持一次选择或拖拽多张截图，将按顺序自动逐张分析并保存到历史。刷新页面不会丢失队列（已保存到本机），关闭标签前请尽量等当前一张分析完成。
        </p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center">
        {!hasJobs ? (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`${dropZoneClass} cursor-pointer group p-12`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <UploadCloud
              className={`w-12 h-12 mx-auto mb-4 transition-colors ${
                isDragging ? "text-[#0066cc]" : "text-gray-400 group-hover:text-gray-600"
              }`}
            />
            <p className="text-gray-600 font-medium mb-1">
              {isDragging ? "松开鼠标以上传" : "点击或拖拽上传（可多选）"}
            </p>
            <p className="text-sm text-gray-400">支持 JPG、PNG 等图片，单张最大 5MB，最多排队 {MAX_QUEUE} 张</p>
          </div>
        ) : (
          <div className="space-y-6 text-left">
            <div
              className={`${dropZoneClass} cursor-pointer group p-6 flex flex-col sm:flex-row items-center justify-center gap-3`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Plus
                className={`w-8 h-8 shrink-0 ${isDragging ? "text-[#0066cc]" : "text-gray-400 group-hover:text-gray-600"}`}
              />
              <div className="text-center sm:text-left">
                <p className="text-sm font-medium text-gray-800">
                  {isDragging ? "松开以添加到队列" : "继续添加图片"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">点击或拖拽，可与当前队列合并</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <p className="text-sm text-gray-600">
                共 <span className="font-semibold text-gray-900">{jobs.length}</span> 张
                {analyzingCount > 0 && (
                  <span className="text-amber-700">
                    {" "}
                    · 正在分析 {analyzingCount} 张
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="text-gray-500">
                    {" "}
                    · 待分析 {pendingCount} 张
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={clearFinished}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100"
                >
                  移除已完成
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50"
                >
                  清空全部
                </button>
              </div>
            </div>

            <ul className="space-y-8">
              {jobs.map((job) => (
                <li key={job.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/40">
                  <div className="flex flex-wrap items-start gap-3 p-4 bg-white border-b border-gray-100">
                    <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={job.preview} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate" title={job.title}>
                        {job.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {job.status === "pending" && "排队中…"}
                        {job.status === "analyzing" && (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            正在分析…
                          </span>
                        )}
                        {job.status === "done" && <span className="text-emerald-700">分析完成</span>}
                        {job.status === "error" && (
                          <span className="text-red-600">失败：{job.errorMessage}</span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={job.status === "analyzing"}
                      onClick={() => removeJob(job.id)}
                      className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-40"
                      title="从列表移除"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {job.status === "done" && job.analysisJson && job.patternId != null && (
                    <div className="p-4 pt-0 bg-white">
                      <ResultCard
                        embedded
                        analysisJson={job.analysisJson}
                        patternId={job.patternId}
                        thumbnailUrl={job.preview}
                        title={job.title}
                        onSaved={(json) => {
                          setJobs((prev) =>
                            prev.map((j) =>
                              j.id === job.id ? { ...j, analysisJson: json } : j
                            )
                          );
                        }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <p className="text-xs text-gray-400 text-center">
              * 分析会优先读取图上的配色表、用量表或印刷数字；若无可靠标注再估算格子。模糊或阴影较大的图片仍可能存在偏差。
            </p>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
