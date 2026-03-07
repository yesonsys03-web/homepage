import { Bell, Menu } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"

import { AdminCommandPalette } from "@/components/screens/admin/components/AdminCommandPalette"
import { Button } from "@/components/ui/button"
import type { User } from "@/lib/auth-types"

import { ADMIN_ROUTE_META } from "../constants"

interface AdminHeaderProps {
  user?: User | null
  onOpenMobileNav: () => void
}

export function AdminHeader({ user, onOpenMobileNav }: AdminHeaderProps) {
  const location = useLocation()
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
        return
      }
      event.preventDefault()
      setCommandOpen(true)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const breadcrumb = useMemo(() => {
    if (location.pathname.startsWith("/admin/users")) return ADMIN_ROUTE_META.users.label
    if (location.pathname.startsWith("/admin/content")) return ADMIN_ROUTE_META.content.label
    if (location.pathname.startsWith("/admin/curated")) return ADMIN_ROUTE_META.curated.label
    if (location.pathname.startsWith("/admin/reports")) return ADMIN_ROUTE_META.reports.label
    if (location.pathname.startsWith("/admin/pages")) return ADMIN_ROUTE_META.pages.label
    if (location.pathname.startsWith("/admin/policies")) return ADMIN_ROUTE_META.policies.label
    if (location.pathname.startsWith("/admin/logs")) return ADMIN_ROUTE_META.logs.label
    if (location.pathname.startsWith("/admin/manual")) return ADMIN_ROUTE_META.manual.label
    return ADMIN_ROUTE_META.dashboard.label
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-700 bg-slate-900/90 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 border-slate-700 bg-slate-800 text-slate-200 md:hidden"
          onClick={onOpenMobileNav}
          aria-label="관리자 메뉴 열기"
        >
          <Menu size={16} />
        </Button>
        <p className="text-sm text-slate-400">
          Admin <span className="text-slate-500">/</span> <span className="text-slate-100">{breadcrumb}</span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 border-slate-700 bg-slate-800 px-2.5 text-xs text-slate-300 hover:bg-slate-700"
          onClick={() => setCommandOpen(true)}
        >
          빠른 이동
          <span className="ml-2 rounded border border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-400">⌘K</span>
        </Button>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8 border-slate-700 bg-slate-800 text-slate-200">
          <Bell size={16} />
        </Button>
        <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200">
          @{user?.nickname || "operator"}
        </div>
      </div>

      <AdminCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </header>
  )
}
