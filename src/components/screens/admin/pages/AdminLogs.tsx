import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"

export function AdminLogs() {
  const [query, setQuery] = useState("")
  const [actionType, setActionType] = useState("")
  const [actorId, setActorId] = useState("")
  const [pageId, setPageId] = useState("")
  const [windowDays, setWindowDays] = useState(30)

  const logsQuery = useQuery({
    queryKey: ["admin-actions", "logs-page", actionType, actorId, pageId],
    queryFn: async () =>
      api.getAdminActionLogs(200, {
        actionType: actionType || undefined,
        actorId: actorId || undefined,
        pageId: pageId || undefined,
      }),
  })

  const observabilityQuery = useQuery({
    queryKey: ["admin-actions", "observability", windowDays],
    queryFn: async () => api.getAdminActionObservability(windowDays),
  })

  const filtered = useMemo(() => {
    const logs = logsQuery.data?.items ?? []
    const keyword = query.trim().toLowerCase()
    if (!keyword) return logs

    return logs.filter((log) => {
      return (
        log.action_type.toLowerCase().includes(keyword)
        || log.target_type.toLowerCase().includes(keyword)
        || log.target_id.toLowerCase().includes(keyword)
        || (log.reason || "").toLowerCase().includes(keyword)
        || (log.admin_nickname || "").toLowerCase().includes(keyword)
      )
    })
  }, [logsQuery.data, query])

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-slate-50">활동 로그</h1>
        <div className="grid w-full gap-2 md:w-auto md:grid-cols-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="작업/대상/사유 검색"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none ring-[#FF5D8F]/40 focus:ring-2"
          />
          <input
            value={actionType}
            onChange={(event) => setActionType(event.target.value)}
            placeholder="action_type"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none ring-[#FF5D8F]/40 focus:ring-2"
          />
          <input
            value={pageId}
            onChange={(event) => setPageId(event.target.value)}
            placeholder="page_id (예: about_page)"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none ring-[#FF5D8F]/40 focus:ring-2"
          />
          <input
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
            placeholder="actor_id"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none ring-[#FF5D8F]/40 focus:ring-2"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">관측 지표</h2>
          <select
            aria-label="관측 기간"
            value={windowDays}
            onChange={(event) => setWindowDays(Number(event.target.value))}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
          >
            <option value={7}>최근 7일</option>
            <option value={30}>최근 30일</option>
            <option value={60}>최근 60일</option>
          </select>
        </div>

        {observabilityQuery.isPending ? (
          <div className="grid gap-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`metric-skeleton-${index}`} className="h-16 animate-pulse rounded bg-slate-700/60" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-2 md:grid-cols-4">
              <MetricCard label="일별 publish 합계" value={String(observabilityQuery.data?.summary.published ?? 0)} />
              <MetricCard
                label="rollback 비율"
                value={`${((observabilityQuery.data?.summary.rollback_ratio ?? 0) * 100).toFixed(1)}%`}
              />
              <MetricCard
                label="평균 충돌 발생률"
                value={`${((observabilityQuery.data?.summary.conflict_rate ?? 0) * 100).toFixed(1)}%`}
              />
              <MetricCard label="publish 실패 건수" value={String((observabilityQuery.data?.publish_failure_distribution ?? []).reduce((acc, item) => acc + item.count, 0))} />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-400">일별 publish 횟수</p>
                <div className="max-h-40 space-y-1 overflow-auto text-xs text-slate-300">
                  {(observabilityQuery.data?.daily_publish_counts ?? []).map((row) => (
                    <div key={row.day} className="flex items-center justify-between rounded border border-slate-700 px-2 py-1">
                      <span>{row.day}</span>
                      <span>{row.publish_count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-400">publish 실패 원인 분포</p>
                <div className="max-h-40 space-y-1 overflow-auto text-xs text-slate-300">
                  {(observabilityQuery.data?.publish_failure_distribution ?? []).length === 0 ? (
                    <p className="text-slate-500">실패 이력이 없습니다.</p>
                  ) : (
                    observabilityQuery.data?.publish_failure_distribution.map((row) => (
                      <div key={`${row.reason}-${row.count}`} className="flex items-center justify-between rounded border border-slate-700 px-2 py-1">
                        <span>{row.reason}</span>
                        <span>{row.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">작업</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">대상</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">사유</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">관리자</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">시간</th>
            </tr>
          </thead>
          <tbody>
            {logsQuery.isPending ? (
              Array.from({ length: 8 }).map((_, index) => (
                <tr key={`log-skeleton-${index}`} className="border-b border-slate-700/50">
                  <td className="px-4 py-3" colSpan={5}>
                    <div className="h-7 animate-pulse rounded bg-slate-700/60" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={5}>
                  표시할 로그가 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((log, index) => (
                <tr key={log.id} className={index % 2 === 0 ? "border-b border-slate-700/50 bg-slate-800" : "border-b border-slate-700/50 bg-slate-800/70"}>
                  <td className="px-4 py-3 text-sm text-slate-100">{log.action_type}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{log.target_type}:{log.target_id}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{log.reason || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{log.admin_nickname || "admin"}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{new Date(log.created_at).toLocaleString("ko-KR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-100">{value}</p>
    </div>
  )
}
