import { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { DataTable, type DataTableColumn } from "@/components/screens/admin/components/DataTable"
import { EditDrawer } from "@/components/screens/admin/components/EditDrawer"
import { RowActions } from "@/components/screens/admin/components/RowActions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api, type CuratedContent } from "@/lib/api"

const TABLE_COLUMNS: DataTableColumn[] = [
  { key: "status", header: "상태" },
  { key: "title", header: "제목" },
  { key: "meta", header: "메타" },
  { key: "score", header: "점수" },
  { key: "actions", header: "작업" },
]

type CuratedStatus =
  | "all"
  | "pending"
  | "review_license"
  | "review_duplicate"
  | "review_quality"
  | "approved"
  | "rejected"
  | "auto_rejected"
type DrawerMode =
  | "approve"
  | "review_license"
  | "review_duplicate"
  | "review_quality"
  | "reject"
  | "edit"
  | "delete"
  | null

const CURATED_REVIEW_QUEUE_STATUSES = ["pending", "review_license", "review_duplicate", "review_quality"] as const

function getCuratedStatusMeta(status: string) {
  if (status === "approved") return { label: "승인", variant: "secondary" as const }
  if (status === "review_license") return { label: "라이선스 검토", variant: "outline" as const }
  if (status === "review_duplicate") return { label: "중복 검토", variant: "outline" as const }
  if (status === "review_quality") return { label: "품질 검토", variant: "outline" as const }
  if (status === "pending") return { label: "일반 대기", variant: "outline" as const }
  if (status === "auto_rejected") return { label: "자동반려", variant: "destructive" as const }
  if (status === "rejected") return { label: "반려", variant: "destructive" as const }
  return { label: status, variant: "outline" as const }
}

function getReviewReasonLabel(reasonCode: string): string {
  if (reasonCode === "canonical_url_match") return "URL 일치"
  if (reasonCode === "owner_repo_match") return "owner/repo 일치"
  if (reasonCode === "title_match") return "제목 일치"
  if (reasonCode === "license_missing") return "라이선스 없음"
  if (reasonCode === "license_unrecognized") return "라이선스 불명확"
  if (reasonCode === "quality_below_threshold") return "품질 기준 미달"
  return reasonCode
}

function getReviewReasonDescription(reasonCode: string): string {
  if (reasonCode === "canonical_url_match") return "같은 canonical URL이 기존 항목 또는 같은 배치 후보와 겹칩니다."
  if (reasonCode === "owner_repo_match") return "같은 GitHub owner/repo 조합이 이미 존재합니다."
  if (reasonCode === "title_match") return "정규화된 제목이 기존 항목과 동일합니다."
  if (reasonCode === "license_missing") return "GitHub 응답에 라이선스가 비어 있어 수동 확인이 필요합니다."
  if (reasonCode === "license_unrecognized") return "라이선스 값이 unknown/noassertion/other 계열이라 재사용 가능 여부를 확인해야 합니다."
  if (reasonCode === "quality_below_threshold") return "현재 운영 정책의 curated 품질 검토 기준을 통과하지 못했습니다."
  return reasonCode
}

export function AdminCurated() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStatusParam = searchParams.get("status")
  const initialStatus = (
    initialStatusParam && ["all", ...CURATED_REVIEW_QUEUE_STATUSES, "approved", "rejected", "auto_rejected"].includes(initialStatusParam)
      ? initialStatusParam
      : "all"
  ) as CuratedStatus
  const [status, setStatus] = useState<CuratedStatus>(initialStatus)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<CuratedContent | null>(null)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null)
  const [summaryBeginner, setSummaryBeginner] = useState("")
  const [summaryMid, setSummaryMid] = useState("")
  const [summaryExpert, setSummaryExpert] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [runningCollection, setRunningCollection] = useState(false)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [showReviewReasonGuide, setShowReviewReasonGuide] = useState(false)

  useEffect(() => {
    const currentParam = searchParams.get("status")
    if (currentParam === status || (status === "all" && currentParam === null)) {
      return
    }

    const nextParams = new URLSearchParams(searchParams)
    if (status === "all") {
      nextParams.delete("status")
    } else {
      nextParams.set("status", status)
    }
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams, status])

  useEffect(() => {
    const currentParam = searchParams.get("status")
    if (!currentParam) {
      if (status !== "all") {
        setStatus("all")
      }
      return
    }

    const nextStatus = (
      ["all", ...CURATED_REVIEW_QUEUE_STATUSES, "approved", "rejected", "auto_rejected"].includes(currentParam)
        ? currentParam
        : "all"
    ) as CuratedStatus
    if (nextStatus !== status) {
      setStatus(nextStatus)
    }
  }, [searchParams, status])

  const listQuery = useQuery({
    queryKey: ["admin-curated", status],
    queryFn: async () => api.getAdminCuratedContent(status === "all" ? undefined : status, 200, 0),
  })

  const pendingCountQuery = useQuery({
    queryKey: ["admin-curated-pending-count"],
    queryFn: async () => {
      const responses = await Promise.all(
        CURATED_REVIEW_QUEUE_STATUSES.map((queueStatus) => api.getAdminCuratedContent(queueStatus, 1, 0)),
      )
      return responses.reduce((sum, response) => sum + (response.total || 0), 0)
    },
  })

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const source = listQuery.data?.items || []
    if (!query) {
      return source
    }
    return source.filter((item) => (
      item.title.toLowerCase().includes(query)
      || item.repo_name.toLowerCase().includes(query)
      || item.repo_owner.toLowerCase().includes(query)
      || item.category.toLowerCase().includes(query)
    ))
  }, [listQuery.data?.items, search])

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-curated"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-curated-pending-count"] }),
    ])
  }

  const reviewReasonLabels = (item: CuratedContent): string[] => {
    return (item.review_metadata?.reason_codes ?? []).map(getReviewReasonLabel)
  }

  const openDrawer = (item: CuratedContent, mode: Exclude<DrawerMode, null>) => {
    setSelected(item)
    setDrawerMode(mode)
    setSummaryBeginner(item.summary_beginner || "")
    setSummaryMid(item.summary_mid || "")
    setSummaryExpert(item.summary_expert || "")
    setThumbnailUrl(item.thumbnail_url || "")
    setRejectReason(item.reject_reason || "")
  }

  const closeDrawer = (open: boolean) => {
    if (!open) {
      setSelected(null)
      setDrawerMode(null)
      setSubmitting(false)
    }
  }

  const handleSubmitDrawer = async () => {
    if (!selected || !drawerMode) {
      return
    }

    setSubmitting(true)
    setResultMessage(null)
    try {
      if (drawerMode === "approve") {
        await api.updateAdminCuratedContent(selected.id, { status: "approved", reject_reason: "" })
      }

      if (drawerMode === "review_license") {
        await api.updateAdminCuratedContent(selected.id, { status: "review_license", reject_reason: "" })
      }

      if (drawerMode === "review_duplicate") {
        await api.updateAdminCuratedContent(selected.id, { status: "review_duplicate", reject_reason: "" })
      }

      if (drawerMode === "review_quality") {
        await api.updateAdminCuratedContent(selected.id, { status: "review_quality", reject_reason: "" })
      }

      if (drawerMode === "reject") {
        await api.updateAdminCuratedContent(selected.id, {
          status: "rejected",
          reject_reason: rejectReason.trim() || "운영 기준 미충족",
        })
      }

      if (drawerMode === "edit") {
        await api.updateAdminCuratedContent(selected.id, {
          summary_beginner: summaryBeginner.trim(),
          summary_mid: summaryMid.trim(),
          summary_expert: summaryExpert.trim(),
          thumbnail_url: thumbnailUrl.trim(),
        })
      }

      if (drawerMode === "delete") {
        await api.deleteAdminCuratedContent(selected.id)
      }

      await refresh()
      setResultMessage("작업이 반영되었습니다.")
      closeDrawer(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "작업 처리에 실패했습니다."
      setResultMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRunCollection = async () => {
    setRunningCollection(true)
    setResultMessage(null)
    try {
      const result = await api.runAdminCuratedCollection()
      await refresh()
      setResultMessage(`수집 완료: ${result.created}건 생성 (오늘 ${result.collected_today}/${result.daily_limit})`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "수집 실행에 실패했습니다."
      setResultMessage(message)
    } finally {
      setRunningCollection(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">큐레이션 관리</h1>
          <p className="mt-1 text-sm text-slate-400">대기 콘텐츠 승인/반려 및 요약 편집을 처리합니다.</p>
        </div>
        <Button
          onClick={() => void handleRunCollection()}
          disabled={runningCollection}
          className="bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
        >
          {runningCollection ? "수집 실행 중..." : "수집 실행"}
        </Button>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as CuratedStatus)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="all">전체</option>
          <option value="pending">일반 대기</option>
          <option value="review_license">라이선스 검토</option>
          <option value="review_duplicate">중복 검토</option>
          <option value="review_quality">품질 검토</option>
          <option value="approved">승인</option>
          <option value="rejected">반려</option>
          <option value="auto_rejected">자동반려</option>
        </select>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="제목/레포/카테고리 검색"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none ring-[#FF5D8F]/40 focus:ring-2"
        />
        <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
          검수 대기 {pendingCountQuery.data || 0}건
        </div>
      </div>

      {resultMessage ? (
        <p className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">{resultMessage}</p>
      ) : null}

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Review Reason Guide</p>
            <p className="mt-1 text-xs text-slate-500">reason chip 의미가 헷갈릴 때만 펼쳐 확인합니다.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowReviewReasonGuide((value) => !value)}
            className="h-9 border-slate-700 bg-slate-950/50 px-3 text-xs text-slate-100 hover:bg-slate-800"
          >
            {showReviewReasonGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showReviewReasonGuide ? "가이드 접기" : "가이드 펼치기"}
          </Button>
        </div>
        {showReviewReasonGuide ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {[
              "canonical_url_match",
              "owner_repo_match",
              "title_match",
              "license_missing",
              "license_unrecognized",
              "quality_below_threshold",
            ].map((reasonCode) => (
              <div key={reasonCode} className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2">
                <p className="text-xs font-medium text-slate-100">{getReviewReasonLabel(reasonCode)}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">{getReviewReasonDescription(reasonCode)}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <DataTable
        columns={TABLE_COLUMNS}
        rows={rows}
        loading={listQuery.isPending}
        emptyMessage="조건에 맞는 큐레이션 항목이 없습니다."
        getRowKey={(item) => String(item.id)}
        renderRow={(item) => (
          <>
            <td className="px-4 py-3 text-sm text-slate-300">
              <Badge variant={getCuratedStatusMeta(item.status).variant}>
                {getCuratedStatusMeta(item.status).label}
              </Badge>
            </td>
            <td className="px-4 py-3 text-sm text-slate-100">
              <p className="line-clamp-1">{item.title}</p>
              <p className="text-xs text-slate-400">{item.repo_owner}/{item.repo_name}</p>
              {item.source_url ? (
                <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-sky-400 hover:underline truncate block max-w-[260px]">{item.source_url}</a>
              ) : (
                <p className="text-[11px] text-red-400">source_url 없음</p>
              )}
              {reviewReasonLabels(item).length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {reviewReasonLabels(item).map((label) => (
                    <span key={`${item.id}-${label}`} className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
              {item.review_metadata?.quality_score_value !== undefined ? (
                <p className="mt-1 text-[11px] text-slate-500">
                  품질 점수 {item.review_metadata.quality_score_value}
                  {item.review_metadata.quality_threshold !== undefined ? ` / 기준 ${item.review_metadata.quality_threshold}` : ""}
                </p>
              ) : null}
              {(item.review_metadata?.license_value ?? "") !== "" ? (
                <p className="mt-1 text-[11px] text-slate-500">감지 라이선스: {item.review_metadata?.license_value}</p>
              ) : null}
              {(item.review_metadata?.matched_existing_ids?.length ?? 0) > 0 ? (
                <p className="mt-1 text-[11px] text-slate-500">기존 항목 ID: {item.review_metadata?.matched_existing_ids?.join(", ")}</p>
              ) : null}
              {(item.review_metadata?.matched_processed_titles?.length ?? 0) > 0 ? (
                <p className="mt-1 text-[11px] text-slate-500">같은 배치 후보: {item.review_metadata?.matched_processed_titles?.join(", ")}</p>
              ) : null}
            </td>
            <td className="px-4 py-3 text-sm text-slate-300">{item.category || "미분류"} · ⭐ {item.stars}</td>
            <td className="px-4 py-3 text-sm text-slate-300">Q {item.quality_score ?? "-"} / R {item.relevance_score ?? "-"}</td>
            <td className="px-4 py-3 text-sm text-slate-300">
              <RowActions
                label={`${item.title} 큐레이션`}
                actions={[
                  { key: "approve", label: "승인", onClick: () => openDrawer(item, "approve"), disabled: item.status === "approved" },
                  { key: "review-license", label: "라이선스 검토", onClick: () => openDrawer(item, "review_license"), disabled: item.status === "review_license" },
                  { key: "review-duplicate", label: "중복 검토", onClick: () => openDrawer(item, "review_duplicate"), disabled: item.status === "review_duplicate" },
                  { key: "review-quality", label: "품질 검토", onClick: () => openDrawer(item, "review_quality"), disabled: item.status === "review_quality" },
                  { key: "reject", label: "반려", onClick: () => openDrawer(item, "reject") },
                  { key: "edit", label: "요약 편집", onClick: () => openDrawer(item, "edit") },
                  { key: "delete", label: "삭제", onClick: () => openDrawer(item, "delete"), danger: true },
                ]}
              />
            </td>
          </>
        )}
      />

      <EditDrawer
        open={Boolean(selected && drawerMode)}
        title={selected ? `${selected.title} 작업` : "큐레이션 작업"}
        description="승인/반려/요약 편집/삭제를 처리합니다."
        submitting={submitting}
        onOpenChange={closeDrawer}
        onSubmit={() => void handleSubmitDrawer()}
      >
        {drawerMode === "approve" ? <p className="text-sm text-slate-300">이 항목을 승인 상태로 변경합니다.</p> : null}

        {drawerMode === "review_license" ? <p className="text-sm text-slate-300">이 항목을 라이선스 검토 상태로 이동합니다.</p> : null}

        {drawerMode === "review_duplicate" ? <p className="text-sm text-slate-300">이 항목을 중복 검토 상태로 이동합니다.</p> : null}

        {drawerMode === "review_quality" ? <p className="text-sm text-slate-300">이 항목을 품질 검토 상태로 이동합니다.</p> : null}

        {drawerMode === "reject" ? (
          <label className="block text-sm text-slate-300">
            반려 사유
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </label>
        ) : null}

        {drawerMode === "edit" ? (
          <>
            <label className="block text-sm text-slate-300">
              커버 이미지 URL
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(event) => setThumbnailUrl(event.target.value)}
                placeholder="https://example.com/image.png (비워두면 GitHub 기본 이미지 사용)"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500"
              />
              {thumbnailUrl.trim() ? (
                <img src={thumbnailUrl.trim()} alt="미리보기" className="mt-2 h-28 w-full rounded object-cover" />
              ) : null}
            </label>
            <label className="block text-sm text-slate-300">
              초보자 요약
              <textarea
                value={summaryBeginner}
                onChange={(event) => setSummaryBeginner(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </label>
            <label className="block text-sm text-slate-300">
              중급자 요약
              <textarea
                value={summaryMid}
                onChange={(event) => setSummaryMid(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </label>
            <label className="block text-sm text-slate-300">
              전문가 요약
              <textarea
                value={summaryExpert}
                onChange={(event) => setSummaryExpert(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </label>
          </>
        ) : null}

        {drawerMode === "delete" ? (
          <p className="text-sm text-red-300">이 항목을 영구 삭제합니다. 되돌릴 수 없습니다.</p>
        ) : null}
      </EditDrawer>
    </section>
  )
}
