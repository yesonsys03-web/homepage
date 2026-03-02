# Admin User Enforcement Plan (v1)

## Goal
- Provide an operationally safe workflow for suspicious account handling: suspend first, delete later with safeguards.

## Scope
- Backend policy/status model
- Admin APIs for suspend/delete workflow
- Admin UI controls in Users tab
- Audit logging and scheduled cleanup
- Regression/security tests

## Epic A: Account Enforcement and Deletion

### A-1. Extend User Status Model
- **Objective**: Expand `users.status` to `active | limited | suspended | pending_delete | deleted`.
- **Tasks**:
  - Add/normalize status values in DB layer.
  - Add optional metadata columns for enforcement lifecycle.
- **Done when**: status transitions are represented and queryable in backend models.

### A-2. Add Suspend/Unsuspend/Revoke APIs
- **Objective**: Let admins immediately block suspicious accounts.
- **Endpoints**:
  - `POST /api/admin/users/{id}/suspend`
  - `DELETE /api/admin/users/{id}/suspend`
  - `POST /api/admin/users/{id}/tokens/revoke`
- **Rules**:
  - Admin auth required.
  - Reason required for suspend.
  - Action must be logged.

### A-3. Add Deletion Workflow APIs
- **Objective**: Safe deletion with grace period and role guard.
- **Endpoints**:
  - `POST /api/admin/users/{id}/delete-schedule`
  - `DELETE /api/admin/users/{id}/delete-schedule`
  - `POST /api/admin/users/{id}/delete-now` (super_admin only)
- **Rules**:
  - Prevent self-delete and privileged-account delete.
  - Keep soft-delete first, hard-delete only by policy.

### A-4. Enforce Status in Auth Paths
- **Objective**: Block access for disallowed statuses.
- **Tasks**:
  - Apply checks in login and token-authenticated user resolution.
- **Done when**: `suspended | pending_delete | deleted` cannot authenticate.

### A-5. Audit Log Expansion
- **Objective**: Preserve full enforcement traceability.
- **Action types**:
  - `user_suspended`
  - `user_unsuspended`
  - `user_delete_scheduled`
  - `user_deleted`
  - `user_tokens_revoked`
- **Rules**:
  - Reason required where applicable.
  - Sensitive text masking remains enabled.

### A-6. Admin UI Controls (Users Tab)
- **Objective**: Provide safe operator actions.
- **UI items**:
  - Status badge display.
  - Action buttons: suspend, unsuspend, schedule delete, cancel delete, delete now.
  - Confirmation modal with required reason for destructive actions.

### A-7. Scheduled Purge Job
- **Objective**: Execute pending deletions after grace period.
- **Tasks**:
  - Add periodic backend task to process due `pending_delete` accounts.
  - Record purge actions in audit logs.

### A-8. Regression/Security Test Set
- **Objective**: Prevent privilege and state-transition regressions.
- **Tests**:
  - Role guards (admin vs super_admin).
  - Status transition validity.
  - Auth denial for blocked statuses.
  - Deletion scheduling and purge execution.

## Recommended Implementation Order
1. A-1 -> A-2 -> A-4
2. A-5 -> A-6
3. A-3 -> A-7
4. A-8 final pass

## Minimum Launch Criteria
- Enforcement APIs deployed with role checks
- Users-tab controls available to admins
- Audit logs generated for all enforcement actions
- Regression tests green in CI
