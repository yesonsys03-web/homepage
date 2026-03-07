import { AlertTriangle, Flag, FolderOpen, MousePointerClick, ShieldAlert, Sparkles, UserPlus, Users } from "lucide-react"
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

function extractCuratedThresholdHistory(reason?: string) {
  const text = (reason || "").trim()
  if (!text) return null

  const match = text.match(/(?:^|,\s*)curated_quality_threshold=(\d+)/)
  if (!match) return null

  return Number(match[1])
}

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
  const policyHistoryQuery = useQuery({
    queryKey: ["admin-actions", "policy-threshold-history", "dashboard"],
    queryFn: async () => api.getAdminActionLogs(6, { actionType: "policy_updated" }),
  })
  const relatedClicksQuery = useQuery({
    queryKey: ["admin-curated-related-clicks", "dashboard"],
    queryFn: async () => api.getAdminCuratedRelatedClicksSummary(30, 5),
  })
  const observabilityQuery = useQuery({
    queryKey: ["admin-actions", "observability", "dashboard"],
    queryFn: async () => api.getAdminActionObservability(30),
  })
  const policiesQuery = useQuery({
    queryKey: ["admin-policies", "dashboard-threshold"],
    queryFn: async () => api.getAdminPolicies(),
  })

  const stats = statsQuery.data
  const totalUsers = stats?.total_users ?? 0
  const totalProjects = stats?.total_projects ?? 0
  const openReports = stats?.open_reports ?? 0
  const thisWeekJoiners = stats?.users_this_week ?? 0
  const usersWeekDelta = stats?.users_week_delta ?? 0
  const projectsWeekDelta = stats?.projects_week_delta ?? 0
  const weeklyTrend = stats?.weekly_trend ?? []
  const curatedReviewQueue = observabilityQuery.data?.curated_review_queue_summary
  const reviewCards = [
    {
      key: "pending",
      label: "일반 대기",
      value: curatedReviewQueue?.pending ?? 0,
      icon: Sparkles,
      accentClassName: "text-sky-300",
    },
    {
      key: "review_license",
      label: "라이선스 검토",
      value: curatedReviewQueue?.review_license ?? 0,
      icon: ShieldAlert,
      accentClassName: "text-amber-300",
    },
    {
      key: "review_duplicate",
      label: "중복 검토",
      value: curatedReviewQueue?.review_duplicate ?? 0,
      icon: AlertTriangle,
      accentClassName: "text-rose-300",
    },
    {
      key: "review_quality",
      label: "품질 검토",
      value: curatedReviewQueue?.review_quality ?? 0,
      icon: Flag,
      accentClassName: "text-emerald-300",
    },
  ]

  const feedItems = (logsQuery.data?.items ?? []).slice(0, 6).map((log) => ({
    id: log.id,
    title: `${log.admin_nickname || "admin"} · ${log.action_type}`,
    subtitle: `${log.target_type}:${log.target_id}`,
    at: new Date(log.created_at).toLocaleString("ko-KR"),
  }))
  const thresholdHistory = (policyHistoryQuery.data?.items ?? [])
    .map((log) => {
      const threshold = extractCuratedThresholdHistory(log.reason)
      if (threshold === null) return null
      return {
        id: log.id,
        threshold,
        admin: log.admin_nickname || "admin",
        at: new Date(log.created_at).toLocaleString("ko-KR"),
      }
    })
    .filter((entry): entry is { id: string; threshold: number; admin: string; at: string } => entry !== null)

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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-medium text-slate-100">Curated 검수 큐</h2>
            <p className="text-xs text-slate-400">자동 수집 이후 어떤 검토 단계에 적체되는지 상태별로 바로 확인합니다.</p>
          </div>
          <Button asChild variant="outline" className="h-9 border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 hover:bg-slate-800">
            <Link to="/admin/curated">검수 화면 열기</Link>
          </Button>
        </div>

        {observabilityQuery.isPending ? (
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="h-32 animate-pulse rounded-xl bg-slate-700/60" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`curated-review-skeleton-${index}`} className="h-24 animate-pulse rounded-lg bg-slate-700/60" />
              ))}
            </div>
          </div>
        ) : observabilityQuery.isError ? (
          <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            검수 큐 집계를 불러오지 못했습니다.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-xl border border-slate-700 bg-[radial-gradient(circle_at_top_left,_rgba(255,93,143,0.16),_transparent_55%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,41,59,0.78))] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Review Queue</p>
              <p className="mt-3 text-4xl font-semibold text-slate-50">{curatedReviewQueue?.total ?? 0}</p>
              <p className="mt-2 text-sm text-slate-300">현재 검수 대기 총합</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-950/40 px-3 py-1 text-xs text-slate-200">
                <span className="text-slate-400">현재 품질 기준</span>
                <span className="font-semibold text-slate-50">Q {policiesQuery.data?.curated_review_quality_threshold ?? 45}</span>
              </div>
              <p className="mt-4 max-w-md text-xs leading-5 text-slate-400">
                대시보드에서 상태별 병목을 먼저 확인한 뒤 `큐레이션 관리` 화면에서 해당 필터로 바로 내려가면 운영 전환이 빠릅니다.
              </p>

              <div className="mt-4 rounded-lg border border-slate-700/80 bg-slate-950/30 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">최근 기준 변경</p>
                <div className="mt-2 space-y-2 text-xs text-slate-300">
                  {thresholdHistory.length === 0 ? (
                    <p className="text-slate-500">기록된 품질 기준 변경 이력이 없습니다.</p>
                  ) : (
                    thresholdHistory.slice(0, 3).map((entry) => (
                      <Link
                        key={entry.id}
                        to={`/admin/logs?actionType=policy_updated&query=${encodeURIComponent("curated_quality_threshold")}&targetLogId=${encodeURIComponent(entry.id)}`}
                        className="flex items-center justify-between gap-3 rounded border border-slate-700/80 px-2 py-1.5 transition hover:border-slate-500 hover:bg-slate-900/70"
                      >
                        <span>Q {entry.threshold}</span>
                        <span className="text-slate-500">{entry.admin} · {entry.at}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {reviewCards.map((card) => {
                const Icon = card.icon
                return (
                      <Link
                        key={card.key}
                        to={`/admin/curated?status=${card.key}`}
                        className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 transition hover:border-slate-500 hover:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-slate-400">{card.label}</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-50">{card.value}</p>
                          </div>
                          <div className={`rounded-lg border border-slate-700 bg-slate-950/60 p-2 ${card.accentClassName}`}>
                            <Icon size={18} />
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article className="rounded-xl border border-slate-700 bg-slate-800 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-slate-100">Curated 추천 클릭</h2>
              <p className="text-xs text-slate-400">최근 {(relatedClicksQuery.data?.window_days ?? 30)}일 기준 추천 전환 상위 조합</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="h-9 border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 hover:bg-slate-800">
                <Link to="/admin/curated/analytics">자세히 보기</Link>
              </Button>
              <div className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-200">
                <MousePointerClick size={20} />
              </div>
            </div>
          </div>

          {relatedClicksQuery.isPending ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="h-28 animate-pulse rounded-lg bg-slate-700/60" />
              <div className="h-28 animate-pulse rounded-lg bg-slate-700/60" />
            </div>
          ) : relatedClicksQuery.isError ? (
            <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              추천 클릭 집계를 불러오지 못했습니다.
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3">
                  <p className="text-xs text-slate-400">총 클릭</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-50">{relatedClicksQuery.data?.total_clicks ?? 0}</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3">
                  <p className="text-xs text-slate-400">고유 조합</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-50">{relatedClicksQuery.data?.unique_pairs ?? 0}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-400">상위 클릭 조합</p>
                  <div className="space-y-2 text-sm text-slate-200">
                    {(relatedClicksQuery.data?.top_pairs ?? []).length === 0 ? (
                      <p className="text-slate-500">아직 추천 클릭 데이터가 없습니다.</p>
                    ) : (
                      relatedClicksQuery.data?.top_pairs.map((pair) => (
                        <div key={`${pair.source_content_id}-${pair.target_content_id}`} className="rounded-lg border border-slate-700 px-3 py-2">
                          <p className="font-medium text-slate-100">{pair.source_title} → {pair.target_title}</p>
                          <p className="mt-1 text-xs text-slate-400">{pair.click_count}회 · 대표 이유 {pair.top_reason_label}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-400">상위 추천 이유</p>
                  <div className="space-y-2 text-sm text-slate-200">
                    {(relatedClicksQuery.data?.top_reasons ?? []).length === 0 ? (
                      <p className="text-slate-500">집계된 추천 이유가 없습니다.</p>
                    ) : (
                      relatedClicksQuery.data?.top_reasons.map((reason) => (
                        <div key={reason.reason_code} className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2">
                          <span>{reason.reason_label}</span>
                          <span className="text-slate-400">{reason.click_count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </article>

        <article className="rounded-xl border border-slate-700 bg-slate-800 p-5">
          <h2 className="text-lg font-medium text-slate-100">빠른 액션</h2>
          <div className="mt-4 grid gap-2">
            <Button asChild className="justify-start bg-[#FF5D8F] text-white hover:bg-[#ff4a83]">
              <Link to="/admin/reports">대기 신고 보기</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
              <Link to="/admin/users">신규 사용자 승인</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
              <Link to="/admin/curated">큐레이션 관리</Link>
            </Button>
          </div>
        </article>
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
          <h2 className="text-lg font-medium text-slate-100">운영 메모</h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            추천 클릭 위젯은 서버에서 계산한 추천 이유를 그대로 집계합니다. 클라이언트와 집계 기준이 분리되지 않도록
            `related` API와 대시보드 요약이 같은 로직을 공유합니다.
          </p>
        </article>
      </section>
    </div>
  )
}
