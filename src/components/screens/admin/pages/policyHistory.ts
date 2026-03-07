import type { AdminActionLog, AdminPolicyFieldChange } from "@/lib/api"

const POLICY_FIELD_LABELS: Record<string, string> = {
  blocked_keywords: "금칙어",
  auto_hide_report_threshold: "자동 숨김 임계치",
  admin_log_retention_days: "로그 보존",
  admin_log_view_window_days: "기본 조회 기간",
  admin_log_mask_reasons: "reason 마스킹",
  page_editor_enabled: "페이지 편집",
  page_editor_rollout_stage: "롤아웃 단계",
  page_editor_pilot_admin_ids: "파일럿 관리자",
  page_editor_publish_fail_rate_threshold: "Publish 실패율",
  page_editor_rollback_ratio_threshold: "Rollback 비율",
  page_editor_conflict_rate_threshold: "충돌률",
  curated_review_quality_threshold: "품질 기준",
}

function getNumericChangeValue(change?: AdminPolicyFieldChange, key: "previous" | "next" = "next") {
  const value = change?.[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function extractLegacyCuratedThreshold(reason?: string) {
  const text = (reason || "").trim()
  if (!text) return null

  const nextMatch = text.match(/(?:^|,\s*)curated_quality_threshold_next=(\d+)/)
  if (nextMatch) return Number(nextMatch[1])

  const match = text.match(/(?:^|,\s*)curated_quality_threshold=(\d+)/)
  if (!match) return null

  return Number(match[1])
}

export interface CuratedThresholdHistoryEntry {
  id: string
  threshold: number
  previousThreshold: number | null
  admin: string
  at: string
}

export interface PolicyChangeSummaryItem {
  key: string
  label: string
  summary: string
}

function formatPolicyValue(key: string, value: unknown): string {
  if (key === "curated_review_quality_threshold" && typeof value === "number") {
    return `Q ${value}`
  }
  if (typeof value === "boolean") {
    return value ? "켜짐" : "꺼짐"
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? "없음" : `${value.length}개`
  }
  if (value === null || value === undefined || value === "") {
    return "없음"
  }
  return String(value)
}

function formatPolicyChangeSummary(key: string, change: AdminPolicyFieldChange): string {
  const previous = formatPolicyValue(key, change.previous)
  const next = formatPolicyValue(key, change.next)
  return `${previous} -> ${next}`
}

export function extractCuratedThresholdHistoryEntry(log: AdminActionLog): CuratedThresholdHistoryEntry | null {
  const metadataThreshold = getNumericChangeValue(log.metadata?.curated_quality_threshold)
  const nextFromChangedFields = getNumericChangeValue(log.metadata?.changed_fields?.curated_review_quality_threshold)
  const previousThreshold = getNumericChangeValue(log.metadata?.curated_quality_threshold, "previous")
    ?? getNumericChangeValue(log.metadata?.changed_fields?.curated_review_quality_threshold, "previous")
  const threshold = metadataThreshold ?? nextFromChangedFields ?? extractLegacyCuratedThreshold(log.reason)

  if (threshold === null) return null

  return {
    id: log.id,
    threshold,
    previousThreshold,
    admin: log.admin_nickname || "admin",
    at: new Date(log.created_at).toLocaleString("ko-KR"),
  }
}

export function extractPolicyChangeSummary(log: AdminActionLog): PolicyChangeSummaryItem[] {
  const changedFields = log.metadata?.changed_fields
  if (!changedFields) return []

  return Object.entries(changedFields)
    .filter(([, change]) => change && (change.previous !== undefined || change.next !== undefined))
    .map(([key, change]) => ({
      key,
      label: POLICY_FIELD_LABELS[key] || key,
      summary: formatPolicyChangeSummary(key, change),
    }))
}
