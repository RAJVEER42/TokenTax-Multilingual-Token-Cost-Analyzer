import { Bell, Search, User } from 'lucide-react'

export default function TopBar() {
  return (
    <header className="h-16 flex-shrink-0 glass border-b border-white/[0.06] flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-2 text-slate-400 bg-white/[0.03] px-3 py-1.5 rounded-md border border-white/[0.05] w-64 focus-within:border-indigo-500/50 focus-within:bg-white/[0.05] transition-all">
        <Search className="w-4 h-4" />
        <input
          type="text"
          placeholder="Search analysis runs..."
          className="bg-transparent border-none outline-none text-sm placeholder:text-slate-500 w-full text-slate-200"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] rounded-lg transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
        </button>

        <div className="w-px h-5 bg-white/[0.1]" />

        <button className="flex items-center gap-2 hover:bg-white/[0.05] p-1 pr-3 rounded-full transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-slate-300">Reseacher</span>
        </button>
      </div>
    </header>
  )
}
