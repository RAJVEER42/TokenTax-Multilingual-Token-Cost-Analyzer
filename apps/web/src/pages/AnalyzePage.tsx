export default function AnalyzePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Compare Languages</h1>
        <p className="text-slate-400 mt-1">Input text to see how tokenization differs across languages.</p>
      </header>
      
      <div className="glass p-6 rounded-xl space-y-4">
         <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Base Text (English)</label>
            <textarea 
              className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Enter text here..."
            />
         </div>
         <div className="flex justify-end pt-2">
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
              Run Analysis
            </button>
         </div>
      </div>
    </div>
  )
}
