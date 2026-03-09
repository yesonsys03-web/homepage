import {
  ADMIN_TAB_TTL_MS,
  API_BASE,
  authFetch,
  createAdminCacheKey,
  fetchWithAdminSWR,
  hasAdminCache,
  invalidateAdminCacheKey,
  type SWRFetchOptions,
} from "./api-core"
import type {
  AboutContent,
  AdminActionLog,
  AdminActionObservability,
  AdminListResponse,
  AdminManagedProject,
  AdminManagedUser,
  AdminOAuthHealth,
  AdminOAuthSettings,
  AdminPageDraftResponse,
  AdminPageMigrationBackupListResponse,
  AdminPageMigrationExecuteResponse,
  AdminPageMigrationPreviewResponse,
  AdminPageMigrationRestoreResponse,
  AdminPagePerfScenario,
  AdminPagePerfSnapshot,
  AdminPagePublishScheduleItem,
  AdminPagePublishScheduleListResponse,
  AdminPagePublishScheduleProcessResponse,
  AdminPageVersionCompareResponse,
  AdminPageVersionDetail,
  AdminPageVersionListItem,
  AdminReportsResponse,
  AdminStats,
  ModerationPolicy,
  PageDocument,
  Report,
} from "./api-types"

export const adminApi = {
  getAdminStats: async (options?: SWRFetchOptions<AdminStats>) => {
    const key = createAdminCacheKey("stats")
    return fetchWithAdminSWR(key, ADMIN_TAB_TTL_MS.stats, async (signal) => {
      const res = await authFetch(`${API_BASE}/api/admin/stats`, { signal })
      return res.json() as Promise<AdminStats>
    }, options)
  },
  getReports: async (status?: string, limit: number = 50, offset: number = 0, options?: SWRFetchOptions<AdminReportsResponse>) => {
    const key = createAdminCacheKey("reports", { status: status ?? "all", limit, offset })
    return fetchWithAdminSWR(key, ADMIN_TAB_TTL_MS.reports, async (signal) => {
      const params = new URLSearchParams()
      if (status) params.set("status", status)
      params.set("limit", String(limit))
      params.set("offset", String(offset))
      const res = await authFetch(`${API_BASE}/api/admin/reports?${params.toString()}`, { signal })
      return res.json() as Promise<AdminReportsResponse>
    }, options)
  },
  updateReport: async (reportId: string, status: string, reason?: string) => {
    const res = await authFetch(`${API_BASE}/api/admin/reports/${reportId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reason }) })
    return res.json() as Promise<Report>
  },
  getAdminActionLogs: async (limit: number = 50, filters?: { actionType?: string; actorId?: string; pageId?: string }, options?: SWRFetchOptions<AdminListResponse<AdminActionLog>>) => {
    const key = createAdminCacheKey("actions", { limit, actionType: filters?.actionType ?? "all", actorId: filters?.actorId ?? "all", pageId: filters?.pageId ?? "all" })
    return fetchWithAdminSWR(key, ADMIN_TAB_TTL_MS.actions, async (signal) => {
      const params = new URLSearchParams({ limit: String(limit) })
      if (filters?.actionType) params.set("action_type", filters.actionType)
      if (filters?.actorId) params.set("actor_id", filters.actorId)
      if (filters?.pageId) params.set("page_id", filters.pageId)
      const res = await authFetch(`${API_BASE}/api/admin/action-logs?${params.toString()}`, { signal })
      return res.json() as Promise<AdminListResponse<AdminActionLog>>
    }, options)
  },
  invalidateAdminTabCache: (tab: keyof typeof ADMIN_TAB_TTL_MS, params?: Record<string, string | number | undefined>) => {
    const key = createAdminCacheKey(tab, params)
    invalidateAdminCacheKey(key)
  },
  getAdminActionObservability: async (windowDays: number = 30) => {
    const params = new URLSearchParams({ window_days: String(windowDays) })
    const res = await authFetch(`${API_BASE}/api/admin/action-logs/observability?${params.toString()}`)
    return res.json() as Promise<AdminActionObservability>
  },
  getAdminPagePerfSnapshot: async () => {
    const res = await authFetch(`${API_BASE}/api/admin/perf/page-editor`)
    return res.json() as Promise<AdminPagePerfSnapshot>
  },
  logAdminPagePerfEvent: async (pageId: string, scenario: AdminPagePerfScenario, durationMs: number, source: string = "ui") => {
    const res = await authFetch(`${API_BASE}/api/admin/perf/page-editor/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId, scenario, durationMs, source }) })
    return res.json() as Promise<{ ok: boolean }>
  },
  getAdminUsers: async (limit: number = 200, options?: SWRFetchOptions<AdminListResponse<AdminManagedUser>>) => {
    const key = createAdminCacheKey("users", { limit })
    return fetchWithAdminSWR(key, ADMIN_TAB_TTL_MS.users, async (signal) => {
      const res = await authFetch(`${API_BASE}/api/admin/users?limit=${limit}`, { signal })
      return res.json() as Promise<AdminListResponse<AdminManagedUser>>
    }, options)
  },
  getAdminProjects: async (status?: string, limit: number = 200, options?: SWRFetchOptions<AdminListResponse<AdminManagedProject>>) => {
    const key = createAdminCacheKey("content", { status: status ?? "all", limit })
    return fetchWithAdminSWR(key, ADMIN_TAB_TTL_MS.content, async (signal) => {
      const params = new URLSearchParams()
      if (status) params.set("status", status)
      params.set("limit", String(limit))
      const res = await authFetch(`${API_BASE}/api/admin/projects?${params.toString()}`, { signal })
      return res.json() as Promise<AdminListResponse<AdminManagedProject>>
    }, options)
  },
  updateAdminProject: async (projectId: string, data: Partial<AdminManagedProject> & { reason?: string }) => (await authFetch(`${API_BASE}/api/admin/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })).json() as Promise<AdminManagedProject>,
  hideAdminProject: async (projectId: string, reason?: string) => (await authFetch(`${API_BASE}/api/admin/projects/${projectId}/hide`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) })).json() as Promise<AdminManagedProject>,
  restoreAdminProject: async (projectId: string, reason?: string) => (await authFetch(`${API_BASE}/api/admin/projects/${projectId}/restore`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) })).json() as Promise<AdminManagedProject>,
  deleteAdminProject: async (projectId: string, reason?: string) => (await authFetch(`${API_BASE}/api/admin/projects/${projectId}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) })).json() as Promise<AdminManagedProject>,
  limitUser: async (userId: string, hours: number, reason?: string) => (await authFetch(`${API_BASE}/api/admin/users/${userId}/limit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hours, reason }) })).json() as Promise<AdminManagedUser>,
  unlimitUser: async (userId: string) => (await authFetch(`${API_BASE}/api/admin/users/${userId}/limit`, { method: "DELETE" })).json() as Promise<AdminManagedUser>,
  suspendUser: async (userId: string, reason: string) => (await authFetch(`${API_BASE}/api/admin/users/${userId}/suspend`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) })).json() as Promise<AdminManagedUser>,
  unsuspendUser: async (userId: string) => (await authFetch(`${API_BASE}/api/admin/users/${userId}/suspend`, { method: "DELETE" })).json() as Promise<AdminManagedUser>,
  revokeUserTokens: async (userId: string, reason?: string) => (await authFetch(`${API_BASE}/api/admin/users/${userId}/tokens/revoke`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) })).json() as Promise<AdminManagedUser>,
  scheduleUserDelete: async (userId: string, days: number, reason: string) => (await authFetch(`${API_BASE}/api/admin/users/${userId}/delete-schedule`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days, reason }) })).json() as Promise<AdminManagedUser>,
  cancelUserDeleteSchedule: async (userId: string) => (await authFetch(`${API_BASE}/api/admin/users/${userId}/delete-schedule`, { method: "DELETE" })).json() as Promise<AdminManagedUser>,
  deleteUserNow: async (userId: string, reason: string) => (await authFetch(`${API_BASE}/api/admin/users/${userId}/delete-now`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) })).json() as Promise<AdminManagedUser>,
  approveUser: async (userId: string) => (await authFetch(`${API_BASE}/api/admin/users/${userId}/approve`, { method: "POST" })).json() as Promise<AdminManagedUser>,
  rejectUser: async (userId: string, reason: string) => (await authFetch(`${API_BASE}/api/admin/users/${userId}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) })).json() as Promise<AdminManagedUser>,
  updateAdminUserRole: async (userId: string, role: "user" | "admin", reason?: string) => (await authFetch(`${API_BASE}/api/admin/users/${userId}/role`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, reason }) })).json() as Promise<AdminManagedUser>,
  getAdminPolicies: async (options?: SWRFetchOptions<ModerationPolicy>) => fetchWithAdminSWR(createAdminCacheKey("policies"), ADMIN_TAB_TTL_MS.policies, async (signal) => (await authFetch(`${API_BASE}/api/admin/policies`, { signal })).json() as Promise<ModerationPolicy>, options),
  hasAdminTabCache: (tab: keyof typeof ADMIN_TAB_TTL_MS, params?: Record<string, string | number | undefined>) => hasAdminCache(createAdminCacheKey(tab, params)),
  prefetchAdminTabData: async (tab: keyof typeof ADMIN_TAB_TTL_MS) => {
    switch (tab) {
      case "reports": await adminApi.getReports(undefined, 50, 0); break
      case "users": await adminApi.getAdminUsers(200); break
      case "content": await adminApi.getAdminProjects(undefined, 200); break
      case "pages": await adminApi.getAboutContent(); break
      case "policies": await adminApi.getAdminPolicies(); break
      case "actions": await adminApi.getAdminActionLogs(100); break
    }
  },
  updateAdminPolicies: async (
    blocked_keywords: string[], auto_hide_report_threshold: number, home_filter_tabs?: import("./api-types").FilterTab[], explore_filter_tabs?: import("./api-types").FilterTab[], admin_log_retention_days?: number, admin_log_view_window_days?: number, admin_log_mask_reasons?: boolean, page_editor_enabled?: boolean, page_editor_rollout_stage?: "qa" | "pilot" | "open", page_editor_pilot_admin_ids?: string[], page_editor_publish_fail_rate_threshold?: number, page_editor_rollback_ratio_threshold?: number, page_editor_conflict_rate_threshold?: number, curated_review_quality_threshold?: number, curated_related_click_boost_min_relevance?: number, curated_related_click_boost_multiplier?: number, curated_related_click_boost_cap?: number,
  ) => {
    const payload: Record<string, unknown> = { blocked_keywords, auto_hide_report_threshold }
    if (home_filter_tabs) payload.home_filter_tabs = home_filter_tabs
    if (explore_filter_tabs) payload.explore_filter_tabs = explore_filter_tabs
    if (typeof admin_log_retention_days === "number") payload.admin_log_retention_days = admin_log_retention_days
    if (typeof admin_log_view_window_days === "number") payload.admin_log_view_window_days = admin_log_view_window_days
    if (typeof admin_log_mask_reasons === "boolean") payload.admin_log_mask_reasons = admin_log_mask_reasons
    if (typeof page_editor_enabled === "boolean") payload.page_editor_enabled = page_editor_enabled
    if (page_editor_rollout_stage) payload.page_editor_rollout_stage = page_editor_rollout_stage
    if (page_editor_pilot_admin_ids) payload.page_editor_pilot_admin_ids = page_editor_pilot_admin_ids
    if (typeof page_editor_publish_fail_rate_threshold === "number") payload.page_editor_publish_fail_rate_threshold = page_editor_publish_fail_rate_threshold
    if (typeof page_editor_rollback_ratio_threshold === "number") payload.page_editor_rollback_ratio_threshold = page_editor_rollback_ratio_threshold
    if (typeof page_editor_conflict_rate_threshold === "number") payload.page_editor_conflict_rate_threshold = page_editor_conflict_rate_threshold
    if (typeof curated_review_quality_threshold === "number") payload.curated_review_quality_threshold = curated_review_quality_threshold
    if (typeof curated_related_click_boost_min_relevance === "number") payload.curated_related_click_boost_min_relevance = curated_related_click_boost_min_relevance
    if (typeof curated_related_click_boost_multiplier === "number") payload.curated_related_click_boost_multiplier = curated_related_click_boost_multiplier
    if (typeof curated_related_click_boost_cap === "number") payload.curated_related_click_boost_cap = curated_related_click_boost_cap
    return (await authFetch(`${API_BASE}/api/admin/policies`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })).json() as Promise<ModerationPolicy>
  },
  getAdminOAuthSettings: async () => (await authFetch(`${API_BASE}/api/admin/integrations/oauth`)).json() as Promise<AdminOAuthSettings>,
  getAdminOAuthHealth: async () => (await authFetch(`${API_BASE}/api/admin/integrations/oauth/health`)).json() as Promise<AdminOAuthHealth>,
  updateAdminOAuthSettings: async (payload: AdminOAuthSettings) => (await authFetch(`${API_BASE}/api/admin/integrations/oauth`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })).json() as Promise<AdminOAuthSettings>,
  getAdminPageDraft: async (pageId: string) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/draft`)).json() as Promise<AdminPageDraftResponse>,
  updateAdminPageDraft: async (pageId: string, baseVersion: number, document: PageDocument, reason?: string, source: "manual" | "auto" = "manual") => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/draft`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseVersion, document, reason, source }) })).json() as Promise<{ savedVersion: number; document: PageDocument; warnings?: Array<{ field: string; message: string }> }>,
  publishAdminPage: async (pageId: string, reason: string, draftVersion?: number) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, draftVersion }) })).json() as Promise<{ publishedVersion: number }>,
  getAdminPageVersions: async (pageId: string, limit: number = 50) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/versions?${new URLSearchParams({ limit: String(limit) })}`)).json() as Promise<{ items: AdminPageVersionListItem[]; next_cursor: string | null }>,
  getAdminPageVersion: async (pageId: string, version: number) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/versions/${version}`)).json() as Promise<AdminPageVersionDetail>,
  compareAdminPageVersions: async (pageId: string, fromVersion: number, toVersion: number) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/versions-compare?${new URLSearchParams({ from_version: String(fromVersion), to_version: String(toVersion) })}`)).json() as Promise<AdminPageVersionCompareResponse>,
  getAdminPageMigrationPreview: async (pageId: string) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/migration/preview`)).json() as Promise<AdminPageMigrationPreviewResponse>,
  getAdminPageMigrationBackups: async (pageId: string, limit: number = 20) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/migration/backups?${new URLSearchParams({ limit: String(limit) })}`)).json() as Promise<AdminPageMigrationBackupListResponse>,
  executeAdminPageMigration: async (pageId: string, reason: string, dryRun: boolean = false) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/migration/execute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, dryRun }) })).json() as Promise<AdminPageMigrationExecuteResponse>,
  restoreAdminPageMigration: async (pageId: string, backupKey: string, reason: string, dryRun: boolean = false) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/migration/restore`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ backupKey, reason, dryRun }) })).json() as Promise<AdminPageMigrationRestoreResponse>,
  getAdminPagePublishSchedules: async (pageId: string, limit: number = 50) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/publish-schedules?${new URLSearchParams({ limit: String(limit) })}`)).json() as Promise<AdminPagePublishScheduleListResponse>,
  createAdminPagePublishSchedule: async (pageId: string, publishAt: string, reason: string, timezone: string = "Asia/Seoul", draftVersion?: number) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/publish-schedules`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publishAt, reason, timezone, draftVersion }) })).json() as Promise<{ scheduled: boolean; schedule: AdminPagePublishScheduleItem }>,
  cancelAdminPagePublishSchedule: async (pageId: string, scheduleId: string, reason: string) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/publish-schedules/${scheduleId}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) })).json() as Promise<{ cancelled: boolean; schedule: AdminPagePublishScheduleItem }>,
  retryAdminPagePublishSchedule: async (pageId: string, scheduleId: string, reason: string) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/publish-schedules/${scheduleId}/retry`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) })).json() as Promise<{ retried: boolean; schedule: AdminPagePublishScheduleItem }>,
  processAdminPagePublishSchedules: async (pageId: string, limit: number = 20, reason?: string) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/publish-schedules/process`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit, reason }) })).json() as Promise<AdminPagePublishScheduleProcessResponse>,
  rollbackAdminPage: async (pageId: string, targetVersion: number, reason: string, publishNow: boolean = false) => (await authFetch(`${API_BASE}/api/admin/pages/${pageId}/rollback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetVersion, reason, publishNow }) })).json() as Promise<{ restoredDraftVersion: number; publishedVersion?: number | null }>,
  updateAboutContent: async (payload: AboutContent & { reason: string }) => (await authFetch(`${API_BASE}/api/admin/content/about`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })).json() as Promise<AboutContent>,
  getAboutContent: async (options?: SWRFetchOptions<AboutContent>) => {
    const key = createAdminCacheKey("pages")
    return fetchWithAdminSWR(key, ADMIN_TAB_TTL_MS.pages, async (signal) => {
      const res = await fetch(`${API_BASE}/api/content/about`, { signal, cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load about content")
      return res.json() as Promise<AboutContent>
    }, options)
  },
}
