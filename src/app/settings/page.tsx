"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Loader2, KeyRound, Database } from "lucide-react";
import {
  BEAD_VENDOR_OPTIONS,
  normalizeBeadVendor,
  type BeadVendorId,
} from "@/lib/beadVendors";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [beadVendor, setBeadVendor] = useState<BeadVendorId>("mixed");
  const [status, setStatus] = useState<{
    configured: boolean;
    maskedKey: string | null;
    beadVendor?: BeadVendorId;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [normalizing, setNormalizing] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setStatus(data);
      if (data.baseUrl) setBaseUrl(data.baseUrl);
      setBeadVendor(normalizeBeadVendor(data.beadVendor));
    } catch (err) {
      toast.error("无法加载设置状态");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      const payload: Record<string, string> = { baseUrl, beadVendor };
      if (apiKey.trim()) payload.apiKey = apiKey.trim();

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");

      if (!status?.configured && !apiKey.trim()) {
        toast.success("色号与地址已保存；开始分析前仍需填写 API Key");
      } else {
        toast.success("设置已保存");
      }
      setApiKey(""); // Clear from UI state immediately
      fetchSettings();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNormalizeAllPatterns = async () => {
    if (
      !confirm(
        "将处理数据库中全部历史图案：每条颜色会按当前规则规范化（空色号、英文名转中文名、数量取整），总颗数与配色表对齐；未记录色号体系的旧项目会标记为「混合」。不调用 AI、不重新识图。确定执行？"
      )
    ) {
      return;
    }
    setNormalizing(true);
    try {
      const res = await fetch("/api/patterns/normalize-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "处理失败");
      toast.success(`已更新 ${data.updated} 个项目（库中共 ${data.total} 条；无需改写的已跳过）`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "处理失败");
    } finally {
      setNormalizing(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("确定要清除服务端保存的 API 密钥吗？")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      if (!res.ok) throw new Error("清除失败");
      toast.success("已清除设置");
      setApiKey("");
      setBaseUrl("");
      fetchSettings();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">服务设置</h1>
        <p className="text-gray-500 text-sm">
          密钥仅保存在服务端，不会在浏览器端暴露。色号供应商决定分析结果中的「色号」字段遵循哪套官方色卡（如 MARD、Perler）。
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200">
        {status?.configured && (
          <div className="mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">API Key 已配置</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{status.maskedKey}</p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="text-sm text-red-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              清除
            </button>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              拼豆色号供应商
            </label>
            <select
              value={beadVendor}
              onChange={(e) => setBeadVendor(normalizeBeadVendor(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm"
            >
              {BEAD_VENDOR_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.nameZh} — {opt.hint}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              分析图纸时模型会按此处选择严格输出对应品牌的色号格式；与图上印刷不一致时宁可标「待定」也不乱套其它品牌编号。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={status?.configured ? "输入新密钥以覆盖" : "sk-..."}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              Base URL <span className="text-xs text-gray-400 font-normal">(可选，用于代理)</span>
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#1d1d1f] text-white px-8 py-3.5 rounded-xl font-medium hover:bg-[#333336] transition-all disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {status?.configured ? "更新设置" : "保存设置（可先只保存色号）"}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">历史配色数据</h2>
            <p className="text-sm text-gray-500 mt-1">
              对已有分析结果批量执行与「新分析」相同的 JSON 规范化（含合计数对齐），并为旧记录补上默认色号体系字段，便于在结果卡片上区分。
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={normalizing}
          onClick={handleNormalizeAllPatterns}
          className="w-full sm:w-auto border border-gray-300 bg-white text-gray-900 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60 flex justify-center items-center gap-2"
        >
          {normalizing && <Loader2 className="w-4 h-4 animate-spin" />}
          一键整理全部历史图案
        </button>
      </div>
    </div>
  );
}
