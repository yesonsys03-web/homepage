import { API_BASE, ApiRequestError } from "./api-core"
import type { ErrorTranslateResponse, GlossaryTermRequestResponse, TextTranslateResponse } from "./api-types"

export const translationApi = {
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

  textTranslate: async (input_text: string) => {
    const res = await fetch(`${API_BASE}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input_text }),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "텍스트 번역에 실패했습니다" }))
      const detail = (error as { detail?: unknown }).detail ?? "텍스트 번역에 실패했습니다"
      throw new ApiRequestError(res.status, detail)
    }
    return res.json() as Promise<TextTranslateResponse>
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
}
