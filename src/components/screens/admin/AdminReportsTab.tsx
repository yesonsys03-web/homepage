import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { FormModal } from "@/components/FormModal"
import { AdminTable } from "@/components/screens/admin/AdminTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"

type ReportStatus = "open" | "reviewing" | "resolved" | "rejected" | "all"

type AdminReportRow = {
  id: string
  targetType: string
  targetContent: string
  reason: string
  status: string
  reporter: string
  createdAt: string
}

interface AdminReportsTabProps {
  statusTabs: Array<{ value: ReportStatus; label: string }>
  activeStatus: ReportStatus
  setActiveStatus: (value: ReportStatus) => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  loadingReports: boolean
  filteredReports: AdminReportRow[]
  statusToText: (status: string) => string
  handleUpdateReport: (reportId: string, status: Exclude<ReportStatus, "all">, reason?: string) => Promise<void>
}

export function AdminReportsTab({
  statusTabs,
  activeStatus,
  setActiveStatus,
  searchQuery,
  setSearchQuery,
  loadingReports,
  filteredReports,
  statusToText,
  handleUpdateReport,
}: AdminReportsTabProps) {
  const [pendingReportAction, setPendingReportAction] = useState<{
    reportId: string
    status: Exclude<ReportStatus, "all">
  } | null>(null)
  const [actionReason, setActionReason] = useState("")
  const [submittingAction, setSubmittingAction] = useState(false)

  const openReportActionModal = (reportId: string, status: Exclude<ReportStatus, "all">) => {
    setPendingReportAction({ reportId, status })
    setActionReason("")
  }

  const closeReportActionModal = () => {
    if (submittingAction) return
    setPendingReportAction(null)
    setActionReason("")
  }

  const submitReportAction = async () => {
    if (!pendingReportAction) return
    setSubmittingAction(true)
    try {
      await handleUpdateReport(
        pendingReportAction.reportId,
        pendingReportAction.status,
        actionReason.trim() || undefined,
      )
      closeReportActionModal()
    } finally {
      setSubmittingAction(false)
    }
  }

  const reportActionLabel = pendingReportAction
    ? pendingReportAction.status === "resolved"
      ? "처리"
      : pendingReportAction.status === "reviewing"
        ? "검토"
        : "거절"
    : "처리"

  const columns = useMemo<Array<ColumnDef<AdminReportRow>>>(
    () => [
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <Badge
              variant={
                status === "open"
                  ? "destructive"
                  : status === "reviewing"
                    ? "secondary"
                    : status === "resolved"
                      ? "default"
                      : "outline"
              }
            >
              {statusToText(status)}
            </Badge>
          )
        },
      },
      {
        accessorKey: "targetType",
        header: "유형",
        cell: ({ row }) => <span className="text-[#F4F7FF]">{row.original.targetType}</span>,
      },
      {
        accessorKey: "targetContent",
        header: "내용",
        cell: ({ row }) => <span className="text-[#F4F7FF] max-w-xs truncate block">{row.original.targetContent}</span>,
      },
      {
        accessorKey: "reason",
        header: "사유",
        cell: ({ row }) => <span className="text-[#B8C3E6]">{row.original.reason}</span>,
      },
      {
        accessorKey: "reporter",
        header: "신고자",
        cell: ({ row }) => <span className="text-[#B8C3E6]">{row.original.reporter}</span>,
      },
      {
        accessorKey: "createdAt",
        header: "시간",
        cell: ({ row }) => <span className="text-[#B8C3E6]">{row.original.createdAt}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        header: "작업",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              size="sm"
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white text-xs"
              disabled={row.original.status === "resolved"}
              onClick={() => openReportActionModal(row.original.id, "resolved")}
            >
              처리
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
              onClick={() => openReportActionModal(row.original.id, "reviewing")}
            >
              검토
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
              onClick={() => openReportActionModal(row.original.id, "rejected")}
            >
              거절
            </Button>
          </div>
        ),
      },
    ],
    [statusToText],
  )

  return (
    <TabsContent value="reports">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 flex-wrap">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveStatus(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeStatus === tab.value
                  ? "bg-[#FF5D8F] text-white"
                  : "bg-[#161F42] text-[#B8C3E6] hover:bg-[#1b2550]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="사유/대상/신고자 검색"
          className="w-full md:w-72 bg-[#161F42] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#B8C3E6]/60 focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
        />
      </div>

      <AdminTable
        data={filteredReports}
        columns={columns}
        loading={loadingReports}
        loadingMessage="로딩 중..."
        emptyMessage="표시할 신고가 없습니다."
        initialPageSize={20}
      />
      <FormModal
        open={pendingReportAction !== null}
        title={`신고 ${reportActionLabel} 처리`}
        description="처리 사유는 선택 입력입니다. 비워두면 사유 없이 처리됩니다."
        submitLabel="적용"
        submitting={submittingAction}
        onClose={closeReportActionModal}
        onSubmit={() => void submitReportAction()}
      >
        <textarea
          value={actionReason}
          onChange={(event) => setActionReason(event.target.value)}
          rows={4}
          placeholder="처리 사유 (선택)"
          className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
        />
      </FormModal>
    </TabsContent>
  )
}
