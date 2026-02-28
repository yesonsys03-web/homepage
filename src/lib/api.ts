import type { User } from "./auth-types"

const API_BASE = "http://localhost:8000"

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

export interface AdminManagedUser {
  id: string
  email: string
  nickname: string
  role: string
  created_at: string
  limited_until?: string | null
  limited_reason?: string | null
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
  updated_at: string
  last_updated_by?: string | null
  last_updated_by_id?: string | null
  last_updated_action_at?: string | null
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

type AdminReportsResponse = { items: Report[]; total: number }
type AdminListResponse<T> = { items: T[] }
type ProjectsResponse = { items: Project[] }
type CommentsResponse = { items: Comment[] }

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
    throw new Error(error.detail || "Request failed")
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
    const data = await res.json()
    return { ...data, user: data.user } as { access_token: string; user: User }
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    return { ...data, user: data.user } as { access_token: string; user: User }
  },

  getMe: async () => {
    const res = await authFetch(`${API_BASE}/api/me`)
    return res.json() as Promise<User>
  },

  getAboutContent: async (options?: SWRFetchOptions<AboutContent>) => {
    const key = createAdminCacheKey("pages")
    return fetchWithAdminSWR(
      key,
      ADMIN_TAB_TTL_MS.pages,
      async (signal) => {
        const res = await fetch(`${API_BASE}/api/content/about`, { signal })
        if (!res.ok) throw new Error("Failed to load about content")
        return res.json() as Promise<AboutContent>
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

  getAdminActionLogs: async (limit: number = 50, options?: SWRFetchOptions<AdminListResponse<AdminActionLog>>) => {
    const key = createAdminCacheKey("actions", { limit })
    return fetchWithAdminSWR(
      key,
      ADMIN_TAB_TTL_MS.actions,
      async (signal) => {
        const res = await authFetch(`${API_BASE}/api/admin/action-logs?limit=${limit}`, { signal })
        return res.json() as Promise<AdminListResponse<AdminActionLog>>
      },
      options,
    )
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

  updateAdminPolicies: async (blocked_keywords: string[], auto_hide_report_threshold: number) => {
    const res = await authFetch(`${API_BASE}/api/admin/policies`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked_keywords, auto_hide_report_threshold }),
    })
    return res.json() as Promise<ModerationPolicy>
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
    return res.json()
  },
}
