import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

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

type CuratedStatus = "all" | "pending" | "approved" | "rejected" | "auto_rejected"
type DrawerMode = "approve" | "reject" | "edit" | "delete" | null

export function AdminCurated() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<CuratedStatus>("all")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<CuratedContent | null>(null)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null)
  const [summaryBeginner, setSummaryBeginner] = useState("")
  const [summaryMid, setSummaryMid] = useState("")
  const [summaryExpert, setSummaryExpert] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [runningCollection, setRunningCollection] = useState(false)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ["admin-curated", status],
    queryFn: async () => api.getAdminCuratedContent(status === "all" ? undefined : status, 200, 0),
  })

  const pendingCountQuery = useQuery({
    queryKey: ["admin-curated-pending-count"],
    queryFn: async () => {
      const response = await api.getAdminCuratedContent("pending", 1, 0)
      return response.total || 0
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

  const openDrawer = (item: CuratedContent, mode: Exclude<DrawerMode, null>) => {
    setSelected(item)
    setDrawerMode(mode)
    setSummaryBeginner(item.summary_beginner || "")
    setSummaryMid(item.summary_mid || "")
    setSummaryExpert(item.summary_expert || "")
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
          <option value="pending">대기</option>
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
          대기 {pendingCountQuery.data || 0}건
        </div>
      </div>

      {resultMessage ? (
        <p className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">{resultMessage}</p>
      ) : null}

      <DataTable
        columns={TABLE_COLUMNS}
        rows={rows}
        loading={listQuery.isPending}
        emptyMessage="조건에 맞는 큐레이션 항목이 없습니다."
        getRowKey={(item) => String(item.id)}
        renderRow={(item) => (
          <>
            <td className="px-4 py-3 text-sm text-slate-300">
              <Badge variant={item.status === "approved" ? "secondary" : item.status === "pending" ? "outline" : "destructive"}>
                {item.status}
              </Badge>
            </td>
            <td className="px-4 py-3 text-sm text-slate-100">
              <p className="line-clamp-1">{item.title}</p>
              <p className="text-xs text-slate-400">{item.repo_owner}/{item.repo_name}</p>
            </td>
            <td className="px-4 py-3 text-sm text-slate-300">{item.category || "미분류"} · ⭐ {item.stars}</td>
            <td className="px-4 py-3 text-sm text-slate-300">Q {item.quality_score ?? "-"} / R {item.relevance_score ?? "-"}</td>
            <td className="px-4 py-3 text-sm text-slate-300">
              <RowActions
                label={`${item.title} 큐레이션`}
                actions={[
                  { key: "approve", label: "승인", onClick: () => openDrawer(item, "approve"), disabled: item.status === "approved" },
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
