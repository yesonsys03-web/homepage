# Cloudflare + Google OAuth + Signup Approval Roadmap

Last updated: 2026-03-01

## 1) Scope and Goals

- Build a production-ready auth flow with Google OAuth.
- Introduce admin-driven signup approval (`pending -> active/rejected`).
- Keep existing FastAPI + Postgres architecture and add Cloudflare at the edge.
- Ensure clear user messaging for signup, approval waiting, and rejection.

## 2) Success Criteria (KPI)

- Signup success/failure handling accuracy: 100% (no false-success UI states).
- New signup visibility in admin queue: <= 10s after registration.
- Login gate by status (`active` only): 100% enforced.
- Approval/rejection audit trail coverage: 100% (admin action logs).

## 3) Target Architecture

### Frontend
- Host on Cloudflare Pages.
- Public app domain: `app.<your-domain>`.
- Configure `API_BASE` to `https://api.<your-domain>`.

### Backend
- Keep FastAPI hosted on existing compute provider.
- Expose via Cloudflare DNS + Proxy on `api.<your-domain>`.
- Apply Cloudflare WAF + rate limiting on auth endpoints.

### Database
- Keep Postgres and run additive migrations for auth/approval fields.

### Email
- Use provider like Resend/Postmark/SendGrid for transactional mail.
- Send events: signup received, approved, rejected.

## 4) Phased Execution Plan

## Phase 0 - Immediate Hotfix (Day 1)

### Objective
Fix current register failure handling bug first.

### Tasks
- Align `register` error handling with robust API pattern (`res.ok` check + `detail`).
- Prevent login state persistence when register fails.
- Show server error message directly in register UI.

### Verification
- Duplicate email/nickname must show error and never log in user.
- Successful signup must return valid token+user only.

---

## Phase 1 - Cloudflare Base Setup (Day 2-3)

### Tasks
- Deploy frontend to Cloudflare Pages.
- Connect domain and SSL.
- Configure DNS proxy for backend API.
- Set WAF and basic rate limits for `/api/auth/*`.

### Verification
- `app.<domain>` and `api.<domain>` reachable with valid TLS.
- CORS works between app and API origins.

---

## Phase 2 - Data Model Extension (Day 4-5)

### New/Updated User Fields
- `status`: `pending | active | rejected`
- `provider`: `local | google`
- `provider_user_id`: OAuth provider subject id
- `email_verified`: boolean
- `approved_at`, `approved_by`, `rejected_reason`
- `last_login_at`

### Migration Rules
- Existing users default to `active` (safe rollout).
- Add indexes on `status`, `email`, `(provider, provider_user_id)`.

### Verification
- Migration up/down scripts tested.
- Existing account login unaffected.

---

## Phase 3 - Approval Workflow API (Day 6-7)

### User/Auth Side
- New signup defaults to `pending`.
- Login allowed only for `active`.
- `pending` and `rejected` return clear 403 messages.

### Admin Side
- `GET /api/admin/users?status=pending`
- `PATCH /api/admin/users/{id}/approve`
- `PATCH /api/admin/users/{id}/reject`
- Record all decisions in admin action logs.

### Verification
- Pending users cannot log in.
- Approval activates account immediately.
- Rejection blocks login and stores reason.

---

## Phase 4 - Google OAuth (Week 2, Early)

### Backend Endpoints
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`

### Flow
- Exchange auth code with Google.
- Upsert user by `(provider, provider_user_id)` or verified email policy.
- Create/update user with `provider=google` and `email_verified=true`.
- Issue internal JWT session.

### Security
- Enforce `state` validation.
- Restrict redirect URIs to production/staging domains.

### Verification
- New OAuth signup enters pending queue.
- Existing OAuth user returns to login correctly.

---

## Phase 5 - Email Notifications (Week 2, Mid)

### Templates
- Signup received (pending)
- Approved
- Rejected

### Delivery Strategy
- Prefer async dispatch (queue/background task) with retry policy.
- Log delivery outcomes for admin troubleshooting.

### Verification
- Emails sent on each status transition.
- Failures retried and visible in logs.

---

## Phase 6 - Admin/User UI Completion (Week 2, Late)

### Admin UI
- Add approval queue tab/filter (`pending`).
- Approve/reject actions with optional reason.
- Force refresh or cache invalidation after action.

### User UX
- Signup completion page states: pending/approved/rejected.
- Login error messages mapped to account status.

### Verification
- End-to-end scenario tests for each status path.

---

## Phase 7 - Release and Monitoring (Week 3)

### Rollout
- Canary release (10% -> 50% -> 100%).
- Feature flag for approval gate (quick rollback).

### Monitoring
- Auth error rate
- Approval queue latency
- Email delivery success rate
- Login success rate by status/provider

---

## 5) Risk Register

### Risk: OAuth redirect mismatch
- Mitigation: register exact staging/prod callback URLs before release.

### Risk: Email delivery to spam/junk
- Mitigation: configure SPF, DKIM, DMARC before enabling notifications.

### Risk: Admin list stale cache
- Mitigation: reduce users-tab TTL or force refresh after approval actions.

### Risk: Existing users blocked accidentally
- Mitigation: migration default `status=active` and pre-release data audit.

## 6) Implementation Order (Strict)

1. Register failure-handling hotfix
2. Cloudflare app/API routing baseline
3. User status schema + auth gating
4. Admin approval endpoints + logs
5. Admin UI approval queue
6. Google OAuth
7. Transactional email
8. Canary rollout + monitoring

## 7) Operational Checklist

- [ ] Domain purchased and DNS managed in Cloudflare
- [ ] Pages deployed with production env vars
- [ ] API proxied via Cloudflare with WAF/rate limits
- [ ] DB migration applied (status/provider fields)
- [ ] Approval APIs protected by admin auth
- [ ] OAuth client configured for prod/staging callbacks
- [ ] Email sender domain authenticated (SPF/DKIM/DMARC)
- [ ] Admin queue UX tested
- [ ] End-to-end test cases passed

## 8) Notes for Team Adoption

- Keep local email/password login during transition (fallback path).
- Do not couple approval state to temporary user-limiting fields.
- Treat approval decisions as auditable admin actions.
