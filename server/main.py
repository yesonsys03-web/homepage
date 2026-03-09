# pyright: reportUnknownVariableType=false, reportUnknownArgumentType=false, reportUnknownMemberType=false, reportUnknownParameterType=false, reportUnknownLambdaType=false, reportCallInDefaultInitializer=false, reportDeprecated=false, reportMissingImports=false

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import RedirectResponse, Response
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import (
    Awaitable,
    AsyncIterator,
    Callable,
    Literal,
    Optional,
    Mapping,
    Protocol,
    Sequence,
    TypedDict,
    cast,
)
from datetime import datetime, timedelta, timezone
import asyncio
import logging
import re
import sys
import unicodedata
import time
import os
import json
import hashlib
import secrets
import uuid
from xml.sax.saxutils import escape as xml_escape
from urllib.parse import urlparse, urlencode, quote
from urllib.request import Request as UrlRequest, urlopen
from threading import Lock
from contextlib import asynccontextmanager
from collections import deque

# === SECTION: IMPORTS_AND_ROUTE_MODULES ===

from db import (
    init_db,
    get_projects,
    get_project,
    create_project,
    like_project,
    unlike_project,
    anon_clap_project,
    get_comments,
    create_comment,
    report_comment,
    get_reports,
    get_reports_count,
    get_admin_stats,
    update_report,
    create_user,
    create_or_update_google_user,
    get_user_by_email,
    get_user_by_provider,
    get_user_by_nickname,
    get_user_by_id,
    update_user_profile,
    bootstrap_super_admin_user,
    get_user_projects,
    get_user_comments,
    get_user_liked_projects,
    get_admin_projects,
    update_project_admin,
    update_project_owner_fields,
    set_project_status,
    create_admin_action_log,
    get_admin_action_logs,
    get_admin_action_observability,
    cleanup_admin_action_logs,
    get_latest_policy_update_action,
    get_admin_users,
    limit_user,
    unlimit_user,
    suspend_user,
    unsuspend_user,
    revoke_user_tokens,
    schedule_user_deletion,
    cancel_user_deletion,
    delete_user_now,
    purge_due_user_deletions,
    approve_user,
    reject_user,
    set_user_role,
    get_moderation_settings,
    update_moderation_settings,
    get_oauth_runtime_settings,
    update_oauth_runtime_settings,
    create_oauth_state_token,
    consume_oauth_state_token,
    cleanup_oauth_state_tokens,
    get_site_content,
    upsert_site_content,
    list_site_contents_by_prefix,
    get_page_document_draft,
    save_page_document_draft,
    publish_page_document,
    list_page_document_versions,
    get_page_document_version,
    rollback_page_document,
    create_page_publish_schedule,
    list_page_publish_schedules,
    cancel_page_publish_schedule,
    retry_page_publish_schedule,
    list_due_page_publish_schedules,
    mark_page_publish_schedule_published,
    mark_page_publish_schedule_failed,
    list_curated_content,
    get_curated_content_count,
    get_curated_content_by_id,
    list_admin_curated_content,
    get_admin_curated_content_count,
    create_or_update_curated_content,
    update_curated_content_admin,
    delete_curated_content,
    get_error_solution,
    upsert_error_solution,
    get_text_translation,
    upsert_text_translation,
    increment_error_solution_feedback,
    create_glossary_term_request,
    create_curated_related_click,
    get_curated_related_click_counts_for_source,
    get_curated_related_click_summary,
)
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_token,
)
from scheduler import cancel_background_task, run_periodic_async_loop
from github_collector import (
    GitHubCollectorConfig,
    build_search_query,
    fetch_github_readme_excerpt,
    fetch_github_license_file,
    normalize_github_repo_url,
    reached_daily_collect_limit,
    search_github_repositories,
)
from gemini_curator import (
    CurationEvaluation,
    QualityInputs,
    ThreeLevelSummary,
    calc_quality_score,
    curate_repository_with_gemini,
    fallback_summary_template,
    heuristic_curation_evaluation,
    summarize_repository_without_llm,
    should_auto_reject,
)
from curated_reasons import (
    CURATED_REASON_CATEGORY_MATCH,
    CURATED_REASON_CONTEXTUAL_MATCH,
    CURATED_REASON_HIGH_QUALITY,
    CURATED_REASON_KOREAN_DEV_MATCH,
    CURATED_REASON_LANGUAGE_MATCH,
    CURATED_REASON_RECENT_UPDATE,
    CURATED_REASON_TAG_OVERLAP,
    CURATED_REASON_UNKNOWN,
    format_curated_reason_label,
    get_curated_reason_label,
    normalize_curated_reason_code,
)
from translation import (
    build_error_solution_fallback,
    build_text_translation_fallback,
    contains_prompt_injection,
    extract_gemini_text,
    find_related_glossary_terms,
    translate_text_with_gemini,
)

try:
    from about_content_service import (
        build_page_document_from_about_content as _build_page_document_from_about_content,
        build_page_migration_preview as _build_page_migration_preview,
        execute_page_migration as _execute_page_migration,
        extract_about_content_from_page_document as _extract_about_content_from_page_document,
        get_about_content_payload as _get_about_content_payload,
        list_page_migration_backups as _list_page_migration_backups,
        page_action_target_id as _page_action_target_id,
        parse_schedule_publish_at,
        restore_page_migration_backup as _restore_page_migration_backup,
        serialize_publish_schedule,
    )
    from app_config import (
        ABOUT_CONTENT_DEFAULT,
        ABOUT_CONTENT_KEY,
        ABOUT_CONTENT_TARGET_ID,
        ADMIN_ALLOWED_ROLES,
        ADMIN_LOG_CLEANUP_INTERVAL_SECONDS,
        ALLOWED_ORIGINS,
        DAILY_COLLECT_LIMIT,
        DEFAULT_ADMIN_LOG_RETENTION_DAYS,
        DEFAULT_ADMIN_LOG_VIEW_WINDOW_DAYS,
        DEFAULT_EXPLORE_FILTER_TABS,
        DEFAULT_HOME_FILTER_TABS,
        DEFAULT_PAGE_EDITOR_CONFLICT_RATE_THRESHOLD,
        DEFAULT_PAGE_EDITOR_PUBLISH_FAIL_RATE_THRESHOLD,
        DEFAULT_PAGE_EDITOR_ROLLBACK_RATIO_THRESHOLD,
        DEFAULT_PAGE_EDITOR_ROLLOUT_STAGE,
        ENFORCE_HTTPS,
        ERROR_TRANSLATE_IP_LIMIT_PER_MINUTE,
        GEMINI_API_KEY,
        GEMINI_MODEL,
        GITHUB_MIN_STARS,
        GITHUB_README_EXCERPT_MAX_CHARS,
        GITHUB_SEARCH_TOPICS,
        GITHUB_TOKEN,
        GLOSSARY_TERM_REQUEST_IP_LIMIT_PER_HOUR,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_FRONTEND_REDIRECT_URI,
        GOOGLE_OAUTH_STATE_TTL_SECONDS,
        GOOGLE_REDIRECT_URI,
        LOGIN_ACCOUNT_LIMIT_PER_HOUR,
        LOGIN_IP_LIMIT_PER_MINUTE,
        PROFILE_BIO_MAX_LEN,
        PROFILE_NICKNAME_MAX_LEN,
        PROFILE_NICKNAME_MIN_LEN,
        PUBLIC_BASE_URL,
        REGISTER_IP_LIMIT_PER_HOUR,
        SUPER_ADMIN_BOOTSTRAP_EMAIL,
        SYSTEM_ADMIN_USER_ID,
        TEXT_TRANSLATE_IP_LIMIT_PER_MINUTE,
        BASELINE_BLOCKED_KEYWORD_CATEGORIES,
        STARS_REFRESH_INTERVAL_SECONDS,
    )
    from stars_refresher import refresh_stars_for_approved_content as _refresh_stars
    from api_models import (
        AboutContentUpdateRequest,
        AboutFaqItem,
        AboutTeamMember,
        AboutValueItem,
        AdminActionReasonRequest,
        AdminOAuthSettingsUpdateRequest,
        AdminPageDraftUpdateRequest,
        AdminPageMigrationExecuteRequest,
        AdminPageMigrationRestoreRequest,
        AdminPagePerfEventRequest,
        AdminPagePublishRequest,
        AdminPagePublishScheduleActionRequest,
        AdminPagePublishScheduleCreateRequest,
        AdminPagePublishScheduleProcessRequest,
        AdminPageRollbackRequest,
        AdminPolicyUpdateRequest,
        AdminProjectUpdateRequest,
        AdminReportUpdateRequest,
        AdminUserDeleteScheduleRequest,
        AdminUserLimitRequest,
        AdminUserRoleUpdateRequest,
        CommentCreate,
        ErrorTranslateFeedbackRequest,
        ErrorTranslateRequest,
        GlossaryTermRequestCreate,
        LoginRequest,
        OAuthCodeExchangeRequest,
        PageBlockPayload,
        PageDocumentPayload,
        PageSeoPayload,
        PolicyFilterTab,
        ProfileUpdateRequest,
        ProjectCreate,
        ProjectUpdateRequest,
        RegisterRequest,
        ReportCreate,
        TextTranslateRequest,
        TokenResponse,
        UserContext,
    )
    from admin_operations_routes import register_admin_operations_routes
    from about_content_routes import register_about_content_routes
    from admin_page_editor_routes import register_admin_page_editor_routes
    from admin_policy_routes import register_admin_policy_routes
    from auth_routes import register_auth_routes
    from curated_defs import (
        AUTO_CURATED_COLLECTION_ENABLED,
        AUTO_CURATED_COLLECTION_INTERVAL_SECONDS,
        AUTO_CURATED_COLLECTION_MIN_INTERVAL_SECONDS,
        AUTO_CURATED_COLLECTION_RUN_ON_STARTUP,
        CURATED_RELATED_CLICK_BOOST_CAP,
        CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE,
        CURATED_RELATED_CLICK_BOOST_MIN_TAG_OVERLAP,
        CURATED_RELATED_CLICK_BOOST_MULTIPLIER,
        CURATED_RELATED_CLICK_BOOST_WINDOW_DAYS,
        CURATED_RELATED_CLICK_DEDUPE_WINDOW_SECONDS,
        CURATED_RELATED_CLICK_FALLBACK_LOG_WINDOW_SECONDS,
        CURATED_RELATED_CLICK_IP_LIMIT_PER_MINUTE,
        CURATED_REVIEW_QUEUE_STATUSES,
        CURATED_STATUS_APPROVED,
        CURATED_STATUS_AUTO_REJECTED,
        CURATED_STATUS_PENDING,
        CURATED_STATUS_REJECTED,
        CURATED_STATUS_REVIEW_DUPLICATE,
        CURATED_STATUS_REVIEW_LICENSE,
        CURATED_STATUS_REVIEW_QUALITY,
        CuratedAdminUpdateRequest,
        CuratedDuplicateReviewMetadata,
        CuratedReasonPayload,
        CuratedRelatedClickCreate,
        CuratedRelatedListItem,
        DEFAULT_CURATED_RELATED_CLICK_BOOST_CAP,
        DEFAULT_CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE,
        DEFAULT_CURATED_RELATED_CLICK_BOOST_MULTIPLIER,
        DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD,
    )
    from curated_runtime import (
        get_curated_collection_task,
        get_last_curated_related_click_fallback_warning_at,
        get_stars_refresh_task,
        set_curated_collection_task,
        set_last_curated_related_click_fallback_warning_at,
        set_stars_refresh_task,
    )
    from curated_settings import (
        curated_moderation_settings_changed,
        get_curated_runtime_settings as _get_curated_runtime_settings,
        normalize_curated_moderation_settings,
        resolve_curated_moderation_settings,
    )
    from moderation_settings import (
        ensure_baseline_moderation_settings as _ensure_baseline_moderation_settings,
        get_effective_moderation_settings as _get_effective_moderation_settings,
        general_moderation_settings_changed,
        normalize_general_moderation_settings,
        resolve_general_moderation_update,
    )
    from shared_utils import (
        build_page_document_diff,
        build_policy_update_log_metadata,
        collect_page_document_issues,
        coerce_policy_metadata_value as _coerce_policy_metadata_value,
        extract_block_core_fields,
        get_effective_blocked_keywords as _get_effective_blocked_keywords,
        is_valid_http_url,
        normalize_filter_tabs,
        normalize_keyword_list,
        normalize_positive_int,
        normalize_ratio,
        normalize_rollout_stage,
        normalize_text_for_filter,
        safe_int,
        text_contains_blocked_keyword,
        to_json_compatible,
    )
    from curated_routes import register_curated_routes
    from curated_service import bind_curated_service
    from public_api_routes import register_public_api_routes
    from showcase_clap_routes import register_showcase_clap_routes
    from translation_routes import register_translation_routes
except ImportError:
    from .about_content_service import (
        build_page_document_from_about_content as _build_page_document_from_about_content,
        build_page_migration_preview as _build_page_migration_preview,
        execute_page_migration as _execute_page_migration,
        extract_about_content_from_page_document as _extract_about_content_from_page_document,
        get_about_content_payload as _get_about_content_payload,
        list_page_migration_backups as _list_page_migration_backups,
        page_action_target_id as _page_action_target_id,
        parse_schedule_publish_at,
        restore_page_migration_backup as _restore_page_migration_backup,
        serialize_publish_schedule,
    )
    from .app_config import (
        ABOUT_CONTENT_DEFAULT,
        ABOUT_CONTENT_KEY,
        ABOUT_CONTENT_TARGET_ID,
        ADMIN_ALLOWED_ROLES,
        ADMIN_LOG_CLEANUP_INTERVAL_SECONDS,
        ALLOWED_ORIGINS,
        DAILY_COLLECT_LIMIT,
        DEFAULT_ADMIN_LOG_RETENTION_DAYS,
        DEFAULT_ADMIN_LOG_VIEW_WINDOW_DAYS,
        DEFAULT_EXPLORE_FILTER_TABS,
        DEFAULT_HOME_FILTER_TABS,
        DEFAULT_PAGE_EDITOR_CONFLICT_RATE_THRESHOLD,
        DEFAULT_PAGE_EDITOR_PUBLISH_FAIL_RATE_THRESHOLD,
        DEFAULT_PAGE_EDITOR_ROLLBACK_RATIO_THRESHOLD,
        DEFAULT_PAGE_EDITOR_ROLLOUT_STAGE,
        ENFORCE_HTTPS,
        ERROR_TRANSLATE_IP_LIMIT_PER_MINUTE,
        GEMINI_API_KEY,
        GEMINI_MODEL,
        GITHUB_MIN_STARS,
        GITHUB_README_EXCERPT_MAX_CHARS,
        GITHUB_SEARCH_TOPICS,
        GITHUB_TOKEN,
        GLOSSARY_TERM_REQUEST_IP_LIMIT_PER_HOUR,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_FRONTEND_REDIRECT_URI,
        GOOGLE_OAUTH_STATE_TTL_SECONDS,
        GOOGLE_REDIRECT_URI,
        LOGIN_ACCOUNT_LIMIT_PER_HOUR,
        LOGIN_IP_LIMIT_PER_MINUTE,
        PROFILE_BIO_MAX_LEN,
        PROFILE_NICKNAME_MAX_LEN,
        PROFILE_NICKNAME_MIN_LEN,
        PUBLIC_BASE_URL,
        REGISTER_IP_LIMIT_PER_HOUR,
        SUPER_ADMIN_BOOTSTRAP_EMAIL,
        SYSTEM_ADMIN_USER_ID,
        TEXT_TRANSLATE_IP_LIMIT_PER_MINUTE,
        BASELINE_BLOCKED_KEYWORD_CATEGORIES,
        STARS_REFRESH_INTERVAL_SECONDS,
    )
    from .stars_refresher import refresh_stars_for_approved_content as _refresh_stars
    from .api_models import (
        AboutContentUpdateRequest,
        AboutFaqItem,
        AboutTeamMember,
        AboutValueItem,
        AdminActionReasonRequest,
        AdminOAuthSettingsUpdateRequest,
        AdminPageDraftUpdateRequest,
        AdminPageMigrationExecuteRequest,
        AdminPageMigrationRestoreRequest,
        AdminPagePerfEventRequest,
        AdminPagePublishRequest,
        AdminPagePublishScheduleActionRequest,
        AdminPagePublishScheduleCreateRequest,
        AdminPagePublishScheduleProcessRequest,
        AdminPageRollbackRequest,
        AdminPolicyUpdateRequest,
        AdminProjectUpdateRequest,
        AdminReportUpdateRequest,
        AdminUserDeleteScheduleRequest,
        AdminUserLimitRequest,
        AdminUserRoleUpdateRequest,
        CommentCreate,
        ErrorTranslateFeedbackRequest,
        ErrorTranslateRequest,
        GlossaryTermRequestCreate,
        LoginRequest,
        OAuthCodeExchangeRequest,
        PageBlockPayload,
        PageDocumentPayload,
        PageSeoPayload,
        PolicyFilterTab,
        ProfileUpdateRequest,
        ProjectCreate,
        ProjectUpdateRequest,
        RegisterRequest,
        ReportCreate,
        TextTranslateRequest,
        TokenResponse,
        UserContext,
    )
    from .admin_operations_routes import register_admin_operations_routes
    from .about_content_routes import register_about_content_routes
    from .admin_page_editor_routes import register_admin_page_editor_routes
    from .admin_policy_routes import register_admin_policy_routes
    from .auth_routes import register_auth_routes
    from .curated_defs import (
        AUTO_CURATED_COLLECTION_ENABLED,
        AUTO_CURATED_COLLECTION_INTERVAL_SECONDS,
        AUTO_CURATED_COLLECTION_MIN_INTERVAL_SECONDS,
        AUTO_CURATED_COLLECTION_RUN_ON_STARTUP,
        CURATED_RELATED_CLICK_BOOST_CAP,
        CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE,
        CURATED_RELATED_CLICK_BOOST_MIN_TAG_OVERLAP,
        CURATED_RELATED_CLICK_BOOST_MULTIPLIER,
        CURATED_RELATED_CLICK_BOOST_WINDOW_DAYS,
        CURATED_RELATED_CLICK_DEDUPE_WINDOW_SECONDS,
        CURATED_RELATED_CLICK_FALLBACK_LOG_WINDOW_SECONDS,
        CURATED_RELATED_CLICK_IP_LIMIT_PER_MINUTE,
        CURATED_REVIEW_QUEUE_STATUSES,
        CURATED_STATUS_APPROVED,
        CURATED_STATUS_AUTO_REJECTED,
        CURATED_STATUS_PENDING,
        CURATED_STATUS_REJECTED,
        CURATED_STATUS_REVIEW_DUPLICATE,
        CURATED_STATUS_REVIEW_LICENSE,
        CURATED_STATUS_REVIEW_QUALITY,
        CuratedAdminUpdateRequest,
        CuratedDuplicateReviewMetadata,
        CuratedReasonPayload,
        CuratedRelatedClickCreate,
        CuratedRelatedListItem,
        DEFAULT_CURATED_RELATED_CLICK_BOOST_CAP,
        DEFAULT_CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE,
        DEFAULT_CURATED_RELATED_CLICK_BOOST_MULTIPLIER,
        DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD,
    )
    from .curated_runtime import (
        get_curated_collection_task,
        get_last_curated_related_click_fallback_warning_at,
        get_stars_refresh_task,
        set_curated_collection_task,
        set_last_curated_related_click_fallback_warning_at,
        set_stars_refresh_task,
    )
    from .curated_settings import (
        curated_moderation_settings_changed,
        get_curated_runtime_settings as _get_curated_runtime_settings,
        normalize_curated_moderation_settings,
        resolve_curated_moderation_settings,
    )
    from .moderation_settings import (
        ensure_baseline_moderation_settings as _ensure_baseline_moderation_settings,
        get_effective_moderation_settings as _get_effective_moderation_settings,
        general_moderation_settings_changed,
        normalize_general_moderation_settings,
        resolve_general_moderation_update,
    )
    from .shared_utils import (
        build_page_document_diff,
        build_policy_update_log_metadata,
        collect_page_document_issues,
        coerce_policy_metadata_value as _coerce_policy_metadata_value,
        extract_block_core_fields,
        get_effective_blocked_keywords as _get_effective_blocked_keywords,
        is_valid_http_url,
        normalize_filter_tabs,
        normalize_keyword_list,
        normalize_positive_int,
        normalize_ratio,
        normalize_rollout_stage,
        normalize_text_for_filter,
        safe_int,
        text_contains_blocked_keyword,
        to_json_compatible,
    )
    from .curated_routes import register_curated_routes
    from .curated_service import bind_curated_service
    from .public_api_routes import register_public_api_routes
    from .showcase_clap_routes import register_showcase_clap_routes
    from .translation_routes import register_translation_routes

logger = logging.getLogger(__name__)


# === SECTION: APP_LIFECYCLE_AND_MIDDLEWARE ===


async def startup_event() -> None:
    await _startup_event_impl()


async def shutdown_event() -> None:
    await _shutdown_event_impl()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    _ = app
    await startup_event()
    try:
        yield
    finally:
        await shutdown_event()


app = FastAPI(title="VibeCoder Playground API", lifespan=lifespan)


@app.middleware("http")
async def enforce_https_and_security_headers(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
):
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip()
    request_scheme = str(request.scope.get("scheme") or "http")
    request_is_https = request_scheme == "https" or forwarded_proto == "https"

    if ENFORCE_HTTPS and not request_is_https:
        host = request.headers.get("host", "localhost")
        secure_url = f"https://{host}{request.url.path}"
        if request.url.query:
            secure_url = f"{secure_url}?{request.url.query}"
        return RedirectResponse(url=secure_url, status_code=307)

    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://localhost:5173 http://127.0.0.1:5173",
    )
    if ENFORCE_HTTPS or request_is_https:
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    return response


PROJECT_LIST_CACHE_TTL_SECONDS = 12.0
PROJECT_PERF_WINDOW_SIZE = 300
PAGE_EDITOR_PERF_WINDOW_SIZE = 500
_project_list_cache: dict[
    tuple[str, Optional[str], Optional[str]], tuple[float, list[dict[str, object]]]
] = {}
_project_list_cache_lock = Lock()
_project_perf_samples: deque[tuple[float, float, int]] = deque(
    maxlen=PROJECT_PERF_WINDOW_SIZE
)
_project_perf_lock = Lock()
_page_editor_perf_samples: deque[tuple[str, float, str]] = deque(
    maxlen=PAGE_EDITOR_PERF_WINDOW_SIZE
)
_page_editor_perf_lock = Lock()


def _project_cache_key(
    sort: str, platform: Optional[str], tag: Optional[str]
) -> tuple[str, Optional[str], Optional[str]]:
    return (sort, platform, tag)


def _get_cached_projects(
    sort: str, platform: Optional[str], tag: Optional[str]
) -> Optional[list[dict[str, object]]]:
    now = time.perf_counter()
    key = _project_cache_key(sort, platform, tag)
    with _project_list_cache_lock:
        cached = _project_list_cache.get(key)
        if not cached:
            return None
        expires_at, items = cached
        if expires_at <= now:
            _ = _project_list_cache.pop(key, None)
            return None
        return [dict(item) for item in items]


def _set_cached_projects(
    sort: str,
    platform: Optional[str],
    tag: Optional[str],
    items: Sequence[Mapping[str, object]],
) -> None:
    key = _project_cache_key(sort, platform, tag)
    expires_at = time.perf_counter() + PROJECT_LIST_CACHE_TTL_SECONDS
    with _project_list_cache_lock:
        _project_list_cache[key] = (expires_at, [dict(item) for item in items])


def _invalidate_projects_cache() -> None:
    with _project_list_cache_lock:
        _project_list_cache.clear()


def _percentile(values: list[float], ratio: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = round((len(ordered) - 1) * ratio)
    index = min(max(index, 0), len(ordered) - 1)
    return ordered[index]


def _record_project_perf(elapsed_ms: float, db_ms: float, cache_hit: bool) -> None:
    with _project_perf_lock:
        _project_perf_samples.append((elapsed_ms, db_ms, 1 if cache_hit else 0))


def _project_perf_snapshot() -> dict[str, object]:
    with _project_perf_lock:
        samples = list(_project_perf_samples)

    if not samples:
        return {
            "window_size": PROJECT_PERF_WINDOW_SIZE,
            "sample_count": 0,
            "cache_hit_rate": 0.0,
            "elapsed_ms_p50": 0.0,
            "elapsed_ms_p95": 0.0,
            "db_ms_p50": 0.0,
            "db_ms_p95": 0.0,
        }

    elapsed_values = [row[0] for row in samples]
    db_values = [row[1] for row in samples if row[2] == 0]
    cache_hit_rate = sum(row[2] for row in samples) / len(samples)

    return {
        "window_size": PROJECT_PERF_WINDOW_SIZE,
        "sample_count": len(samples),
        "cache_hit_rate": round(cache_hit_rate, 4),
        "elapsed_ms_p50": round(_percentile(elapsed_values, 0.5), 2),
        "elapsed_ms_p95": round(_percentile(elapsed_values, 0.95), 2),
        "db_ms_p50": round(_percentile(db_values, 0.5), 2),
        "db_ms_p95": round(_percentile(db_values, 0.95), 2),
    }


PAGE_EDITOR_PERF_SCENARIOS: set[str] = {
    "editor_initial_load",
    "preview_switch",
    "draft_save_roundtrip",
    "panel_canvas_roundtrip_count",
    "edit_completion_time",
    "editor_scroll_distance",
}

PAGE_EDITOR_PERF_SLO_P75_MS: dict[str, float] = {
    "editor_initial_load": 2500.0,
    "draft_save_roundtrip": 800.0,
    "preview_switch": 500.0,
    "panel_canvas_roundtrip_count": 6.0,
    "edit_completion_time": 180000.0,
    "editor_scroll_distance": 6000.0,
}


def _record_page_editor_perf(
    scenario: str,
    duration_ms: float,
    source: Optional[str] = None,
) -> None:
    with _page_editor_perf_lock:
        _page_editor_perf_samples.append((scenario, duration_ms, str(source or "")))


def _parse_perf_source_tags(source: str) -> dict[str, str]:
    tags: dict[str, str] = {}
    for segment in source.split(";"):
        item = segment.strip()
        if not item or "=" not in item:
            continue
        key, value = item.split("=", 1)
        tag_key = key.strip()
        tag_value = value.strip()
        if tag_key and tag_value:
            tags[tag_key] = tag_value
    return tags


def _resolve_editor_ui_variant(source: str) -> str:
    tags = _parse_perf_source_tags(source)
    variant = tags.get("ui_variant", "").strip().lower()
    if variant in {"enhanced", "baseline"}:
        return variant
    return "baseline"


def _page_editor_perf_snapshot() -> dict[str, object]:
    with _page_editor_perf_lock:
        samples = list(_page_editor_perf_samples)

    if not samples:
        return {
            "window_size": PAGE_EDITOR_PERF_WINDOW_SIZE,
            "sample_count": 0,
            "metrics": {
                scenario: {
                    "sample_count": 0,
                    "p75_ms": 0.0,
                    "p95_ms": 0.0,
                    "slo_p75_ms": PAGE_EDITOR_PERF_SLO_P75_MS[scenario],
                    "within_slo": True,
                }
                for scenario in sorted(PAGE_EDITOR_PERF_SCENARIOS)
            },
            "variants": {
                "baseline": {
                    "sample_count": 0,
                    "metrics": {
                        scenario: {
                            "sample_count": 0,
                            "p75_ms": 0.0,
                            "p95_ms": 0.0,
                            "slo_p75_ms": PAGE_EDITOR_PERF_SLO_P75_MS[scenario],
                            "within_slo": True,
                        }
                        for scenario in sorted(PAGE_EDITOR_PERF_SCENARIOS)
                    },
                },
                "enhanced": {
                    "sample_count": 0,
                    "metrics": {
                        scenario: {
                            "sample_count": 0,
                            "p75_ms": 0.0,
                            "p95_ms": 0.0,
                            "slo_p75_ms": PAGE_EDITOR_PERF_SLO_P75_MS[scenario],
                            "within_slo": True,
                        }
                        for scenario in sorted(PAGE_EDITOR_PERF_SCENARIOS)
                    },
                },
            },
        }

    metrics: dict[str, dict[str, object]] = {}
    for scenario in sorted(PAGE_EDITOR_PERF_SCENARIOS):
        durations = [row[1] for row in samples if row[0] == scenario]
        p75_ms = round(_percentile(durations, 0.75), 2)
        p95_ms = round(_percentile(durations, 0.95), 2)
        slo_p75_ms = PAGE_EDITOR_PERF_SLO_P75_MS[scenario]
        metrics[scenario] = {
            "sample_count": len(durations),
            "p75_ms": p75_ms,
            "p95_ms": p95_ms,
            "slo_p75_ms": slo_p75_ms,
            "within_slo": p75_ms <= slo_p75_ms,
        }

    variants: dict[str, dict[str, object]] = {
        "baseline": {"sample_count": 0, "metrics": {}},
        "enhanced": {"sample_count": 0, "metrics": {}},
    }

    for variant in ("baseline", "enhanced"):
        variant_samples = [
            row for row in samples if _resolve_editor_ui_variant(row[2]) == variant
        ]
        variants[variant]["sample_count"] = len(variant_samples)

        variant_metric_map: dict[str, dict[str, object]] = {}
        for scenario in sorted(PAGE_EDITOR_PERF_SCENARIOS):
            durations = [row[1] for row in variant_samples if row[0] == scenario]
            p75_ms = round(_percentile(durations, 0.75), 2)
            p95_ms = round(_percentile(durations, 0.95), 2)
            slo_p75_ms = PAGE_EDITOR_PERF_SLO_P75_MS[scenario]
            variant_metric_map[scenario] = {
                "sample_count": len(durations),
                "p75_ms": p75_ms,
                "p95_ms": p95_ms,
                "slo_p75_ms": slo_p75_ms,
                "within_slo": p75_ms <= slo_p75_ms,
            }
        variants[variant]["metrics"] = variant_metric_map

    return {
        "window_size": PAGE_EDITOR_PERF_WINDOW_SIZE,
        "sample_count": len(samples),
        "metrics": metrics,
        "variants": variants,
    }


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


_admin_log_cleanup_task: Optional[asyncio.Task[None]] = None
_RATE_LIMIT_BUCKETS: dict[str, deque[float]] = {}
_RATE_LIMIT_LOCK = Lock()


def build_user_context(user: Mapping[str, object]) -> UserContext:
    return {
        "id": str(user["id"]),
        "email": str(user["email"]),
        "nickname": str(user["nickname"]),
        "role": str(user["role"]),
        "status": str(user.get("status", "pending")),
        "avatar_url": cast(Optional[str], user.get("avatar_url")),
        "bio": cast(Optional[str], user.get("bio")),
    }


class _ReadableResponse(Protocol):
    def __enter__(self) -> "_ReadableResponse": ...
    def __exit__(self, exc_type: object, exc: object, tb: object) -> bool: ...
    def read(self) -> bytes: ...


def collect_page_document_issues(
    document: Mapping[str, object],
) -> dict[str, list[dict[str, str]]]:
    blocking: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []

    blocks_raw = document.get("blocks", [])
    blocks = cast(
        list[Mapping[str, object]], blocks_raw if isinstance(blocks_raw, list) else []
    )

    orders: list[int] = []
    for index, block in enumerate(blocks):
        order_raw = block.get("order")
        if not isinstance(order_raw, int):
            blocking.append(
                {
                    "field": f"blocks[{index}].order",
                    "message": "블록 order는 정수여야 합니다",
                }
            )
            continue
        orders.append(order_raw)
    if len(orders) != len(set(orders)):
        blocking.append(
            {
                "field": "blocks[*].order",
                "message": "블록 order 값이 중복되었습니다",
            }
        )

    for index, block in enumerate(blocks):
        block_type = str(block.get("type") or "")
        content = cast(Mapping[str, object], block.get("content") or {})
        visible = bool(block.get("visible", True))

        def _required(field_name: str, message: str) -> None:
            value = content.get(field_name)
            if isinstance(value, str):
                if value.strip():
                    return
            elif value is not None:
                return
            blocking.append(
                {
                    "field": f"blocks[{index}].content.{field_name}",
                    "message": message,
                }
            )

        if block_type == "hero":
            _required("headline", "Hero headline은 필수입니다")
            headline = str(content.get("headline") or "").strip()
            if len(headline) > 80:
                warnings.append(
                    {
                        "field": f"blocks[{index}].content.headline",
                        "message": "Hero headline 권장 길이(80자)를 초과했습니다",
                    }
                )
        elif block_type == "rich_text":
            if visible:
                _required("body", "RichText body는 필수입니다")
            body = str(content.get("body") or "").strip()
            if len(body) > 2000:
                warnings.append(
                    {
                        "field": f"blocks[{index}].content.body",
                        "message": "RichText body 권장 길이(2000자)를 초과했습니다",
                    }
                )
        elif block_type == "image":
            if visible:
                _required("src", "Image src는 필수입니다")
            src = str(content.get("src") or "").strip()
            if src and not is_valid_http_url(src):
                blocking.append(
                    {
                        "field": f"blocks[{index}].content.src",
                        "message": "Image src URL 형식이 올바르지 않습니다",
                    }
                )
            alt = str(content.get("alt") or "").strip()
            if src and not alt:
                warnings.append(
                    {
                        "field": f"blocks[{index}].content.alt",
                        "message": "이미지 alt 텍스트를 입력하는 것을 권장합니다",
                    }
                )
        elif block_type == "cta":
            if visible:
                _required("label", "CTA label은 필수입니다")
                _required("href", "CTA href는 필수입니다")
            href = str(content.get("href") or "").strip()
            if href and not is_valid_http_url(href):
                blocking.append(
                    {
                        "field": f"blocks[{index}].content.href",
                        "message": "CTA href URL 형식이 올바르지 않습니다",
                    }
                )
            label = str(content.get("label") or "").strip().lower()
            if label in {"click here", "more", "learn more", "여기", "자세히"}:
                warnings.append(
                    {
                        "field": f"blocks[{index}].content.label",
                        "message": "CTA 라벨을 더 구체적으로 작성하는 것을 권장합니다",
                    }
                )
        elif block_type == "feature_list":
            items_raw = content.get("items")
            if not isinstance(items_raw, list):
                blocking.append(
                    {
                        "field": f"blocks[{index}].content.items",
                        "message": "FeatureList items는 배열이어야 합니다",
                    }
                )
            elif visible and len(items_raw) == 0:
                warnings.append(
                    {
                        "field": f"blocks[{index}].content.items",
                        "message": "FeatureList 항목이 비어 있습니다",
                    }
                )
        elif block_type == "faq":
            items_raw = content.get("items")
            if not isinstance(items_raw, list):
                blocking.append(
                    {
                        "field": f"blocks[{index}].content.items",
                        "message": "FAQ items는 배열이어야 합니다",
                    }
                )
            elif visible and len(items_raw) == 0:
                warnings.append(
                    {
                        "field": f"blocks[{index}].content.items",
                        "message": "FAQ 항목이 비어 있습니다",
                    }
                )
        elif block_type == "gallery":
            items_raw = content.get("items")
            if not isinstance(items_raw, list):
                blocking.append(
                    {
                        "field": f"blocks[{index}].content.items",
                        "message": "Gallery items는 배열이어야 합니다",
                    }
                )
            else:
                for image_index, item_raw in enumerate(items_raw):
                    item = (
                        cast(Mapping[str, object], item_raw)
                        if isinstance(item_raw, Mapping)
                        else {}
                    )
                    src = str(item.get("src") or "").strip()
                    if visible and not src:
                        blocking.append(
                            {
                                "field": f"blocks[{index}].content.items[{image_index}].src",
                                "message": "Gallery image src는 필수입니다",
                            }
                        )
                    elif src and not is_valid_http_url(src):
                        blocking.append(
                            {
                                "field": f"blocks[{index}].content.items[{image_index}].src",
                                "message": "Gallery image src URL 형식이 올바르지 않습니다",
                            }
                        )
                    alt = str(item.get("alt") or "").strip()
                    if src and not alt:
                        warnings.append(
                            {
                                "field": f"blocks[{index}].content.items[{image_index}].alt",
                                "message": "Gallery 이미지 alt 텍스트를 입력하는 것을 권장합니다",
                            }
                        )

    seo_raw = document.get("seo")
    seo = cast(Mapping[str, object], seo_raw if isinstance(seo_raw, Mapping) else {})
    og_image = str(seo.get("ogImage") or "").strip()
    if og_image and not is_valid_http_url(og_image):
        blocking.append(
            {
                "field": "seo.ogImage",
                "message": "OG 이미지 URL 형식이 올바르지 않습니다",
            }
        )

    return {
        "blocking": blocking,
        "warnings": warnings,
    }


def require_action_reason(reason: Optional[str]) -> str:
    normalized_reason = (reason or "").strip()
    if not normalized_reason:
        raise HTTPException(status_code=400, detail="처리 사유(reason)는 필수입니다")
    return normalized_reason


def validate_enforcement_target(
    target_user_id: str,
    current_user: UserContext,
    *,
    allow_super_admin_target: bool = False,
    allow_admin_target: bool = False,
) -> None:
    if current_user["id"] == target_user_id:
        raise HTTPException(status_code=400, detail="본인 계정에는 적용할 수 없습니다")

    target_user = get_user_by_id(target_user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    target_role = target_user.get("role")
    if target_role == "admin" and not allow_admin_target:
        raise HTTPException(
            status_code=403, detail="관리자 계정에는 적용할 수 없습니다"
        )
    if target_role == "super_admin" and not allow_super_admin_target:
        raise HTTPException(
            status_code=403,
            detail="슈퍼 관리자 계정에는 적용할 수 없습니다",
        )


def ensure_bootstrap_super_admin(user: dict[str, object]) -> dict[str, object]:
    email_raw = user.get("email")
    email = email_raw.strip().lower() if isinstance(email_raw, str) else ""
    if email != SUPER_ADMIN_BOOTSTRAP_EMAIL:
        return user

    role = user.get("role")
    status = user.get("status")
    if role == "super_admin" and status == "active":
        return user

    upgraded = bootstrap_super_admin_user(email)
    if upgraded:
        return cast(dict[str, object], upgraded)
    return user


def get_effective_oauth_settings() -> dict[str, object]:
    runtime = get_oauth_runtime_settings() or {}
    enabled = bool(runtime.get("google_oauth_enabled", False))
    google_redirect_uri = (
        runtime.get("google_redirect_uri") or GOOGLE_REDIRECT_URI or ""
    ).strip()
    google_frontend_redirect_uri = (
        runtime.get("google_frontend_redirect_uri")
        or GOOGLE_FRONTEND_REDIRECT_URI
        or ""
    ).strip()
    return {
        "google_oauth_enabled": enabled,
        "google_redirect_uri": google_redirect_uri,
        "google_frontend_redirect_uri": google_frontend_redirect_uri,
    }


def ensure_google_oauth_available() -> dict[str, object]:
    settings = get_effective_oauth_settings()
    if not settings["google_oauth_enabled"]:
        raise HTTPException(
            status_code=403, detail="Google OAuth가 비활성화되어 있습니다"
        )
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth 설정이 누락되었습니다. GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET를 확인해 주세요",
        )
    if (
        not settings["google_redirect_uri"]
        or not settings["google_frontend_redirect_uri"]
    ):
        raise HTTPException(
            status_code=503,
            detail="Google OAuth 리다이렉트 URI 설정이 누락되었습니다",
        )
    return settings


def build_google_nickname(profile: dict[str, object]) -> str:
    raw_name = profile.get("name")
    preferred_name = raw_name.strip() if isinstance(raw_name, str) else ""
    if preferred_name:
        normalized = re.sub(r"\s+", " ", preferred_name)
        return normalized[:PROFILE_NICKNAME_MAX_LEN]

    raw_email = profile.get("email")
    email = raw_email.strip() if isinstance(raw_email, str) else ""
    local_part = email.split("@")[0] if "@" in email else "user"
    local_part = re.sub(r"[^a-zA-Z0-9_.-]", "", local_part)
    return (local_part or "user")[:PROFILE_NICKNAME_MAX_LEN]


def ensure_unique_nickname(base_nickname: str) -> str:
    trimmed_base = (base_nickname or "user").strip()[:PROFILE_NICKNAME_MAX_LEN]
    if not get_user_by_nickname(trimmed_base):
        return trimmed_base

    for _ in range(10):
        suffix = secrets.token_hex(2)
        max_base = PROFILE_NICKNAME_MAX_LEN - len(suffix) - 1
        candidate = f"{trimmed_base[:max_base]}-{suffix}"
        if not get_user_by_nickname(candidate):
            return candidate

    fallback = f"user-{secrets.token_hex(4)}"
    return fallback[:PROFILE_NICKNAME_MAX_LEN]


def get_about_content_payload() -> dict[str, object]:
    return _get_about_content_payload(sys.modules[__name__])


def build_page_document_from_about_content(
    page_id: str,
    about_content: Mapping[str, object],
    version: int,
) -> dict[str, object]:
    return _build_page_document_from_about_content(
        sys.modules[__name__],
        page_id,
        about_content,
        version,
    )


def extract_about_content_from_page_document(
    document: Mapping[str, object],
) -> dict[str, object]:
    return _extract_about_content_from_page_document(document)


def build_page_migration_preview(page_id: str) -> dict[str, object]:
    return _build_page_migration_preview(sys.modules[__name__], page_id)


def execute_page_migration(
    page_id: str,
    actor_id: str,
    reason: str,
    dry_run: bool,
) -> dict[str, object]:
    return _execute_page_migration(
        sys.modules[__name__],
        page_id,
        actor_id,
        reason,
        dry_run,
    )


def restore_page_migration_backup(
    page_id: str,
    backup_key: str,
    actor_id: str,
    reason: str,
    dry_run: bool,
) -> dict[str, object]:
    return _restore_page_migration_backup(
        sys.modules[__name__],
        page_id,
        backup_key,
        actor_id,
        reason,
        dry_run,
    )


def list_page_migration_backups(page_id: str, limit: int = 20) -> dict[str, object]:
    return _list_page_migration_backups(sys.modules[__name__], page_id, limit=limit)


def page_action_target_id(page_id: str) -> str:
    return _page_action_target_id(sys.modules[__name__], page_id)


def curated_collection_action_target_id() -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "vibecoder:curated-collection:scheduler"))


def parse_schedule_publish_at(raw: str) -> datetime:
    normalized = raw.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="publishAt은 필수입니다")
    try:
        parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail="publishAt 형식이 올바르지 않습니다"
        ) from exc

    if parsed.tzinfo is not None:
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def serialize_publish_schedule(
    record: Mapping[str, object],
) -> dict[str, object]:
    def to_int(value: object, default: int = 0) -> int:
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, str):
            try:
                return int(value)
            except ValueError:
                return default
        return default

    return {
        "scheduleId": str(record.get("schedule_id") or ""),
        "pageId": str(record.get("page_id") or ""),
        "draftVersion": to_int(record.get("draft_version"), 0),
        "publishAt": str(record.get("publish_at") or ""),
        "timezone": str(record.get("timezone") or "Asia/Seoul"),
        "status": str(record.get("status") or "scheduled"),
        "reason": str(record.get("reason") or ""),
        "attemptCount": to_int(record.get("attempt_count"), 0),
        "maxAttempts": to_int(record.get("max_attempts"), 3),
        "lastError": str(record.get("last_error") or ""),
        "nextRetryAt": str(record.get("next_retry_at") or ""),
        "createdBy": str(record.get("created_by") or ""),
        "createdAt": str(record.get("created_at") or ""),
        "updatedAt": str(record.get("updated_at") or ""),
        "cancelledAt": str(record.get("cancelled_at") or ""),
        "publishedVersion": to_int(record.get("published_version"), 0),
        "publishedAt": str(record.get("published_at") or ""),
    }


def get_blocked_user_message(user_status: str) -> str:
    if user_status == "pending":
        return "가입 승인이 대기 중입니다. 관리자 승인 후 로그인할 수 있습니다"
    if user_status == "rejected":
        return "가입이 반려된 계정입니다. 관리자에게 문의해 주세요"
    if user_status == "suspended":
        return "보안 정책으로 계정이 정지되었습니다. 관리자에게 문의해 주세요"
    if user_status == "pending_delete":
        return "삭제 예정 상태의 계정입니다. 관리자에게 문의해 주세요"
    if user_status == "deleted":
        return "삭제된 계정입니다"
    return "활성화되지 않은 계정입니다"


def _extract_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if forwarded_for:
        return forwarded_for

    client = getattr(request, "client", None)
    client_host = getattr(client, "host", "") if client else ""
    return client_host or "unknown"


def enforce_rate_limit(
    bucket: str,
    key: str,
    *,
    limit: int,
    window_seconds: float,
    detail: str,
) -> None:
    now = time.monotonic()
    bucket_key = f"{bucket}:{key}"

    with _RATE_LIMIT_LOCK:
        samples = _RATE_LIMIT_BUCKETS.setdefault(bucket_key, deque())
        while samples and now - samples[0] >= window_seconds:
            samples.popleft()
        if len(samples) >= limit:
            raise HTTPException(status_code=429, detail=detail)
        samples.append(now)


# === SECTION: LOGGING_AND_MODERATION_WRAPPERS ===


def mask_sensitive_reason(reason: Optional[str], mask_enabled: bool) -> Optional[str]:
    if reason is None:
        return None

    normalized = reason.strip()
    if not normalized or not mask_enabled:
        return normalized

    patterns = [
        (r"([\w.+-]+)@([\w.-]+\.[A-Za-z]{2,})", "[masked-email]"),
        (r"\b(01[0-9]-?\d{3,4}-?\d{4})\b", "[masked-phone]"),
        (r"\b(Bearer\s+[A-Za-z0-9._-]+)\b", "[masked-token]"),
        (r"\b(sk-[A-Za-z0-9]{10,})\b", "[masked-secret]"),
        (
            r"\b([A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{20,})\b",
            "[masked-jwt]",
        ),
    ]

    masked = normalized
    for pattern, replacement in patterns:
        masked = re.sub(pattern, replacement, masked)
    return masked


def write_admin_action_log(
    admin_id: str,
    action_type: str,
    target_type: str,
    target_id: str,
    reason: Optional[str],
    metadata: Optional[Mapping[str, object]] = None,
) -> None:
    settings = get_effective_moderation_settings()
    mask_enabled = bool(settings.get("admin_log_mask_reasons", True))
    sanitized_reason = mask_sensitive_reason(reason, mask_enabled)
    create_admin_action_log(
        admin_id=admin_id,
        action_type=action_type,
        target_type=target_type,
        target_id=target_id,
        reason=sanitized_reason,
        metadata=metadata,
    )


def log_curated_collection_action(
    *, action_type: str, created: int, message: Optional[str] = None
) -> None:
    detail = f"created={max(created, 0)}"
    normalized_message = str(message or "").strip()
    if normalized_message:
        detail = f"{detail}; message={normalized_message}"
    try:
        write_admin_action_log(
            admin_id=SYSTEM_ADMIN_USER_ID,
            action_type=action_type,
            target_type="system",
            target_id=curated_collection_action_target_id(),
            reason=detail,
        )
    except Exception as error:
        logger.warning("curated collection action log skipped: %s", error)


def get_effective_moderation_settings() -> dict[str, object]:
    return _get_effective_moderation_settings(sys.modules[__name__])


def ensure_baseline_moderation_settings() -> None:
    _ensure_baseline_moderation_settings(sys.modules[__name__])


def perform_due_user_deletion_cleanup() -> int:
    deleted_users = purge_due_user_deletions(limit=200)
    for deleted_user in deleted_users:
        target_id = str(deleted_user["id"])
        write_admin_action_log(
            admin_id=SYSTEM_ADMIN_USER_ID,
            action_type="user_deleted",
            target_type="user",
            target_id=target_id,
            reason="삭제 예약 만료로 자동 삭제 처리",
        )
    return len(deleted_users)


# === SECTION: BACKGROUND_TASKS_AND_RUNTIME_HELPERS ===


async def run_admin_log_cleanup_loop() -> None:
    while True:
        try:
            settings = get_effective_moderation_settings()
            retention_days = cast(int, settings["admin_log_retention_days"])
            deleted_count = cleanup_admin_action_logs(retention_days=retention_days)
            if deleted_count > 0:
                print(f"[admin-log] cleaned up {deleted_count} expired action logs")
            user_deleted_count = perform_due_user_deletion_cleanup()
            if user_deleted_count > 0:
                print(
                    f"[admin-user] auto-deleted {user_deleted_count} due pending_delete accounts"
                )
        except Exception as error:
            print(f"[admin-log] cleanup loop error: {error}")
        await asyncio.sleep(ADMIN_LOG_CLEANUP_INTERVAL_SECONDS)


async def run_stars_refresh_iteration() -> None:
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, _refresh_stars, GITHUB_TOKEN
        )
        print(
            f"[stars-refresh] updated={result.get('updated')} "
            f"skipped={result.get('skipped')} "
            f"maintenance_stopped={result.get('maintenance_stopped')}"
        )
    except Exception as error:
        print(f"[stars-refresh] error: {error}")


async def run_curated_collection_scheduler_iteration() -> None:
    try:
        result = perform_curated_collection_run(allow_sample_fallback=False)
        created = safe_int(result.get("created"), 0)
        message = str(result.get("message") or "").strip()
        action_type = "curated_collection_succeeded"
        if message and created == 0:
            action_type = "curated_collection_skipped"
        log_curated_collection_action(
            action_type=action_type,
            created=created,
            message=message,
        )
        if created > 0 or message:
            log_line = (
                f"[curated-scheduler] created={created} "
                f"collected_today={safe_int(result.get('collected_today'), 0)} "
                f"daily_limit={safe_int(result.get('daily_limit'), 0)} "
                f"message={message or 'none'}"
            )
            print(log_line)
    except Exception as error:
        log_curated_collection_action(
            action_type="curated_collection_failed",
            created=0,
            message=str(error),
        )
        print(f"[curated-scheduler] loop error: {error}")


# === SECTION: STARTUP_AND_SHUTDOWN ===


async def _startup_event_impl() -> None:
    """앱 시작 시 DB 테이블 초기화"""
    try:
        init_db()
        ensure_baseline_moderation_settings()
        settings = get_effective_moderation_settings()
        _ = cleanup_admin_action_logs(
            retention_days=cast(int, settings["admin_log_retention_days"])
        )
        _ = perform_due_user_deletion_cleanup()
        _ = get_about_content_payload()
        _set_cached_projects(
            sort="latest", platform=None, tag=None, items=get_projects(sort="latest")
        )
        global _admin_log_cleanup_task
        if _admin_log_cleanup_task is None or _admin_log_cleanup_task.done():
            _admin_log_cleanup_task = asyncio.create_task(run_admin_log_cleanup_loop())
        curated_collection_task = get_curated_collection_task()
        if AUTO_CURATED_COLLECTION_ENABLED and (
            curated_collection_task is None or curated_collection_task.done()
        ):
            set_curated_collection_task(
                asyncio.create_task(
                    run_periodic_async_loop(
                        interval_seconds=AUTO_CURATED_COLLECTION_INTERVAL_SECONDS,
                        callback=run_curated_collection_scheduler_iteration,
                        run_immediately=AUTO_CURATED_COLLECTION_RUN_ON_STARTUP,
                    )
                )
            )
        stars_refresh_task = get_stars_refresh_task()
        if GITHUB_TOKEN and (stars_refresh_task is None or stars_refresh_task.done()):
            set_stars_refresh_task(
                asyncio.create_task(
                    run_periodic_async_loop(
                        interval_seconds=STARS_REFRESH_INTERVAL_SECONDS,
                        callback=run_stars_refresh_iteration,
                    )
                )
            )
    except Exception as e:
        print(f"⚠️  DB initialization warning: {e}")


async def _shutdown_event_impl() -> None:
    global _admin_log_cleanup_task
    await cancel_background_task(get_curated_collection_task())
    set_curated_collection_task(None)
    await cancel_background_task(get_stars_refresh_task())
    set_stars_refresh_task(None)
    await cancel_background_task(_admin_log_cleanup_task)
    _admin_log_cleanup_task = None


# === SECTION: HEALTH_AND_METADATA_ROUTES ===


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def get_public_base_url(request: Request) -> str:
    if PUBLIC_BASE_URL:
        return PUBLIC_BASE_URL

    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip()
    forwarded_host = request.headers.get("x-forwarded-host", "").split(",")[0].strip()
    scheme = forwarded_proto or str(
        request.scope.get("scheme") or request.url.scheme or "http"
    )
    host = forwarded_host or request.headers.get("host") or request.url.netloc
    return f"{scheme}://{host}".rstrip("/")


@app.get("/sitemap.xml", include_in_schema=False)
def sitemap_xml(request: Request) -> Response:
    base_url = get_public_base_url(request)
    static_urls: list[tuple[str, str, str]] = [
        ("/", "daily", "1.0"),
        ("/explore", "daily", "0.9"),
        ("/about", "monthly", "0.7"),
        ("/challenges", "weekly", "0.8"),
    ]
    projects = get_projects(sort="latest")

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    for path, changefreq, priority in static_urls:
        lines.extend(
            [
                "  <url>",
                f"    <loc>{xml_escape(f'{base_url}{path}')}</loc>",
                f"    <changefreq>{changefreq}</changefreq>",
                f"    <priority>{priority}</priority>",
                "  </url>",
            ]
        )

    for project in projects:
        project_id = str(project["id"])
        project_url = f"{base_url}/project/{quote(project_id, safe='')}"
        lines.extend(
            [
                "  <url>",
                f"    <loc>{xml_escape(project_url)}</loc>",
                "    <changefreq>weekly</changefreq>",
                "    <priority>0.8</priority>",
                "  </url>",
            ]
        )

    lines.append("</urlset>")
    return Response(content="\n".join(lines), media_type="application/xml")


@app.get("/api/content/filter-tabs")
def get_filter_tabs_endpoint() -> dict[str, list[dict[str, str]]]:
    settings = get_effective_moderation_settings()
    return {
        "home_filter_tabs": cast(list[dict[str, str]], settings["home_filter_tabs"]),
        "explore_filter_tabs": cast(
            list[dict[str, str]],
            settings["explore_filter_tabs"],
        ),
    }


def require_admin_from_request(request: Request) -> UserContext:
    auth_header = request.headers.get("authorization", "")
    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()

    if not token:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다")

    decoded = decode_token(token)
    user_id = decoded.get("sub") if decoded else None
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    user = ensure_bootstrap_super_admin(user)

    role = str(user.get("role") or "")
    if role not in ADMIN_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    return build_user_context(user)


_KNOWN_LICENSE_EXPLANATIONS: dict[str, str] = {
    "MIT": "자유롭게 사용, 수정, 배포할 수 있어요. 출처(저작권 표시)만 남겨두면 돼요. 상업적으로 써도 괜찮아요.",
    "Apache-2.0": "자유롭게 사용, 수정, 배포할 수 있어요. 출처 표시가 필요하고, 특허 분쟁으로부터 보호받을 수 있는 조항도 포함돼 있어요.",
    "GPL-2.0": "사용·수정은 자유롭지만, 이 코드를 포함해 배포할 때는 소스코드를 반드시 함께 공개해야 해요.",
    "GPL-2.0-only": "사용·수정은 자유롭지만, 이 코드를 포함해 배포할 때는 소스코드를 반드시 함께 공개해야 해요.",
    "GPL-3.0": "사용·수정은 자유롭지만, 배포 시 소스코드 공개가 필수예요. GPL-2.0보다 특허 보호 조항이 더 강해요.",
    "GPL-3.0-only": "사용·수정은 자유롭지만, 배포 시 소스코드 공개가 필수예요. GPL-2.0보다 특허 보호 조항이 더 강해요.",
    "LGPL-2.1": "라이브러리로 가져다 쓰는 건 자유로워요. 단, 이 라이브러리 자체를 수정해서 배포할 때만 소스 공개가 필요해요.",
    "LGPL-3.0": "라이브러리로 가져다 쓰는 건 자유로워요. 단, 이 라이브러리 자체를 수정해서 배포할 때만 소스 공개가 필요해요.",
    "LGPL-3.0-only": "라이브러리로 가져다 쓰는 건 자유로워요. 단, 이 라이브러리 자체를 수정해서 배포할 때만 소스 공개가 필요해요.",
    "AGPL-3.0": "서버에서 서비스로 제공할 때도 소스코드를 공개해야 해요. 웹 서비스에도 오픈소스 의무가 적용돼요.",
    "AGPL-3.0-only": "서버에서 서비스로 제공할 때도 소스코드를 공개해야 해요. 웹 서비스에도 오픈소스 의무가 적용돼요.",
    "BSD-2-Clause": "자유롭게 사용, 수정, 배포할 수 있어요. 출처 표시와 라이선스 문구를 유지하면 돼요.",
    "BSD-3-Clause": "자유롭게 사용, 수정, 배포할 수 있어요. 출처 표시가 필요하고, 제작자 이름을 홍보에 무단으로 쓰면 안 돼요.",
    "ISC": "MIT와 거의 같아요. 자유롭게 사용·수정·배포 가능하고 출처만 표시하면 돼요.",
    "MPL-2.0": "수정한 파일만 소스를 공개하면 되고, 나머지 코드는 비공개로 유지해도 돼요.",
    "CC0-1.0": "저작권을 완전히 포기한 라이선스예요. 아무런 제한 없이 자유롭게 사용해도 돼요.",
    "Unlicense": "공공 도메인이에요. 출처 표시도 필요 없고 완전히 자유롭게 쓸 수 있어요.",
    "0BSD": "아무 조건 없이 자유롭게 사용할 수 있어요. 출처 표시도 필요 없어요.",
}


def _get_known_license_explanation(spdx_id: str) -> str | None:
    normalized = spdx_id.strip()
    if normalized in _KNOWN_LICENSE_EXPLANATIONS:
        return _KNOWN_LICENSE_EXPLANATIONS[normalized]
    return None


def _build_license_explain_prompt(license_text: str, repo_title: str) -> str:
    return (
        f"다음은 '{repo_title}' 프로젝트의 라이선스 전문이야. "
        "중학생도 쉽게 이해할 수 있는 한국어로 2~3문장으로 설명해줘. "
        "상업적 사용 가능 여부, 수정 가능 여부, 배포 시 조건을 반드시 포함해. "
        "법률 용어 없이 친근한 말투로 써줘.\n\n"
        f"라이선스 내용:\n{license_text}"
    )


def _explain_license_with_gemini(
    license_text: str,
    repo_title: str,
    *,
    api_key: str,
    model: str,
) -> str:
    prompt = _build_license_explain_prompt(license_text, repo_title)
    request_payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 300},
    }
    request = UrlRequest(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
        data=json.dumps(request_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            raw_bytes = cast(bytes, response.read())
        payload = json.loads(raw_bytes.decode("utf-8"))
        return extract_gemini_text(payload).strip()
    except Exception:
        return ""


def generate_license_explanation(
    spdx_id: str,
    owner: str,
    repo_name: str,
    repo_title: str,
    github_token: str,
) -> str:
    known = _get_known_license_explanation(spdx_id)
    if known:
        return known

    if not GEMINI_API_KEY or not github_token:
        return "라이선스를 자동으로 파악하지 못했어요. 사용 전 GitHub 레포의 LICENSE 파일을 직접 확인해 주세요."

    license_text = fetch_github_license_file(owner, repo_name, github_token)
    if not license_text:
        return (
            "라이선스 파일을 찾을 수 없어요. 사용 전 GitHub 레포를 직접 확인해 주세요."
        )

    explanation = _explain_license_with_gemini(
        license_text,
        repo_title,
        api_key=GEMINI_API_KEY,
        model=GEMINI_MODEL,
    )
    if explanation:
        return explanation
    return "라이선스를 자동으로 파악하지 못했어요. 사용 전 GitHub 레포의 LICENSE 파일을 직접 확인해 주세요."


# === SECTION: APP_ROUTE_REGISTRATION_AND_COMPATIBILITY ===

register_curated_routes(
    app,
    sys.modules[__name__],
    CuratedAdminUpdateRequest,
    CuratedRelatedClickCreate,
)
register_showcase_clap_routes(app, sys.modules[__name__])
register_translation_routes(
    app,
    sys.modules[__name__],
    ErrorTranslateRequest,
    ErrorTranslateFeedbackRequest,
    TextTranslateRequest,
    GlossaryTermRequestCreate,
)
bind_curated_service(sys.modules[__name__])


# === SECTION: AUTH_AND_ADMIN_GUARDS ===


def get_curated_runtime_settings() -> dict[str, int]:
    return _get_curated_runtime_settings(sys.modules[__name__])


def get_effective_blocked_keywords(custom_keywords: list[str]) -> list[str]:
    return _get_effective_blocked_keywords(
        custom_keywords,
        BASELINE_BLOCKED_KEYWORD_CATEGORIES,
    )


perform_curated_collection_run = cast(
    Callable[..., dict[str, object]],
    getattr(sys.modules[__name__], "perform_curated_collection_run"),
)
determine_curated_collection_status = cast(
    Callable[..., str],
    getattr(sys.modules[__name__], "determine_curated_collection_status"),
)
build_curated_review_metadata = cast(
    Callable[..., dict[str, object]],
    getattr(sys.modules[__name__], "build_curated_review_metadata"),
)
build_curated_duplicate_review_metadata = cast(
    Callable[..., dict[str, object]],
    getattr(sys.modules[__name__], "build_curated_duplicate_review_metadata"),
)
is_curated_duplicate_candidate = cast(
    Callable[..., bool],
    getattr(sys.modules[__name__], "is_curated_duplicate_candidate"),
)


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    user = ensure_bootstrap_super_admin(user)

    status_raw = user.get("status")
    user_status = status_raw if isinstance(status_raw, str) and status_raw else "active"
    if user_status != "active":
        raise HTTPException(
            status_code=403, detail=get_blocked_user_message(user_status)
        )

    token_version_claim = payload.get("sv")
    token_version_from_claim = (
        token_version_claim if isinstance(token_version_claim, int) else 0
    )
    user_token_version = user.get("token_version")
    current_token_version = (
        user_token_version if isinstance(user_token_version, int) else 0
    )
    if token_version_from_claim != current_token_version:
        raise HTTPException(
            status_code=401, detail="세션이 만료되었습니다. 다시 로그인해 주세요"
        )

    return {
        "id": str(user["id"]),
        "email": str(user["email"]),
        "nickname": str(user["nickname"]),
        "role": str(user["role"]),
        "status": user_status,
        "avatar_url": cast(Optional[str], user.get("avatar_url")),
        "bio": cast(Optional[str], user.get("bio")),
    }


async def require_admin(current_user: UserContext = Depends(get_current_user)):
    if current_user.get("role") not in ADMIN_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    return current_user


async def require_super_admin(current_user: UserContext = Depends(get_current_user)):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="슈퍼 관리자 권한이 필요합니다")
    return current_user


register_admin_policy_routes(
    app,
    sys.modules[__name__],
    AdminPolicyUpdateRequest,
)
register_about_content_routes(
    app,
    sys.modules[__name__],
    AboutContentUpdateRequest,
)
register_admin_page_editor_routes(
    app,
    sys.modules[__name__],
    AdminPageDraftUpdateRequest,
    AdminPagePublishRequest,
    AdminPagePublishScheduleCreateRequest,
    AdminPagePublishScheduleActionRequest,
    AdminPagePublishScheduleProcessRequest,
    AdminPageRollbackRequest,
    AdminPageMigrationExecuteRequest,
    AdminPageMigrationRestoreRequest,
)
register_public_api_routes(
    app,
    sys.modules[__name__],
    ReportCreate,
    ProjectCreate,
    ProjectUpdateRequest,
    CommentCreate,
)
register_auth_routes(
    app,
    sys.modules[__name__],
    OAuthCodeExchangeRequest,
    RegisterRequest,
    LoginRequest,
    ProfileUpdateRequest,
)
register_admin_operations_routes(
    app,
    sys.modules[__name__],
    AdminPagePerfEventRequest,
    AdminOAuthSettingsUpdateRequest,
    AdminUserRoleUpdateRequest,
    AdminProjectUpdateRequest,
    AdminActionReasonRequest,
    AdminUserLimitRequest,
    AdminUserDeleteScheduleRequest,
    AdminReportUpdateRequest,
)


def enforce_page_editor_rollout_access(current_user: UserContext) -> None:
    settings = get_effective_moderation_settings()
    if not bool(settings.get("page_editor_enabled", True)):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "page_editor_disabled",
                "message": "페이지 편집 기능이 현재 비활성화되어 있습니다",
            },
        )

    stage = normalize_rollout_stage(
        settings.get("page_editor_rollout_stage"),
        DEFAULT_PAGE_EDITOR_ROLLOUT_STAGE,
    )
    role = str(current_user.get("role") or "")
    if role == "super_admin":
        return

    if stage == "open":
        return

    if stage == "qa":
        raise HTTPException(
            status_code=403,
            detail={
                "code": "page_editor_stage_qa_only",
                "message": "현재 내부 QA 단계로 super_admin만 접근할 수 있습니다",
            },
        )

    pilot_ids = {
        str(admin_id).strip()
        for admin_id in cast(list[str], settings.get("page_editor_pilot_admin_ids", []))
        if str(admin_id).strip()
    }
    if str(current_user.get("id") or "") not in pilot_ids:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "page_editor_stage_pilot_only",
                "message": "현재 파일럿 단계로 지정된 운영자만 접근할 수 있습니다",
            },
        )
