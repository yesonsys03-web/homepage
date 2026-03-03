import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  areAllFilteredProjectsSelected: boolean
  toggleSelectAllFilteredProjects: () => void
  statusToText: (status: string) => string
  handleUpdateReport: (reportId: string, status: Exclude<ReportStatus, "all">) => void
  reportTotal: number
  reportPageSize: number
  reportPage: number
  loadReports: (page?: number) => void
}

export function AdminReportsTab({
  statusTabs,
  activeStatus,
  setActiveStatus,
  searchQuery,
  setSearchQuery,
  loadingReports,
  filteredReports,
  areAllFilteredProjectsSelected,
  toggleSelectAllFilteredProjects,
  statusToText,
  handleUpdateReport,
  reportTotal,
  reportPageSize,
  reportPage,
  loadReports,
}: AdminReportsTabProps) {
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

      <Card className="bg-[#161F42] border-0">
        <CardContent className="p-0">
          {loadingReports ? (
            <div className="p-6 text-[#B8C3E6]">로딩 중...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#111936]">
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">
                    <input
                      type="checkbox"
                      checked={areAllFilteredProjectsSelected}
                      onChange={toggleSelectAllFilteredProjects}
                    />
                  </th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">상태</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">유형</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">내용</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">사유</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">신고자</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">시간</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id} className="border-b border-[#111936]/50 hover:bg-[#111936]/30">
                    <td className="p-4">
                      <Badge
                        variant={
                          report.status === "open"
                            ? "destructive"
                            : report.status === "reviewing"
                              ? "secondary"
                              : report.status === "resolved"
                                ? "default"
                                : "outline"
                        }
                      >
                        {statusToText(report.status)}
                      </Badge>
                    </td>
                    <td className="p-4 text-[#F4F7FF]">{report.targetType}</td>
                    <td className="p-4 text-[#F4F7FF] max-w-xs truncate">{report.targetContent}</td>
                    <td className="p-4 text-[#B8C3E6]">{report.reason}</td>
                    <td className="p-4 text-[#B8C3E6]">{report.reporter}</td>
                    <td className="p-4 text-[#B8C3E6]">{report.createdAt}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white text-xs"
                          disabled={report.status === "resolved"}
                          onClick={() => handleUpdateReport(report.id, "resolved")}
                        >
                          처리
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
                          onClick={() => handleUpdateReport(report.id, "reviewing")}
                        >
                          검토
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
                          onClick={() => handleUpdateReport(report.id, "rejected")}
                        >
                          거절
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loadingReports && reportTotal > reportPageSize ? (
            <div className="flex items-center justify-between border-t border-[#111936] p-4">
              <p className="text-xs text-[#B8C3E6]">
                총 {reportTotal}건 | 페이지 {reportPage + 1} / {Math.max(1, Math.ceil(reportTotal / reportPageSize))}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                  disabled={reportPage === 0}
                  onClick={() => loadReports(reportPage - 1)}
                >
                  이전
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                  disabled={(reportPage + 1) * reportPageSize >= reportTotal}
                  onClick={() => loadReports(reportPage + 1)}
                >
                  다음
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </TabsContent>
  )
}
