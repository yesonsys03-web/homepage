import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Tabs } from "@/components/ui/tabs"
import { TopNav } from "@/components/TopNav"
import { AdminStatsCards } from "@/components/screens/admin/AdminStatsCards"
import { AdminSidebarNav } from "@/components/screens/admin/AdminSidebarNav"
import { AdminReportsTab } from "@/components/screens/admin/AdminReportsTab"
import { AdminUsersTab } from "@/components/screens/admin/AdminUsersTab"
import { AdminContentTab } from "@/components/screens/admin/AdminContentTab"
import { AdminPagesTab } from "@/components/screens/admin/AdminPagesTab"
import { AdminPoliciesTab } from "@/components/screens/admin/AdminPoliciesTab"
import { AdminActionsTab } from "@/components/screens/admin/AdminActionsTab"
import {
  api,
  type AdminActionLog,
  type AdminManagedProject,
  type AdminManagedUser,
  type AdminOAuthHealth,
  type AdminOAuthSettings,
  type AboutContent,
  type FilterTab,
  type ModerationPolicy,
} from "@/lib/api"
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
type ProjectStatus = "all" | "published" | "hidden" | "deleted"
type ActionLogFilter = "all" | "project" | "report" | "user" | "moderation_settings"
type ActionLogPeriod = 0 | 7 | 30 | 90
type AdminTabKey = "reports" | "users" | "content" | "pages" | "policies" | "actions"

const ADMIN_QUERY_KEYS = {
  reportsBase: ["admin-reports"] as const,
  reports: (status: ReportStatus, page: number, pageSize: number) =>
    ["admin-reports", status, page, pageSize] as const,
  users: ["admin-users"] as const,
  projects: ["admin-projects"] as const,
  pages: ["admin-about-content"] as const,
  policies: ["admin-policies"] as const,
  actions: (limit: number) => ["admin-actions", limit] as const,
  oauthSettings: ["admin-oauth-settings"] as const,
  oauthHealth: ["admin-oauth-health"] as const,
}

function getAdminTabQueryKey(tab: AdminTabKey): QueryKey {
  switch (tab) {
    case "reports":
      return ADMIN_QUERY_KEYS.reportsBase
    case "users":
      return ADMIN_QUERY_KEYS.users
    case "content":
      return ADMIN_QUERY_KEYS.projects
    case "pages":
      return ADMIN_QUERY_KEYS.pages
    case "policies":
      return ADMIN_QUERY_KEYS.policies
    case "actions":
      return ADMIN_QUERY_KEYS.actions(100)
  }
}

const ABOUT_CONTENT_FALLBACK: AboutContent = {
  hero_title: "완성도보다 바이브.",
  hero_highlight: "실험도 작품이다.",
  hero_description:
    "VibeCoder는 개발자들이 자유롭게 실험하고, 공유하고, 피드백을 받는 공간입니다. 완벽한 코드보다 재미있는 시도가 더 가치 있다고 믿습니다.",
  contact_email: "hello@vibecoder.dev",
  values: [
    { emoji: "🎨", title: "창작의 자유", description: "당신만의 독특한 바이브를 보여주세요." },
    { emoji: "🤝", title: "피드백 문화", description: "건전한 피드백 문화로 함께 성장합니다." },
    { emoji: "🚀", title: "실험정신", description: "실패를 두려워하지 않고 실험하세요." },
  ],
  team_members: [
    { name: "devkim", role: "Founder & Lead Dev", description: "AI와 웹 개발을 좋아합니다" },
    { name: "codemaster", role: "Backend Engineer", description: "Rust와 Python을 좋아합니다" },
    { name: "designer_y", role: "UI/UX Designer", description: "사용자 경험을 중요시합니다" },
  ],
  faqs: [
    {
      question: "VibeCoder는 무엇인가요?",
      answer: "개발자 커뮤니티 기반 프로젝트 공유 플랫폼입니다.",
    },
    {
      question: "프로젝트는 어떻게 올리나요?",
      answer: "로그인 후 작품 올리기 버튼에서 등록할 수 있습니다.",
    },
  ],
}

const HOME_FILTER_TABS_FALLBACK: FilterTab[] = [
  { id: "all", label: "전체" },
  { id: "web", label: "Web" },
  { id: "app", label: "App" },
  { id: "ai", label: "AI" },
  { id: "tool", label: "Tool" },
  { id: "game", label: "Game" },
  { id: "和学习", label: "和学习" },
]

const EXPLORE_FILTER_TABS_FALLBACK: FilterTab[] = [
  { id: "all", label: "전체" },
  { id: "web", label: "Web" },
  { id: "game", label: "Game" },
  { id: "tool", label: "Tool" },
  { id: "ai", label: "AI" },
  { id: "mobile", label: "Mobile" },
]

function tabsToTextarea(tabs: FilterTab[]): string {
  return tabs.map((tab) => `${tab.id}|${tab.label}`).join("\n")
}

function parseTabsTextarea(input: string): FilterTab[] {
  const seen = new Set<string>()
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawId = "", ...rest] = line.split("|")
      return {
        id: rawId.trim(),
        label: rest.join("|").trim(),
      }
    })
    .filter((tab) => {
      if (!tab.id || !tab.label) {
        return false
      }
      const key = tab.id.toLowerCase()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
}

function linesToTriples(input: string): Array<{ a: string; b: string; c: string }> {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [a = "", b = "", ...rest] = line.split("|")
      return {
        a: a.trim(),
        b: b.trim(),
        c: rest.join("|").trim(),
      }
    })
    .filter((item) => item.a && item.b && item.c)
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      const nextChar = line[i + 1]
      if (inQuotes && nextChar === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      values.push(current)
      current = ""
      continue
    }

    current += char
  }

  values.push(current)
  return values.map((value) => value.trim())
}

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
  if (actionType === "user_approved") return "가입 승인"
  if (actionType === "user_rejected") return "가입 반려"
  if (actionType === "user_suspended") return "계정 정지"
  if (actionType === "user_unsuspended") return "정지 해제"
  if (actionType === "user_tokens_revoked") return "세션 무효화"
  if (actionType === "user_delete_scheduled") return "삭제 예약"
  if (actionType === "user_delete_schedule_canceled") return "삭제 예약 취소"
  if (actionType === "user_deleted") return "사용자 삭제"
  if (actionType === "project_updated") return "프로젝트 수정"
  if (actionType === "project_hidden") return "프로젝트 숨김"
  if (actionType === "project_restored") return "프로젝트 복구"
  if (actionType === "project_deleted") return "프로젝트 삭제"
  if (actionType === "policy_updated") return "정책 수정"
  if (actionType === "oauth_settings_updated") return "OAuth 설정 수정"
  if (actionType === "about_content_updated") return "About 페이지 수정"
  return actionType
}

const POLICY_REASON_LABELS: Record<string, string> = {
  keywords: "금칙어 수",
  threshold: "자동 숨김 임계치",
  retention_days: "로그 보존(일)",
  view_window_days: "로그 조회 기간(일)",
  mask_reasons: "사유 마스킹",
}

function parsePolicyReason(reason?: string): Record<string, string> {
  if (!reason) {
    return {}
  }

  const result: Record<string, string> = {}
  reason
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [rawKey = "", ...rest] = part.split("=")
      const key = rawKey.trim()
      const value = rest.join("=").trim()
      if (key && value) {
        result[key] = value
      }
    })

  return result
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

function getUserApprovalState(user: AdminManagedUser): {
  tone: "destructive" | "secondary"
  label: string
} {
  const status = user.status || "active"
  if (status === "pending") {
    return { tone: "destructive", label: "승인 대기" }
  }
  if (status === "rejected") {
    return { tone: "destructive", label: "반려" }
  }
  if (status === "suspended") {
    return { tone: "destructive", label: "정지" }
  }
  if (status === "pending_delete") {
    return { tone: "destructive", label: "삭제 예정" }
  }
  if (status === "deleted") {
    return { tone: "destructive", label: "삭제됨" }
  }
  return { tone: "secondary", label: "활성" }
}

export function AdminScreen({ onNavigate }: ScreenProps) {
  const { logout, user: authUser } = useAuth()
  const queryClient = useQueryClient()

  const [actionLogs, setActionLogs] = useState<AdminActionLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [loadingPolicies, setLoadingPolicies] = useState(true)
  const [savingPolicies, setSavingPolicies] = useState(false)
  const [loadingOAuthSettings, setLoadingOAuthSettings] = useState(true)
  const [savingOAuthSettings, setSavingOAuthSettings] = useState(false)
  const [activeStatus, setActiveStatus] = useState<ReportStatus>("all")
  const REPORT_PAGE_SIZE = 50
  const [activeTab, setActiveTab] = useState<AdminTabKey>("reports")
  const [searchQuery, setSearchQuery] = useState("")
  const [blockedKeywordsInput, setBlockedKeywordsInput] = useState("")
  const [baselineKeywordCategories, setBaselineKeywordCategories] = useState<Record<string, string[]>>({})
  const [policyPreviewQuery, setPolicyPreviewQuery] = useState("")
  const [collapsedPolicyCategories, setCollapsedPolicyCategories] = useState<Record<string, boolean>>({})
  const [autoHideThreshold, setAutoHideThreshold] = useState(3)
  const [adminLogRetentionDays, setAdminLogRetentionDays] = useState(365)
  const [adminLogViewWindowDays, setAdminLogViewWindowDays] = useState(30)
  const [adminLogMaskReasons, setAdminLogMaskReasons] = useState(true)
  const [homeFilterTabsInput, setHomeFilterTabsInput] = useState(
    tabsToTextarea(HOME_FILTER_TABS_FALLBACK),
  )
  const [exploreFilterTabsInput, setExploreFilterTabsInput] = useState(
    tabsToTextarea(EXPLORE_FILTER_TABS_FALLBACK),
  )
  const [policyUpdatedBy, setPolicyUpdatedBy] = useState<string | null>(null)
  const [policyUpdatedAt, setPolicyUpdatedAt] = useState<string | null>(null)
  const [oauthEnabled, setOauthEnabled] = useState(false)
  const [oauthGoogleRedirectUri, setOauthGoogleRedirectUri] = useState("")
  const [oauthFrontendRedirectUri, setOauthFrontendRedirectUri] = useState("")
  const [oauthHealth, setOauthHealth] = useState<AdminOAuthHealth | null>(null)
  const csvImportInputRef = useRef<HTMLInputElement | null>(null)
  const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatus>("all")
  const [projectSearchQuery, setProjectSearchQuery] = useState("")
  const [projectActionReason, setProjectActionReason] = useState("")
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectTitle, setEditingProjectTitle] = useState("")
  const [editingProjectSummary, setEditingProjectSummary] = useState("")
  const [editingProjectTags, setEditingProjectTags] = useState<string[]>([])
  const [editingProjectTagInput, setEditingProjectTagInput] = useState("")
  const [editingProjectReason, setEditingProjectReason] = useState("")
  const [actionLogFilter, setActionLogFilter] = useState<ActionLogFilter>("all")
  const [policyOnlyLogs, setPolicyOnlyLogs] = useState(false)
  const [actionLogPeriodDays, setActionLogPeriodDays] = useState<ActionLogPeriod>(30)
  const [selectedActionLogId, setSelectedActionLogId] = useState<string | null>(null)
  const [loadingAboutContent, setLoadingAboutContent] = useState(true)
  const [savingAboutContent, setSavingAboutContent] = useState(false)
  const [aboutReason, setAboutReason] = useState("")
  const [aboutHeroTitle, setAboutHeroTitle] = useState(ABOUT_CONTENT_FALLBACK.hero_title)
  const [aboutHeroHighlight, setAboutHeroHighlight] = useState(ABOUT_CONTENT_FALLBACK.hero_highlight)
  const [aboutHeroDescription, setAboutHeroDescription] = useState(ABOUT_CONTENT_FALLBACK.hero_description)
  const [aboutContactEmail, setAboutContactEmail] = useState(ABOUT_CONTENT_FALLBACK.contact_email)
  const [aboutValuesInput, setAboutValuesInput] = useState("")
  const [aboutTeamInput, setAboutTeamInput] = useState("")
  const [aboutFaqInput, setAboutFaqInput] = useState("")
  const prefetchedTabsRef = useRef<Set<AdminTabKey>>(new Set())
  const reportsQueryKey = useMemo(
    () => ADMIN_QUERY_KEYS.reports(activeStatus, 0, REPORT_PAGE_SIZE),
    [activeStatus],
  )

  const reportsQuery = useQuery({
    queryKey: reportsQueryKey,
    queryFn: async (): Promise<{ items: AdminReportRow[]; total: number }> => {
      const status = activeStatus === "all" ? undefined : activeStatus
      const offset = 0
      const data = await api.getReports(status, REPORT_PAGE_SIZE, offset)
      const items = Array.isArray(data.items) ? data.items : []
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
        total: data.total || 0,
      }
    },
    enabled: activeTab === "reports",
    placeholderData: (previous) => previous,
  })

  const reports = useMemo(() => reportsQuery.data?.items ?? [], [reportsQuery.data])
  const loadingReports = reportsQuery.isPending

  const usersQuery = useQuery({
    queryKey: ADMIN_QUERY_KEYS.users,
    queryFn: async (): Promise<AdminManagedUser[]> => {
      const data = await api.getAdminUsers(200)
      return Array.isArray(data.items) ? data.items : []
    },
    enabled: activeTab === "users",
    placeholderData: (previous) => previous,
  })

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data])
  const loadingUsers = usersQuery.isPending

  const projectsQuery = useQuery({
    queryKey: ADMIN_QUERY_KEYS.projects,
    queryFn: async (): Promise<AdminManagedProject[]> => {
      const data = await api.getAdminProjects(undefined, 300)
      return Array.isArray(data.items) ? data.items : []
    },
    enabled: activeTab === "content",
    placeholderData: (previous) => previous,
  })

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])
  const loadingProjects = projectsQuery.isPending

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status, reason }: { reportId: string; status: Exclude<ReportStatus, "all">; reason?: string }) => {
      await api.updateReport(reportId, status, reason)
    },
  })

  const loadActionLogs = async (force: boolean = false) => {
    const hasCache = !force && api.hasAdminTabCache("actions", { limit: 100 })
    if (!hasCache) {
      setLoadingLogs(true)
    }

    const applyLogs = (data: { items: AdminActionLog[] }) => {
      setActionLogs(Array.isArray(data.items) ? data.items : [])
    }

    try {
      const data = await api.getAdminActionLogs(100, { force, onRevalidate: applyLogs })
      applyLogs(data)
    } catch (error) {
      console.error("Failed to fetch action logs:", error)
      setActionLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  const loadPolicies = async (force: boolean = false) => {
    const hasCache = !force && api.hasAdminTabCache("policies")
    if (!hasCache) {
      setLoadingPolicies(true)
    }

    const applyPolicies = (policy: ModerationPolicy) => {
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
      setAdminLogRetentionDays(policy.admin_log_retention_days || 365)
      setAdminLogViewWindowDays(policy.admin_log_view_window_days || 30)
      setAdminLogMaskReasons(policy.admin_log_mask_reasons ?? true)
      setHomeFilterTabsInput(
        tabsToTextarea(
          policy.home_filter_tabs && policy.home_filter_tabs.length > 0
            ? policy.home_filter_tabs
            : HOME_FILTER_TABS_FALLBACK,
        ),
      )
      setExploreFilterTabsInput(
        tabsToTextarea(
          policy.explore_filter_tabs && policy.explore_filter_tabs.length > 0
            ? policy.explore_filter_tabs
            : EXPLORE_FILTER_TABS_FALLBACK,
        ),
      )
      setPolicyUpdatedBy(policy.last_updated_by || null)
      setPolicyUpdatedAt(policy.last_updated_action_at || null)
    }

    try {
      const policy = await api.getAdminPolicies({ force, onRevalidate: applyPolicies })
      applyPolicies(policy)
    } catch (error) {
      console.error("Failed to fetch policies:", error)
      setBlockedKeywordsInput("")
      setBaselineKeywordCategories({})
      setAutoHideThreshold(3)
      setAdminLogRetentionDays(365)
      setAdminLogViewWindowDays(30)
      setAdminLogMaskReasons(true)
      setHomeFilterTabsInput(tabsToTextarea(HOME_FILTER_TABS_FALLBACK))
      setExploreFilterTabsInput(tabsToTextarea(EXPLORE_FILTER_TABS_FALLBACK))
      setPolicyUpdatedBy(null)
      setPolicyUpdatedAt(null)
    } finally {
      setLoadingPolicies(false)
    }
  }

  const loadOAuthSettings = async () => {
    setLoadingOAuthSettings(true)
    try {
      const [settings, health] = await Promise.all([
        api.getAdminOAuthSettings(),
        api.getAdminOAuthHealth(),
      ])
      const normalized: AdminOAuthSettings = {
        google_oauth_enabled: settings.google_oauth_enabled,
        google_redirect_uri: settings.google_redirect_uri || "",
        google_frontend_redirect_uri: settings.google_frontend_redirect_uri || "",
      }
      setOauthEnabled(normalized.google_oauth_enabled)
      setOauthGoogleRedirectUri(normalized.google_redirect_uri)
      setOauthFrontendRedirectUri(normalized.google_frontend_redirect_uri)
      setOauthHealth(health)
    } catch (error) {
      console.error("Failed to fetch oauth settings:", error)
      setOauthHealth(null)
    } finally {
      setLoadingOAuthSettings(false)
    }
  }

  const loadAboutContent = async (force: boolean = false) => {
    const hasCache = !force && api.hasAdminTabCache("pages")
    if (!hasCache) {
      setLoadingAboutContent(true)
    }

    const applyAbout = (about: AboutContent) => {
      setAboutHeroTitle(about.hero_title)
      setAboutHeroHighlight(about.hero_highlight)
      setAboutHeroDescription(about.hero_description)
      setAboutContactEmail(about.contact_email)
      setAboutValuesInput(
        (about.values || [])
          .map((item) => `${item.emoji}|${item.title}|${item.description}`)
          .join("\n")
      )
      setAboutTeamInput(
        (about.team_members || [])
          .map((item) => `${item.name}|${item.role}|${item.description}`)
          .join("\n")
      )
      setAboutFaqInput(
        (about.faqs || [])
          .map((item) => `${item.question}|${item.answer}`)
          .join("\n")
      )
    }

    try {
      const about = await api.getAboutContent({ force, onRevalidate: applyAbout })
      applyAbout(about)
    } catch (error) {
      console.error("Failed to load about content:", error)
      setAboutHeroTitle(ABOUT_CONTENT_FALLBACK.hero_title)
      setAboutHeroHighlight(ABOUT_CONTENT_FALLBACK.hero_highlight)
      setAboutHeroDescription(ABOUT_CONTENT_FALLBACK.hero_description)
      setAboutContactEmail(ABOUT_CONTENT_FALLBACK.contact_email)
      setAboutValuesInput(
        ABOUT_CONTENT_FALLBACK.values
          .map((item) => `${item.emoji}|${item.title}|${item.description}`)
          .join("\n")
      )
      setAboutTeamInput(
        ABOUT_CONTENT_FALLBACK.team_members
          .map((item) => `${item.name}|${item.role}|${item.description}`)
          .join("\n")
      )
      setAboutFaqInput(
        ABOUT_CONTENT_FALLBACK.faqs
          .map((item) => `${item.question}|${item.answer}`)
          .join("\n")
      )
    } finally {
      setLoadingAboutContent(false)
    }
  }

  const prefetchAdminTab = useCallback((tab: AdminTabKey) => {
    if (prefetchedTabsRef.current.has(tab)) {
      return
    }
    prefetchedTabsRef.current.add(tab)
    void api.prefetchAdminTabData(tab)
  }, [])

  useEffect(() => {
    switch (activeTab) {
      case "reports":
        break
      case "users":
        break
      case "content":
        break
      case "pages":
        loadAboutContent()
        break
      case "policies":
        loadPolicies()
        loadOAuthSettings()
        break
      case "actions":
        loadActionLogs()
        loadPolicies()
        break
    }
  }, [activeTab])

  useEffect(() => {
    const nextTabs: AdminTabKey[] = ["users", "content", "actions", "policies", "pages"]
    const prefetchTimer = window.setTimeout(() => {
      nextTabs.forEach((tab) => {
        if (tab === activeTab) {
          return
        }
        prefetchAdminTab(tab)
      })
    }, 300)

    return () => {
      window.clearTimeout(prefetchTimer)
    }
  }, [activeTab, prefetchAdminTab])

  useEffect(() => {
    setSelectedProjectIds((prev) => prev.filter((id) => projects.some((project) => project.id === id)))
    if (editingProjectId && !projects.some((project) => project.id === editingProjectId)) {
      cancelEditingProject()
    }
  }, [projects, editingProjectId])

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

  const filteredProjects = useMemo(() => {
    const query = projectSearchQuery.trim().toLowerCase()

    return projects.filter((project) => {
      const statusMatched = projectStatusFilter === "all" || project.status === projectStatusFilter
      if (!statusMatched) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        project.title.toLowerCase().includes(query)
        || project.summary.toLowerCase().includes(query)
        || project.author_nickname.toLowerCase().includes(query)
        || project.platform.toLowerCase().includes(query)
      )
    })
  }, [projects, projectStatusFilter, projectSearchQuery])

  const filteredActionLogs = useMemo(() => {
    const now = Date.now()
    const periodMs = actionLogPeriodDays > 0 ? actionLogPeriodDays * 24 * 60 * 60 * 1000 : 0

    return actionLogs.filter((log) => {
      if (actionLogFilter !== "all" && log.target_type !== actionLogFilter) {
        return false
      }
      if (policyOnlyLogs && log.action_type !== "policy_updated") {
        return false
      }
      if (periodMs > 0) {
        const createdAt = new Date(log.created_at).getTime()
        if (!Number.isFinite(createdAt) || now - createdAt > periodMs) {
          return false
        }
      }
      return true
    })
  }, [actionLogs, actionLogFilter, policyOnlyLogs, actionLogPeriodDays])

  const selectedActionLog = useMemo(() => {
    if (!selectedActionLogId) {
      return null
    }
    return filteredActionLogs.find((log) => log.id === selectedActionLogId) || null
  }, [filteredActionLogs, selectedActionLogId])

  const policyChangeHistory = useMemo(() => {
    const policyLogs = filteredActionLogs.filter((log) => log.action_type === "policy_updated")
    return policyLogs.map((log, index) => {
      const current = parsePolicyReason(log.reason)
      const previous = index + 1 < policyLogs.length
        ? parsePolicyReason(policyLogs[index + 1].reason)
        : {}

      const keys = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)]))
      const diffs = keys
        .filter((key) => current[key] !== previous[key])
        .map((key) => {
          const label = POLICY_REASON_LABELS[key] || key
          return `${label}: ${previous[key] ?? "-"} -> ${current[key] ?? "-"}`
        })

      return {
        log,
        diffs,
      }
    })
  }, [filteredActionLogs])

  const isProjectActionReasonValid = projectActionReason.trim().length > 0

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

  useEffect(() => {
    if (selectedActionLogId && !filteredActionLogs.some((log) => log.id === selectedActionLogId)) {
      setSelectedActionLogId(null)
    }
  }, [filteredActionLogs, selectedActionLogId])

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

  const handleImportPoliciesCsvClick = () => {
    csvImportInputRef.current?.click()
  }

  const handleImportPoliciesCsvFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

      if (lines.length < 2) {
        window.alert("CSV 내용이 비어 있습니다")
        return
      }

      const header = parseCsvLine(lines[0]).map((column) => column.toLowerCase())
      if (header.join(",") !== "group,category,keyword") {
        window.alert("CSV 헤더 형식이 올바르지 않습니다. (group,category,keyword)")
        return
      }

      const importedCustomKeywords = new Set<string>()

      lines.slice(1).forEach((line) => {
        const [group, , keyword] = parseCsvLine(line)
        if (!keyword) {
          return
        }
        if (group?.toLowerCase() === "custom") {
          importedCustomKeywords.add(keyword.trim())
        }
      })

      if (importedCustomKeywords.size === 0) {
        window.alert("CSV에서 가져올 custom 키워드가 없습니다")
        return
      }

      const mergedKeywords = Array.from(
        new Set([...customKeywords, ...Array.from(importedCustomKeywords)])
      )

      setBlockedKeywordsInput(mergedKeywords.join(", "))
      setSavingPolicies(true)
      await api.updateAdminPolicies(mergedKeywords, autoHideThreshold)
      await Promise.all([loadPolicies(true), loadActionLogs(true)])
      window.alert(`CSV에서 custom 키워드 ${importedCustomKeywords.size}개를 반영했습니다`)
    } catch (error) {
      console.error("Failed to import policies CSV:", error)
      window.alert("CSV 가져오기에 실패했습니다")
    } finally {
      event.target.value = ""
      setSavingPolicies(false)
    }
  }

  const handleUpdateReport = async (
    reportId: string,
    status: Exclude<ReportStatus, "all">,
    reason?: string,
  ) => {
    try {
      await updateReportMutation.mutateAsync({ reportId, status, reason: reason || undefined })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.reportsBase }),
        loadActionLogs(true),
      ])
    } catch (error) {
      console.error("Failed to update report:", error)
    }
  }

  const refreshUsersAndLogs = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users }),
      loadActionLogs(true),
    ])
  }

  const refreshProjectsAndLogs = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.projects }),
      loadActionLogs(true),
    ])
  }

  const handleLimitUser = async (userId: string, hours: number, reason?: string) => {
    if (!Number.isFinite(hours) || hours <= 0) {
      window.alert("유효한 시간(1 이상)을 입력해주세요")
      return
    }
    try {
      await api.limitUser(userId, hours, reason || undefined)
      await refreshUsersAndLogs()
    } catch (error) {
      console.error("Failed to limit user:", error)
    }
  }

  const handleUnlimitUser = async (userId: string) => {
    try {
      await api.unlimitUser(userId)
      await refreshUsersAndLogs()
    } catch (error) {
      console.error("Failed to unlimit user:", error)
    }
  }

  const handleSuspendUser = async (userId: string, reason: string) => {
    if (!reason || !reason.trim()) {
      return
    }

    try {
      await api.suspendUser(userId, reason.trim())
      await refreshUsersAndLogs()
    } catch (error) {
      console.error("Failed to suspend user:", error)
    }
  }

  const handleUnsuspendUser = async (userId: string) => {
    try {
      await api.unsuspendUser(userId)
      await refreshUsersAndLogs()
    } catch (error) {
      console.error("Failed to unsuspend user:", error)
    }
  }

  const handleRevokeUserTokens = async (userId: string, reason?: string) => {
    try {
      await api.revokeUserTokens(userId, reason || undefined)
      await refreshUsersAndLogs()
    } catch (error) {
      console.error("Failed to revoke user tokens:", error)
    }
  }

  const handleScheduleUserDelete = async (userId: string, days: number, reason: string) => {
    if (!Number.isFinite(days) || days < 1) {
      window.alert("유효한 기간(1일 이상)을 입력해주세요")
      return
    }
    if (!reason || !reason.trim()) {
      return
    }

    try {
      await api.scheduleUserDelete(userId, days, reason.trim())
      await refreshUsersAndLogs()
    } catch (error) {
      console.error("Failed to schedule user deletion:", error)
    }
  }

  const handleCancelUserDeleteSchedule = async (userId: string) => {
    try {
      await api.cancelUserDeleteSchedule(userId)
      await refreshUsersAndLogs()
    } catch (error) {
      console.error("Failed to cancel user deletion schedule:", error)
    }
  }

  const handleDeleteUserNow = async (userId: string, reason: string) => {
    if (!reason || !reason.trim()) {
      return
    }

    try {
      await api.deleteUserNow(userId, reason.trim())
      await refreshUsersAndLogs()
    } catch (error) {
      console.error("Failed to delete user now:", error)
    }
  }

  const handleApproveUser = async (userId: string) => {
    try {
      await api.approveUser(userId)
      await refreshUsersAndLogs()
    } catch (error) {
      console.error("Failed to approve user:", error)
    }
  }

  const handleRejectUser = async (userId: string, reason: string) => {
    if (!reason || !reason.trim()) {
      return
    }

    try {
      await api.rejectUser(userId, reason.trim())
      await refreshUsersAndLogs()
    } catch (error) {
      console.error("Failed to reject user:", error)
    }
  }

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    )
  }

  const startEditingProject = (project: AdminManagedProject) => {
    setEditingProjectId(project.id)
    setEditingProjectTitle(project.title)
    setEditingProjectSummary(project.summary)
    setEditingProjectTags(project.tags ?? [])
    setEditingProjectTagInput("")
    setEditingProjectReason("")
  }

  const cancelEditingProject = () => {
    setEditingProjectId(null)
    setEditingProjectTitle("")
    setEditingProjectSummary("")
    setEditingProjectTags([])
    setEditingProjectTagInput("")
    setEditingProjectReason("")
  }

  const handleAddEditingProjectTag = () => {
    const nextTag = editingProjectTagInput.trim()
    if (!nextTag) return
    setEditingProjectTags((prev) => {
      const exists = prev.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())
      if (exists) return prev
      return [...prev, nextTag]
    })
    setEditingProjectTagInput("")
  }

  const handleRemoveEditingProjectTag = (targetTag: string) => {
    setEditingProjectTags((prev) => prev.filter((tag) => tag !== targetTag))
  }

  const handleSaveProjectEdit = async () => {
    if (!editingProjectId) return

    const reason = editingProjectReason.trim()
    if (!reason) {
      window.alert("수정 사유를 입력해주세요")
      return
    }

    try {
      await api.updateAdminProject(editingProjectId, {
        title: editingProjectTitle.trim(),
        summary: editingProjectSummary.trim(),
        tags: editingProjectTags,
        reason,
      })
      await refreshProjectsAndLogs()
      cancelEditingProject()
    } catch (error) {
      console.error("Failed to update project:", error)
    }
  }

  const handleProjectSingleAction = async (
    action: "hide" | "restore" | "delete",
    projectId: string,
  ) => {
    const reason = projectActionReason.trim()
    if (!reason) {
      window.alert("작업 사유를 입력해주세요")
      return
    }

    try {
      if (action === "hide") {
        await api.hideAdminProject(projectId, reason)
      } else if (action === "restore") {
        await api.restoreAdminProject(projectId, reason)
      } else {
        await api.deleteAdminProject(projectId, reason)
      }
      await refreshProjectsAndLogs()
      setSelectedProjectIds((prev) => prev.filter((id) => id !== projectId))
    } catch (error) {
      console.error(`Failed to ${action} project:`, error)
    }
  }

  const handleProjectBulkAction = async (action: "hide" | "restore") => {
    if (selectedProjectIds.length === 0) {
      window.alert("먼저 프로젝트를 선택해주세요")
      return
    }

    const reason = projectActionReason.trim()
    if (!reason) {
      window.alert("작업 사유를 입력해주세요")
      return
    }

    try {
      await Promise.all(
        selectedProjectIds.map((projectId) =>
          action === "hide"
            ? api.hideAdminProject(projectId, reason)
            : api.restoreAdminProject(projectId, reason)
        )
      )
      await refreshProjectsAndLogs()
      setSelectedProjectIds([])
    } catch (error) {
      console.error(`Failed to bulk-${action} projects:`, error)
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
    if (adminLogRetentionDays < 30) {
      window.alert("로그 보존 기간은 최소 30일 이상이어야 합니다")
      return
    }
    if (adminLogViewWindowDays < 1) {
      window.alert("로그 기본 조회 기간은 최소 1일 이상이어야 합니다")
      return
    }

    const homeTabs = parseTabsTextarea(homeFilterTabsInput)
    const exploreTabs = parseTabsTextarea(exploreFilterTabsInput)
    if (homeTabs.length === 0 || exploreTabs.length === 0) {
      window.alert("Home/Explore 탭은 최소 1개 이상 입력해야 합니다 (형식: id|label)")
      return
    }

    setSavingPolicies(true)
    try {
      await api.updateAdminPolicies(
        keywords,
        autoHideThreshold,
        homeTabs,
        exploreTabs,
        adminLogRetentionDays,
        adminLogViewWindowDays,
        adminLogMaskReasons,
      )
      await Promise.all([loadPolicies(true), loadActionLogs(true)])
      window.alert("정책이 저장되었습니다")
    } catch (error) {
      console.error("Failed to save policies:", error)
      window.alert("정책 저장에 실패했습니다")
    } finally {
      setSavingPolicies(false)
    }
  }

  const handleSaveOAuthSettings = async () => {
    if (!oauthGoogleRedirectUri.trim() || !oauthFrontendRedirectUri.trim()) {
      window.alert("Google Redirect URI와 Frontend Redirect URI를 입력해주세요")
      return
    }

    setSavingOAuthSettings(true)
    try {
      await api.updateAdminOAuthSettings({
        google_oauth_enabled: oauthEnabled,
        google_redirect_uri: oauthGoogleRedirectUri.trim(),
        google_frontend_redirect_uri: oauthFrontendRedirectUri.trim(),
      })
      const health = await api.getAdminOAuthHealth()
      setOauthHealth(health)
      await loadActionLogs(true)
      window.alert("OAuth 설정이 저장되었습니다")
    } catch (error) {
      console.error("Failed to save oauth settings:", error)
      window.alert(error instanceof Error ? error.message : "OAuth 설정 저장에 실패했습니다")
    } finally {
      setSavingOAuthSettings(false)
    }
  }

  const handleSaveAboutContent = async () => {
    const reason = aboutReason.trim()
    if (!reason) {
      window.alert("소개 페이지 수정 사유를 입력해주세요")
      return
    }

    const values = linesToTriples(aboutValuesInput).map((item) => ({
      emoji: item.a,
      title: item.b,
      description: item.c,
    }))
    const teamMembers = linesToTriples(aboutTeamInput).map((item) => ({
      name: item.a,
      role: item.b,
      description: item.c,
    }))
    const faqs = aboutFaqInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [question = "", ...rest] = line.split("|")
        return {
          question: question.trim(),
          answer: rest.join("|").trim(),
        }
      })
      .filter((item) => item.question && item.answer)

    if (values.length === 0 || teamMembers.length === 0 || faqs.length === 0) {
      window.alert("Values/Team/FAQ는 각 줄을 `|` 구분자로 입력해야 합니다")
      return
    }

    setSavingAboutContent(true)
    try {
      await api.updateAboutContent({
        hero_title: aboutHeroTitle.trim(),
        hero_highlight: aboutHeroHighlight.trim(),
        hero_description: aboutHeroDescription.trim(),
        contact_email: aboutContactEmail.trim(),
        values,
        team_members: teamMembers,
        faqs,
        reason,
      })
      await Promise.all([loadAboutContent(true), loadActionLogs(true)])
      setAboutReason("")
      window.alert("About 페이지 내용이 저장되었습니다")
    } catch (error) {
      console.error("Failed to save about content:", error)
      window.alert("About 페이지 저장에 실패했습니다")
    } finally {
      setSavingAboutContent(false)
    }
  }

  const invalidateAdminTab = async (tab: AdminTabKey) => {
    if (tab === "pages") {
      await loadAboutContent(true)
      return
    }

    if (tab === "policies") {
      await Promise.all([loadPolicies(true), loadOAuthSettings()])
      return
    }

    if (tab === "actions") {
      await loadActionLogs(true)
      return
    }

    await queryClient.invalidateQueries({ queryKey: getAdminTabQueryKey(tab) })
  }

  const handleManualRefresh = async () => {
    await invalidateAdminTab(activeTab)
  }

  const handleTabHoverPrefetch = (tab: AdminTabKey) => {
    prefetchAdminTab(tab)
  }

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <TopNav
        active="home"
        onNavigate={onNavigate}
        titleSuffix={<span className="text-[#FF5D8F]">Admin</span>}
        rightSlot={
          <Button onClick={logout} className="bg-[#FF5D8F] hover:bg-[#FF5D8F]/90 text-white font-semibold">
            로그아웃
          </Button>
        }
      />

      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-6">
        <AdminStatsCards stats={stats} />

        <Tabs
          orientation="vertical"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as AdminTabKey)}
          className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]"
        >
          <AdminSidebarNav
            onTabHoverPrefetch={handleTabHoverPrefetch}
            onManualRefresh={handleManualRefresh}
          />

          <section className="min-w-0 rounded-xl border border-[#111936] bg-[#161F42]/60 p-3 md:p-4">
            <AdminReportsTab
            statusTabs={STATUS_TABS}
            activeStatus={activeStatus}
            setActiveStatus={setActiveStatus}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            loadingReports={loadingReports}
            filteredReports={filteredReports}
            statusToText={statusToText}
            handleUpdateReport={handleUpdateReport}
          />

            <AdminUsersTab
            loadingUsers={loadingUsers}
            users={users}
            authUserRole={authUser?.role}
            getUserLimitState={getUserLimitState}
            getUserApprovalState={getUserApprovalState}
            handleApproveUser={handleApproveUser}
            handleRejectUser={handleRejectUser}
            handleLimitUser={handleLimitUser}
            handleUnlimitUser={handleUnlimitUser}
            handleSuspendUser={handleSuspendUser}
            handleUnsuspendUser={handleUnsuspendUser}
            handleRevokeUserTokens={handleRevokeUserTokens}
            handleScheduleUserDelete={handleScheduleUserDelete}
            handleCancelUserDeleteSchedule={handleCancelUserDeleteSchedule}
            handleDeleteUserNow={handleDeleteUserNow}
          />

            <AdminContentTab
            filters={{
              projectStatusFilter,
              setProjectStatusFilter,
              projectSearchQuery,
              setProjectSearchQuery,
            }}
            bulk={{
              projectActionReason,
              setProjectActionReason,
              handleProjectBulkAction,
              isProjectActionReasonValid,
              selectedProjectIds,
            }}
            editing={{
              editingProjectId,
              editingProjectTitle,
              setEditingProjectTitle,
              editingProjectSummary,
              setEditingProjectSummary,
              editingProjectTagInput,
              setEditingProjectTagInput,
              editingProjectTags,
              editingProjectReason,
              setEditingProjectReason,
              handleAddEditingProjectTag,
              handleRemoveEditingProjectTag,
              handleSaveProjectEdit,
              cancelEditingProject,
            }}
            loading={{
              loadingProjects,
            }}
            filteredProjects={filteredProjects}
            toggleProjectSelection={toggleProjectSelection}
            startEditingProject={startEditingProject}
            handleProjectSingleAction={handleProjectSingleAction}
          />

            <AdminPagesTab
            loading={{
              loadingAboutContent,
              savingAboutContent,
            }}
            fields={{
              aboutHeroTitle,
              setAboutHeroTitle,
              aboutHeroHighlight,
              setAboutHeroHighlight,
              aboutHeroDescription,
              setAboutHeroDescription,
              aboutContactEmail,
              setAboutContactEmail,
              aboutValuesInput,
              setAboutValuesInput,
              aboutTeamInput,
              setAboutTeamInput,
              aboutFaqInput,
              setAboutFaqInput,
              aboutReason,
              setAboutReason,
            }}
            actions={{
              handleSaveAboutContent,
            }}
          />

            <AdminPoliciesTab
            loading={{
              loadingPolicies,
              loadingOAuthSettings,
              savingOAuthSettings,
              savingPolicies,
            }}
            oauth={{
              oauthHealth,
              oauthEnabled,
              setOauthEnabled,
              oauthGoogleRedirectUri,
              setOauthGoogleRedirectUri,
              oauthFrontendRedirectUri,
              setOauthFrontendRedirectUri,
              handleSaveOAuthSettings,
            }}
            policyMeta={{
              policyUpdatedBy,
              policyUpdatedAt,
              policyPreviewQuery,
              setPolicyPreviewQuery,
            }}
            policyCategories={{
              filteredBaselineKeywordCategories,
              collapsedPolicyCategories,
              handleTogglePolicyCategory,
              handleExpandAllPolicyCategories,
              handleCollapseAllPolicyCategories,
            }}
            policyForms={{
              blockedKeywordsInput,
              setBlockedKeywordsInput,
              autoHideThreshold,
              setAutoHideThreshold,
              adminLogRetentionDays,
              setAdminLogRetentionDays,
              adminLogViewWindowDays,
              setAdminLogViewWindowDays,
              adminLogMaskReasons,
              setAdminLogMaskReasons,
              homeFilterTabsInput,
              setHomeFilterTabsInput,
              exploreFilterTabsInput,
              setExploreFilterTabsInput,
              handleSavePolicies,
            }}
            csvActions={{
              handleExportPoliciesCsv,
              handleImportPoliciesCsvClick,
              csvImportInputRef,
              handleImportPoliciesCsvFile,
            }}
          />

            <AdminActionsTab
            summary={{
              adminLogRetentionDays,
              adminLogViewWindowDays,
              adminLogMaskReasons,
            }}
            filters={{
              policyOnlyLogs,
              setPolicyOnlyLogs,
              actionLogPeriodDays,
              setActionLogPeriodDays,
              actionLogFilter,
              setActionLogFilter,
            }}
            data={{
              loadingLogs,
              filteredActionLogs,
              selectedActionLogId,
              selectedActionLog,
              policyChangeHistory,
            }}
            actions={{
              setSelectedActionLogId,
            }}
            actionToText={actionToText}
            />
          </section>
        </Tabs>
      </main>
    </div>
  )
}
