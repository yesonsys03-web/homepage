import { Flag, FolderOpen, UserPlus, Users } from "lucide-react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ActivityFeed } from "@/components/screens/admin/components/ActivityFeed"
import { KpiCard } from "@/components/screens/admin/components/KpiCard"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

function formatSignedDelta(value: number): string {
  if (value === 0) return "변화 없음"
  return `${value > 0 ? "+" : ""}${value}`
}

export function AdminDashboard() {
  const statsQuery = useQuery({
    queryKey: ["admin-stats", "dashboard"],
    queryFn: async () => api.getAdminStats(),
  })
  const logsQuery = useQuery({
    queryKey: ["admin-actions", "dashboard"],
    queryFn: async () => api.getAdminActionLogs(8),
  })

  const stats = statsQuery.data
  const totalUsers = stats?.total_users ?? 0
  const totalProjects = stats?.total_projects ?? 0
  const openReports = stats?.open_reports ?? 0
  const thisWeekJoiners = stats?.users_this_week ?? 0
  const usersWeekDelta = stats?.users_week_delta ?? 0
  const projectsWeekDelta = stats?.projects_week_delta ?? 0
  const weeklyTrend = stats?.weekly_trend ?? []

  const feedItems = (logsQuery.data?.items ?? []).slice(0, 6).map((log) => ({
    id: log.id,
    title: `${log.admin_nickname || "admin"} · ${log.action_type}`,
    subtitle: `${log.target_type}:${log.target_id}`,
    at: new Date(log.created_at).toLocaleString("ko-KR"),
  }))

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="총 사용자"
          value={String(totalUsers)}
          icon={Users}
          hint="운영 계정 포함"
          delta={`주간 ${formatSignedDelta(usersWeekDelta)}`}
          tone={usersWeekDelta < 0 ? "danger" : "default"}
        />
        <KpiCard
          title="총 프로젝트"
          value={String(totalProjects)}
          icon={FolderOpen}
          hint="삭제 포함"
          delta={`주간 ${formatSignedDelta(projectsWeekDelta)}`}
          tone={projectsWeekDelta < 0 ? "danger" : "default"}
        />
        <KpiCard
          title="대기 신고"
          value={String(openReports)}
          icon={Flag}
          hint="status=open"
          tone={openReports > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="이번 주 신규 가입"
          value={String(thisWeekJoiners)}
          icon={UserPlus}
          hint="이번 주 누적"
          delta={`지난주 ${formatSignedDelta(usersWeekDelta)}`}
          tone="success"
        />
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-800 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-100">주간 유입 추이</h2>
          <p className="text-xs text-slate-400">이번 주 일별 신규 사용자/프로젝트</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyTrend} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={(value: string) => value.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "0.5rem",
                  color: "#f8fafc",
                }}
                labelStyle={{ color: "#cbd5e1" }}
              />
              <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: "12px" }} />
              <Bar dataKey="new_users" name="신규 사용자" fill="#FF5D8F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="new_projects" name="신규 프로젝트" fill="#23D5AB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <ActivityFeed title="최근 활동" items={feedItems} />

        <article className="rounded-xl border border-slate-700 bg-slate-800 p-5">
          <h2 className="text-lg font-medium text-slate-100">빠른 액션</h2>
          <div className="mt-4 grid gap-2">
            <Button asChild className="justify-start bg-[#FF5D8F] text-white hover:bg-[#ff4a83]">
              <Link to="/admin/reports">대기 신고 보기</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
              <Link to="/admin/users">신규 사용자 승인</Link>
            </Button>
          </div>
        </article>
      </section>
    </div>
  )
}
