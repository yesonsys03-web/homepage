import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"

export type ReportStatus = "open" | "reviewing" | "resolved" | "rejected" | "all"

export interface AdminReportRow {
  id: string
  targetType: string
  targetContent: string
  reason: string
  status: string
  reporter: string
  createdAt: string
}

const REPORT_PAGE_SIZE = 50

export function useAdminReports() {
  const queryClient = useQueryClient()
  const [activeStatus, setActiveStatus] = useState<ReportStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const reportsQuery = useQuery({
    queryKey: ["admin-reports", activeStatus, REPORT_PAGE_SIZE],
    queryFn: async (): Promise<{ items: AdminReportRow[]; total: number }> => {
      const status = activeStatus === "all" ? undefined : activeStatus
      const response = await api.getReports(status, REPORT_PAGE_SIZE, 0)
      const items = Array.isArray(response.items) ? response.items : []

      return {
        items: items.map((item) => ({
          id: item.id,
          targetType: item.target_type,
          targetContent: item.target_id,
          reason: item.reason,
          status: item.status,
          reporter: item.reporter_id || "unknown",
          createdAt: new Date(item.created_at).toLocaleString("ko-KR"),
        })),
        total: response.total || 0,
      }
    },
  })

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status, reason }: { reportId: string; status: Exclude<ReportStatus, "all">; reason?: string }) => {
      await api.updateReport(reportId, status, reason)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-reports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-actions"] }),
      ])
    },
  })

  const reports = useMemo(() => reportsQuery.data?.items ?? [], [reportsQuery.data])

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return reports
    }

    return reports.filter((report) => {
      return (
        report.targetContent.toLowerCase().includes(query)
        || report.reason.toLowerCase().includes(query)
        || report.reporter.toLowerCase().includes(query)
        || report.status.toLowerCase().includes(query)
      )
    })
  }, [reports, searchQuery])

  const statusCounts = useMemo(() => {
    const open = reports.filter((report) => report.status === "open").length
    const reviewing = reports.filter((report) => report.status === "reviewing").length
    return {
      total: reportsQuery.data?.total ?? reports.length,
      open,
      reviewing,
      resolved: reports.filter((report) => report.status === "resolved").length,
    }
  }, [reports, reportsQuery.data])

  const handleUpdateReport = async (reportId: string, status: Exclude<ReportStatus, "all">, reason?: string) => {
    await updateReportMutation.mutateAsync({ reportId, status, reason: reason || undefined })
  }

  return {
    activeStatus,
    setActiveStatus,
    searchQuery,
    setSearchQuery,
    reports,
    filteredReports,
    loadingReports: reportsQuery.isPending,
    statusCounts,
    handleUpdateReport,
  }
}
