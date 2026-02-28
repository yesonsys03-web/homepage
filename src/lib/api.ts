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

  // Projects
  getProjects: async (params?: { sort?: string; platform?: string; tag?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.sort) searchParams.set("sort", params.sort)
    if (params?.platform) searchParams.set("platform", params.platform)
    if (params?.tag) searchParams.set("tag", params.tag)
    
    const res = await fetch(`${API_BASE}/api/projects?${searchParams}`)
    return res.json()
  },

  getProject: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/projects/${id}`)
    if (!res.ok) throw new Error("Project not found")
    return res.json() as Promise<Project>
  },

  createProject: async (data: Partial<Project>) => {
    const res = await authFetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return res.json() as Promise<Project>
  },

  likeProject: async (id: string) => {
    const res = await authFetch(`${API_BASE}/api/projects/${id}/like`, {
      method: "POST",
    })
    return res.json() as Promise<{ like_count: number }>
  },

  unlikeProject: async (id: string) => {
    const res = await authFetch(`${API_BASE}/api/projects/${id}/like`, {
      method: "DELETE",
    })
    return res.json() as Promise<{ like_count: number }>
  },

  // Comments
  getComments: async (projectId: string, sort: string = "latest") => {
    const res = await fetch(`${API_BASE}/api/projects/${projectId}/comments?sort=${sort}`)
    return res.json()
  },

  createComment: async (projectId: string, content: string) => {
    const res = await authFetch(`${API_BASE}/api/projects/${projectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    return res.json() as Promise<Comment>
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
  getReports: async (status?: string) => {
    const searchParams = status ? `?status=${status}` : ""
    const res = await authFetch(`${API_BASE}/api/admin/reports${searchParams}`)
    return res.json()
  },

  updateReport: async (reportId: string, status: string, reason?: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    })
    return res.json() as Promise<Report>
  },

  getAdminActionLogs: async (limit: number = 50) => {
    const res = await authFetch(`${API_BASE}/api/admin/action-logs?limit=${limit}`)
    return res.json() as Promise<{ items: AdminActionLog[] }>
  },

  getAdminUsers: async (limit: number = 200) => {
    const res = await authFetch(`${API_BASE}/api/admin/users?limit=${limit}`)
    return res.json() as Promise<{ items: AdminManagedUser[] }>
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

  getAdminPolicies: async () => {
    const res = await authFetch(`${API_BASE}/api/admin/policies`)
    return res.json() as Promise<ModerationPolicy>
  },

  updateAdminPolicies: async (blocked_keywords: string[], auto_hide_report_threshold: number) => {
    const res = await authFetch(`${API_BASE}/api/admin/policies`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked_keywords, auto_hide_report_threshold }),
    })
    return res.json() as Promise<ModerationPolicy>
  },

  // My Projects
  getMyProjects: async () => {
    const res = await authFetch(`${API_BASE}/api/me/projects`)
    return res.json()
  },
}
