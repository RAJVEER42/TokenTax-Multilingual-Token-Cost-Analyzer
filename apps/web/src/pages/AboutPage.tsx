export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">About TokenTax</h1>
      </header>
      <div className="glass p-6 rounded-xl space-y-4">
        <p className="text-slate-300">
          Modern LLMs tokenize text using Byte-Pair Encoding (BPE), predominantly trained on English text.
          This creates a hidden tax on non-English speakers, where similar semantic meaning costs significantly more.
        </p>
      </div>
    </div>
  )
}
