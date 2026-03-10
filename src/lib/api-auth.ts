import { API_BASE, authFetch } from "./api-core"
import type { User } from "./api-types"

export const authApi = {
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
    const data = (await res.json()) as { auth_url: string }
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
      headers: { Authorization: `Bearer ${token}` },
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

  getMyProjects: async () => {
    const res = await authFetch(`${API_BASE}/api/me/projects`)
    return res.json() as Promise<{ items: import("./api-types").Project[] }>
  },

  getMyComments: async (limit: number = 50) => {
    const params = new URLSearchParams({ limit: String(limit) })
    const res = await authFetch(`${API_BASE}/api/me/comments?${params.toString()}`)
    return res.json() as Promise<{ items: import("./api-types").ProfileComment[] }>
  },

  getMyLikedProjects: async (limit: number = 50) => {
    const params = new URLSearchParams({ limit: String(limit) })
    const res = await authFetch(`${API_BASE}/api/me/liked-projects?${params.toString()}`)
    return res.json() as Promise<{ items: import("./api-types").Project[] }>
  },
}
