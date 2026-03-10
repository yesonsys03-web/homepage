from __future__ import annotations

from typing import Literal, Optional, TypedDict

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    title: str
    summary: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    demo_url: Optional[str] = None
    repo_url: Optional[str] = None
    platform: str = "web"
    tags: list[str] = []


class ProjectUpdateRequest(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    demo_url: Optional[str] = None
    repo_url: Optional[str] = None
    platform: Optional[str] = None
    tags: Optional[list[str]] = None


class CommentCreate(BaseModel):
    content: str


class ReportCreate(BaseModel):
    target_type: str
    target_id: str
    reason: str
    memo: Optional[str] = None


class ErrorTranslateRequest(BaseModel):
    error_message: str


class ErrorTranslateFeedbackRequest(BaseModel):
    error_hash: str
    solved: bool


class TextTranslateRequest(BaseModel):
    input_text: str


class GlossaryTermRequestCreate(BaseModel):
    requested_term: str
    context_note: Optional[str] = None


class RegisterRequest(BaseModel):
    email: str
    nickname: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    nickname: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserContext"


class OAuthCodeExchangeRequest(BaseModel):
    oauth_code: str


class UserContext(TypedDict):
    id: str
    email: str
    nickname: str
    role: str
    status: str
    avatar_url: str | None
    bio: str | None


class AdminReportUpdateRequest(BaseModel):
    status: str
    reason: Optional[str] = None


class AdminUserLimitRequest(BaseModel):
    hours: int = 24
    reason: Optional[str] = None


class AdminUserDeleteScheduleRequest(BaseModel):
    days: int = 30
    reason: Optional[str] = None


class PolicyFilterTab(BaseModel):
    id: str
    label: str


class AdminPolicyUpdateRequest(BaseModel):
    blocked_keywords: list[str]
    auto_hide_report_threshold: int
    home_filter_tabs: Optional[list[PolicyFilterTab]] = None
    explore_filter_tabs: Optional[list[PolicyFilterTab]] = None
    admin_log_retention_days: Optional[int] = None
    admin_log_view_window_days: Optional[int] = None
    admin_log_mask_reasons: Optional[bool] = None
    page_editor_enabled: Optional[bool] = None
    page_editor_rollout_stage: Optional[Literal["qa", "pilot", "open"]] = None
    page_editor_pilot_admin_ids: Optional[list[str]] = None
    page_editor_publish_fail_rate_threshold: Optional[float] = None
    page_editor_rollback_ratio_threshold: Optional[float] = None
    page_editor_conflict_rate_threshold: Optional[float] = None
    curated_review_quality_threshold: Optional[int] = None
    curated_related_click_boost_min_relevance: Optional[int] = None
    curated_related_click_boost_multiplier: Optional[int] = None
    curated_related_click_boost_cap: Optional[int] = None


class AdminOAuthSettingsUpdateRequest(BaseModel):
    google_oauth_enabled: bool
    google_redirect_uri: Optional[str] = None
    google_frontend_redirect_uri: Optional[str] = None


class AdminProjectUpdateRequest(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    demo_url: Optional[str] = None
    repo_url: Optional[str] = None
    platform: Optional[str] = None
    tags: Optional[list[str]] = None
    status: Optional[str] = None
    reason: Optional[str] = None


class AdminActionReasonRequest(BaseModel):
    reason: Optional[str] = None


class AdminUserRoleUpdateRequest(BaseModel):
    role: Literal["user", "admin"]
    reason: Optional[str] = None


class AboutValueItem(BaseModel):
    emoji: str
    title: str
    description: str


class AboutTeamMember(BaseModel):
    name: str
    role: str
    description: str


class AboutFaqItem(BaseModel):
    question: str
    answer: str


class AboutContentUpdateRequest(BaseModel):
    hero_title: str
    hero_highlight: str
    hero_description: str
    contact_email: str
    values: list[AboutValueItem]
    team_members: list[AboutTeamMember]
    faqs: list[AboutFaqItem]
    reason: Optional[str] = None


class PageSeoPayload(BaseModel):
    metaTitle: str
    metaDescription: str
    ogImage: Optional[str] = None


class PageBlockPayload(BaseModel):
    id: str
    type: Literal[
        "hero",
        "rich_text",
        "image",
        "cta",
        "faq",
        "gallery",
        "feature_list",
    ]
    order: int
    visible: bool
    content: dict[str, object]
    style: Optional[dict[str, object]] = None


class PageDocumentPayload(BaseModel):
    pageId: str
    status: Literal["draft", "published"]
    version: int
    title: str
    seo: PageSeoPayload
    blocks: list[PageBlockPayload]
    updatedBy: str
    updatedAt: str


class AdminPageDraftUpdateRequest(BaseModel):
    baseVersion: int
    document: PageDocumentPayload
    reason: Optional[str] = None
    source: Literal["manual", "auto"] = "manual"


class AdminPagePublishRequest(BaseModel):
    reason: Optional[str] = None
    draftVersion: Optional[int] = None


class AdminPagePublishScheduleCreateRequest(BaseModel):
    publishAt: str
    timezone: Optional[str] = "Asia/Seoul"
    reason: Optional[str] = None
    draftVersion: Optional[int] = None


class AdminPagePublishScheduleActionRequest(BaseModel):
    reason: Optional[str] = None


class AdminPagePublishScheduleProcessRequest(BaseModel):
    limit: int = 20
    reason: Optional[str] = None


class AdminPageRollbackRequest(BaseModel):
    targetVersion: int
    reason: Optional[str] = None
    publishNow: bool = False


class AdminPageMigrationExecuteRequest(BaseModel):
    reason: Optional[str] = None
    dryRun: bool = False


class AdminPageMigrationRestoreRequest(BaseModel):
    backupKey: str
    reason: Optional[str] = None
    dryRun: bool = False


class AdminPagePerfEventRequest(BaseModel):
    pageId: str
    scenario: Literal[
        "editor_initial_load",
        "preview_switch",
        "draft_save_roundtrip",
        "panel_canvas_roundtrip_count",
        "edit_completion_time",
        "editor_scroll_distance",
    ]
    durationMs: float
    source: Optional[str] = None
