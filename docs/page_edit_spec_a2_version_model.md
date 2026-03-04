# A-2 버전 저장 모델 설계

## 목적

Draft/Published/Version 이력을 일관되게 저장하고 롤백 가능하도록 모델을 정의한다.

## 문서 상태

- 상태: Draft v1
- Sprint: 1
- 선행: A-1
- 후행: A-3, C-3

## 모델 개요

### 1) page_documents_current

- 역할: 페이지별 최신 draft/published 포인터
- 주요 필드:
  - `page_id` (PK)
  - `draft_version`
  - `published_version`
  - `updated_by`
  - `updated_at`

### 2) page_document_versions

- 역할: 스냅샷 저장(append-only)
- 주요 필드:
  - `page_id`
  - `version`
  - `status` (`draft` | `published`)
  - `document_json` (A-1 `PageDocument`)
  - `reason` (publish/rollback 시 필수)
  - `created_by`
  - `created_at`
- PK: (`page_id`, `version`)

## 버전 증가 정책

- Draft 저장(`PUT /draft`):
  - 같은 편집 세션에서도 저장 시 `version +1` (불변 이력 유지)
- Publish:
  - 현재 draft_version을 published_version으로 승격
  - 필요 시 published 스냅샷을 별도 기록
- Rollback:
  - 대상 version을 새로운 draft로 복제하여 새 version 부여
  - 즉시 publish 여부는 API 옵션으로 분리

## 동시성 정책(초안)

- 낙관적 동시성 기본:
  - 요청에 `baseVersion` 포함
  - 서버 최신 draft_version과 다르면 409 반환
- 편집 락 모델은 후속(Phase 4) 검토

## 감사 로그 연결

다음 액션은 기존 `admin_action_logs` 인프라로 기록한다.

- `page_draft_saved`
- `page_published`
- `page_rolled_back`

## 보존/정리

- 버전 이력은 기본 무기한 보존
- 대용량 페이지는 압축 저장 옵션 검토

## 변경 이력

- 2026-03-04: Sprint 1 초기 설계 작성
