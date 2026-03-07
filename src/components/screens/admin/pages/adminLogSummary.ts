import type { AdminActionLog } from "@/lib/api"

import { extractPolicyChangeSummary } from "./policyHistory"

export interface AdminLogSummaryItem {
  key: string
  label: string
  summary: string
}

function formatVersion(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value) ? `v${value}` : null
}

function extractPagePublishSummary(log: AdminActionLog): AdminLogSummaryItem[] {
  const metadata = log.metadata || {}

  if (log.action_type === "page_published") {
    const draftVersion = formatVersion(metadata.draft_version)
    const publishedVersion = formatVersion(metadata.published_version)
    const items: AdminLogSummaryItem[] = []

    if (draftVersion && publishedVersion) {
      items.push({
        key: "page-published-version",
        label: "게시 버전",
        summary: `${draftVersion} -> ${publishedVersion}`,
      })
    }

    return items
  }

  if (log.action_type === "page_publish_failed") {
    const failureKind = typeof metadata.failure_kind === "string" ? metadata.failure_kind : null
    const expectedDraftVersion = formatVersion(metadata.expected_draft_version)
    const currentDraftVersion = formatVersion(metadata.current_draft_version)
    const blockingErrorCount = typeof metadata.blocking_error_count === "number" ? metadata.blocking_error_count : null
    const warningCount = typeof metadata.warning_count === "number" ? metadata.warning_count : null
    const items: AdminLogSummaryItem[] = []

    if (failureKind) {
      items.push({
        key: "page-publish-failed-kind",
        label: "실패 유형",
        summary: failureKind,
      })
    }
    if (expectedDraftVersion && currentDraftVersion) {
      items.push({
        key: "page-publish-failed-version",
        label: "버전 비교",
        summary: `${expectedDraftVersion} / ${currentDraftVersion}`,
      })
    }
    if (blockingErrorCount !== null) {
      items.push({
        key: "page-publish-failed-blocking",
        label: "차단 오류",
        summary: `${blockingErrorCount}건`,
      })
    }
    if (warningCount !== null) {
      items.push({
        key: "page-publish-failed-warning",
        label: "경고",
        summary: `${warningCount}건`,
      })
    }

    return items
  }

  if (log.action_type === "page_draft_saved") {
    const source = typeof metadata.source === "string" ? metadata.source : null
    const baseVersion = formatVersion(metadata.base_version)
    const savedVersion = formatVersion(metadata.saved_version)
    const items: AdminLogSummaryItem[] = []

    if (source) {
      items.push({
        key: "page-draft-saved-source",
        label: "저장 소스",
        summary: source,
      })
    }
    if (baseVersion && savedVersion) {
      items.push({
        key: "page-draft-saved-version",
        label: "저장 버전",
        summary: `${baseVersion} -> ${savedVersion}`,
      })
    }

    return items
  }

  if (log.action_type === "page_conflict_detected") {
    const source = typeof metadata.source === "string" ? metadata.source : null
    const baseVersion = formatVersion(metadata.base_version)
    const currentVersion = formatVersion(metadata.current_version)
    const items: AdminLogSummaryItem[] = []

    if (source) {
      items.push({
        key: "page-conflict-source",
        label: "저장 소스",
        summary: source,
      })
    }
    if (baseVersion && currentVersion) {
      items.push({
        key: "page-conflict-version",
        label: "버전 충돌",
        summary: `${baseVersion} / ${currentVersion}`,
      })
    }

    return items
  }

  if (log.action_type === "page_rolled_back") {
    const targetVersion = formatVersion(metadata.target_version)
    const restoredDraftVersion = formatVersion(metadata.restored_draft_version)
    const publishedVersion = formatVersion(metadata.published_version)
    const publishNow = typeof metadata.publish_now === "boolean" ? metadata.publish_now : null
    const items: AdminLogSummaryItem[] = []

    if (targetVersion && restoredDraftVersion) {
      items.push({
        key: "page-rollback-version",
        label: "복원 버전",
        summary: `${targetVersion} -> ${restoredDraftVersion}`,
      })
    }
    if (publishedVersion) {
      items.push({
        key: "page-rollback-published",
        label: "게시 버전",
        summary: publishedVersion,
      })
    }
    if (publishNow !== null) {
      items.push({
        key: "page-rollback-publish-now",
        label: "즉시 게시",
        summary: publishNow ? "예" : "아니오",
      })
    }

    return items
  }

  return []
}

export function extractAdminLogSummary(log: AdminActionLog): AdminLogSummaryItem[] {
  if (log.action_type === "policy_updated") {
    return extractPolicyChangeSummary(log)
  }

  return extractPagePublishSummary(log)
}
