export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">System Dashboard</h1>
        <p className="text-slate-400 mt-1">Real-time tokenizer and API metrics overview.</p>
      </header>

      {/* Placeholder Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Analyses Run', value: '0', sub: 'Awaiting first run' },
          { label: 'System Status', value: 'Healthy', sub: 'All services connected' },
          { label: 'Active Tokenizers', value: '2', sub: 'tiktoken, sentencepiece' },
        ].map((stat, i) => (
          <div key={i} className="glass p-5 rounded-xl">
            <p className="text-sm font-medium text-slate-400">{stat.label}</p>
            <p className="text-3xl font-semibold text-white mt-2">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="glass p-6 rounded-xl min-h-[400px] flex items-center justify-center border-dashed border-2 border-white/10 bg-transparent">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Ready for Phase 2</h3>
          <p className="text-slate-400 text-sm">
            The core infrastructure is running. The Analysis Engine will be connected here in the next phase to visualize real token disparities.
          </p>
        </div>
      </div>
    </div>
  )
}
