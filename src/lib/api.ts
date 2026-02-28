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

  updateReport: async (reportId: string, status: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    return res.json() as Promise<Report>
  },

  // My Projects
  getMyProjects: async () => {
    const res = await authFetch(`${API_BASE}/api/me/projects`)
    return res.json()
  },
}
