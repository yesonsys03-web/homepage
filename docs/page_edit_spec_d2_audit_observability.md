# D-2 감사 로그/관측 명세

## 목적

운영 이벤트를 추적 가능하게 정의해 감사/장애 대응 속도를 높인다.

## 문서 상태

- 상태: Draft v2
- Sprint: 3
- 선행: C-2, C-3
- 후행: E-3

## 이벤트 스키마

- 공통 필드:
  - `event_type`
  - `actor_id`
  - `page_id`
  - `timestamp`
  - `reason?`

## 필수 이벤트

- `page_draft_saved`
- `page_published`
- `page_rolled_back`
- `page_publish_failed`
- `page_conflict_detected`

## 저장 경로

- 기존 `admin_action_logs` 인프라 재사용
- action_type 표준화하여 검색 가능성 확보

## 운영 지표

- 일별 publish 횟수
- rollback 비율
- 평균 충돌 발생률
- publish 실패 원인 분포

## DoD

- 이벤트 스키마/필수 필드 문서화
- 대시보드 지표 목록 문서화
- 검색/필터 기준(action_type, page_id, actor) 문서화

## 구현 반영 (Sprint 3)

- API
  - 로그 조회: `GET /api/admin/action-logs`
    - query: `limit`, `action_type`, `actor_id`, `page_id`
  - 관측 지표: `GET /api/admin/action-logs/observability`
    - query: `window_days` (1~90)
- 지표 산출
  - 일별 publish 횟수: `action_type=page_published` 일 단위 집계
  - rollback 비율: `page_rolled_back / page_published`
  - 평균 충돌 발생률: `page_conflict_detected / (page_draft_saved + page_conflict_detected)`
  - publish 실패 원인 분포: `action_type=page_publish_failed`의 reason 그룹 집계
- 화면
  - `AdminLogs`에 action/page/actor 필터 입력과 지표 카드/분포 패널 제공

## 변경 이력

- 2026-03-04: Sprint 3 초안 작성
- 2026-03-04: 필터/관측 API 및 AdminLogs 지표 UI 반영
