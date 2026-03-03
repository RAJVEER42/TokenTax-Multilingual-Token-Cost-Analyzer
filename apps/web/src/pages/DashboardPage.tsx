/**
 * DashboardPage — System status overview with live health check.
 *
 * Shows API health, available tokenizers, supported languages,
 * and a call-to-action linking to the analysis page.
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  Cpu,
  Globe,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

import { healthCheck, fetchTokenizers, fetchLanguages } from "@/services/api";

/** Stat card with icon, label, value, and subtitle. */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  status,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
  readonly value: string;
  readonly sub: string;
  readonly status?: "ok" | "error" | "loading";
}) {
  const statusColor =
    status === "ok"
      ? "text-emerald-400"
      : status === "error"
        ? "text-red-400"
        : "text-slate-400";

  return (
    <div className="glass p-5 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <Icon className={`h-4 w-4 ${statusColor}`} />
      </div>
      <p className="text-3xl font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

export default function DashboardPage() {
  // ── Queries ──────────────────────────────────────────
  const health = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => healthCheck(signal),
    refetchInterval: 30_000,
  });

  const tokenizers = useQuery({
    queryKey: ["tokenizers"],
    queryFn: ({ signal }) => fetchTokenizers(signal),
    staleTime: 1000 * 60 * 10,
  });

  const languages = useQuery({
    queryKey: ["languages"],
    queryFn: ({ signal }) => fetchLanguages(signal),
    staleTime: 1000 * 60 * 30,
  });

  // ── Derived ──────────────────────────────────────────
  const isHealthy = health.data?.status === "ok";
  const healthStatus = health.isLoading
    ? "loading"
    : isHealthy
      ? "ok"
      : "error";

  const tokenizerCount = tokenizers.data?.count ?? 0;
  const languageCount = languages.data?.count ?? 0;

  const tokenizerNames =
    tokenizers.data?.tokenizers
      .map((t) => t.display_name)
      .join(", ") ?? "Loading…";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">System Dashboard</h1>
        <p className="text-slate-400 mt-1">
          Real-time tokenizer and API status overview.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          label="API Status"
          value={
            health.isLoading
              ? "Checking…"
              : isHealthy
                ? "Healthy"
                : "Unreachable"
          }
          sub={health.data?.message ?? "Connecting to backend"}
          status={healthStatus}
        />
        <StatCard
          icon={Cpu}
          label="Tokenizers"
          value={String(tokenizerCount)}
          sub={tokenizerNames}
          status={tokenizers.isSuccess ? "ok" : "loading"}
        />
        <StatCard
          icon={Globe}
          label="Languages"
          value={String(languageCount)}
          sub="Supported for analysis"
          status={languages.isSuccess ? "ok" : "loading"}
        />
        <StatCard
          icon={Zap}
          label="Engine"
          value="Phase 9"
          sub="Performance & QA"
          status="ok"
        />
      </div>

      {/* Connection status banner */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-3">
          {health.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : isHealthy ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <XCircle className="h-5 w-5 text-red-400" />
          )}
          <div>
            <p className="text-sm font-medium text-white">
              {health.isLoading
                ? "Checking backend connection…"
                : isHealthy
                  ? "Backend connected and operational"
                  : "Backend is unreachable"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {isHealthy
                ? "All tokenizer adapters are available for analysis."
                : "Start the API server with `docker compose up api` to enable analysis."}
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="glass rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-50">
        <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
          <Zap className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Ready to Analyze
        </h3>
        <p className="text-slate-400 text-sm max-w-md mb-5">
          Compare how different tokenizers process your text across languages.
          Discover token cost disparities and fairness scores.
        </p>
        <Link
          to="/analyze"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Go to Analyzer
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
