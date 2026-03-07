import type { User } from "./auth-types"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000"

export class ApiRequestError extends Error {
  status: number
  detail: unknown

  constructor(status: number, detail: unknown) {
    const message =
      typeof detail === "string"
        ? detail
        : typeof detail === "object" && detail !== null && "message" in detail
          ? String((detail as { message?: unknown }).message ?? "Request failed")
          : "Request failed"
    super(message)
    this.name = "ApiRequestError"
    this.status = status
    this.detail = detail
  }
}

function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("vibecoder_token")
  }
  return null
}

export interface Project {
  id: string
  title: string
  summary: string
  description?: string
  thumbnail_url?: string
  demo_url?: string
  repo_url?: string
  platform: string
  tags: string[]
  author_id: string
  author_nickname: string
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface CuratedContent {
  id: number
  source_type: string
  source_url: string
  canonical_url: string
  repo_name: string
  repo_owner: string
  title: string
  category: string
  language: string
  is_korean_dev: boolean
  stars: number
  license: string
  relevance_score?: number | null
  beginner_value?: number | null
  quality_score?: number | null
  summary_beginner: string
  summary_mid: string
  summary_expert: string
  tags: string[]
  status: "pending" | "approved" | "rejected" | "auto_rejected" | string
  reject_reason: string
  approved_at: string
  approved_by: string
  github_pushed_at: string
  collected_at: string
  updated_at: string
}

export interface ErrorTranslateStep {
  description: string
  command: string
}

export interface ErrorTranslateResponse {
  what_happened: string
  fix_steps: ErrorTranslateStep[]
  plan_b: ErrorTranslateStep
  error_type: "pnpm" | "python" | "git" | "vite" | "general" | string
  error_hash: string
  source: "cache" | "fallback" | string
}

export interface GlossaryTermRequestResponse {
  id: number
  requested_term: string
  status: string
  created_at: string
}

export interface CuratedRelatedClickResponse {
  ok: boolean
  id: number
}

export interface CuratedReason {
  code: string
  label: string
}

export interface CuratedRelatedRecommendation {
  item: CuratedContent
  reasons: CuratedReason[]
}

export interface CuratedRelatedResponse {
  items: CuratedRelatedRecommendation[]
  source: string
}

export interface AdminCuratedRelatedClicksPair {
  source_content_id: number
  source_title: string
  target_content_id: number
  target_title: string
  click_count: number
  last_clicked_at: string
  top_reason_code: string
  top_reason_label: string
  top_reason_count: number
}

export interface AdminCuratedRelatedClicksReason {
  reason_code: string
  reason_label: string
  click_count: number
}

export interface AdminCuratedRelatedClicksSource {
  content_id: number
  title: string
}

export interface AdminCuratedRelatedClicksSummary {
  window_days: number
  source_content_id: number | null
  total_clicks: number
  unique_pairs: number
  top_pairs: AdminCuratedRelatedClicksPair[]
  top_reasons: AdminCuratedRelatedClicksReason[]
  available_sources: AdminCuratedRelatedClicksSource[]
}

export interface Comment {
  id: string
  project_id: string
  author_id: string
  author_nickname: string
  content: string
  like_count: number
  status: string
  created_at: string
}

export interface ProfileComment extends Comment {
  project_title: string
}

export interface Report {
  id: string
  target_type: string
  target_id: string
  reason: string
  reporter_id: string
  status: string
  created_at: string
  resolved_at?: string
}

export interface AdminActionLog {
  id: string
  admin_id?: string
  admin_nickname?: string
  action_type: string
  target_type: string
  target_id: string
  reason?: string
  created_at: string
}

export interface AdminActionObservability {
  window_days: number
  daily_publish_counts: Array<{ day: string; publish_count: number }>
  summary: {
    published: number
    rolled_back: number
    draft_saved: number
    conflicts: number
    rollback_ratio: number
    conflict_rate: number
  }
  publish_failure_distribution: Array<{ reason: string; count: number }>
}

export type AdminPagePerfScenario =
  | "editor_initial_load"
  | "preview_switch"
  | "draft_save_roundtrip"
  | "panel_canvas_roundtrip_count"
  | "edit_completion_time"
  | "editor_scroll_distance"

export interface AdminPagePerfMetric {
  sample_count: number
  p75_ms: number
  p95_ms: number
  slo_p75_ms: number
  within_slo: boolean
}

export type AdminPagePerfVariant = "baseline" | "enhanced"

export interface AdminPagePerfVariantSnapshot {
  sample_count: number
  metrics: Record<AdminPagePerfScenario, AdminPagePerfMetric>
}

export interface AdminPagePerfSnapshot {
  window_size: number
  sample_count: number
  metrics: Record<AdminPagePerfScenario, AdminPagePerfMetric>
  variants: Record<AdminPagePerfVariant, AdminPagePerfVariantSnapshot>
}

export interface AdminPageMigrationPreviewResponse {
  pageId: string
  sourceType: string
  sourceKey: string
  mappingRules: Array<{ from: string; to: string }>
  document: PageDocument
  validation: {
    blocking: Array<{ field: string; message: string }>
    warnings: Array<{ field: string; message: string }>
    blockingCount: number
    warningCount: number
  }
}

export interface AdminPageMigrationBackupListResponse {
  pageId: string
  count: number
  items: Array<{
    backupKey: string
    capturedAt: string
    reason: string
    dryRun: boolean
    sourceKey: string
    updatedAt: string
  }>
}

export interface AdminPageMigrationExecuteResponse {
  pageId: string
  dryRun: boolean
  applied: boolean
  savedVersion?: number
  backupKey: string
  validation: {
    blocking: Array<{ field: string; message: string }>
    warnings: Array<{ field: string; message: string }>
    blockingCount: number
    warningCount: number
  }
}

export interface AdminPageMigrationRestoreResponse {
  pageId: string
  dryRun: boolean
  restored: boolean
  restoredVersion?: number
  backupKey: string
  validation: {
    blocking: Array<{ field: string; message: string }>
    warnings: Array<{ field: string; message: string }>
    blockingCount: number
    warningCount: number
  }
}

export interface AdminPagePublishScheduleItem {
  scheduleId: string
  pageId: string
  draftVersion: number
  publishAt: string
  timezone: string
  status: "scheduled" | "published" | "cancelled" | "failed"
  reason: string
  attemptCount: number
  maxAttempts: number
  lastError: string
  nextRetryAt: string
  createdBy: string
  createdAt: string
  updatedAt: string
  cancelledAt: string
  publishedVersion: number
  publishedAt: string
}

export interface AdminPagePublishScheduleListResponse {
  pageId: string
  count: number
  items: AdminPagePublishScheduleItem[]
}

export interface AdminPagePublishScheduleProcessResponse {
  pageId: string
  processed: number
  published: number
  failed: number
  items: Array<{
    scheduleId: string
    status: "published" | "failed"
    publishedVersion?: number
    error?: string
  }>
}

export interface AdminManagedUser {
  id: string
  email: string
  nickname: string
  role: string
  status?: "pending" | "active" | "rejected" | "suspended" | "pending_delete" | "deleted" | string
  created_at: string
  limited_until?: string | null
  limited_reason?: string | null
  suspended_reason?: string | null
  suspended_at?: string | null
  suspended_by?: string | null
  delete_scheduled_at?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  token_version?: number
}

export interface AdminManagedProject {
  id: string
  author_id: string
  author_nickname: string
  title: string
  summary: string
  description?: string
  thumbnail_url?: string | null
  demo_url?: string | null
  repo_url?: string | null
  platform: string
  tags: string[]
  status: string
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface ModerationPolicy {
  id: number
  blocked_keywords: string[]
  custom_blocked_keywords: string[]
  baseline_keyword_categories: Record<string, string[]>
  auto_hide_report_threshold: number
  home_filter_tabs: FilterTab[]
  explore_filter_tabs: FilterTab[]
  admin_log_retention_days: number
  admin_log_view_window_days: number
  admin_log_mask_reasons: boolean
  page_editor_enabled: boolean
  page_editor_rollout_stage: "qa" | "pilot" | "open"
  page_editor_pilot_admin_ids: string[]
  page_editor_publish_fail_rate_threshold: number
  page_editor_rollback_ratio_threshold: number
  page_editor_conflict_rate_threshold: number
  updated_at: string
  last_updated_by?: string | null
  last_updated_by_id?: string | null
  last_updated_action_at?: string | null
}

export interface FilterTab {
  id: string
  label: string
}

export interface FilterTabsConfig {
  home_filter_tabs: FilterTab[]
  explore_filter_tabs: FilterTab[]
}

export interface AboutValueItem {
  emoji: string
  title: string
  description: string
}

export interface AboutTeamMember {
  name: string
  role: string
  description: string
}

export interface AboutFaqItem {
  question: string
  answer: string
}

export interface AboutContent {
  hero_title: string
  hero_highlight: string
  hero_description: string
  contact_email: string
  values: AboutValueItem[]
  team_members: AboutTeamMember[]
  faqs: AboutFaqItem[]
  updated_at?: string
}

export interface PageSeo {
  metaTitle: string
  metaDescription: string
  ogImage?: string | null
}

export interface PageBlock {
  id: string
  type: "hero" | "rich_text" | "image" | "cta" | "faq" | "gallery" | "feature_list"
  order: number
  visible: boolean
  content: Record<string, unknown>
  style?: Record<string, unknown>
}

export interface PageDocument {
  pageId: string
  status: "draft" | "published"
  version: number
  title: string
  seo: PageSeo
  blocks: PageBlock[]
  updatedBy: string
  updatedAt: string
}

export interface AdminPageDraftResponse {
  pageId: string
  baseVersion: number
  publishedVersion: number
  document: PageDocument
}

export interface AdminPageVersionListItem {
  page_id: string
  version: number
  status: "draft" | "published"
  reason?: string | null
  created_by?: string | null
  created_at: string
}

export interface AdminPageVersionDetail {
  pageId: string
  version: number
  status: "draft" | "published"
  reason?: string | null
  createdBy?: string | null
  createdAt: string
  document: PageDocument
}

export interface AdminPageVersionCompareChange {
  kind: "block_added" | "block_removed" | "block_reordered" | "field_changed"
  block_id: string
  message: string
  from?: unknown
  to?: unknown
}

export interface AdminPageVersionCompareResponse {
  pageId: string
  fromVersion: number
  toVersion: number
  changes: AdminPageVersionCompareChange[]
  summary: {
    total: number
    added: number
    removed: number
    reordered: number
    field_changed: number
  }
}

export interface AdminOAuthSettings {
  google_oauth_enabled: boolean
  google_redirect_uri: string
  google_frontend_redirect_uri: string
}

export interface AdminOAuthHealth extends AdminOAuthSettings {
  has_client_id: boolean
  has_client_secret: boolean
  is_ready: boolean
}

export interface AdminWeeklyTrendPoint {
  day: string
  new_users: number
  new_projects: number
}

export interface AdminStats {
  total_users: number
  total_projects: number
  open_reports: number
  pending_user_approvals: number
  users_this_week: number
  users_last_week: number
  projects_this_week: number
  projects_last_week: number
  users_week_delta: number
  projects_week_delta: number
  weekly_trend: AdminWeeklyTrendPoint[]
}

type AdminReportsResponse = { items: Report[]; total: number }
type AdminListResponse<T> = { items: T[] }
type ProjectsResponse = { items: Project[] }
type CuratedContentResponse = { items: CuratedContent[]; total?: number }
type CommentsResponse = { items: Comment[] }
type ProfileCommentsResponse = { items: ProfileComment[] }

async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken()
  const headers: HeadersInit = {
    ...options.headers,
  }
  
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  }
  
  const res = await fetch(url, { ...options, headers })
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "An error occurred" }))
    const detail = (error as { detail?: unknown }).detail ?? "Request failed"
    throw new ApiRequestError(res.status, detail)
  }
  
  return res
}

type AdminTabCacheEntry<T> = {
  data?: T
  fetchedAt: number
  inflight?: Promise<T>
  controller?: AbortController
}

type SWRFetchOptions<T> = {
  force?: boolean
  onRevalidate?: (data: T) => void
}

const ADMIN_TAB_TTL_MS = {
  reports: 15_000,
  stats: 20_000,
  users: 120_000,
  content: 120_000,
  pages: 180_000,
  policies: 180_000,
  actions: 20_000,
} as const

const PUBLIC_TTL_MS = {
  projects: 45_000,
  projectDetail: 20_000,
  comments: 8_000,
  filterTabs: 180_000,
} as const

const adminTabCache = new Map<string, AdminTabCacheEntry<unknown>>()
const publicDataCache = new Map<string, AdminTabCacheEntry<unknown>>()

function getCacheEntry<T>(key: string): AdminTabCacheEntry<T> | undefined {
  const entry = adminTabCache.get(key)
  return entry as AdminTabCacheEntry<T> | undefined
}

function isCacheFresh(entry: AdminTabCacheEntry<unknown> | undefined, ttlMs: number): boolean {
  if (!entry || entry.data === undefined) {
    return false
  }
  return Date.now() - entry.fetchedAt <= ttlMs
}

function upsertCacheEntry<T>(key: string, updater: (prev?: AdminTabCacheEntry<T>) => AdminTabCacheEntry<T>) {
  const prev = getCacheEntry<T>(key)
  const next = updater(prev)
  adminTabCache.set(key, next as AdminTabCacheEntry<unknown>)
}

async function fetchAndStoreAdminCache<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  force: boolean = false,
): Promise<T> {
  const previous = getCacheEntry<T>(key)
  if (force && previous?.controller) {
    previous.controller.abort()
  }

  const controller = new AbortController()
  const inflight = fetcher(controller.signal)
    .then((data) => {
      upsertCacheEntry<T>(key, () => ({
        data,
        fetchedAt: Date.now(),
      }))
      return data
    })
    .finally(() => {
      const latest = getCacheEntry<T>(key)
      if (latest?.inflight) {
        upsertCacheEntry<T>(key, (prev) => ({
          data: prev?.data,
          fetchedAt: prev?.fetchedAt ?? 0,
        }))
      }
    })

  upsertCacheEntry<T>(key, (prev) => ({
    data: prev?.data,
    fetchedAt: prev?.fetchedAt ?? 0,
    inflight,
    controller,
  }))

  return inflight
}

async function fetchWithAdminSWR<T>(
  key: string,
  ttlMs: number,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: SWRFetchOptions<T> = {},
): Promise<T> {
  const entry = getCacheEntry<T>(key)
  const hasCachedData = entry?.data !== undefined
  const fresh = isCacheFresh(entry, ttlMs)

  if (!options.force && hasCachedData) {
    if (!fresh) {
      const latest = getCacheEntry<T>(key)
      if (!latest?.inflight) {
        void fetchAndStoreAdminCache(key, fetcher)
          .then((data) => {
            options.onRevalidate?.(data)
          })
          .catch((error) => {
            if (error instanceof DOMException && error.name === "AbortError") {
              return
            }
            console.error(`Admin cache revalidate failed: ${key}`, error)
          })
      }
    }
    return entry.data as T
  }

  if (!options.force && entry?.inflight) {
    return entry.inflight
  }

  return fetchAndStoreAdminCache(key, fetcher, options.force)
}

function createAdminCacheKey(tab: keyof typeof ADMIN_TAB_TTL_MS, params?: Record<string, string | number | undefined>) {
  const query = params
    ? Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([k, value]) => `${k}=${String(value)}`)
      .join("&")
    : ""
  return query ? `${tab}?${query}` : tab
}

function hasAdminCache(key: string): boolean {
  const entry = getCacheEntry<unknown>(key)
  return entry?.data !== undefined
}

function getPublicCacheEntry<T>(key: string): AdminTabCacheEntry<T> | undefined {
  return publicDataCache.get(key) as AdminTabCacheEntry<T> | undefined
}

function upsertPublicCacheEntry<T>(key: string, updater: (prev?: AdminTabCacheEntry<T>) => AdminTabCacheEntry<T>) {
  const prev = getPublicCacheEntry<T>(key)
  const next = updater(prev)
  publicDataCache.set(key, next as AdminTabCacheEntry<unknown>)
}

async function fetchAndStorePublicCache<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  force: boolean = false,
): Promise<T> {
  const previous = getPublicCacheEntry<T>(key)
  if (force && previous?.controller) {
    previous.controller.abort()
  }

  const controller = new AbortController()
  const inflight = fetcher(controller.signal)
    .then((data) => {
      upsertPublicCacheEntry<T>(key, () => ({
        data,
        fetchedAt: Date.now(),
      }))
      return data
    })
    .finally(() => {
      const latest = getPublicCacheEntry<T>(key)
      if (latest?.inflight) {
        upsertPublicCacheEntry<T>(key, (prev) => ({
          data: prev?.data,
          fetchedAt: prev?.fetchedAt ?? 0,
        }))
      }
    })

  upsertPublicCacheEntry<T>(key, (prev) => ({
    data: prev?.data,
    fetchedAt: prev?.fetchedAt ?? 0,
    inflight,
    controller,
  }))

  return inflight
}

async function fetchWithPublicSWR<T>(
  key: string,
  ttlMs: number,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: SWRFetchOptions<T> = {},
): Promise<T> {
  const entry = getPublicCacheEntry<T>(key)
  const hasCachedData = entry?.data !== undefined
  const fresh = isCacheFresh(entry, ttlMs)

  if (!options.force && hasCachedData) {
    if (!fresh) {
      const latest = getPublicCacheEntry<T>(key)
      if (!latest?.inflight) {
        void fetchAndStorePublicCache(key, fetcher)
          .then((data) => {
            options.onRevalidate?.(data)
          })
          .catch((error) => {
            if (error instanceof DOMException && error.name === "AbortError") {
              return
            }
            console.error(`Public cache revalidate failed: ${key}`, error)
          })
      }
    }
    return entry.data as T
  }

  if (!options.force && entry?.inflight) {
    return entry.inflight
  }

  return fetchAndStorePublicCache(key, fetcher, options.force)
}

function createPublicCacheKey(kind: keyof typeof PUBLIC_TTL_MS | "projectsList" | "project" | "comments", params?: Record<string, string | number | undefined>) {
  const query = params
    ? Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([k, value]) => `${k}=${String(value)}`)
      .join("&")
    : ""
  return query ? `${kind}?${query}` : kind
}

function hasPublicCache(key: string): boolean {
  const entry = getPublicCacheEntry<unknown>(key)
  return entry?.data !== undefined
}

function invalidatePublicCacheByPrefix(prefix: string) {
  Array.from(publicDataCache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) {
      publicDataCache.delete(key)
    }
  })
}

function invalidateProjectRelatedCaches(projectId: string) {
  invalidatePublicCacheByPrefix("projectsList")
  invalidatePublicCacheByPrefix(`project?id=${projectId}`)
  invalidatePublicCacheByPrefix(`comments?projectId=${projectId}`)
}

// API Functions
export const api = {
  // Auth
  register: async (email: string, nickname: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nickname, password }),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "회원가입에 실패했습니다" }))
      throw new Error(error.detail || "회원가입에 실패했습니다")
    }

    const data = await res.json()
    return { ...data, user: data.user } as { access_token: string; user: User }
  },

  getGoogleAuthUrl: async () => {
    const res = await fetch(`${API_BASE}/api/auth/google/start`)
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Google OAuth 시작에 실패했습니다" }))
      throw new Error(error.detail || "Google OAuth 시작에 실패했습니다")
    }
    const data = await res.json() as { auth_url: string }
    return data.auth_url
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "로그인에 실패했습니다" }))
      throw new Error(error.detail || "로그인에 실패했습니다")
    }

    const data = await res.json()
    return { ...data, user: data.user } as { access_token: string; user: User }
  },

  exchangeGoogleOAuthCode: async (oauthCode: string) => {
    const res = await fetch(`${API_BASE}/api/auth/google/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oauth_code: oauthCode }),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Google OAuth 코드 교환에 실패했습니다" }))
      throw new Error(error.detail || "Google OAuth 코드 교환에 실패했습니다")
    }
    const data = await res.json()
    return { ...data, user: data.user } as { access_token: string; user: User }
  },

  getMe: async () => {
    const res = await authFetch(`${API_BASE}/api/me`)
    return res.json() as Promise<User>
  },

  getMeWithToken: async (token: string) => {
    const res = await fetch(`${API_BASE}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "세션 확인에 실패했습니다" }))
      throw new Error(error.detail || "세션 확인에 실패했습니다")
    }
    return res.json() as Promise<User>
  },

  updateMe: async (payload: Partial<Pick<User, "nickname" | "bio" | "avatar_url">>) => {
    const res = await authFetch(`${API_BASE}/api/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return res.json() as Promise<User>
  },

  getAboutContent: async (options?: SWRFetchOptions<AboutContent>) => {
    const key = createAdminCacheKey("pages")
    return fetchWithAdminSWR(
      key,
      ADMIN_TAB_TTL_MS.pages,
      async (signal) => {
        const res = await fetch(`${API_BASE}/api/content/about`, { signal, cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load about content")
        return res.json() as Promise<AboutContent>
      },
      options,
    )
  },

  getFilterTabs: async (options?: SWRFetchOptions<FilterTabsConfig>) => {
    const key = createPublicCacheKey("filterTabs")
    return fetchWithPublicSWR(
      key,
      PUBLIC_TTL_MS.filterTabs,
      async (signal) => {
        const res = await fetch(`${API_BASE}/api/content/filter-tabs`, { signal })
        if (!res.ok) throw new Error("Failed to load filter tabs")
        return res.json() as Promise<FilterTabsConfig>
      },
      options,
    )
  },

  // Projects
  getProjects: async (
    params?: { sort?: string; platform?: string; tag?: string },
    options?: SWRFetchOptions<ProjectsResponse>,
  ) => {
    const key = createPublicCacheKey("projectsList", {
      sort: params?.sort ?? "latest",
      platform: params?.platform ?? "all",
      tag: params?.tag ?? "all",
    })
    return fetchWithPublicSWR(
      key,
      PUBLIC_TTL_MS.projects,
      async (signal) => {
        const searchParams = new URLSearchParams()
        if (params?.sort) searchParams.set("sort", params.sort)
        if (params?.platform) searchParams.set("platform", params.platform)
        if (params?.tag) searchParams.set("tag", params.tag)
        const res = await fetch(`${API_BASE}/api/projects?${searchParams}`, { signal })
        if (!res.ok) throw new Error("Failed to fetch projects")
        return res.json() as Promise<ProjectsResponse>
      },
      options,
    )
  },

  getCuratedContent: async (
    params?: {
      category?: string
      search?: string
      is_korean_dev?: boolean
      sort?: "latest" | "quality"
      limit?: number
      offset?: number
    },
  ) => {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set("category", params.category)
    if (params?.search) searchParams.set("search", params.search)
    if (typeof params?.is_korean_dev === "boolean") {
      searchParams.set("is_korean_dev", String(params.is_korean_dev))
    }
    if (params?.sort) searchParams.set("sort", params.sort)
    if (typeof params?.limit === "number") searchParams.set("limit", String(params.limit))
    if (typeof params?.offset === "number") searchParams.set("offset", String(params.offset))

    const query = searchParams.toString()
    const res = await fetch(query ? `${API_BASE}/api/curated?${query}` : `${API_BASE}/api/curated`)
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "큐레이션 목록 조회에 실패했습니다" }))
      const detail = (error as { detail?: unknown }).detail ?? "큐레이션 목록 조회에 실패했습니다"
      throw new ApiRequestError(res.status, detail)
    }
    return res.json() as Promise<CuratedContentResponse>
  },

  getCuratedContentDetail: async (contentId: number) => {
    const res = await fetch(`${API_BASE}/api/curated/${contentId}`)
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "큐레이션 상세 조회에 실패했습니다" }))
      const detail = (error as { detail?: unknown }).detail ?? "큐레이션 상세 조회에 실패했습니다"
      throw new ApiRequestError(res.status, detail)
    }
    return res.json() as Promise<CuratedContent>
  },

  getCuratedRelatedContent: async (contentId: number, limit: number = 4) => {
    const searchParams = new URLSearchParams({ limit: String(limit) })
    const res = await fetch(`${API_BASE}/api/curated/${contentId}/related?${searchParams.toString()}`)
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "관련 큐레이션 조회에 실패했습니다" }))
      const detail = (error as { detail?: unknown }).detail ?? "관련 큐레이션 조회에 실패했습니다"
      throw new ApiRequestError(res.status, detail)
    }
    return res.json() as Promise<CuratedRelatedResponse>
  },

  trackCuratedRelatedClick: async (source_content_id: number, target_content_id: number, reason_code?: string) => {
    const res = await fetch(`${API_BASE}/api/curated/related-clicks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_content_id, target_content_id, reason_code }),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "추천 클릭 기록에 실패했습니다" }))
      const detail = (error as { detail?: unknown }).detail ?? "추천 클릭 기록에 실패했습니다"
      throw new ApiRequestError(res.status, detail)
    }
    return res.json() as Promise<CuratedRelatedClickResponse>
  },

  getAdminCuratedContent: async (status?: string, limit: number = 50, offset: number = 0) => {
    const searchParams = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (status) searchParams.set("status", status)
    const res = await authFetch(`${API_BASE}/api/admin/curated?${searchParams.toString()}`)
    return res.json() as Promise<CuratedContentResponse>
  },

  updateAdminCuratedContent: async (
    contentId: number,
    updates: {
      title?: string
      category?: string
      summary_beginner?: string
      summary_mid?: string
      summary_expert?: string
      tags?: string[]
      status?: string
      reject_reason?: string
      quality_score?: number
      relevance_score?: number
      beginner_value?: number
      license?: string
    },
  ) => {
    const res = await authFetch(`${API_BASE}/api/admin/curated/${contentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    return res.json() as Promise<CuratedContent>
  },

  runAdminCuratedCollection: async () => {
    const res = await authFetch(`${API_BASE}/api/admin/curated/run`, { method: "POST" })
    return res.json() as Promise<{ created: number; daily_limit: number; collected_today: number; message?: string }>
  },

  deleteAdminCuratedContent: async (contentId: number) => {
    const res = await authFetch(`${API_BASE}/api/admin/curated/${contentId}`, { method: "DELETE" })
    return res.json() as Promise<{ deleted: boolean; id: number }>
  },

  errorTranslate: async (error_message: string) => {
    const res = await fetch(`${API_BASE}/api/error-translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error_message }),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "에러 번역에 실패했습니다" }))
      const detail = (error as { detail?: unknown }).detail ?? "에러 번역에 실패했습니다"
      throw new ApiRequestError(res.status, detail)
    }
    return res.json() as Promise<ErrorTranslateResponse>
  },

  sendErrorTranslateFeedback: async (error_hash: string, solved: boolean) => {
    const res = await fetch(`${API_BASE}/api/error-translate/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error_hash, solved }),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "피드백 전송에 실패했습니다" }))
      const detail = (error as { detail?: unknown }).detail ?? "피드백 전송에 실패했습니다"
      throw new ApiRequestError(res.status, detail)
    }
    return res.json() as Promise<{ ok: boolean }>
  },

  requestGlossaryTerm: async (requested_term: string, context_note?: string) => {
    const res = await fetch(`${API_BASE}/api/glossary/term-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requested_term, context_note }),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "용어 요청에 실패했습니다" }))
      const detail = (error as { detail?: unknown }).detail ?? "용어 요청에 실패했습니다"
      throw new ApiRequestError(res.status, detail)
    }
    return res.json() as Promise<GlossaryTermRequestResponse>
  },

  getProject: async (id: string, options?: SWRFetchOptions<Project>) => {
    const key = createPublicCacheKey("project", { id })
    return fetchWithPublicSWR(
      key,
      PUBLIC_TTL_MS.projectDetail,
      async (signal) => {
        const res = await fetch(`${API_BASE}/api/projects/${id}`, { signal })
        if (!res.ok) throw new Error("Project not found")
        return res.json() as Promise<Project>
      },
      options,
    )
  },

  createProject: async (data: Partial<Project>) => {
    const res = await authFetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const created = await res.json() as Project
    invalidateProjectRelatedCaches(created.id)
    return created
  },

  updateProject: async (id: string, data: Partial<Project>) => {
    const res = await authFetch(`${API_BASE}/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const updated = await res.json() as Project
    invalidateProjectRelatedCaches(id)
    return updated
  },

  likeProject: async (id: string) => {
    const res = await authFetch(`${API_BASE}/api/projects/${id}/like`, {
      method: "POST",
    })
    const result = await res.json() as { like_count: number }
    invalidateProjectRelatedCaches(id)
    return result
  },

  unlikeProject: async (id: string) => {
    const res = await authFetch(`${API_BASE}/api/projects/${id}/like`, {
      method: "DELETE",
    })
    const result = await res.json() as { like_count: number }
    invalidateProjectRelatedCaches(id)
    return result
  },

  // Comments
  getComments: async (
    projectId: string,
    sort: string = "latest",
    options?: SWRFetchOptions<CommentsResponse>,
  ) => {
    const key = createPublicCacheKey("comments", { projectId, sort })
    return fetchWithPublicSWR(
      key,
      PUBLIC_TTL_MS.comments,
      async (signal) => {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/comments?sort=${sort}`, { signal })
        if (!res.ok) throw new Error("Failed to fetch comments")
        return res.json() as Promise<CommentsResponse>
      },
      options,
    )
  },

  createComment: async (projectId: string, content: string) => {
    const res = await authFetch(`${API_BASE}/api/projects/${projectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    const created = await res.json() as Comment
    invalidateProjectRelatedCaches(projectId)
    return created
  },

  hasProjectsCache: (params?: { sort?: string; platform?: string; tag?: string }) => {
    const key = createPublicCacheKey("projectsList", {
      sort: params?.sort ?? "latest",
      platform: params?.platform ?? "all",
      tag: params?.tag ?? "all",
    })
    return hasPublicCache(key)
  },

  hasProjectDetailCache: (projectId: string) => {
    const key = createPublicCacheKey("project", { id: projectId })
    return hasPublicCache(key)
  },

  hasCommentsCache: (projectId: string, sort: string = "latest") => {
    const key = createPublicCacheKey("comments", { projectId, sort })
    return hasPublicCache(key)
  },

  // Reports
  reportComment: async (commentId: string, data: { target_type: string; target_id: string; reason: string }) => {
    const res = await authFetch(`${API_BASE}/api/comments/${commentId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return res.json() as Promise<Report>
  },

  // Admin
  getAdminStats: async (options?: SWRFetchOptions<AdminStats>) => {
    const key = createAdminCacheKey("stats")
    return fetchWithAdminSWR(
      key,
      ADMIN_TAB_TTL_MS.stats,
      async (signal) => {
        const res = await authFetch(`${API_BASE}/api/admin/stats`, { signal })
        return res.json() as Promise<AdminStats>
      },
      options,
    )
  },

  getAdminCuratedRelatedClicksSummary: async (
    days: number = 30,
    limit: number = 5,
    sourceContentId?: number,
  ) => {
    const params = new URLSearchParams({ days: String(days), limit: String(limit) })
    if (typeof sourceContentId === "number" && sourceContentId > 0) {
      params.set("source_content_id", String(sourceContentId))
    }
    const res = await authFetch(`${API_BASE}/api/admin/curated/related-clicks/summary?${params.toString()}`)
    return res.json() as Promise<AdminCuratedRelatedClicksSummary>
  },

  getReports: async (
    status?: string,
    limit: number = 50,
    offset: number = 0,
    options?: SWRFetchOptions<AdminReportsResponse>,
  ) => {
    const key = createAdminCacheKey("reports", { status: status ?? "all", limit, offset })
    return fetchWithAdminSWR(
      key,
      ADMIN_TAB_TTL_MS.reports,
      async (signal) => {
        const params = new URLSearchParams()
        if (status) params.set("status", status)
        params.set("limit", String(limit))
        params.set("offset", String(offset))
        const res = await authFetch(`${API_BASE}/api/admin/reports?${params.toString()}`, { signal })
        return res.json() as Promise<AdminReportsResponse>
      },
      options,
    )
  },

  updateReport: async (reportId: string, status: string, reason?: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    })
    return res.json() as Promise<Report>
  },

  getAdminActionLogs: async (
    limit: number = 50,
    filters?: { actionType?: string; actorId?: string; pageId?: string },
    options?: SWRFetchOptions<AdminListResponse<AdminActionLog>>,
  ) => {
    const key = createAdminCacheKey("actions", {
      limit,
      actionType: filters?.actionType ?? "all",
      actorId: filters?.actorId ?? "all",
      pageId: filters?.pageId ?? "all",
    })
    return fetchWithAdminSWR(
      key,
      ADMIN_TAB_TTL_MS.actions,
      async (signal) => {
        const params = new URLSearchParams({ limit: String(limit) })
        if (filters?.actionType) params.set("action_type", filters.actionType)
        if (filters?.actorId) params.set("actor_id", filters.actorId)
        if (filters?.pageId) params.set("page_id", filters.pageId)
        const res = await authFetch(`${API_BASE}/api/admin/action-logs?${params.toString()}`, { signal })
        return res.json() as Promise<AdminListResponse<AdminActionLog>>
      },
      options,
    )
  },

  getAdminActionObservability: async (windowDays: number = 30) => {
    const params = new URLSearchParams({ window_days: String(windowDays) })
    const res = await authFetch(`${API_BASE}/api/admin/action-logs/observability?${params.toString()}`)
    return res.json() as Promise<AdminActionObservability>
  },

  getAdminPagePerfSnapshot: async () => {
    const res = await authFetch(`${API_BASE}/api/admin/perf/page-editor`)
    return res.json() as Promise<AdminPagePerfSnapshot>
  },

  logAdminPagePerfEvent: async (
    pageId: string,
    scenario: AdminPagePerfScenario,
    durationMs: number,
    source: string = "ui",
  ) => {
    const res = await authFetch(`${API_BASE}/api/admin/perf/page-editor/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, scenario, durationMs, source }),
    })
    return res.json() as Promise<{ ok: boolean }>
  },

  getAdminUsers: async (limit: number = 200, options?: SWRFetchOptions<AdminListResponse<AdminManagedUser>>) => {
    const key = createAdminCacheKey("users", { limit })
    return fetchWithAdminSWR(
      key,
      ADMIN_TAB_TTL_MS.users,
      async (signal) => {
        const res = await authFetch(`${API_BASE}/api/admin/users?limit=${limit}`, { signal })
        return res.json() as Promise<AdminListResponse<AdminManagedUser>>
      },
      options,
    )
  },

  getAdminProjects: async (
    status?: string,
    limit: number = 200,
    options?: SWRFetchOptions<AdminListResponse<AdminManagedProject>>,
  ) => {
    const key = createAdminCacheKey("content", { status: status ?? "all", limit })
    return fetchWithAdminSWR(
      key,
      ADMIN_TAB_TTL_MS.content,
      async (signal) => {
        const params = new URLSearchParams()
        if (status) params.set("status", status)
        params.set("limit", String(limit))
        const res = await authFetch(`${API_BASE}/api/admin/projects?${params.toString()}`, { signal })
        return res.json() as Promise<AdminListResponse<AdminManagedProject>>
      },
      options,
    )
  },

  updateAdminProject: async (
    projectId: string,
    data: Partial<AdminManagedProject> & { reason?: string },
  ) => {
    const res = await authFetch(`${API_BASE}/api/admin/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return res.json() as Promise<AdminManagedProject>
  },

  hideAdminProject: async (projectId: string, reason?: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/projects/${projectId}/hide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    return res.json() as Promise<AdminManagedProject>
  },

  restoreAdminProject: async (projectId: string, reason?: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/projects/${projectId}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    return res.json() as Promise<AdminManagedProject>
  },

  deleteAdminProject: async (projectId: string, reason?: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/projects/${projectId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    return res.json() as Promise<AdminManagedProject>
  },

  limitUser: async (userId: string, hours: number, reason?: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/users/${userId}/limit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours, reason }),
    })
    return res.json() as Promise<AdminManagedUser>
  },

  unlimitUser: async (userId: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/users/${userId}/limit`, {
      method: "DELETE",
    })
    return res.json() as Promise<AdminManagedUser>
  },

  suspendUser: async (userId: string, reason: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/users/${userId}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    return res.json() as Promise<AdminManagedUser>
  },

  unsuspendUser: async (userId: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/users/${userId}/suspend`, {
      method: "DELETE",
    })
    return res.json() as Promise<AdminManagedUser>
  },

  revokeUserTokens: async (userId: string, reason?: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/users/${userId}/tokens/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    return res.json() as Promise<AdminManagedUser>
  },

  scheduleUserDelete: async (userId: string, days: number, reason: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/users/${userId}/delete-schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days, reason }),
    })
    return res.json() as Promise<AdminManagedUser>
  },

  cancelUserDeleteSchedule: async (userId: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/users/${userId}/delete-schedule`, {
      method: "DELETE",
    })
    return res.json() as Promise<AdminManagedUser>
  },

  deleteUserNow: async (userId: string, reason: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/users/${userId}/delete-now`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    return res.json() as Promise<AdminManagedUser>
  },

  approveUser: async (userId: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/users/${userId}/approve`, {
      method: "POST",
    })
    return res.json() as Promise<AdminManagedUser>
  },

  rejectUser: async (userId: string, reason: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/users/${userId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    return res.json() as Promise<AdminManagedUser>
  },

  updateAdminUserRole: async (userId: string, role: "user" | "admin", reason?: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, reason }),
    })
    return res.json() as Promise<AdminManagedUser>
  },

  getAdminPolicies: async (options?: SWRFetchOptions<ModerationPolicy>) => {
    const key = createAdminCacheKey("policies")
    return fetchWithAdminSWR(
      key,
      ADMIN_TAB_TTL_MS.policies,
      async (signal) => {
        const res = await authFetch(`${API_BASE}/api/admin/policies`, { signal })
        return res.json() as Promise<ModerationPolicy>
      },
      options,
    )
  },

  hasAdminTabCache: (tab: keyof typeof ADMIN_TAB_TTL_MS, params?: Record<string, string | number | undefined>) => {
    const key = createAdminCacheKey(tab, params)
    return hasAdminCache(key)
  },

  prefetchAdminTabData: async (tab: keyof typeof ADMIN_TAB_TTL_MS) => {
    switch (tab) {
      case "reports":
        await api.getReports(undefined, 50, 0)
        break
      case "users":
        await api.getAdminUsers(200)
        break
      case "content":
        await api.getAdminProjects(undefined, 200)
        break
      case "pages":
        await api.getAboutContent()
        break
      case "policies":
        await api.getAdminPolicies()
        break
      case "actions":
        await api.getAdminActionLogs(100)
        break
    }
  },

  updateAdminPolicies: async (
    blocked_keywords: string[],
    auto_hide_report_threshold: number,
    home_filter_tabs?: FilterTab[],
    explore_filter_tabs?: FilterTab[],
    admin_log_retention_days?: number,
    admin_log_view_window_days?: number,
    admin_log_mask_reasons?: boolean,
    page_editor_enabled?: boolean,
    page_editor_rollout_stage?: "qa" | "pilot" | "open",
    page_editor_pilot_admin_ids?: string[],
    page_editor_publish_fail_rate_threshold?: number,
    page_editor_rollback_ratio_threshold?: number,
    page_editor_conflict_rate_threshold?: number,
  ) => {
    const payload: {
      blocked_keywords: string[]
      auto_hide_report_threshold: number
      home_filter_tabs?: FilterTab[]
      explore_filter_tabs?: FilterTab[]
      admin_log_retention_days?: number
      admin_log_view_window_days?: number
      admin_log_mask_reasons?: boolean
      page_editor_enabled?: boolean
      page_editor_rollout_stage?: "qa" | "pilot" | "open"
      page_editor_pilot_admin_ids?: string[]
      page_editor_publish_fail_rate_threshold?: number
      page_editor_rollback_ratio_threshold?: number
      page_editor_conflict_rate_threshold?: number
    } = {
      blocked_keywords,
      auto_hide_report_threshold,
    }
    if (home_filter_tabs) {
      payload.home_filter_tabs = home_filter_tabs
    }
    if (explore_filter_tabs) {
      payload.explore_filter_tabs = explore_filter_tabs
    }
    if (typeof admin_log_retention_days === "number") {
      payload.admin_log_retention_days = admin_log_retention_days
    }
    if (typeof admin_log_view_window_days === "number") {
      payload.admin_log_view_window_days = admin_log_view_window_days
    }
    if (typeof admin_log_mask_reasons === "boolean") {
      payload.admin_log_mask_reasons = admin_log_mask_reasons
    }
    if (typeof page_editor_enabled === "boolean") {
      payload.page_editor_enabled = page_editor_enabled
    }
    if (page_editor_rollout_stage) {
      payload.page_editor_rollout_stage = page_editor_rollout_stage
    }
    if (page_editor_pilot_admin_ids) {
      payload.page_editor_pilot_admin_ids = page_editor_pilot_admin_ids
    }
    if (typeof page_editor_publish_fail_rate_threshold === "number") {
      payload.page_editor_publish_fail_rate_threshold = page_editor_publish_fail_rate_threshold
    }
    if (typeof page_editor_rollback_ratio_threshold === "number") {
      payload.page_editor_rollback_ratio_threshold = page_editor_rollback_ratio_threshold
    }
    if (typeof page_editor_conflict_rate_threshold === "number") {
      payload.page_editor_conflict_rate_threshold = page_editor_conflict_rate_threshold
    }

    const res = await authFetch(`${API_BASE}/api/admin/policies`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return res.json() as Promise<ModerationPolicy>
  },

  getAdminOAuthSettings: async () => {
    const res = await authFetch(`${API_BASE}/api/admin/integrations/oauth`)
    return res.json() as Promise<AdminOAuthSettings>
  },

  getAdminOAuthHealth: async () => {
    const res = await authFetch(`${API_BASE}/api/admin/integrations/oauth/health`)
    return res.json() as Promise<AdminOAuthHealth>
  },

  updateAdminOAuthSettings: async (payload: AdminOAuthSettings) => {
    const res = await authFetch(`${API_BASE}/api/admin/integrations/oauth`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return res.json() as Promise<AdminOAuthSettings>
  },

  getAdminPageDraft: async (pageId: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/draft`)
    return res.json() as Promise<AdminPageDraftResponse>
  },

  updateAdminPageDraft: async (
    pageId: string,
    baseVersion: number,
    document: PageDocument,
    reason?: string,
    source: "manual" | "auto" = "manual",
  ) => {
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/draft`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseVersion, document, reason, source }),
    })
    return res.json() as Promise<{
      savedVersion: number
      document: PageDocument
      warnings?: Array<{ field: string; message: string }>
    }>
  },

  publishAdminPage: async (pageId: string, reason: string, draftVersion?: number) => {
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, draftVersion }),
    })
    return res.json() as Promise<{ publishedVersion: number }>
  },

  getAdminPageVersions: async (pageId: string, limit: number = 50) => {
    const params = new URLSearchParams({ limit: String(limit) })
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/versions?${params.toString()}`)
    return res.json() as Promise<{ items: AdminPageVersionListItem[]; next_cursor: string | null }>
  },

  getAdminPageVersion: async (pageId: string, version: number) => {
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/versions/${version}`)
    return res.json() as Promise<AdminPageVersionDetail>
  },

  compareAdminPageVersions: async (pageId: string, fromVersion: number, toVersion: number) => {
    const params = new URLSearchParams({ from_version: String(fromVersion), to_version: String(toVersion) })
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/versions-compare?${params.toString()}`)
    return res.json() as Promise<AdminPageVersionCompareResponse>
  },

  getAdminPageMigrationPreview: async (pageId: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/migration/preview`)
    return res.json() as Promise<AdminPageMigrationPreviewResponse>
  },

  getAdminPageMigrationBackups: async (pageId: string, limit: number = 20) => {
    const params = new URLSearchParams({ limit: String(limit) })
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/migration/backups?${params.toString()}`)
    return res.json() as Promise<AdminPageMigrationBackupListResponse>
  },

  executeAdminPageMigration: async (pageId: string, reason: string, dryRun: boolean = false) => {
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/migration/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, dryRun }),
    })
    return res.json() as Promise<AdminPageMigrationExecuteResponse>
  },

  restoreAdminPageMigration: async (
    pageId: string,
    backupKey: string,
    reason: string,
    dryRun: boolean = false,
  ) => {
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/migration/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupKey, reason, dryRun }),
    })
    return res.json() as Promise<AdminPageMigrationRestoreResponse>
  },

  getAdminPagePublishSchedules: async (pageId: string, limit: number = 50) => {
    const params = new URLSearchParams({ limit: String(limit) })
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/publish-schedules?${params.toString()}`)
    return res.json() as Promise<AdminPagePublishScheduleListResponse>
  },

  createAdminPagePublishSchedule: async (
    pageId: string,
    publishAt: string,
    reason: string,
    timezone: string = "Asia/Seoul",
    draftVersion?: number,
  ) => {
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/publish-schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publishAt, reason, timezone, draftVersion }),
    })
    return res.json() as Promise<{ scheduled: boolean; schedule: AdminPagePublishScheduleItem }>
  },

  cancelAdminPagePublishSchedule: async (pageId: string, scheduleId: string, reason: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/publish-schedules/${scheduleId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    return res.json() as Promise<{ cancelled: boolean; schedule: AdminPagePublishScheduleItem }>
  },

  retryAdminPagePublishSchedule: async (pageId: string, scheduleId: string, reason: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/publish-schedules/${scheduleId}/retry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    return res.json() as Promise<{ retried: boolean; schedule: AdminPagePublishScheduleItem }>
  },

  processAdminPagePublishSchedules: async (pageId: string, limit: number = 20, reason?: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/publish-schedules/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit, reason }),
    })
    return res.json() as Promise<AdminPagePublishScheduleProcessResponse>
  },

  rollbackAdminPage: async (pageId: string, targetVersion: number, reason: string, publishNow: boolean = false) => {
    const res = await authFetch(`${API_BASE}/api/admin/pages/${pageId}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetVersion, reason, publishNow }),
    })
    return res.json() as Promise<{ restoredDraftVersion: number; publishedVersion?: number | null }>
  },

  updateAboutContent: async (payload: AboutContent & { reason: string }) => {
    const res = await authFetch(`${API_BASE}/api/admin/content/about`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return res.json() as Promise<AboutContent>
  },

  // My Projects
  getMyProjects: async () => {
    const res = await authFetch(`${API_BASE}/api/me/projects`)
    return res.json() as Promise<ProjectsResponse>
  },

  getMyComments: async (limit: number = 50) => {
    const params = new URLSearchParams({ limit: String(limit) })
    const res = await authFetch(`${API_BASE}/api/me/comments?${params.toString()}`)
    return res.json() as Promise<ProfileCommentsResponse>
  },

  getMyLikedProjects: async (limit: number = 50) => {
    const params = new URLSearchParams({ limit: String(limit) })
    const res = await authFetch(`${API_BASE}/api/me/liked-projects?${params.toString()}`)
    return res.json() as Promise<ProjectsResponse>
  },
}
