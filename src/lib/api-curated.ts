import { API_BASE, ApiRequestError, authFetch } from "./api-core"
import type {
  AdminCuratedRelatedClicksSummary,
  CuratedContent,
  CuratedContentResponse,
  CuratedRelatedClickResponse,
  CuratedRelatedResponse,
} from "./api-types"

export const curatedApi = {
  getCuratedContent: async (params?: {
    category?: string
    search?: string
    is_korean_dev?: boolean
    sort?: "latest" | "quality"
    limit?: number
    offset?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set("category", params.category)
    if (params?.search) searchParams.set("search", params.search)
    if (typeof params?.is_korean_dev === "boolean") searchParams.set("is_korean_dev", String(params.is_korean_dev))
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

  updateAdminCuratedContent: async (contentId: number, updates: Record<string, unknown>) => {
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

  getAdminCuratedRelatedClicksSummary: async (days: number = 30, limit: number = 5, sourceContentId?: number) => {
    const params = new URLSearchParams({ days: String(days), limit: String(limit) })
    if (typeof sourceContentId === "number" && sourceContentId > 0) params.set("source_content_id", String(sourceContentId))
    const res = await authFetch(`${API_BASE}/api/admin/curated/related-clicks/summary?${params.toString()}`)
    return res.json() as Promise<AdminCuratedRelatedClicksSummary>
  },
}
