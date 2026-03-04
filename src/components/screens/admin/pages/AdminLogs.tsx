import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"

export function AdminLogs() {
  const [query, setQuery] = useState("")

  const logsQuery = useQuery({
    queryKey: ["admin-actions", "logs-page"],
    queryFn: async () => api.getAdminActionLogs(200),
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
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="작업/대상/사유 검색"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none ring-[#FF5D8F]/40 focus:ring-2 md:w-72"
        />
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
