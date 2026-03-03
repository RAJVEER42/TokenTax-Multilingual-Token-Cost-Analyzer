/**
 * SharePage — Renders a shared analysis by short ID.
 *
 * Features:
 * - Fetches analysis from /api/v1/share/:id
 * - Deterministic rendering via ShareResultCard
 * - Open Graph / Twitter metadata for social previews
 * - Copy link button
 * - Download as PNG (image export)
 * - Handles invalid / expired / missing shares
 */

import { useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Copy,
  Download,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ImageDown,
} from "lucide-react";

import { getShare } from "@/services/api";
import { useImageExport } from "@/hooks/useImageExport";
import ShareResultCard from "@/components/share/ShareResultCard";
import { useState, useCallback } from "react";

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const exportRef = useRef<HTMLDivElement>(null);
  const { exporting, exportAsImage } = useImageExport();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["share", id],
    queryFn: ({ signal }) => getShare(id ?? "", signal),
    enabled: Boolean(id),
    retry: false,
    staleTime: Infinity,
  });

  // Set document title for social previews
  useEffect(() => {
    if (data) {
      document.title = `TokenTax Analysis — ${data.language.toUpperCase()} · Fairness ${data.formula_version}`;
    }
    return () => {
      document.title = "TokenTax";
    };
  }, [data]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for insecure contexts
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleExport = useCallback(async () => {
    await exportAsImage(
      exportRef.current,
      `tokentax-${id ?? "analysis"}.png`,
    );
  }, [exportAsImage, id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading shared analysis…</p>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    const is410 = error instanceof Error && error.message.includes("expired");
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <h2 className="text-lg font-semibold text-white">
          {is410 ? "Analysis Expired" : "Analysis Not Found"}
        </h2>
        <p className="text-sm text-slate-400 text-center max-w-md">
          {is410
            ? "This shared analysis has expired and is no longer available."
            : `No shared analysis found with ID "${id ?? ""}". It may have been removed or the link may be incorrect.`}
        </p>
        <Link
          to="/analyze"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to Analyzer
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/analyze"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Analyzer
        </Link>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-white/6"
          >
            {copied ? (
              <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Copied!</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copy Link</>
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-white/6 disabled:opacity-50"
          >
            {exporting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting…</>
            ) : (
              <><ImageDown className="w-3.5 h-3.5" /> Download PNG</>
            )}
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex gap-3 text-xs">
        <span className="bg-indigo-500/15 text-indigo-400 px-2 py-1 rounded">
          ID: {data.short_id}
        </span>
        <span className="bg-white/5 text-slate-400 px-2 py-1 rounded">
          Created: {new Date(data.created_at).toLocaleDateString()}
        </span>
        <span className="bg-white/5 text-slate-400 px-2 py-1 rounded">
          Formula v{data.formula_version}
        </span>
      </div>

      {/* Exportable card */}
      <div ref={exportRef} className="glass rounded-xl p-6">
        <ShareResultCard
          data={data.payload}
          language={data.language}
        />
      </div>

      {/* Input text preview */}
      <details className="glass rounded-xl p-4">
        <summary className="text-sm font-medium text-slate-400 cursor-pointer hover:text-white transition-colors">
          <Download className="w-3.5 h-3.5 inline mr-2" />
          View original input text
        </summary>
        <p className="mt-3 text-sm text-slate-300 whitespace-pre-wrap font-mono bg-slate-900/60 rounded-lg p-4 max-h-60 overflow-y-auto">
          {data.input_text}
        </p>
      </details>
    </div>
  );
}
