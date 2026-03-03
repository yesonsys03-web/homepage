import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import type { AdminActionLog } from "@/lib/api"

type ActionLogFilter = "all" | "project" | "report" | "user" | "moderation_settings"
type ActionLogPeriod = 0 | 7 | 30 | 90

interface AdminActionsTabProps {
  summary: {
    adminLogRetentionDays: number
    adminLogViewWindowDays: number
    adminLogMaskReasons: boolean
  }
  filters: {
    policyOnlyLogs: boolean
    setPolicyOnlyLogs: (updater: (prev: boolean) => boolean) => void
    actionLogPeriodDays: ActionLogPeriod
    setActionLogPeriodDays: (value: ActionLogPeriod) => void
    actionLogFilter: ActionLogFilter
    setActionLogFilter: (value: ActionLogFilter) => void
  }
  data: {
    loadingLogs: boolean
    filteredActionLogs: AdminActionLog[]
    selectedActionLogId: string | null
    selectedActionLog: AdminActionLog | null
    policyChangeHistory: Array<{ log: AdminActionLog; diffs: string[] }>
  }
  actions: {
    setSelectedActionLogId: (value: string | null) => void
  }
  actionToText: (actionType: string) => string
}

export function AdminActionsTab({
  summary,
  filters,
  data,
  actions,
  actionToText,
}: AdminActionsTabProps) {
  return (
    <TabsContent value="actions">
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge className="bg-[#111936] text-[#F4F7FF] border border-[#2A3669]">
          보존 {summary.adminLogRetentionDays}일
        </Badge>
        <Badge className="bg-[#111936] text-[#F4F7FF] border border-[#2A3669]">
          조회 {summary.adminLogViewWindowDays}일
        </Badge>
        <Badge className="bg-[#111936] text-[#F4F7FF] border border-[#2A3669]">
          사유 마스킹 {summary.adminLogMaskReasons ? "ON" : "OFF"}
        </Badge>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => filters.setPolicyOnlyLogs((prev) => !prev)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            filters.policyOnlyLogs
              ? "bg-[#FF5D8F] text-white"
              : "bg-[#161F42] text-[#B8C3E6] hover:bg-[#1b2550]"
          }`}
        >
          정책 로그만 보기 {filters.policyOnlyLogs ? "ON" : "OFF"}
        </button>
        {([
          { value: 7 as const, label: "7일" },
          { value: 30 as const, label: "30일" },
          { value: 90 as const, label: "90일" },
          { value: 0 as const, label: "전체" },
        ] as const).map((period) => (
          <button
            key={period.value}
            type="button"
            onClick={() => filters.setActionLogPeriodDays(period.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filters.actionLogPeriodDays === period.value
                ? "bg-[#23D5AB] text-[#0B1020]"
                : "bg-[#161F42] text-[#B8C3E6] hover:bg-[#1b2550]"
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>
      <div className="mb-3 flex gap-2 flex-wrap">
        {([
          { value: "all", label: "전체" },
          { value: "project", label: "프로젝트" },
          { value: "report", label: "신고" },
          { value: "user", label: "사용자" },
          { value: "moderation_settings", label: "정책" },
        ] as const).map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => filters.setActionLogFilter(tab.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filters.actionLogFilter === tab.value
                ? "bg-[#FF5D8F] text-white"
                : "bg-[#161F42] text-[#B8C3E6] hover:bg-[#1b2550]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <Card className="bg-[#161F42] border-0">
        <CardContent className="p-0">
          {data.loadingLogs ? (
            <div className="p-6 text-[#B8C3E6]">로그 로딩 중...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#111936]">
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">작업</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">대상</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">사유</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">관리자</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">시간</th>
                </tr>
              </thead>
              <tbody>
                {data.filteredActionLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`border-b border-[#111936]/50 cursor-pointer ${data.selectedActionLogId === log.id ? "bg-[#111936]/60" : "hover:bg-[#111936]/30"}`}
                    onClick={() => actions.setSelectedActionLogId(log.id)}
                  >
                    <td className="p-4 text-[#F4F7FF]">{actionToText(log.action_type)}</td>
                    <td className="p-4 text-[#FF5D8F]">{log.target_type}:{log.target_id}</td>
                    <td className="p-4 text-[#B8C3E6]">{log.reason || "-"}</td>
                    <td className="p-4 text-[#B8C3E6]">{log.admin_nickname || "admin"}</td>
                    <td className="p-4 text-[#B8C3E6]">{new Date(log.created_at).toLocaleString("ko-KR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Card className="mt-4 bg-[#161F42] border-0">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-[#F4F7FF] mb-3">정책 변경 이력(diff)</h3>
          {data.policyChangeHistory.length === 0 ? (
            <p className="text-xs text-[#B8C3E6]">정책 변경 이력이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {data.policyChangeHistory.slice(0, 8).map(({ log, diffs }) => (
                <div key={log.id} className="rounded-md border border-[#111936] bg-[#0B1020] p-3">
                  <p className="text-xs text-[#F4F7FF]">
                    {new Date(log.created_at).toLocaleString("ko-KR")} · {log.admin_nickname || "admin"}
                  </p>
                  <p className="text-xs text-[#B8C3E6] mt-1">{diffs.length > 0 ? diffs.join(" | ") : "변경값 차이 없음"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {data.selectedActionLog ? (
        <Card className="mt-4 bg-[#161F42] border border-[#FF5D8F]/30">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#F4F7FF]">선택한 로그 상세</h3>
              <Button
                type="button"
                variant="outline"
                className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                onClick={() => actions.setSelectedActionLogId(null)}
              >
                닫기
              </Button>
            </div>
            <p className="text-xs text-[#B8C3E6]"><span className="text-[#F4F7FF]">작업:</span> {actionToText(data.selectedActionLog.action_type)}</p>
            <p className="text-xs text-[#B8C3E6]"><span className="text-[#F4F7FF]">대상:</span> {data.selectedActionLog.target_type}:{data.selectedActionLog.target_id}</p>
            <p className="text-xs text-[#B8C3E6]"><span className="text-[#F4F7FF]">관리자:</span> {data.selectedActionLog.admin_nickname || "admin"}</p>
            <p className="text-xs text-[#B8C3E6]"><span className="text-[#F4F7FF]">시간:</span> {new Date(data.selectedActionLog.created_at).toLocaleString("ko-KR")}</p>
            <div className="rounded-md border border-[#111936] bg-[#0B1020] p-3">
              <p className="text-xs text-[#F4F7FF] mb-1">사유 / 내용</p>
              <p className="text-xs text-[#B8C3E6] whitespace-pre-wrap break-words">{data.selectedActionLog.reason || "기록된 사유가 없습니다."}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </TabsContent>
  )
}
