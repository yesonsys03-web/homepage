# D-3 성능 기준선 명세

## 목적

편집 기능 성능 회귀를 정량 기준으로 판단한다.

## 문서 상태

- 상태: Draft v1
- Sprint: 3
- 선행: B-3
- 후행: E-1

## 측정 도구

- Lighthouse CI
- Web Vitals (LCP, INP, CLS)
- 커스텀 편집 이벤트 메트릭

## 측정 시나리오

- 편집기 초기 로딩
- 블록 추가/정렬 후 프리뷰 전환
- draft 저장 왕복 시간

## 기준선(초안)

- 편집기 초기 로딩: p75 2.5s 이내
- draft 저장 응답: p75 800ms 이내
- 프리뷰 전환: p75 500ms 이내

## 회귀 판단

- 기준선 대비 20% 이상 악화 시 경고
- 35% 이상 악화 시 릴리즈 차단 검토

## DoD

- 측정 도구 고정
- 핵심 시나리오별 기준선 수치 문서화
- CI/스테이징 재현 측정 절차 문서화

## 구현 반영 (Sprint 3)

- API
  - 페이지 편집 성능 스냅샷: `GET /api/admin/perf/page-editor`
  - 페이지 편집 성능 이벤트 수집: `POST /api/admin/perf/page-editor/events`
- 수집 시나리오
  - `editor_initial_load` (편집기 초기 로딩)
  - `draft_save_roundtrip` (draft 저장 왕복)
  - `preview_switch` (프리뷰 디바이스 전환)
- 기준선 산출
  - 서버는 최근 샘플 윈도우에서 시나리오별 `p75_ms`, `p95_ms`, `sample_count`를 계산
  - SLO(`editor_initial_load=2500ms`, `draft_save_roundtrip=800ms`, `preview_switch=500ms`) 대비 `within_slo`를 응답
- 화면/클라이언트
  - `AdminPages`가 초기 로딩/저장/프리뷰 전환 시 성능 이벤트를 자동 전송
  - 이벤트는 감사 로그(`action_type=page_perf_*`)에도 남겨 운영 추적 가능

## 변경 이력

- 2026-03-04: Sprint 3 초안 작성
- 2026-03-04: D-3 성능 이벤트 수집/스냅샷 API 및 AdminPages 계측 반영
