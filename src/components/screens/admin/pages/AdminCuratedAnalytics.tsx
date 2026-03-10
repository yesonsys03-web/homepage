import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { api, type AdminCuratedRelatedClicksSource, type AdminCuratedRelatedClicksSummary } from "@/lib/api"

const WINDOW_OPTIONS = [7, 30, 90] as const

export function AdminCuratedAnalytics() {
  const [windowDays, setWindowDays] = useState<number>(30)
  const [query, setQuery] = useState("")
  const [sourceContentId, setSourceContentId] = useState<number>(0)

  const analyticsQuery = useQuery<AdminCuratedRelatedClicksSummary>({
    queryKey: ["admin-curated-related-clicks", "analytics-page", windowDays, sourceContentId],
    queryFn: async () =>
      api.getAdminCuratedRelatedClicksSummary(windowDays, 20, sourceContentId || undefined),
  })
  const availableSources =
    ((analyticsQuery.data as AdminCuratedRelatedClicksSummary | undefined)?.available_sources ?? [])

  const filteredPairs = useMemo(() => {
    const pairs = analyticsQuery.data?.top_pairs ?? []
    const keyword = query.trim().toLowerCase()
    if (!keyword) return pairs
    return pairs.filter((pair) => {
      return [pair.source_title, pair.target_title, pair.top_reason_label]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    })
  }, [analyticsQuery.data?.top_pairs, query])

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">큐레이션 추천 분석</h1>
          <p className="mt-1 text-sm text-slate-400">정규화된 추천 사유 코드 기준으로 클릭 전환을 추적합니다.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="소스/타겟/사유 검색"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none ring-[#FF5D8F]/40 focus:ring-2"
          />
          <select
            aria-label="소스 콘텐츠"
            value={sourceContentId}
            onChange={(event) => setSourceContentId(Number(event.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none ring-[#FF5D8F]/40 focus:ring-2"
          >
            <option value={0}>전체 소스</option>
            {availableSources.map((source: AdminCuratedRelatedClicksSource) => (
              <option key={source.content_id} value={source.content_id}>{source.title}</option>
            ))}
          </select>
          <select
            aria-label="집계 기간"
            value={windowDays}
            onChange={(event) => setWindowDays(Number(event.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none ring-[#FF5D8F]/40 focus:ring-2"
          >
            {WINDOW_OPTIONS.map((days) => (
              <option key={days} value={days}>{`최근 ${days}일`}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="총 클릭" value={String(analyticsQuery.data?.total_clicks ?? 0)} />
        <MetricCard label="고유 조합" value={String(analyticsQuery.data?.unique_pairs ?? 0)} />
        <MetricCard label="상위 사유 수" value={String((analyticsQuery.data?.top_reasons ?? []).length)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <article className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
          <div className="border-b border-slate-700 bg-slate-900 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-100">상위 추천 전환 조합</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-900/70">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">소스</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">타겟</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">대표 사유</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">클릭</th>
              </tr>
            </thead>
            <tbody>
              {analyticsQuery.isPending ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`analytics-pair-skeleton-${index}`} className="border-b border-slate-700/50">
                    <td className="px-4 py-3" colSpan={4}>
                      <div className="h-7 animate-pulse rounded bg-slate-700/60" />
                    </td>
                  </tr>
                ))
              ) : analyticsQuery.isError ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-red-200" colSpan={4}>
                    추천 클릭 분석을 불러오지 못했습니다.
                  </td>
                </tr>
              ) : filteredPairs.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={4}>
                    표시할 추천 클릭 조합이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredPairs.map((pair, index) => (
                  <tr key={`${pair.source_content_id}-${pair.target_content_id}`} className={index % 2 === 0 ? "border-b border-slate-700/50 bg-slate-800" : "border-b border-slate-700/50 bg-slate-800/70"}>
                    <td className="px-4 py-3 text-sm text-slate-100">{pair.source_title}</td>
                    <td className="px-4 py-3 text-sm text-slate-200">{pair.target_title}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{pair.top_reason_label}</td>
                    <td className="px-4 py-3 text-sm text-slate-200">{pair.click_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </article>

        <article className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <h2 className="text-sm font-semibold text-slate-100">정규화된 추천 사유</h2>
          <p className="mt-1 text-xs text-slate-400">문구가 바뀌어도 집계가 분산되지 않도록 코드 기준으로 저장합니다.</p>
          <div className="mt-4 space-y-2">
            {(analyticsQuery.data?.top_reasons ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">집계된 사유가 없습니다.</p>
            ) : (
              (analyticsQuery.data?.top_reasons ?? []).map((reason) => (
                <div key={reason.reason_code} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-100">{reason.reason_label}</span>
                    <span className="text-sm text-slate-300">{reason.click_count}</span>
                  </div>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{reason.reason_code}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-50">{value}</p>
    </div>
  )
}
