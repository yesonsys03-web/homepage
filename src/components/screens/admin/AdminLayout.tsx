import { useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { AdminHeader } from "@/components/screens/admin/components/AdminHeader"
import { AdminSidebar } from "@/components/screens/admin/components/AdminSidebar"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/use-auth"
import { isAdminRole } from "@/lib/roles"

export function AdminLayout() {
  const { user, isLoading } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const reportsQuery = useQuery({
    queryKey: ["admin-layout", "open-reports"],
    queryFn: async () => api.getReports("open", 1, 0),
    enabled: isAdminRole(user?.role),
  })
  const usersQuery = useQuery({
    queryKey: ["admin-layout", "users"],
    queryFn: async () => api.getAdminUsers(300),
    enabled: isAdminRole(user?.role),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-slate-300">관리자 화면 로딩 중...</div>
      </div>
    )
  }

  if (!isAdminRole(user?.role)) {
    return <Navigate to={user ? "/" : "/login"} replace />
  }

  const users = usersQuery.data?.items ?? []
  const pendingApprovals = users.filter((candidate) => (candidate.status || "active") === "pending").length

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <span className="sr-only">admin</span>
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:block">
        <AdminSidebar
          badges={{
            reports: reportsQuery.data?.total ?? 0,
            users: pendingApprovals,
          }}
        />
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[260px] border-slate-700 bg-slate-900 p-0 sm:max-w-[260px]">
          <AdminSidebar
            badges={{
              reports: reportsQuery.data?.total ?? 0,
              users: pendingApprovals,
            }}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="md:pl-[240px]">
        <AdminHeader user={user} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
