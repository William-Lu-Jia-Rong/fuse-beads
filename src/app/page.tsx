"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { UploadCloud, Loader2 } from "lucide-react";
import { ResultCard, PatternData } from "@/components/ResultCard";
import { normalizePatternData } from "@/lib/paletteTypes";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PatternData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.type.startsWith("image/")) {
        toast.error("请选择图片文件");
        return;
      }
      if (selected.size > 5 * 1024 * 1024) {
        toast.error("图片不能超过5MB");
        return;
      }
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(selected);
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!preview) return;

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file?.name || "未命名图纸",
          imageBase64: preview,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "分析失败");
      }

      setResult(normalizePatternData(data.data));
      toast.success("分析完成");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
          智能分析拼豆图纸
        </h1>
        <p className="text-lg text-gray-500">
          上传拼豆图纸截图，自动提取所需颜色、颗粒数与预期时间。
        </p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center">
        {!preview ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-2xl p-12 hover:bg-gray-50 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-4 group-hover:text-gray-600 transition-colors" />
            <p className="text-gray-600 font-medium mb-1">点击或拖拽上传图纸截图</p>
            <p className="text-sm text-gray-400">支持 JPG, PNG (最大 5MB)</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 mb-6 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              <div
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="text-white font-medium">更换图片</span>
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="bg-[#1d1d1f] text-white px-8 py-3 rounded-full font-medium hover:bg-[#333336] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在分析...
                </>
              ) : (
                "开始分析"
              )}
            </button>
            <p className="mt-4 text-xs text-gray-400">
              * 结果由 AI 视觉模型生成，对于模糊或阴影较大的图片可能存在偏差。
            </p>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </div>

      {result && <ResultCard data={result} thumbnailUrl={preview || undefined} />}
    </div>
  );
}
