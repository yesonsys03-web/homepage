# 바이브 용어사전 구현 체크리스트 (VIBE_09)

> 역할: `VIBE_07`, `VIBE_08`을 실제 작업 티켓 단위로 나눈 실행 체크리스트

---

## 1. 프론트 작업

### FE-01. Glossary 상단 추천 영역 재정의

- 대상: `src/components/TodayGlossaryCards.tsx`
- 목표: `오늘의 추천 용어`를 `오늘 막힘 방지 3개` 경험으로 전환
- 해야 할 일:
  - title/description 기본 카피 변경
  - `이럴 때 써요` 노출 가능 구조 검토
  - CTA를 `용어 보기` 외 패턴까지 확장 가능하게 설계
  - 이 단계는 카피/컴포넌트 구조 정리까지를 기본 범위로 하고, DB today API 연동은 포함하지 않는다
- 완료 기준:
  - `GlossaryScreen`에서 새 카피 적용 가능

### FE-02. 상황 필터 추가

- 대상: `src/components/screens/GlossaryScreen.tsx`
- 목표: 카테고리 외에 상황 기반 필터 레이어 추가
- 해야 할 일:
  - `selectedScenario` 상태 추가
  - UI 라벨은 `처음 시작 / 실행 / 에러 / 배포 / 고급`을 사용하되, 내부 canonical 값은 `workflow_tags` 집합(`setup`, `run`, `error`, `deploy`, `advanced`)을 따른다
  - 필터 UI 구현
  - 필터 조건에 맞는 카드 목록 계산
- 완료 기준:
  - 사용자가 `처음 시작 / 실행 / 에러 / 배포 / 고급`으로 카드 축소 가능

### FE-03. 실행 중심 카드 분리

- 대상: 신규 `GlossaryCommandCard` 또는 `GlossaryScreen` 내부 카드 렌더
- 목표: 카드 구조를 실행 중심 레이아웃으로 전환
- 해야 할 일:
  - 한 줄 뜻 / 쉬운 비유 / 이럴 때 써요 / 명령어 순서 반영
  - 복사 CTA 추가
  - 위험도 배지 추가
  - Launchpad CTA 추가
- 완료 기준:
  - 카드 하나만 보고도 복사와 다음 행동이 가능

### FE-04. 위험 명령어 시각 분리

- 대상: glossary 카드 공통 UI
- 목표: 위험 명령어를 기본 카드와 다르게 보이게 처리
- 해야 할 일:
  - 공통 경고 UI 추가
  - `고급/주의` 필터와 연동
- 완료 기준:
  - 위험 명령어가 일반 추천 목록과 명확히 구분됨

### FE-05. Glossary -> Launchpad 딥링크 연결

- 대상: `src/components/screens/GlossaryScreen.tsx`, `src/components/screens/launchpad/LaunchpadTab.tsx`
- 목표: 카드 CTA에서 런치패드의 맞는 블록으로 이동
- 해야 할 일:
  - `initialSubTab` / `focusCommandSlug` 입력 설계
  - `focusCommandSlug`는 glossary term `slug`를 기준으로 하고, static phase에서는 `id`를 동일 값으로 취급
  - 탭 전환 후 포커스 이동 처리
  - 타겟을 찾지 못하면 launchpad 기본 탭으로 fallback 처리
- 완료 기준:
  - 카드 클릭 후 해당 실습 블록으로 이동 가능

### FE-06. 보조 영역 정리

- 대상: `GlossaryCardGallery`, 용어 신청 섹션
- 목표: 핵심 탐색 흐름을 방해하지 않도록 우선순위 조정
- 해야 할 일:
  - 갤러리 위치 재검토
  - 용어 신청 섹션의 배치 유지 또는 축소 판단
- 완료 기준:
  - 메인 학습 흐름이 상단에서 끊기지 않음

---

## 2. 백엔드 작업

### BE-01. glossary terms 스키마 추가

- 대상: `server/db.py`
- 목표: 사용자 노출용 glossary term 저장 구조 확보
- 해야 할 일:
  - `glossary_terms` 테이블 추가
  - slug/status/risk_level/workflow_tags 필드 포함
  - `related_slugs`를 canonical 필드로 포함
- 완료 기준:
  - active/pending/rejected/archived 상태 저장 가능

### BE-02. generation run / candidate 로그 테이블 추가

- 대상: `server/db.py`
- 목표: 실행 단위와 후보 단위를 따로 기록
- 해야 할 일:
  - `glossary_generation_runs`
  - `glossary_generation_candidates`
- 완료 기준:
  - 어떤 생성 시도가 왜 성공/실패했는지 추적 가능

### BE-03. glossary generation 유틸 분리

- 대상: 신규 유틸 또는 `server/gemini_curator.py`
- 목표: glossary 전용 프롬프트와 응답 정규화 처리
- 해야 할 일:
  - 입력 컨텍스트 구성
  - JSON 응답 파싱
  - 구조/길이 검증
- 완료 기준:
  - 3개 초안 생성 함수가 독립 호출 가능

### BE-04. 중복/위험도 검증 추가

- 대상: glossary generation pipeline
- 목표: 초안 저장 전 안전/중복 필터 적용
- 해야 할 일:
  - slug dedupe
  - term dedupe
  - 위험 명령어 탐지
  - validation_errors 기록
  - static `related`를 `related_slugs`로 정규화하는 import 규칙 반영
- 완료 기준:
  - 중복/위험 초안이 무분별하게 active로 가지 않음

### BE-05. scheduler 연결

- 대상: `server/main.py`, `server/scheduler.py`
- 목표: 하루 1회 glossary draft 생성 등록
- 해야 할 일:
  - 반복 작업 등록
  - 실행 로그 기록
  - 중복 실행 방지 전략 반영
- 완료 기준:
  - 수동/정기 실행 모두 가능

### BE-06. 사용자용 glossary API 추가

- 대상: 신규 routes 또는 기존 public routes
- 목표: active term 조회 API 제공
- 해야 할 일:
  - `GET /api/glossary/terms`
  - `GET /api/glossary/terms/today`
  - `/today` 응답에 `one_liner`, `when_appears`, `risk_level`, `workflow_tags`, `selection_rule` 포함
  - `오늘 3개` 선정 규칙은 featured -> recent safe -> fallback deterministic rule을 따른다
- 완료 기준:
  - 프론트가 정적 데이터 외 DB term을 읽을 수 있음

### BE-07. 관리자 glossary 검수 API 추가

- 대상: 신규 admin routes
- 목표: pending term 검수 가능
- 해야 할 일:
  - pending 목록 조회
  - approve/reject
  - generate-now 수동 트리거
  - admin action log 기록
- 완료 기준:
  - 운영자가 UI에서 생성 결과를 검수 가능

### BE-08. 관리자 glossary 직접 편집 API 추가

- 대상: 신규 admin routes
- 목표: pending 뿐 아니라 active glossary command도 어드민이 쉽게 수정 가능
- 해야 할 일:
  - `GET /api/admin/glossary/terms`
  - `PATCH /api/admin/glossary/{id}`
  - write action log 기록
  - `updated_at`, `updated_by` 반영
- 완료 기준:
  - 운영자가 표시 중인 command 문구를 즉시 수정 가능

---

## 3. 관리자 UI 작업

### ADM-01. pending glossary 목록 화면

- 목표: 생성 초안 리스트 확인
- 보여줄 것:
  - term
  - one_liner
  - analogy
  - risk_level
  - validation flags
  - source_model

### ADM-02. approve / reject 액션

- 목표: 관리자 승인 흐름 완성
- 해야 할 일:
  - 승인 버튼
  - 반려 버튼
  - 필요 시 수정 후 승인

### ADM-03. active glossary 편집 화면

- 목표: 노출 중 command를 빠르게 직접 수정
- 보여줄 것:
  - term
  - one_liner
  - analogy
  - when_appears
  - workflow_tags
  - risk_level
  - related_slugs
  - status
  - 저장 버튼

### ADM-04. run history / observability

- 목표: 생성 성공률과 반려율 추적
- 보여줄 것:
  - 실행 시간
  - 생성 수
  - 저장 수
  - 반려 수
  - 에러 여부

---

## 4. 단계별 추천 순서

주의:
- 구현 순서상 `BE-07`이 `BE-06`보다 앞선 이유는, 관리자 승인 흐름이 먼저 있어야 public `active` API 의미가 안정되기 때문이다.
- `FE-01`은 DB 연동 전에도 시작할 수 있지만, `FE-05`와 `BE-06`은 `VIBE_08`의 계약 결정 이후 진행한다.

1. BE-01
2. BE-02
3. BE-03
4. BE-04
5. BE-05
6. BE-07
7. BE-08
8. BE-06
9. FE-01
10. FE-02
11. FE-03
12. FE-05
13. FE-04
14. FE-06
15. ADM-01 ~ ADM-04

---

## 5. 연결 문서

- 전략: `docs/VIBE_05_glossary_tk1.md`
- UX: `docs/VIBE_06_glossary_easyflow_mvp.md`
- 프론트 실행 계획: `docs/VIBE_07_glossary_component_execution.md`
- 기술 설계: `docs/VIBE_08_glossary_pipeline_tech_design.md`
