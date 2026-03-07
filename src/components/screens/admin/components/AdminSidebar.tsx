import {
  BookOpenText,
  FileText,
  Flag,
  FolderOpen,
  LayoutDashboard,
  Sparkles,
  ScrollText,
  Settings,
  Users,
} from "lucide-react"
import { NavLink } from "react-router-dom"

import { cn } from "@/lib/utils"

import { ADMIN_ROUTE_META, type AdminRouteKey } from "../constants"

const NAV_ITEMS: Array<{ key: AdminRouteKey; icon: typeof LayoutDashboard }> = [
  { key: "dashboard", icon: LayoutDashboard },
  { key: "users", icon: Users },
  { key: "content", icon: FolderOpen },
  { key: "curated", icon: Sparkles },
  { key: "reports", icon: Flag },
  { key: "pages", icon: FileText },
  { key: "policies", icon: Settings },
  { key: "logs", icon: ScrollText },
  { key: "manual", icon: BookOpenText },
]

interface AdminSidebarProps {
  badges: Partial<Record<AdminRouteKey, number>>
  onNavigate?: () => void
}

export function AdminSidebar({ badges, onNavigate }: AdminSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 w-[240px] flex-col border-r border-slate-700 bg-slate-900 px-3 py-4">
      <div className="mb-4 px-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">VC Admin</p>
        <p className="mt-1 text-lg font-semibold text-slate-50">Operations</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-1" aria-label="관리자 네비게이션">
        {NAV_ITEMS.map((item) => {
          const meta = ADMIN_ROUTE_META[item.key]
          const Icon = item.icon
          const badge = badges[item.key]

          return (
            <NavLink
              key={item.key}
              to={meta.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "group flex items-center justify-between rounded-lg border-l-2 border-transparent px-3 py-2 text-sm text-slate-400 transition duration-150 ease-in hover:bg-slate-800 hover:text-slate-200",
                  isActive && "border-[#FF5D8F] bg-[#FF5D8F]/10 text-[#FF5D8F]"
                )
              }
            >
              <span className="flex items-center gap-3">
                <Icon size={18} />
                <span>{meta.label}</span>
              </span>
              {badge && badge > 0 ? (
                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-100">{badge}</span>
              ) : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-slate-700 pt-3">
        <a
          href="/"
          className="block rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        >
          ← 사이트로 돌아가기
        </a>
      </div>
    </aside>
  )
}
