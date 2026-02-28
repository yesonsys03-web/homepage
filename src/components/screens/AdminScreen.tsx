import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, type AdminActionLog, type AdminManagedUser } from "@/lib/api"
import { useAuth } from "@/lib/use-auth"

type Screen =
  | "home"
  | "detail"
  | "submit"
  | "profile"
  | "admin"
  | "login"
  | "register"
  | "explore"
  | "challenges"
  | "about"

type ReportStatus = "open" | "reviewing" | "resolved" | "rejected" | "all"

const ADMIN_DASHBOARD_POLLING_MS = 30000

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
}

interface AdminReportRow {
  id: string
  targetType: string
  targetContent: string
  reason: string
  status: string
  reporter: string
  createdAt: string
}

const STATUS_TABS: Array<{ value: ReportStatus; label: string }> = [
  { value: "all", label: "전체" },
  { value: "open", label: "미처리" },
  { value: "reviewing", label: "검토중" },
  { value: "resolved", label: "처리완료" },
  { value: "rejected", label: "거절" },
]

function statusToText(status: string): string {
  if (status === "open") return "미처리"
  if (status === "reviewing") return "검토중"
  if (status === "resolved") return "처리완료"
  if (status === "rejected") return "거절"
  return status
}

function actionToText(actionType: string): string {
  if (actionType === "report_resolved") return "신고 처리"
  if (actionType === "report_rejected") return "신고 거절"
  if (actionType === "report_reviewing") return "검토 시작"
  if (actionType === "user_limited") return "사용자 제한"
  if (actionType === "user_unlimited") return "사용자 제한 해제"
  return actionType
}

function getUserLimitState(user: AdminManagedUser): {
  isLimited: boolean
  label: string
} {
  if (!user.limited_until) {
    return { isLimited: false, label: "정상" }
  }

  const limitDate = new Date(user.limited_until)
  if (Number.isNaN(limitDate.getTime())) {
    return { isLimited: false, label: "정상" }
  }

  if (limitDate.getTime() > Date.now()) {
    return { isLimited: true, label: "제한중" }
  }

  return { isLimited: false, label: "만료" }
}

export function AdminScreen({ onNavigate }: ScreenProps) {
  const { logout } = useAuth()

  const [reports, setReports] = useState<AdminReportRow[]>([])
  const [actionLogs, setActionLogs] = useState<AdminActionLog[]>([])
  const [users, setUsers] = useState<AdminManagedUser[]>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingPolicies, setLoadingPolicies] = useState(true)
  const [savingPolicies, setSavingPolicies] = useState(false)
  const [activeStatus, setActiveStatus] = useState<ReportStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [blockedKeywordsInput, setBlockedKeywordsInput] = useState("")
  const [baselineKeywordCategories, setBaselineKeywordCategories] = useState<Record<string, string[]>>({})
  const [policyPreviewQuery, setPolicyPreviewQuery] = useState("")
  const [collapsedPolicyCategories, setCollapsedPolicyCategories] = useState<Record<string, boolean>>({})
  const [autoHideThreshold, setAutoHideThreshold] = useState(3)
  const [policyUpdatedBy, setPolicyUpdatedBy] = useState<string | null>(null)
  const [policyUpdatedAt, setPolicyUpdatedAt] = useState<string | null>(null)

  const loadReports = async () => {
    setLoadingReports(true)
    try {
      const data = await api.getReports()
      const items = Array.isArray(data.items) ? data.items : []
      const mapped: AdminReportRow[] = items.map(
        (item: {
          id: string
          target_type: string
          target_id: string
          reason: string
          status: string
          reporter_id?: string
          created_at: string
        }) => ({
          id: item.id,
          targetType: item.target_type,
          targetContent: item.target_id,
          reason: item.reason,
          status: item.status,
          reporter: item.reporter_id || "unknown",
          createdAt: new Date(item.created_at).toLocaleString("ko-KR"),
        })
      )
      setReports(mapped)
    } catch (error) {
      console.error("Failed to fetch reports:", error)
      setReports([])
    } finally {
      setLoadingReports(false)
    }
  }

  const loadActionLogs = async () => {
    setLoadingLogs(true)
    try {
      const data = await api.getAdminActionLogs(100)
      setActionLogs(Array.isArray(data.items) ? data.items : [])
    } catch (error) {
      console.error("Failed to fetch action logs:", error)
      setActionLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const data = await api.getAdminUsers(200)
      setUsers(Array.isArray(data.items) ? data.items : [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadPolicies = async () => {
    setLoadingPolicies(true)
    try {
      const policy = await api.getAdminPolicies()
      setBlockedKeywordsInput((policy.custom_blocked_keywords || []).join(", "))
      setBaselineKeywordCategories(policy.baseline_keyword_categories || {})
      setCollapsedPolicyCategories((prev) => {
        const next: Record<string, boolean> = {}
        Object.keys(policy.baseline_keyword_categories || {}).forEach((category) => {
          next[category] = prev[category] ?? false
        })
        return next
      })
      setAutoHideThreshold(policy.auto_hide_report_threshold || 3)
      setPolicyUpdatedBy(policy.last_updated_by || null)
      setPolicyUpdatedAt(policy.last_updated_action_at || null)
    } catch (error) {
      console.error("Failed to fetch policies:", error)
      setBlockedKeywordsInput("")
      setBaselineKeywordCategories({})
      setAutoHideThreshold(3)
      setPolicyUpdatedBy(null)
      setPolicyUpdatedAt(null)
    } finally {
      setLoadingPolicies(false)
    }
  }

  useEffect(() => {
    loadReports()
    loadActionLogs()
    loadUsers()
    loadPolicies()
  }, [])

  useEffect(() => {
    const poll = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return
      }

      loadReports()
      loadActionLogs()
    }

    const intervalId = window.setInterval(poll, ADMIN_DASHBOARD_POLLING_MS)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return reports.filter((report) => {
      const statusMatched = activeStatus === "all" || report.status === activeStatus
      if (!statusMatched) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        report.targetContent.toLowerCase().includes(query)
        || report.reason.toLowerCase().includes(query)
        || report.reporter.toLowerCase().includes(query)
        || report.status.toLowerCase().includes(query)
      )
    })
  }, [reports, searchQuery, activeStatus])

  const stats = useMemo(() => {
    const open = reports.filter((r) => r.status === "open").length
    const reviewing = reports.filter((r) => r.status === "reviewing").length
    const resolved = reports.filter((r) => r.status === "resolved").length
    return [
      { label: "총 신고", value: String(reports.length), color: "text-[#F4F7FF]" },
      { label: "미처리", value: String(open), color: "text-[#FF6B6B]" },
      { label: "검토중", value: String(reviewing), color: "text-[#FFB547]" },
      { label: "처리완료", value: String(resolved), color: "text-[#23D5AB]" },
    ]
  }, [reports])

  const filteredBaselineKeywordCategories = useMemo(() => {
    const query = policyPreviewQuery.trim().toLowerCase()
    if (!query) {
      return baselineKeywordCategories
    }

    const entries = Object.entries(baselineKeywordCategories)
      .map(([category, keywords]) => {
        const matchedKeywords = keywords.filter((keyword) => keyword.toLowerCase().includes(query))
        if (category.toLowerCase().includes(query) || matchedKeywords.length > 0) {
          return [category, matchedKeywords.length > 0 ? matchedKeywords : keywords] as const
        }
        return null
      })
      .filter((entry): entry is readonly [string, string[]] => entry !== null)

    return Object.fromEntries(entries)
  }, [baselineKeywordCategories, policyPreviewQuery])

  const customKeywords = useMemo(() => {
    return blockedKeywordsInput
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean)
  }, [blockedKeywordsInput])

  const handleTogglePolicyCategory = (category: string) => {
    setCollapsedPolicyCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const handleCollapseAllPolicyCategories = () => {
    const next: Record<string, boolean> = {}
    Object.keys(baselineKeywordCategories).forEach((category) => {
      next[category] = true
    })
    setCollapsedPolicyCategories(next)
  }

  const handleExpandAllPolicyCategories = () => {
    const next: Record<string, boolean> = {}
    Object.keys(baselineKeywordCategories).forEach((category) => {
      next[category] = false
    })
    setCollapsedPolicyCategories(next)
  }

  const handleExportPoliciesCsv = () => {
    const rows: string[][] = [["group", "category", "keyword"]]

    Object.entries(baselineKeywordCategories).forEach(([category, keywords]) => {
      keywords.forEach((keyword) => {
        rows.push(["baseline", category, keyword])
      })
    })

    customKeywords.forEach((keyword) => {
      rows.push(["custom", "관리자 커스텀", keyword])
    })

    const csv = rows
      .map((columns) => columns.map((column) => `"${column.replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `moderation-keywords-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleUpdateReport = async (
    reportId: string,
    status: Exclude<ReportStatus, "all">,
  ) => {
    const reason = window.prompt("처리 사유를 입력하세요 (선택)", "")
    try {
      await api.updateReport(reportId, status, reason || undefined)
      await Promise.all([loadReports(), loadActionLogs()])
    } catch (error) {
      console.error("Failed to update report:", error)
    }
  }

  const handleLimitUser = async (userId: string) => {
    const hoursText = window.prompt("제한 시간을 입력하세요 (시간)", "24")
    if (!hoursText) return

    const hours = Number(hoursText)
    if (!Number.isFinite(hours) || hours <= 0) {
      window.alert("유효한 시간(1 이상)을 입력해주세요")
      return
    }

    const reason = window.prompt("제한 사유를 입력하세요", "운영 정책 위반")
    try {
      await api.limitUser(userId, hours, reason || undefined)
      await Promise.all([loadUsers(), loadActionLogs()])
    } catch (error) {
      console.error("Failed to limit user:", error)
    }
  }

  const handleUnlimitUser = async (userId: string) => {
    try {
      await api.unlimitUser(userId)
      await Promise.all([loadUsers(), loadActionLogs()])
    } catch (error) {
      console.error("Failed to unlimit user:", error)
    }
  }

  const handleSavePolicies = async () => {
    const keywords = blockedKeywordsInput
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean)

    if (autoHideThreshold < 1) {
      window.alert("임계치는 1 이상이어야 합니다")
      return
    }

    setSavingPolicies(true)
    try {
      await api.updateAdminPolicies(keywords, autoHideThreshold)
      await Promise.all([loadPolicies(), loadActionLogs()])
      window.alert("정책이 저장되었습니다")
    } catch (error) {
      console.error("Failed to save policies:", error)
      window.alert("정책 저장에 실패했습니다")
    } finally {
      setSavingPolicies(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <header className="sticky top-0 z-50 bg-[#0B1020]/95 backdrop-blur-sm border-b border-[#111936]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">
            VibeCoder <span className="text-[#FF5D8F]">Admin</span>
          </h1>
          <nav className="flex gap-6">
            <button onClick={() => onNavigate?.("home")} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Home</button>
            <button onClick={() => onNavigate?.("explore")} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Explore</button>
            <button onClick={() => onNavigate?.("challenges")} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Challenges</button>
            <button onClick={() => onNavigate?.("about")} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">About</button>
          </nav>
          <Button onClick={logout} className="bg-[#FF5D8F] hover:bg-[#FF5D8F]/90 text-white font-semibold">
            로그아웃
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-[#161F42] border-0">
              <CardContent className="p-4 text-center">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-[#B8C3E6]">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="reports">
          <TabsList className="bg-[#161F42] border-0 mb-6">
            <TabsTrigger value="reports" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">📋 신고 큐</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">👤 사용자 관리</TabsTrigger>
            <TabsTrigger value="policies" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">⚙️ 정책/룰</TabsTrigger>
            <TabsTrigger value="actions" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">📝 관리자 로그</TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-2 flex-wrap">
                {STATUS_TABS.map((tab) => (
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
                            <Badge variant={
                              report.status === "open"
                                ? "destructive"
                                : report.status === "reviewing"
                                  ? "secondary"
                                  : report.status === "resolved"
                                    ? "default"
                                    : "outline"
                            }>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-0">
                {loadingUsers ? (
                  <div className="p-6 text-[#B8C3E6]">사용자 로딩 중...</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#111936]">
                        <th className="text-left p-4 text-[#B8C3E6] font-medium">닉네임</th>
                        <th className="text-left p-4 text-[#B8C3E6] font-medium">이메일</th>
                        <th className="text-left p-4 text-[#B8C3E6] font-medium">권한</th>
                        <th className="text-left p-4 text-[#B8C3E6] font-medium">상태</th>
                        <th className="text-left p-4 text-[#B8C3E6] font-medium">제한 종료</th>
                        <th className="text-left p-4 text-[#B8C3E6] font-medium">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        const limitState = getUserLimitState(user)
                        return (
                          <tr key={user.id} className="border-b border-[#111936]/50 hover:bg-[#111936]/30">
                            <td className="p-4 text-[#F4F7FF]">{user.nickname}</td>
                            <td className="p-4 text-[#B8C3E6]">{user.email || "-"}</td>
                            <td className="p-4 text-[#B8C3E6]">{user.role}</td>
                            <td className="p-4">
                              <Badge variant={limitState.isLimited ? "destructive" : "secondary"}>
                                {limitState.label}
                              </Badge>
                            </td>
                            <td className="p-4 text-[#B8C3E6]">
                              {user.limited_until ? new Date(user.limited_until).toLocaleString("ko-KR") : "-"}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white text-xs"
                                  disabled={user.role === "admin" || limitState.isLimited}
                                  onClick={() => handleLimitUser(user.id)}
                                >
                                  24h 제한
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
                                  disabled={user.role === "admin" || !limitState.isLimited}
                                  onClick={() => handleUnlimitUser(user.id)}
                                >
                                  제한 해제
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies">
            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-6 space-y-6">
                {loadingPolicies ? (
                  <div className="text-[#B8C3E6]">정책 로딩 중...</div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-[#F4F7FF] font-semibold mb-2">기본 금칙 카테고리 (자동 적용)</h3>
                      <p className="text-xs text-[#B8C3E6] mb-3">아래 목록은 시스템 기본 규칙으로 항상 적용됩니다.</p>
                      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="text-xs text-[#B8C3E6]">
                          최근 수정자: <span className="text-[#F4F7FF]">{policyUpdatedBy || "시스템"}</span>
                          {policyUpdatedAt ? ` · ${new Date(policyUpdatedAt).toLocaleString("ko-KR")}` : ""}
                        </div>
                        <input
                          value={policyPreviewQuery}
                          onChange={(event) => setPolicyPreviewQuery(event.target.value)}
                          placeholder="카테고리/금칙어 미리보기 검색"
                          className="w-full md:w-72 bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#B8C3E6]/60 focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
                        />
                      </div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                          onClick={handleExpandAllPolicyCategories}
                        >
                          전체 펼치기
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                          onClick={handleCollapseAllPolicyCategories}
                        >
                          전체 접기
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                          onClick={handleExportPoliciesCsv}
                        >
                          CSV 내보내기
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {Object.entries(filteredBaselineKeywordCategories).map(([category, keywords]) => (
                          <div key={category} className="rounded-lg border border-[#111936] bg-[#0B1020] p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-[#F4F7FF]">
                                {category} <span className="text-[#B8C3E6] text-xs">({keywords.length})</span>
                              </p>
                              <button
                                type="button"
                                className="text-xs text-[#B8C3E6] hover:text-[#F4F7FF]"
                                onClick={() => handleTogglePolicyCategory(category)}
                              >
                                {collapsedPolicyCategories[category] ? "펼치기" : "접기"}
                              </button>
                            </div>
                            {!collapsedPolicyCategories[category] ? (
                              <p className="text-xs text-[#B8C3E6] leading-relaxed">
                                {keywords.length > 0 ? keywords.join(", ") : "-"}
                              </p>
                            ) : (
                              <p className="text-xs text-[#B8C3E6]/70">접힘</p>
                            )}
                          </div>
                        ))}
                        {Object.keys(filteredBaselineKeywordCategories).length === 0 && (
                          <div className="rounded-lg border border-[#111936] bg-[#0B1020] p-3 text-xs text-[#B8C3E6]">
                            검색 결과가 없습니다.
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[#F4F7FF] font-semibold mb-2">추가 금칙어 목록 (관리자 커스텀)</h3>
                      <p className="text-xs text-[#B8C3E6] mb-2">쉼표(,)로 구분해서 입력하세요. 입력 항목은 기본 카테고리와 합쳐서 적용됩니다.</p>
                      <textarea
                        value={blockedKeywordsInput}
                        onChange={(event) => setBlockedKeywordsInput(event.target.value)}
                        rows={4}
                        className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#B8C3E6]/60 focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
                      />
                    </div>

                    <div>
                      <h3 className="text-[#F4F7FF] font-semibold mb-2">자동 임시 숨김 임계치</h3>
                      <p className="text-xs text-[#B8C3E6] mb-2">동일 대상 신고 누적 건수 기준</p>
                      <input
                        type="number"
                        min={1}
                        value={autoHideThreshold}
                        onChange={(event) => setAutoHideThreshold(Number(event.target.value) || 1)}
                        className="w-32 bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={handleSavePolicies}
                        disabled={savingPolicies}
                        className="bg-[#FF5D8F] hover:bg-[#FF5D8F]/90 text-white"
                      >
                        {savingPolicies ? "저장 중..." : "정책 저장"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions">
            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-0">
                {loadingLogs ? (
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
                      {actionLogs.map((log) => (
                        <tr key={log.id} className="border-b border-[#111936]/50">
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
