# D-2 감사 로그/관측 명세

## 목적

운영 이벤트를 추적 가능하게 정의해 감사/장애 대응 속도를 높인다.

## 문서 상태

- 상태: Draft v1
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

## 변경 이력

- 2026-03-04: Sprint 3 초안 작성
