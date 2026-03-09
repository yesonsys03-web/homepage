import type { User } from "./auth-types"

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

export interface CuratedContent {
  id: number
  source_type: string
  source_url: string
  canonical_url: string
  repo_name: string
  repo_owner: string
  title: string
  category: string
  language: string
  is_korean_dev: boolean
  stars: number
  license: string
  license_explanation: string
  thumbnail_url: string
  relevance_score?: number | null
  beginner_value?: number | null
  quality_score?: number | null
  summary_beginner: string
  summary_mid: string
  summary_expert: string
  tags: string[]
  status:
    | "pending"
    | "review_license"
    | "review_duplicate"
    | "review_quality"
    | "approved"
    | "rejected"
    | "auto_rejected"
    | string
  reject_reason: string
  review_metadata?: {
    reason_codes?: string[]
    canonical_url_match?: boolean
    owner_repo_match?: boolean
    title_match?: boolean
    matched_existing_ids?: number[]
    matched_processed_titles?: string[]
    license_value?: string
    quality_score_value?: number
    quality_threshold?: number
    [key: string]: unknown
  }
  approved_at: string
  approved_by: string
  github_pushed_at: string
  collected_at: string
  updated_at: string
}

export interface ErrorTranslateStep {
  description: string
  command: string
}

export interface ErrorTranslateResponse {
  what_happened: string
  fix_steps: ErrorTranslateStep[]
  plan_b: ErrorTranslateStep
  error_type: "pnpm" | "python" | "git" | "vite" | "general" | string
  error_hash: string
  source: "cache" | "fallback" | string
}

export interface TextTranslateCommand {
  description: string
  command: string
}

export interface TextTranslateResponse {
  korean_summary: string
  simple_analogy: string
  commands: TextTranslateCommand[]
  related_terms: string[]
  input_hash: string
  source: "cache" | "fallback" | string
}

export interface GlossaryTermRequestResponse {
  id: number
  requested_term: string
  status: string
  created_at: string
}

export interface CuratedRelatedClickResponse {
  ok: boolean
  id: number
}

export interface CuratedReason {
  code: string
  label: string
}

export interface CuratedRelatedRecommendation {
  item: CuratedContent
  reasons: CuratedReason[]
}

export interface CuratedRelatedResponse {
  items: CuratedRelatedRecommendation[]
  source: string
}

export interface AdminCuratedRelatedClicksPair {
  source_content_id: number
  source_title: string
  target_content_id: number
  target_title: string
  click_count: number
  last_clicked_at: string
  top_reason_code: string
  top_reason_label: string
  top_reason_count: number
}

export interface AdminCuratedRelatedClicksReason {
  reason_code: string
  reason_label: string
  click_count: number
}

export interface AdminCuratedRelatedClicksSource {
  content_id: number
  title: string
}

export interface AdminCuratedRelatedClicksSummary {
  window_days: number
  source_content_id: number | null
  total_clicks: number
  unique_pairs: number
  top_pairs: AdminCuratedRelatedClicksPair[]
  top_reasons: AdminCuratedRelatedClicksReason[]
  available_sources: AdminCuratedRelatedClicksSource[]
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

export interface ProfileComment extends Comment {
  project_title: string
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

export interface AdminPolicyFieldChange {
  previous?: unknown
  next?: unknown
}

export interface AdminActionLogMetadata {
  event?: string
  changed_fields?: Record<string, AdminPolicyFieldChange>
  curated_quality_threshold?: AdminPolicyFieldChange
  [key: string]: unknown
}

export interface AdminActionLog {
  id: string
  admin_id?: string
  admin_nickname?: string
  action_type: string
  target_type: string
  target_id: string
  reason?: string
  metadata?: AdminActionLogMetadata
  created_at: string
}

export interface AdminActionObservability {
  window_days: number
  daily_publish_counts: Array<{ day: string; publish_count: number }>
  summary: {
    published: number
    rolled_back: number
    draft_saved: number
    conflicts: number
    rollback_ratio: number
    conflict_rate: number
  }
  publish_failure_distribution: Array<{ reason: string; count: number }>
  daily_curated_collection_counts: Array<{
    day: string
    run_count: number
    created_total: number
  }>
  curated_collection_summary: {
    succeeded: number
    failed: number
    skipped: number
    created_total: number
  }
  curated_review_queue_summary: {
    pending: number
    review_license: number
    review_duplicate: number
    review_quality: number
    total: number
  }
  curated_collection_failure_distribution: Array<{ reason: string; count: number }>
}

export type AdminPagePerfScenario =
  | "editor_initial_load"
  | "preview_switch"
  | "draft_save_roundtrip"
  | "panel_canvas_roundtrip_count"
  | "edit_completion_time"
  | "editor_scroll_distance"

export interface AdminPagePerfMetric {
  sample_count: number
  p75_ms: number
  p95_ms: number
  slo_p75_ms: number
  within_slo: boolean
}

export type AdminPagePerfVariant = "baseline" | "enhanced"

export interface AdminPagePerfVariantSnapshot {
  sample_count: number
  metrics: Record<AdminPagePerfScenario, AdminPagePerfMetric>
}

export interface AdminPagePerfSnapshot {
  window_size: number
  sample_count: number
  metrics: Record<AdminPagePerfScenario, AdminPagePerfMetric>
  variants: Record<AdminPagePerfVariant, AdminPagePerfVariantSnapshot>
}

export interface AdminPageMigrationPreviewResponse {
  pageId: string
  sourceType: string
  sourceKey: string
  mappingRules: Array<{ from: string; to: string }>
  document: PageDocument
  validation: {
    blocking: Array<{ field: string; message: string }>
    warnings: Array<{ field: string; message: string }>
    blockingCount: number
    warningCount: number
  }
}

export interface AdminPageMigrationBackupListResponse {
  pageId: string
  count: number
  items: Array<{
    backupKey: string
    capturedAt: string
    reason: string
    dryRun: boolean
    sourceKey: string
    updatedAt: string
  }>
}

export interface AdminPageMigrationExecuteResponse {
  pageId: string
  dryRun: boolean
  applied: boolean
  savedVersion?: number
  backupKey: string
  validation: {
    blocking: Array<{ field: string; message: string }>
    warnings: Array<{ field: string; message: string }>
    blockingCount: number
    warningCount: number
  }
}

export interface AdminPageMigrationRestoreResponse {
  pageId: string
  dryRun: boolean
  restored: boolean
  restoredVersion?: number
  backupKey: string
  validation: {
    blocking: Array<{ field: string; message: string }>
    warnings: Array<{ field: string; message: string }>
    blockingCount: number
    warningCount: number
  }
}

export interface AdminPagePublishScheduleItem {
  scheduleId: string
  pageId: string
  draftVersion: number
  publishAt: string
  timezone: string
  status: "scheduled" | "published" | "cancelled" | "failed"
  reason: string
  attemptCount: number
  maxAttempts: number
  lastError: string
  nextRetryAt: string
  createdBy: string
  createdAt: string
  updatedAt: string
  cancelledAt: string
  publishedVersion: number
  publishedAt: string
}

export interface AdminPagePublishScheduleListResponse {
  pageId: string
  count: number
  items: AdminPagePublishScheduleItem[]
}

export interface AdminPagePublishScheduleProcessResponse {
  pageId: string
  processed: number
  published: number
  failed: number
  items: Array<{
    scheduleId: string
    status: "published" | "failed"
    publishedVersion?: number
    error?: string
  }>
}

export interface AdminManagedUser {
  id: string
  email: string
  nickname: string
  role: string
  status?: "pending" | "active" | "rejected" | "suspended" | "pending_delete" | "deleted" | string
  created_at: string
  limited_until?: string | null
  limited_reason?: string | null
  suspended_reason?: string | null
  suspended_at?: string | null
  suspended_by?: string | null
  delete_scheduled_at?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  token_version?: number
}

export interface AdminManagedProject {
  id: string
  author_id: string
  author_nickname: string
  title: string
  summary: string
  description?: string
  thumbnail_url?: string | null
  demo_url?: string | null
  repo_url?: string | null
  platform: string
  tags: string[]
  status: string
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface ModerationPolicy {
  id: number
  blocked_keywords: string[]
  custom_blocked_keywords: string[]
  baseline_keyword_categories: Record<string, string[]>
  auto_hide_report_threshold: number
  home_filter_tabs: FilterTab[]
  explore_filter_tabs: FilterTab[]
  admin_log_retention_days: number
  admin_log_view_window_days: number
  admin_log_mask_reasons: boolean
  page_editor_enabled: boolean
  page_editor_rollout_stage: "qa" | "pilot" | "open"
  page_editor_pilot_admin_ids: string[]
  page_editor_publish_fail_rate_threshold: number
  page_editor_rollback_ratio_threshold: number
  page_editor_conflict_rate_threshold: number
  curated_review_quality_threshold: number
  curated_related_click_boost_min_relevance: number
  curated_related_click_boost_multiplier: number
  curated_related_click_boost_cap: number
  updated_at: string
  last_updated_by?: string | null
  last_updated_by_id?: string | null
  last_updated_action_at?: string | null
}

export interface FilterTab {
  id: string
  label: string
}

export interface FilterTabsConfig {
  home_filter_tabs: FilterTab[]
  explore_filter_tabs: FilterTab[]
}

export interface AboutValueItem {
  emoji: string
  title: string
  description: string
}

export interface AboutTeamMember {
  name: string
  role: string
  description: string
}

export interface AboutFaqItem {
  question: string
  answer: string
}

export interface AboutContent {
  hero_title: string
  hero_highlight: string
  hero_description: string
  contact_email: string
  values: AboutValueItem[]
  team_members: AboutTeamMember[]
  faqs: AboutFaqItem[]
  updated_at?: string
}

export interface PageSeo {
  metaTitle: string
  metaDescription: string
  ogImage?: string | null
}

export interface PageBlock {
  id: string
  type: "hero" | "rich_text" | "image" | "cta" | "faq" | "gallery" | "feature_list"
  order: number
  visible: boolean
  content: Record<string, unknown>
  style?: Record<string, unknown>
}

export interface PageDocument {
  pageId: string
  status: "draft" | "published"
  version: number
  title: string
  seo: PageSeo
  blocks: PageBlock[]
  updatedBy: string
  updatedAt: string
}

export interface AdminPageDraftResponse {
  pageId: string
  baseVersion: number
  publishedVersion: number
  document: PageDocument
}

export interface AdminPageVersionListItem {
  page_id: string
  version: number
  status: "draft" | "published"
  reason?: string | null
  created_by?: string | null
  created_at: string
}

export interface AdminPageVersionDetail {
  pageId: string
  version: number
  status: "draft" | "published"
  reason?: string | null
  createdBy?: string | null
  createdAt: string
  document: PageDocument
}

export interface AdminPageVersionCompareChange {
  kind: "block_added" | "block_removed" | "block_reordered" | "field_changed"
  block_id: string
  message: string
  from?: unknown
  to?: unknown
}

export interface AdminPageVersionCompareResponse {
  pageId: string
  fromVersion: number
  toVersion: number
  changes: AdminPageVersionCompareChange[]
  summary: {
    total: number
    added: number
    removed: number
    reordered: number
    field_changed: number
  }
}

export interface AdminOAuthSettings {
  google_oauth_enabled: boolean
  google_redirect_uri: string
  google_frontend_redirect_uri: string
}

export interface AdminOAuthHealth extends AdminOAuthSettings {
  has_client_id: boolean
  has_client_secret: boolean
  is_ready: boolean
}

export interface AdminWeeklyTrendPoint {
  day: string
  new_users: number
  new_projects: number
}

export interface AdminStats {
  total_users: number
  total_projects: number
  open_reports: number
  pending_user_approvals: number
  users_this_week: number
  users_last_week: number
  projects_this_week: number
  projects_last_week: number
  users_week_delta: number
  projects_week_delta: number
  weekly_trend: AdminWeeklyTrendPoint[]
}

export type AdminReportsResponse = { items: Report[]; total: number }
export type AdminListResponse<T> = { items: T[] }
export type ProjectsResponse = { items: Project[] }
export type CuratedContentResponse = { items: CuratedContent[]; total?: number }
export type CommentsResponse = { items: Comment[] }
export type ProfileCommentsResponse = { items: ProfileComment[] }
export type { User }
