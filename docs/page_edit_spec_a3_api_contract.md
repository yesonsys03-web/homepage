# A-3 API 계약

## 목적

페이지 편집 흐름의 서버 계약을 고정해 프론트/백엔드 재작업을 줄인다.

## 문서 상태

- 상태: Draft v1
- Sprint: 1
- 선행: A-1, A-2
- 후행: C-1, C-2, C-3

## 공통 규칙

- 인증: admin 이상
- 권한: publish/rollback은 A-4 정책 적용
- 에러 포맷: `{ code, message, field_errors }`

## Endpoints

### 1) GET `/api/admin/pages/:id/draft`

- 설명: 최신 draft 조회
- 200: `PageDocument`
- 404: 페이지 없음

### 2) PUT `/api/admin/pages/:id/draft`

- 설명: draft 저장(새 version 생성)
- 요청:
  - `baseVersion: number`
  - `document: PageDocument`
  - `reason?: string`
- 200:
  - `savedVersion: number`
  - `document: PageDocument`
- 409: 동시성 충돌(`baseVersion` mismatch)
- 422: 유효성 실패

### 3) POST `/api/admin/pages/:id/publish`

- 설명: 현재 draft publish
- 요청:
  - `reason: string` (필수)
  - `draftVersion?: number` (지정 publish)
- 200:
  - `publishedVersion: number`
  - `publishedAt: string`
- 403: 권한 부족

### 4) GET `/api/admin/pages/:id/versions`

- 설명: 버전 목록 조회
- 쿼리:
  - `limit` (default 50)
  - `cursor?`
- 200:
  - `items: Array<{ version, status, createdBy, createdAt, reason? }>`
  - `nextCursor: string | null`

### 5) GET `/api/admin/pages/:id/versions/:version`

- 설명: 특정 버전 상세 조회
- 200: `PageDocument`
- 404: 버전 없음

### 6) POST `/api/admin/pages/:id/rollback`

- 설명: 특정 버전을 새로운 draft로 복원
- 요청:
  - `targetVersion: number`
  - `reason: string` (필수)
  - `publishNow?: boolean` (default false)
- 200:
  - `restoredDraftVersion: number`
  - `publishedVersion?: number`
- 403: 권한 부족

## 감사 로그 이벤트

- `page_draft_saved`
- `page_published`
- `page_rolled_back`

기존 `admin_action_logs` 저장 경로를 재사용한다.

## 변경 이력

- 2026-03-04: Sprint 1 계약 초안 작성
