import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Zap,
  DollarSign,
  Info,
  Coins,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analyze',   icon: Zap,             label: 'Analyze'   },
  { to: '/pricing',   icon: DollarSign,      label: 'Pricing'   },
  { to: '/about',     icon: Info,            label: 'About'     },
]

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 flex flex-col glass border-r border-white/6">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/6">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Coins className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-wide">TokenTax</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Token Analyzer</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-slate-500">v0.6.0 · Phase 6</span>
        </div>
      </div>
    </aside>
  )
}
