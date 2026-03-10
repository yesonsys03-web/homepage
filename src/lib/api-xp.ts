import { API_BASE, ApiRequestError } from "./api-core"
import type { XpAwardResult, XpSummary } from "./api-types"

function getAuthHeader(): Record<string, string> {
  const token = window.localStorage.getItem("vibecoder_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const xpApi = {
  getMyXp: async (): Promise<XpSummary> => {
    const res = await fetch(`${API_BASE}/api/xp/me`, {
      headers: { ...getAuthHeader() },
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "XP 조회에 실패했습니다" }))
      const detail = (error as { detail?: unknown }).detail ?? "XP 조회에 실패했습니다"
      throw new ApiRequestError(res.status, detail)
    }
    return res.json() as Promise<XpSummary>
  },

  awardXp: async (event_type: string, ref_id?: string): Promise<XpAwardResult> => {
    const res = await fetch(`${API_BASE}/api/xp/award`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({ event_type, ref_id }),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "XP 지급에 실패했습니다" }))
      const detail = (error as { detail?: unknown }).detail ?? "XP 지급에 실패했습니다"
      throw new ApiRequestError(res.status, detail)
    }
    return res.json() as Promise<XpAwardResult>
  },
}
