import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TopNav } from "@/components/TopNav"
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

  const [reports, setReports] = useState<AdminReportRow[]>([])
  const [actionLogs, setActionLogs] = useState<AdminActionLog[]>([])
  const [users, setUsers] = useState<AdminManagedUser[]>([])
  const [projects, setProjects] = useState<AdminManagedProject[]>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingPolicies, setLoadingPolicies] = useState(true)
  const [savingPolicies, setSavingPolicies] = useState(false)
  const [loadingOAuthSettings, setLoadingOAuthSettings] = useState(true)
  const [savingOAuthSettings, setSavingOAuthSettings] = useState(false)
  const [activeStatus, setActiveStatus] = useState<ReportStatus>("all")
  const [reportPage, setReportPage] = useState(0)
  const [reportTotal, setReportTotal] = useState(0)
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

  const loadReports = useCallback(async (page: number = 0, force: boolean = false) => {
    const status = activeStatus === "all" ? undefined : activeStatus
    const offset = page * REPORT_PAGE_SIZE
    const hasCache = !force && api.hasAdminTabCache("reports", {
      status: status ?? "all",
      limit: REPORT_PAGE_SIZE,
      offset,
    })
    if (!hasCache) {
      setLoadingReports(true)
    }

    const applyReports = (data: { items: Array<{ id: string; target_type: string; target_id: string; reason: string; status: string; reporter_id?: string; created_at: string }>; total?: number }) => {
      const items = Array.isArray(data.items) ? data.items : []
      const mapped: AdminReportRow[] = items.map((item) => ({
        id: item.id,
        targetType: item.target_type,
        targetContent: item.target_id,
        reason: item.reason,
        status: item.status,
        reporter: item.reporter_id || "unknown",
        createdAt: new Date(item.created_at).toLocaleString("ko-KR"),
      }))
      setReports(mapped)
      setReportTotal(data.total || 0)
      setReportPage(page)
    }

    try {
      const data = await api.getReports(status, REPORT_PAGE_SIZE, offset, {
        force,
        onRevalidate: applyReports,
      })
      applyReports(data)
    } catch (error) {
      console.error("Failed to fetch reports:", error)
      setReports([])
    } finally {
      setLoadingReports(false)
    }
  }, [activeStatus])

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

  const loadUsers = async (force: boolean = false) => {
    const hasCache = !force && api.hasAdminTabCache("users", { limit: 200 })
    if (!hasCache) {
      setLoadingUsers(true)
    }

    const applyUsers = (data: { items: AdminManagedUser[] }) => {
      setUsers(Array.isArray(data.items) ? data.items : [])
    }

    try {
      const data = await api.getAdminUsers(200, { force, onRevalidate: applyUsers })
      applyUsers(data)
    } catch (error) {
      console.error("Failed to fetch users:", error)
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadProjects = async (force: boolean = false) => {
    const hasCache = !force && api.hasAdminTabCache("content", { status: "all", limit: 300 })
    if (!hasCache) {
      setLoadingProjects(true)
    }

    const applyProjects = (data: { items: AdminManagedProject[] }) => {
      setProjects(Array.isArray(data.items) ? data.items : [])
    }

    try {
      const data = await api.getAdminProjects(undefined, 300, { force, onRevalidate: applyProjects })
      applyProjects(data)
    } catch (error) {
      console.error("Failed to fetch projects:", error)
      setProjects([])
    } finally {
      setLoadingProjects(false)
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

  useEffect(() => {
    switch (activeTab) {
      case "reports":
        loadReports(0)
        break
      case "users":
        loadUsers()
        break
      case "content":
        loadProjects()
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
  }, [activeTab, loadReports])

  useEffect(() => {
    if (activeTab === "reports") {
      loadReports(0)
    }
  }, [activeStatus, activeTab, loadReports])

  useEffect(() => {
    const nextTabs: AdminTabKey[] = ["users", "content", "actions", "policies", "pages"]
    const prefetchTimer = window.setTimeout(() => {
      nextTabs.forEach((tab) => {
        if (tab === activeTab || prefetchedTabsRef.current.has(tab)) {
          return
        }
        prefetchedTabsRef.current.add(tab)
        void api.prefetchAdminTabData(tab)
      })
    }, 300)

    return () => {
      window.clearTimeout(prefetchTimer)
    }
  }, [activeTab])

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
  const areAllFilteredProjectsSelected =
    filteredProjects.length > 0
    && filteredProjects.every((project) => selectedProjectIds.includes(project.id))

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
  ) => {
    const reason = window.prompt("처리 사유를 입력하세요 (선택)", "")
    try {
      await api.updateReport(reportId, status, reason || undefined)
      await Promise.all([loadReports(reportPage, true), loadActionLogs(true)])
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
      await Promise.all([loadUsers(true), loadActionLogs(true)])
    } catch (error) {
      console.error("Failed to limit user:", error)
    }
  }

  const handleUnlimitUser = async (userId: string) => {
    try {
      await api.unlimitUser(userId)
      await Promise.all([loadUsers(true), loadActionLogs(true)])
    } catch (error) {
      console.error("Failed to unlimit user:", error)
    }
  }

  const handleSuspendUser = async (userId: string) => {
    const reason = window.prompt("정지 사유를 입력하세요", "보안 정책 위반")
    if (!reason || !reason.trim()) {
      return
    }

    try {
      await api.suspendUser(userId, reason.trim())
      await Promise.all([loadUsers(true), loadActionLogs(true)])
    } catch (error) {
      console.error("Failed to suspend user:", error)
    }
  }

  const handleUnsuspendUser = async (userId: string) => {
    try {
      await api.unsuspendUser(userId)
      await Promise.all([loadUsers(true), loadActionLogs(true)])
    } catch (error) {
      console.error("Failed to unsuspend user:", error)
    }
  }

  const handleRevokeUserTokens = async (userId: string) => {
    const reason = window.prompt("세션 무효화 사유를 입력하세요", "보안 점검")
    try {
      await api.revokeUserTokens(userId, reason || undefined)
      await Promise.all([loadUsers(true), loadActionLogs(true)])
    } catch (error) {
      console.error("Failed to revoke user tokens:", error)
    }
  }

  const handleScheduleUserDelete = async (userId: string) => {
    const daysText = window.prompt("삭제 예약 기간(일)을 입력하세요", "30")
    if (!daysText) {
      return
    }
    const days = Number(daysText)
    if (!Number.isFinite(days) || days < 1) {
      window.alert("유효한 기간(1일 이상)을 입력해주세요")
      return
    }

    const reason = window.prompt("삭제 예약 사유를 입력하세요", "보안 위협 계정 조사")
    if (!reason || !reason.trim()) {
      return
    }

    try {
      await api.scheduleUserDelete(userId, days, reason.trim())
      await Promise.all([loadUsers(true), loadActionLogs(true)])
    } catch (error) {
      console.error("Failed to schedule user deletion:", error)
    }
  }

  const handleCancelUserDeleteSchedule = async (userId: string) => {
    try {
      await api.cancelUserDeleteSchedule(userId)
      await Promise.all([loadUsers(true), loadActionLogs(true)])
    } catch (error) {
      console.error("Failed to cancel user deletion schedule:", error)
    }
  }

  const handleDeleteUserNow = async (userId: string) => {
    const reason = window.prompt("즉시 삭제 사유를 입력하세요", "중대한 보안 위협")
    if (!reason || !reason.trim()) {
      return
    }
    if (!window.confirm("정말로 즉시 삭제 처리하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return
    }

    try {
      await api.deleteUserNow(userId, reason.trim())
      await Promise.all([loadUsers(true), loadActionLogs(true)])
    } catch (error) {
      console.error("Failed to delete user now:", error)
    }
  }

  const handleApproveUser = async (userId: string) => {
    try {
      await api.approveUser(userId)
      await Promise.all([loadUsers(true), loadActionLogs(true)])
    } catch (error) {
      console.error("Failed to approve user:", error)
    }
  }

  const handleRejectUser = async (userId: string) => {
    const reason = window.prompt("반려 사유를 입력하세요", "가입 정보 확인 필요")
    if (!reason || !reason.trim()) {
      return
    }

    try {
      await api.rejectUser(userId, reason.trim())
      await Promise.all([loadUsers(true), loadActionLogs(true)])
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

  const toggleSelectAllFilteredProjects = () => {
    if (areAllFilteredProjectsSelected) {
      setSelectedProjectIds((prev) =>
        prev.filter((id) => !filteredProjects.some((project) => project.id === id))
      )
      return
    }

    setSelectedProjectIds((prev) => {
      const merged = new Set(prev)
      filteredProjects.forEach((project) => merged.add(project.id))
      return Array.from(merged)
    })
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
      await Promise.all([loadProjects(true), loadActionLogs(true)])
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

    if (action === "delete") {
      const confirmed = window.confirm("정말 삭제(소프트 삭제) 처리하시겠습니까?")
      if (!confirmed) return
    }

    try {
      if (action === "hide") {
        await api.hideAdminProject(projectId, reason)
      } else if (action === "restore") {
        await api.restoreAdminProject(projectId, reason)
      } else {
        await api.deleteAdminProject(projectId, reason)
      }
      await Promise.all([loadProjects(true), loadActionLogs(true)])
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
      await Promise.all([loadProjects(true), loadActionLogs(true)])
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

  const handleManualRefresh = async () => {
    switch (activeTab) {
      case "reports":
        await loadReports(reportPage, true)
        break
      case "users":
        await loadUsers(true)
        break
      case "content":
        await loadProjects(true)
        break
      case "pages":
        await loadAboutContent(true)
        break
      case "policies":
        await Promise.all([loadPolicies(true), loadOAuthSettings()])
        break
      case "actions":
        await loadActionLogs(true)
        break
    }
  }

  const handleTabHoverPrefetch = (tab: AdminTabKey) => {
    if (prefetchedTabsRef.current.has(tab)) {
      return
    }
    prefetchedTabsRef.current.add(tab)
    void api.prefetchAdminTabData(tab)
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

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTabKey)}>
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <TabsList className="bg-[#161F42] border-0">
              <TabsTrigger onMouseEnter={() => handleTabHoverPrefetch("reports")} value="reports" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">📋 신고 큐</TabsTrigger>
              <TabsTrigger onMouseEnter={() => handleTabHoverPrefetch("users")} value="users" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">👤 사용자 관리</TabsTrigger>
              <TabsTrigger onMouseEnter={() => handleTabHoverPrefetch("content")} value="content" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">🧩 콘텐츠 관리</TabsTrigger>
              <TabsTrigger onMouseEnter={() => handleTabHoverPrefetch("pages")} value="pages" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">📝 페이지 관리</TabsTrigger>
              <TabsTrigger onMouseEnter={() => handleTabHoverPrefetch("policies")} value="policies" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">⚙️ 정책/룰</TabsTrigger>
              <TabsTrigger onMouseEnter={() => handleTabHoverPrefetch("actions")} value="actions" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">📝 관리자 로그</TabsTrigger>
            </TabsList>
            <Button
              type="button"
              variant="outline"
              className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
              onClick={handleManualRefresh}
            >
              데이터 새로고침
            </Button>
          </div>

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
                {!loadingReports && reportTotal > REPORT_PAGE_SIZE ? (
                  <div className="flex items-center justify-between border-t border-[#111936] p-4">
                    <p className="text-xs text-[#B8C3E6]">
                      총 {reportTotal}건 | 페이지 {reportPage + 1} / {Math.max(1, Math.ceil(reportTotal / REPORT_PAGE_SIZE))}
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
                        disabled={(reportPage + 1) * REPORT_PAGE_SIZE >= reportTotal}
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
                        const approvalState = getUserApprovalState(user)
                        const canHardDelete = (authUser?.role ?? "") === "super_admin"
                        return (
                          <tr key={user.id} className="border-b border-[#111936]/50 hover:bg-[#111936]/30">
                            <td className="p-4 text-[#F4F7FF]">{user.nickname}</td>
                            <td className="p-4 text-[#B8C3E6]">{user.email || "-"}</td>
                            <td className="p-4 text-[#B8C3E6]">{user.role}</td>
                            <td className="p-4">
                              <Badge variant={approvalState.tone}>
                                {approvalState.label}
                              </Badge>
                              <p className="text-xs text-[#B8C3E6] mt-2">제재: {limitState.label}</p>
                            </td>
                            <td className="p-4 text-[#B8C3E6]">
                              {user.limited_until ? new Date(user.limited_until).toLocaleString("ko-KR") : "-"}
                            </td>
                            <td className="p-4 align-top">
                              <div className="flex flex-wrap gap-1 max-w-[640px]">
                                <Button
                                  size="sm"
                                  className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] text-xs whitespace-nowrap"
                                  disabled={user.role === "admin" || user.status !== "pending"}
                                  onClick={() => handleApproveUser(user.id)}
                                >
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10 text-xs whitespace-nowrap"
                                  disabled={user.role === "admin" || user.status !== "pending"}
                                  onClick={() => handleRejectUser(user.id)}
                                >
                                  반려
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white text-xs whitespace-nowrap"
                                  disabled={user.role === "admin" || limitState.isLimited || user.status !== "active"}
                                  onClick={() => handleLimitUser(user.id)}
                                >
                                  24h 제한
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs whitespace-nowrap"
                                  disabled={user.role === "admin" || !limitState.isLimited}
                                  onClick={() => handleUnlimitUser(user.id)}
                                >
                                  제한 해제
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-[#FFB547] hover:bg-[#FFB547]/90 text-[#0B1020] text-xs whitespace-nowrap"
                                  disabled={user.role === "admin" || user.status === "suspended" || user.status === "deleted"}
                                  onClick={() => handleSuspendUser(user.id)}
                                >
                                  계정 정지
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-[#FFB547] text-[#FFB547] hover:bg-[#FFB547]/10 text-xs whitespace-nowrap"
                                  disabled={user.role === "admin" || user.status !== "suspended"}
                                  onClick={() => handleUnsuspendUser(user.id)}
                                >
                                  정지 해제
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-[#23D5AB] text-[#23D5AB] hover:bg-[#23D5AB]/10 text-xs whitespace-nowrap"
                                  disabled={user.role === "admin" || user.status === "deleted"}
                                  onClick={() => handleRevokeUserTokens(user.id)}
                                >
                                  세션 무효화
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-[#6B8BFF] hover:bg-[#6B8BFF]/90 text-white text-xs whitespace-nowrap"
                                  disabled={user.role === "admin" || user.status === "pending_delete" || user.status === "deleted"}
                                  onClick={() => handleScheduleUserDelete(user.id)}
                                >
                                  삭제 예약
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-[#6B8BFF] text-[#6B8BFF] hover:bg-[#6B8BFF]/10 text-xs whitespace-nowrap"
                                  disabled={user.status !== "pending_delete"}
                                  onClick={() => handleCancelUserDeleteSchedule(user.id)}
                                >
                                  예약 취소
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10 text-xs whitespace-nowrap"
                                  disabled={!canHardDelete || user.role === "admin" || user.status === "deleted"}
                                  onClick={() => handleDeleteUserNow(user.id)}
                                >
                                  즉시 삭제
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

          <TabsContent value="content">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-2 flex-wrap">
                {(["all", "published", "hidden", "deleted"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setProjectStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      projectStatusFilter === status
                        ? "bg-[#FF5D8F] text-white"
                        : "bg-[#161F42] text-[#B8C3E6] hover:bg-[#1b2550]"
                    }`}
                  >
                    {status === "all" ? "전체" : status}
                  </button>
                ))}
              </div>
              <input
                value={projectSearchQuery}
                onChange={(event) => setProjectSearchQuery(event.target.value)}
                placeholder="제목/요약/작성자/플랫폼 검색"
                className="w-full md:w-72 bg-[#161F42] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#B8C3E6]/60 focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
              />
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={projectActionReason}
                onChange={(event) => setProjectActionReason(event.target.value)}
                placeholder="콘텐츠 작업 사유 (필수)"
                className="w-full bg-[#161F42] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#B8C3E6]/60 focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                  onClick={() => handleProjectBulkAction("hide")}
                  disabled={!isProjectActionReasonValid || selectedProjectIds.length === 0}
                >
                  선택 숨김
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                  onClick={() => handleProjectBulkAction("restore")}
                  disabled={!isProjectActionReasonValid || selectedProjectIds.length === 0}
                >
                  선택 복구
                </Button>
              </div>
            </div>

            {editingProjectId && (
              <Card className="bg-[#161F42] border border-[#FF5D8F]/40 mb-4">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-[#F4F7FF]">프로젝트 수정</p>
                  <input
                    value={editingProjectTitle}
                    onChange={(event) => setEditingProjectTitle(event.target.value)}
                    placeholder="제목"
                    className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                  />
                  <textarea
                    value={editingProjectSummary}
                    onChange={(event) => setEditingProjectSummary(event.target.value)}
                    placeholder="요약"
                    rows={3}
                    className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                  />
                  <div className="space-y-2">
                    <p className="text-xs text-[#B8C3E6]">태그 수정 (추가/제거)</p>
                    <div className="flex gap-2">
                      <input
                        value={editingProjectTagInput}
                        onChange={(event) => setEditingProjectTagInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            handleAddEditingProjectTag()
                          }
                        }}
                        placeholder="태그 입력 후 Enter"
                        className="flex-1 bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                        onClick={handleAddEditingProjectTag}
                      >
                        태그 추가
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editingProjectTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleRemoveEditingProjectTag(tag)}
                          className="rounded-full bg-[#111936] px-3 py-1 text-xs text-[#B8C3E6] hover:bg-[#FF5D8F]/20 hover:text-[#F4F7FF]"
                          title="클릭해서 제거"
                        >
                          {tag} ×
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    value={editingProjectReason}
                    onChange={(event) => setEditingProjectReason(event.target.value)}
                    placeholder="수정 사유 (필수)"
                    className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="bg-[#FF5D8F] hover:bg-[#FF5D8F]/90 text-white"
                      onClick={handleSaveProjectEdit}
                    >
                      수정 저장
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                      onClick={cancelEditingProject}
                    >
                      취소
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-0">
                {loadingProjects ? (
                  <div className="p-6 text-[#B8C3E6]">프로젝트 로딩 중...</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#111936]">
                        <th className="text-left p-4 text-[#B8C3E6] font-medium">상태</th>
                        <th className="text-left p-4 text-[#B8C3E6] font-medium">제목</th>
                        <th className="text-left p-4 text-[#B8C3E6] font-medium">작성자</th>
                        <th className="text-left p-4 text-[#B8C3E6] font-medium">플랫폼</th>
                        <th className="text-left p-4 text-[#B8C3E6] font-medium">반응</th>
                        <th className="text-left p-4 text-[#B8C3E6] font-medium">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.map((project) => (
                        <tr key={project.id} className="border-b border-[#111936]/50 hover:bg-[#111936]/30">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedProjectIds.includes(project.id)}
                              onChange={() => toggleProjectSelection(project.id)}
                            />
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                project.status === "published"
                                  ? "default"
                                  : project.status === "hidden"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {project.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-[#F4F7FF] max-w-xs truncate">{project.title}</td>
                          <td className="p-4 text-[#B8C3E6]">{project.author_nickname}</td>
                          <td className="p-4 text-[#B8C3E6]">{project.platform}</td>
                          <td className="p-4 text-[#B8C3E6]">❤️ {project.like_count} · 💬 {project.comment_count}</td>
                          <td className="p-4">
                            <div className="flex gap-1 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
                                onClick={() => startEditingProject(project)}
                              >
                                수정
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
                                onClick={() => handleProjectSingleAction("hide", project.id)}
                                disabled={project.status === "hidden" || project.status === "deleted"}
                              >
                                숨김
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
                                onClick={() => handleProjectSingleAction("restore", project.id)}
                                disabled={project.status === "published"}
                              >
                                복구
                              </Button>
                              <Button
                                size="sm"
                                className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white text-xs"
                                onClick={() => handleProjectSingleAction("delete", project.id)}
                                disabled={project.status === "deleted"}
                              >
                                삭제
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

          <TabsContent value="pages">
            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-6 space-y-4">
                {loadingAboutContent ? (
                  <div className="text-[#B8C3E6]">About 콘텐츠 로딩 중...</div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-[#F4F7FF] font-semibold mb-2">About Hero</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          value={aboutHeroTitle}
                          onChange={(event) => setAboutHeroTitle(event.target.value)}
                          placeholder="Hero title"
                          className="bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                        />
                        <input
                          value={aboutHeroHighlight}
                          onChange={(event) => setAboutHeroHighlight(event.target.value)}
                          placeholder="Hero highlight"
                          className="bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                        />
                      </div>
                      <textarea
                        value={aboutHeroDescription}
                        onChange={(event) => setAboutHeroDescription(event.target.value)}
                        rows={3}
                        placeholder="Hero description"
                        className="mt-3 w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                      />
                      <input
                        value={aboutContactEmail}
                        onChange={(event) => setAboutContactEmail(event.target.value)}
                        placeholder="Contact email"
                        className="mt-3 w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                      />
                    </div>

                    <div>
                      <h3 className="text-[#F4F7FF] font-semibold mb-2">Values (emoji|title|description)</h3>
                      <textarea
                        value={aboutValuesInput}
                        onChange={(event) => setAboutValuesInput(event.target.value)}
                        rows={4}
                        className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                      />
                    </div>

                    <div>
                      <h3 className="text-[#F4F7FF] font-semibold mb-2">Team (name|role|description)</h3>
                      <textarea
                        value={aboutTeamInput}
                        onChange={(event) => setAboutTeamInput(event.target.value)}
                        rows={4}
                        className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                      />
                    </div>

                    <div>
                      <h3 className="text-[#F4F7FF] font-semibold mb-2">FAQ (question|answer)</h3>
                      <textarea
                        value={aboutFaqInput}
                        onChange={(event) => setAboutFaqInput(event.target.value)}
                        rows={5}
                        className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                      />
                    </div>

                    <div>
                      <input
                        value={aboutReason}
                        onChange={(event) => setAboutReason(event.target.value)}
                        placeholder="수정 사유 (필수)"
                        className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                      />
                    </div>

                    <div>
                      <Button
                        onClick={handleSaveAboutContent}
                        disabled={savingAboutContent}
                        className="bg-[#FF5D8F] hover:bg-[#FF5D8F]/90 text-white"
                      >
                        {savingAboutContent ? "저장 중..." : "About 페이지 저장"}
                      </Button>
                    </div>
                  </>
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
                    <div className="rounded-lg border border-[#111936] bg-[#0B1020] p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-[#F4F7FF] font-semibold">Google OAuth 운영 설정</h3>
                          <p className="text-xs text-[#B8C3E6] mt-1">비밀키는 서버 환경변수로 관리하고, 이 화면에서는 런타임 토글/리다이렉트만 관리합니다.</p>
                        </div>
                        <Badge variant={oauthHealth?.is_ready ? "secondary" : "destructive"}>
                          {oauthHealth?.is_ready ? "준비됨" : "미완료"}
                        </Badge>
                      </div>
                      {loadingOAuthSettings ? (
                        <p className="text-xs text-[#B8C3E6]">OAuth 설정을 불러오는 중...</p>
                      ) : (
                        <>
                          <label className="flex items-center gap-2 text-sm text-[#F4F7FF]">
                            <input
                              type="checkbox"
                              checked={oauthEnabled}
                              onChange={(event) => setOauthEnabled(event.target.checked)}
                            />
                            Google OAuth 활성화
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-[#B8C3E6] mb-1">Google Redirect URI</p>
                              <input
                                value={oauthGoogleRedirectUri}
                                onChange={(event) => setOauthGoogleRedirectUri(event.target.value)}
                                placeholder="https://api.your-domain.com/api/auth/google/callback"
                                className="w-full bg-[#161F42] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-[#B8C3E6] mb-1">Frontend Redirect URI</p>
                              <input
                                value={oauthFrontendRedirectUri}
                                onChange={(event) => setOauthFrontendRedirectUri(event.target.value)}
                                placeholder="https://app.your-domain.com"
                                className="w-full bg-[#161F42] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                              />
                            </div>
                          </div>
                          <div className="text-xs text-[#B8C3E6] space-y-1">
                            <p>Client ID: {oauthHealth?.has_client_id ? "설정됨" : "누락"}</p>
                            <p>Client Secret: {oauthHealth?.has_client_secret ? "설정됨" : "누락"}</p>
                          </div>
                          <div>
                            <Button
                              onClick={handleSaveOAuthSettings}
                              disabled={savingOAuthSettings}
                              className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020]"
                            >
                              {savingOAuthSettings ? "저장 중..." : "OAuth 설정 저장"}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

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
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                          onClick={handleImportPoliciesCsvClick}
                        >
                          CSV 가져오기
                        </Button>
                        <input
                          ref={csvImportInputRef}
                          type="file"
                          accept=".csv,text/csv"
                          className="hidden"
                          onChange={handleImportPoliciesCsvFile}
                        />
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-[#F4F7FF] font-semibold mb-2">관리자 로그 보존 기간(일)</h3>
                        <p className="text-xs text-[#B8C3E6] mb-2">만료된 로그는 서버 시작 시 정리됩니다 (최소 30일)</p>
                        <input
                          type="number"
                          min={30}
                          value={adminLogRetentionDays}
                          onChange={(event) => setAdminLogRetentionDays(Number(event.target.value) || 30)}
                          className="w-32 bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
                        />
                      </div>
                      <div>
                        <h3 className="text-[#F4F7FF] font-semibold mb-2">관리자 로그 기본 조회 기간(일)</h3>
                        <p className="text-xs text-[#B8C3E6] mb-2">로그 탭 기본 목록 조회 범위 (최소 1일)</p>
                        <input
                          type="number"
                          min={1}
                          value={adminLogViewWindowDays}
                          onChange={(event) => setAdminLogViewWindowDays(Number(event.target.value) || 1)}
                          className="w-32 bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
                        />
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-[#F4F7FF]">
                      <input
                        type="checkbox"
                        checked={adminLogMaskReasons}
                        onChange={(event) => setAdminLogMaskReasons(event.target.checked)}
                        className="rounded border-[#111936] bg-[#0B1020]"
                      />
                      로그 사유(reason) 민감정보 마스킹 사용
                    </label>

                    <div>
                      <h3 className="text-[#F4F7FF] font-semibold mb-2">Home 탭 구성</h3>
                      <p className="text-xs text-[#B8C3E6] mb-2">한 줄에 `id|label` 형식으로 입력 (예: web|Web)</p>
                      <textarea
                        value={homeFilterTabsInput}
                        onChange={(event) => setHomeFilterTabsInput(event.target.value)}
                        rows={6}
                        className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#B8C3E6]/60 focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
                      />
                    </div>

                    <div>
                      <h3 className="text-[#F4F7FF] font-semibold mb-2">Explore 탭 구성</h3>
                      <p className="text-xs text-[#B8C3E6] mb-2">한 줄에 `id|label` 형식으로 입력 (예: mobile|Mobile)</p>
                      <textarea
                        value={exploreFilterTabsInput}
                        onChange={(event) => setExploreFilterTabsInput(event.target.value)}
                        rows={6}
                        className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#B8C3E6]/60 focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
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
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge className="bg-[#111936] text-[#F4F7FF] border border-[#2A3669]">
                보존 {adminLogRetentionDays}일
              </Badge>
              <Badge className="bg-[#111936] text-[#F4F7FF] border border-[#2A3669]">
                조회 {adminLogViewWindowDays}일
              </Badge>
              <Badge className="bg-[#111936] text-[#F4F7FF] border border-[#2A3669]">
                사유 마스킹 {adminLogMaskReasons ? "ON" : "OFF"}
              </Badge>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPolicyOnlyLogs((prev) => !prev)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  policyOnlyLogs
                    ? "bg-[#FF5D8F] text-white"
                    : "bg-[#161F42] text-[#B8C3E6] hover:bg-[#1b2550]"
                }`}
              >
                정책 로그만 보기 {policyOnlyLogs ? "ON" : "OFF"}
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
                  onClick={() => setActionLogPeriodDays(period.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    actionLogPeriodDays === period.value
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
                  onClick={() => setActionLogFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    actionLogFilter === tab.value
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
                      {filteredActionLogs.map((log) => (
                        <tr
                          key={log.id}
                          className={`border-b border-[#111936]/50 cursor-pointer ${selectedActionLogId === log.id ? "bg-[#111936]/60" : "hover:bg-[#111936]/30"}`}
                          onClick={() => setSelectedActionLogId(log.id)}
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
                {policyChangeHistory.length === 0 ? (
                  <p className="text-xs text-[#B8C3E6]">정책 변경 이력이 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {policyChangeHistory.slice(0, 8).map(({ log, diffs }) => (
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
            {selectedActionLog ? (
              <Card className="mt-4 bg-[#161F42] border border-[#FF5D8F]/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#F4F7FF]">선택한 로그 상세</h3>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                      onClick={() => setSelectedActionLogId(null)}
                    >
                      닫기
                    </Button>
                  </div>
                  <p className="text-xs text-[#B8C3E6]"><span className="text-[#F4F7FF]">작업:</span> {actionToText(selectedActionLog.action_type)}</p>
                  <p className="text-xs text-[#B8C3E6]"><span className="text-[#F4F7FF]">대상:</span> {selectedActionLog.target_type}:{selectedActionLog.target_id}</p>
                  <p className="text-xs text-[#B8C3E6]"><span className="text-[#F4F7FF]">관리자:</span> {selectedActionLog.admin_nickname || "admin"}</p>
                  <p className="text-xs text-[#B8C3E6]"><span className="text-[#F4F7FF]">시간:</span> {new Date(selectedActionLog.created_at).toLocaleString("ko-KR")}</p>
                  <div className="rounded-md border border-[#111936] bg-[#0B1020] p-3">
                    <p className="text-xs text-[#F4F7FF] mb-1">사유 / 내용</p>
                    <p className="text-xs text-[#B8C3E6] whitespace-pre-wrap break-words">{selectedActionLog.reason || "기록된 사유가 없습니다."}</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
