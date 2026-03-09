# Code Map

This repository does not use a Qt-style `signal/slot` desktop architecture.
The closest equivalents are:

- FastAPI route registration and dependency injection on the server
- startup/shutdown background task wiring on the server
- React component tree + API client calls on the frontend

The sections below describe the current maintainability map in that shape.

## Server Topology

### Main Assembly
- `server/main.py`: app assembly, shared helpers, auth/admin guards, compatibility surface for tests

### Route Modules
- `server/translation_routes.py`: translation, error-translate, glossary request endpoints
- `server/public_api_routes.py`: public project/comment/report/like endpoints and `me` project/comment lists
- `server/auth_routes.py`: Google OAuth, register/login, `me` profile endpoints
- `server/about_content_routes.py`: public/admin about-content endpoints
- `server/admin_policy_routes.py`: admin policy endpoints
- `server/admin_page_editor_routes.py`: admin page editor and migration endpoints
- `server/admin_operations_routes.py`: admin reports/users/projects/oauth/perf/action-log endpoints
- `server/curated_routes.py`: curated and admin-curated endpoints

### Domain / Service Modules
- `server/moderation_settings.py`: general moderation/page-editor/admin-log normalization and effective settings assembly
- `server/curated_settings.py`: curated-specific moderation normalization
- `server/curated_service.py`: curated collection, review classification, duplicate checks
- `server/curated_runtime.py`: curated runtime task/warning state
- `server/curated_defs.py`: curated constants, TypedDicts, Pydantic models
- `server/curated_reasons.py`: curated reason normalization/labels

## Class List

### Server Pydantic Models Still Defined In `server/main.py`
- `ProjectCreate`: project creation payload
- `ProjectUpdateRequest`: owner-side project update payload
- `CommentCreate`: comment creation payload
- `ReportCreate`: comment report payload
- `ErrorTranslateRequest`: error translation request body
- `ErrorTranslateFeedbackRequest`: error translation feedback body
- `TextTranslateRequest`: general translation request body
- `GlossaryTermRequestCreate`: glossary request body
- `RegisterRequest`: email registration request body
- `LoginRequest`: login request body
- `ProfileUpdateRequest`: current-user profile patch body
- `TokenResponse`: auth response envelope
- `OAuthCodeExchangeRequest`: Google OAuth exchange request body
- `UserContext`: authenticated user shape used across guards and handlers
- `AdminReportUpdateRequest`: admin report status update body
- `AdminUserLimitRequest`: admin user limit body
- `AdminUserDeleteScheduleRequest`: user deletion scheduling body
- `PolicyFilterTab`: filter tab payload in admin policy editing
- `AdminPolicyUpdateRequest`: admin moderation/policy update body
- `AdminOAuthSettingsUpdateRequest`: admin OAuth runtime config body
- `AdminProjectUpdateRequest`: admin project edit body
- `AdminActionReasonRequest`: generic admin reason body
- `AdminUserRoleUpdateRequest`: admin user-role update body
- `AboutValueItem`: about page value card payload
- `AboutTeamMember`: about page team member payload
- `AboutFaqItem`: about page FAQ payload
- `AboutContentUpdateRequest`: admin about page edit body
- `PageSeoPayload`: page editor SEO payload
- `PageBlockPayload`: page editor block payload
- `PageDocumentPayload`: page editor document payload
- `AdminPageDraftUpdateRequest`: draft save payload
- `AdminPagePublishRequest`: publish payload
- `AdminPagePublishScheduleCreateRequest`: publish schedule creation payload
- `AdminPagePublishScheduleActionRequest`: publish schedule retry/cancel payload
- `AdminPagePublishScheduleProcessRequest`: batch process payload
- `AdminPageRollbackRequest`: rollback payload
- `AdminPageMigrationExecuteRequest`: migration execution payload
- `AdminPageMigrationRestoreRequest`: migration restore payload
- `AdminPagePerfEventRequest`: page editor perf event payload

## Major Function List

### `server/main.py`
- `startup_event`: application startup entrypoint
- `shutdown_event`: application shutdown entrypoint
- `lifespan`: FastAPI lifespan wrapper
- `enforce_https_and_security_headers`: HTTPS redirect and common security headers
- `get_effective_moderation_settings`: wrapper into `server/moderation_settings.py`
- `ensure_baseline_moderation_settings`: wrapper into `server/moderation_settings.py`
- `write_admin_action_log`: masked admin action logging wrapper
- `log_curated_collection_action`: curated scheduler log helper with DB-safe fallback
- `build_policy_update_log_metadata`: structured policy diff metadata builder
- `require_admin_from_request`: bearer-token admin extraction for request-driven endpoints
- `require_admin`: dependency guard for admin routes
- `require_super_admin`: dependency guard for super-admin routes
- `enforce_page_editor_rollout_access`: page editor rollout/stage access gate
- `run_curated_collection_scheduler_iteration`: curated automatic collection scheduler step
- `get_about_content_payload`: reads current about page content payload
- `build_page_document_from_about_content`: converts about content into page-editor document shape
- `extract_about_content_from_page_document`: converts page document back into about content payload

### Frontend API Client
- `src/lib/api.ts`: central API client, request wrappers, typed response models, auth fetch utilities, cache-aware fetch helpers

## One-Line Function Roles

### Server Wiring
- Route module `register_*_routes(...)`: attach a feature slice to the shared FastAPI app while keeping logic in feature modules
- `bind_curated_service(...)`: keep `main` monkeypatch/test compatibility while implementations live in `curated_service.py`

### Settings / Runtime
- `normalize_general_moderation_settings(...)`: normalize page-editor, admin-log, and filter-tab settings
- `normalize_curated_moderation_settings(...)`: normalize curated tuning values
- `get_curated_runtime_settings(...)`: fetch curated settings with DB-safe fallback to defaults
- `get_curated_collection_task` / `set_curated_collection_task`: read/write curated scheduler task state

## Function Dependency Relations

### Server Route Registration Flow
- `server/main.py` creates `app`
- `server/main.py` calls `register_*_routes(...)`
- each route module calls back into `main` helpers, guards, db wrappers, and services

### Moderation Flow
- route handlers -> `get_effective_moderation_settings()` wrapper -> `server/moderation_settings.py`
- curated handlers -> `get_curated_runtime_settings()` wrapper -> `server/curated_settings.py`

### Curated Flow
- curated routes -> `curated_routes.py`
- curated routes -> `curated_service.py` for collection/review helpers
- curated settings/runtime modules provide tuning + scheduler state

### About/Page Editor Flow
- about routes -> `get_about_content_payload()` / `upsert_site_content()`
- admin page-editor routes -> page document helpers in `main.py` -> DB layer
- publish path for about page also syncs page document back to site content

## Global State Variables

### Server Runtime State In `server/main.py`
- `logger`: module logger
- `_admin_log_cleanup_task`: background admin-log cleanup task
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: OAuth environment config
- `GOOGLE_REDIRECT_URI`, `GOOGLE_FRONTEND_REDIRECT_URI`: OAuth redirect defaults
- `PUBLIC_BASE_URL`, `ENFORCE_HTTPS`: deployment/runtime URL behavior
- rate-limit constants and in-memory rate-limit buckets/locks
- project cache and performance sample in-memory stores

### Curated Runtime State In `server/curated_runtime.py`
- `_curated_collection_task`: background curated scheduler task
- `_last_curated_related_click_fallback_warning_at`: fallback warning dedupe timestamp

## Signal / Slot Equivalent Structure

There is no Qt signal/slot wiring in this repository.

Use this mapping instead:

- Route registration -> equivalent of UI signal hookup
  - `register_translation_routes(...)`
  - `register_public_api_routes(...)`
  - `register_auth_routes(...)`
  - `register_about_content_routes(...)`
  - `register_admin_policy_routes(...)`
  - `register_admin_page_editor_routes(...)`
  - `register_admin_operations_routes(...)`
  - `register_curated_routes(...)`
- Dependency injection guards -> equivalent of access-control slots
  - `require_admin`
  - `require_super_admin`
  - `get_current_user`
- Startup task wiring -> equivalent of background worker hookup
  - curated scheduler via `run_periodic_async_loop(...)`
  - admin log cleanup task via startup/shutdown lifecycle

## Side-Effect Hotspots To Watch When Editing

- `write_admin_action_log(...)`: can touch moderation settings and DB-backed log creation; changes here ripple across admin/page-editor/curated tests
- `get_effective_moderation_settings(...)`: central source for admin UI behavior, report handling, page-editor rollout, and curated tuning
- OAuth flows in `server/auth_routes.py`: tests monkeypatch `main.urlopen`, token decode helpers, and DB-sensitive OAuth-state storage paths
- page-editor publish/rollback paths: about page publishing also syncs `site_content`
- curated scheduler/logging: DB-less test environments rely on fallback-safe behavior
- `src/lib/api.ts`: broad frontend blast radius; changing request/response contracts affects many screens at once

## Recommended Anchor Strategy

For this repo, section anchors are useful in only a few large files.

Recommended pattern:

```py
# === SECTION: IMPORTS_AND_ROUTE_MODULES ===
# === SECTION: APP_LIFECYCLE_AND_MIDDLEWARE ===
# === SECTION: REQUEST_MODELS_AND_SHARED_TYPES ===
# === SECTION: AUTH_AND_ADMIN_GUARDS ===
# === SECTION: LOGGING_AND_MODERATION_WRAPPERS ===
# === SECTION: APP_ROUTE_REGISTRATION ===
# === SECTION: HEALTH_AND_METADATA_ROUTES ===
```

And for `src/lib/api.ts`:

```ts
// === SECTION: CORE_FETCH_AND_ERRORS ===
// === SECTION: SHARED_TYPES ===
// === SECTION: PUBLIC_API ===
// === SECTION: AUTH_API ===
// === SECTION: ADMIN_API ===
// === SECTION: CURATED_API ===
```

These are a better fit than Qt-specific anchors like `SIGNAL_CONNECTIONS` or `BACKUP_WORKER`.
