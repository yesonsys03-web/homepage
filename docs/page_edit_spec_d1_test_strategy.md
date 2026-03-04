# D-1 테스트 전략 명세

## 목적

페이지 편집 도메인의 회귀를 방지하는 테스트 범위와 우선순위를 확정한다.

## 문서 상태

- 상태: Draft v2
- Sprint: 3
- 선행: A-3, C-1, C-2, B-2
- 후행: E-1

## 테스트 계층

### 단위 테스트

- 블록 유효성 검증
- 상태 전이 로직(dirty/saving/conflict)
- 권한 조건 분기

### 통합 테스트

- draft 저장/충돌/재시도
- publish 및 reason 필수
- rollback 후 버전 증가/로그 기록

### E2E 테스트

- 편집 -> 저장 -> 프리뷰 -> publish
- 충돌 발생 시 처리
- rollback 후 재게시 시나리오

## 우선순위

1. publish/rollback 권한 회귀
2. 저장 충돌(409) 처리
3. 버전 이력 정합성
4. 가드레일(blocking/warning) 동작

## 필수 테스트 매트릭스 (Sprint 3 적용)

### 백엔드 통합

- Draft 저장 충돌(409) + conflict 로그 기록
  - 파일: `server/tests/test_admin_page_editor_api.py`
  - 케이스: `test_update_admin_page_draft_conflict_writes_conflict_log`
- Publish reason/권한/최신버전 충돌
  - 파일: `server/tests/test_admin_page_editor_api.py`
  - 케이스: `test_publish_admin_page_success`, `test_publish_admin_page_returns_conflict_when_not_latest_draft`
- Publish 검증 실패(422) + 실패 로그 기록
  - 파일: `server/tests/test_admin_page_editor_api.py`
  - 케이스: `test_publish_admin_page_validation_failure_writes_failed_log`
- 버전 비교(diff) 응답 정합성
  - 파일: `server/tests/test_admin_page_editor_api.py`
  - 케이스: `test_compare_admin_page_versions_returns_diff_summary`

### 프론트 단위/통합

- 가드레일 blocking/warning 계산
  - 파일: `src/components/screens/admin/pages/pageEditorGuardrails.test.ts`
- 버전 비교 UI + 결과 표시
  - 파일: `src/components/screens/admin/pages/AdminPages.workflow.test.tsx`
  - 케이스: `shows compare diff result in versions tab`
- 저장 충돌 UI(배너 + 최신 draft 불러오기 버튼)
  - 파일: `src/components/screens/admin/pages/AdminPages.workflow.test.tsx`
  - 케이스: `shows conflict banner and reload button on draft save conflict`

## 회귀 우선순위 운영 규칙

- P0(머지 차단): 권한 회귀, publish/rollback 실패, 버전 정합성 손상
- P1(릴리즈 전 해결): 충돌 UX, diff 결과 왜곡, 가드레일 오탐/미탐
- P2(후속): 비핵심 편집 UX 경고 문구/표현 개선

## 최소 커버리지 기준 (Sprint 3 종료 목표)

- 백엔드 페이지 에디터 API 핵심 분기(200/403/404/409/422) 최소 1회 이상 검증
- 프론트 AdminPages 핵심 플로우(비교/충돌/저장) 최소 1회 이상 UI 회귀 테스트 보유
- 신규 API/가드레일 변경 시 관련 테스트 1개 이상 동반 추가

## DoD

- 필수 시나리오 테스트 매트릭스 작성
- 회귀 우선순위 문서화
- Sprint 3 종료 전 최소 커버리지 기준 제안

## 변경 이력

- 2026-03-04: Sprint 3 초안 작성
- 2026-03-04: Sprint 3 C-3 반영에 맞춰 테스트 매트릭스/운영 기준 구체화
