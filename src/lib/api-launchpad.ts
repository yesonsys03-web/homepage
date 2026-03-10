import { API_BASE, ApiRequestError, authFetch } from "./api-core"
import type {
  ErrorClinicResult,
  LaunchpadTip,
  LaunchpadTipPreview,
  LaunchpadTipsResponse,
} from "./api-types"

export const launchpadApi = {
  getLaunchpadTips: async (params?: {
    tool_tag?: string
    topic_tag?: string
    search?: string
    sort?: "date" | "name" | "alpha"
    limit?: number
    offset?: number
  }): Promise<LaunchpadTipsResponse> => {
    const qs = new URLSearchParams()
    if (params?.tool_tag) qs.set("tool_tag", params.tool_tag)
    if (params?.topic_tag) qs.set("topic_tag", params.topic_tag)
    if (params?.search) qs.set("search", params.search)
    if (params?.sort) qs.set("sort", params.sort)
    if (params?.limit != null) qs.set("limit", String(params.limit))
    if (params?.offset != null) qs.set("offset", String(params.offset))
    const url = `${API_BASE}/api/launchpad/tips${qs.toString() ? `?${qs}` : ""}`
    const res = await fetch(url)
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "팁 목록 조회에 실패했습니다" }))
      throw new ApiRequestError(res.status, (error as { detail?: unknown }).detail ?? "Request failed")
    }
    return res.json() as Promise<LaunchpadTipsResponse>
  },

  submitErrorClinic: async (payload: {
    error_text: string
    tool: string
    os: string
    tool_version?: string
  }): Promise<ErrorClinicResult> => {
    const res = await fetch(`${API_BASE}/api/launchpad/error-clinic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "에러 분석에 실패했습니다" }))
      throw new ApiRequestError(res.status, (error as { detail?: unknown }).detail ?? "Request failed")
    }
    return res.json() as Promise<ErrorClinicResult>
  },

  adminFetchTipUrl: async (url: string): Promise<LaunchpadTipPreview> => {
    const res = await authFetch(`${API_BASE}/api/admin/launchpad/tips/fetch-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
    return res.json() as Promise<LaunchpadTipPreview>
  },

  adminGetLaunchpadTips: async (status?: string): Promise<LaunchpadTipsResponse> => {
    const qs = status ? `?status=${status}` : ""
    const res = await authFetch(`${API_BASE}/api/admin/launchpad/tips${qs}`)
    return res.json() as Promise<LaunchpadTipsResponse>
  },

  adminCreateLaunchpadTip: async (data: Partial<LaunchpadTip> & {
    source_url: string
    platform: string
    og_title: string
    description_kr: string
  }): Promise<LaunchpadTip> => {
    const res = await authFetch(`${API_BASE}/api/admin/launchpad/tips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return res.json() as Promise<LaunchpadTip>
  },

  adminUpdateLaunchpadTip: async (id: number, data: Partial<LaunchpadTip>): Promise<LaunchpadTip> => {
    const res = await authFetch(`${API_BASE}/api/admin/launchpad/tips/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return res.json() as Promise<LaunchpadTip>
  },

  adminDeleteLaunchpadTip: async (id: number): Promise<void> => {
    await authFetch(`${API_BASE}/api/admin/launchpad/tips/${id}`, { method: "DELETE" })
  },

  adminCheckLaunchpadLinks: async (): Promise<{ checked: number; invalid: number }> => {
    const res = await authFetch(`${API_BASE}/api/admin/launchpad/tips/check-links`, {
      method: "POST",
    })
    return res.json() as Promise<{ checked: number; invalid: number }>
  },
}
