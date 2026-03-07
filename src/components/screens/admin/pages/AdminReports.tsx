import { useState } from "react"

import { EditDrawer } from "@/components/screens/admin/components/EditDrawer"
import { RowActions } from "@/components/screens/admin/components/RowActions"
import { DataTable, type DataTableColumn } from "@/components/screens/admin/components/DataTable"
import { Badge } from "@/components/ui/badge"
import { useAdminReports, type ReportStatus } from "@/components/screens/admin/hooks/useAdminReports"

const STATUS_TABS: Array<{ value: ReportStatus; label: string }> = [
  { value: "all", label: "전체" },
  { value: "open", label: "미처리" },
  { value: "reviewing", label: "검토중" },
  { value: "resolved", label: "처리완료" },
  { value: "rejected", label: "거절" },
]

const REPORT_TABLE_COLUMNS: DataTableColumn[] = [
  { key: "status", header: "상태" },
  { key: "type", header: "유형" },
  { key: "target", header: "대상" },
  { key: "reason", header: "사유" },
  { key: "actions", header: "작업" },
]

export function AdminReports() {
  const {
    activeStatus,
    setActiveStatus,
    searchQuery,
    setSearchQuery,
    filteredReports,
    loadingReports,
    handleUpdateReport,
  } = useAdminReports()

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [nextStatus, setNextStatus] = useState<Exclude<ReportStatus, "all">>("reviewing")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const openDrawer = (reportId: string, status: Exclude<ReportStatus, "all">) => {
    setSelectedReportId(reportId)
    setNextStatus(status)
    setReason("")
  }

  const closeDrawer = (open: boolean) => {
    if (!open) {
      setSelectedReportId(null)
      setReason("")
      setSubmitting(false)
    }
  }

  const submit = async () => {
    if (!selectedReportId) return
    setSubmitting(true)
    try {
      await handleUpdateReport(selectedReportId, nextStatus, reason || undefined)
      closeDrawer(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-slate-50">신고 처리</h1>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="사유/대상/신고자 검색"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none ring-[#FF5D8F]/40 focus:ring-2 md:w-72"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveStatus(tab.value)}
            className={activeStatus === tab.value
              ? "rounded-full bg-[#FF5D8F] px-3 py-1.5 text-xs font-semibold text-white"
              : "rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={REPORT_TABLE_COLUMNS}
        rows={filteredReports}
        loading={loadingReports}
        emptyMessage="처리할 신고가 없습니다."
        getRowKey={(report) => report.id}
        renderRow={(report) => (
          <>
            <td className="px-4 py-3 text-sm">
              <Badge variant={report.status === "open" ? "destructive" : report.status === "reviewing" ? "outline" : "secondary"}>
                {report.status}
              </Badge>
            </td>
            <td className="px-4 py-3 text-sm text-slate-200">{report.targetType}</td>
            <td className="px-4 py-3 text-sm text-slate-300">{report.targetContent}</td>
            <td className="px-4 py-3 text-sm text-slate-300">{report.reason}</td>
            <td className="px-4 py-3 text-sm text-slate-300">
              <RowActions
                label={`${report.id} 신고`}
                actions={[
                  { key: "reviewing", label: "검토중으로", onClick: () => openDrawer(report.id, "reviewing") },
                  { key: "resolved", label: "처리완료", onClick: () => openDrawer(report.id, "resolved") },
                  { key: "rejected", label: "거절", onClick: () => openDrawer(report.id, "rejected"), danger: true },
                ]}
              />
            </td>
          </>
        )}
      />

      <EditDrawer
        open={Boolean(selectedReportId)}
        title="신고 상태 변경"
        description="모달 대신 우측 드로어에서 처리합니다."
        submitting={submitting}
        onOpenChange={closeDrawer}
        onSubmit={() => void submit()}
      >
        <label className="block text-sm text-slate-300">
          변경 상태
          <select
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as Exclude<ReportStatus, "all">)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          >
            <option value="reviewing">reviewing</option>
            <option value="resolved">resolved</option>
            <option value="rejected">rejected</option>
          </select>
        </label>
        <label className="block text-sm text-slate-300">
          처리 사유
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </label>
      </EditDrawer>
    </section>
  )
}
