# 바이브 용어사전 컴포넌트 실행 계획서 (VIBE_07)

> 역할: `VIBE_06`의 UX 방향을 실제 프론트 컴포넌트 변경 단위로 쪼갠 실행 문서
> 기준 문서: `docs/VIBE_06_glossary_easyflow_mvp.md`

---

## 1. 목표

`/glossary`를 현재의 "정적 용어 카드 목록"에서,
코알못이 상황을 먼저 이해하고 바로 복사/실행까지 이어질 수 있는 구조로 바꾼다.

이 문서는 UI 구현을 아래 단위로 쪼갠다.

1. 화면 상단 추천 영역
2. 상황 필터 레이어
3. 명령어 카드 레이아웃
4. Launchpad 연결 동선
5. 점진 적용 순서

---

## 2. 현재 구조 기준점

현재 주요 진입점:
- `src/components/screens/GlossaryScreen.tsx`
- `src/components/TodayGlossaryCards.tsx`
- `src/components/GlossaryCardGallery.tsx`
- `src/components/screens/launchpad/LaunchpadTab.tsx`

현재 상태 요약:
- 메인 탭은 이미 `용어사전 / 런치패드` 구조를 갖고 있다.
- 추천 카드(`TodayGlossaryCards`)는 존재하지만 "오늘 막힘 방지 3개" 역할로 재정의 필요
- 카테고리 필터는 있으나 상황 필터는 없음
- 개별 카드에는 복사 CTA, 위험도 배지, Launchpad CTA가 없음

---

## 3. 변경 대상 컴포넌트

### 3-1. `GlossaryScreen.tsx`

역할:
- `/glossary` 메인 오케스트레이션
- 메인 탭 전환
- 검색/필터/포커스 상태 관리

이번 변경 목표:
1. 상황 필터 상태 추가
2. 상단 히어로 문구를 `VIBE_06` 기준으로 변경
3. 카드 리스트에 새 액션 전달
4. Launchpad 딥링크 상태 연결

필요 상태 예시:
- `selectedScenario`
- `highlightSource`
- `launchpadTargetCommand`

### 3-2. `TodayGlossaryCards.tsx`

현재 역할:
- 오늘의 추천 용어 3장 노출

변경 목표:
1. 제목/설명을 `오늘 막힘 방지 3개` 기준으로 조정 가능하게 만들기
2. 카드에 `이럴 때 써요` 정보 추가 검토
3. `복사하기` 또는 `먼저 보기` CTA 패턴 분리

권장 판단:
- 완전 신규 컴포넌트를 만들기보다 먼저 확장형으로 가져가는 편이 안전하다.

### 3-3. `GlossaryCardGallery.tsx`

현재 역할:
- 구경용 카드 갤러리

판단:
- MVP 핵심 루프와 직접 연결되는 컴포넌트는 아니다.
- 유지하되 우선순위는 낮다.

권장 처리:
- Phase 1에서는 유지
- 필요 시 "탐색 갤러리" 보조 영역으로만 사용

### 3-4. 개별 용어 카드 영역 (`GlossaryScreen.tsx` 내부)

현재 역할:
- 필터 결과를 카드 리스트로 렌더

변경 목표:
1. 정보 순서를 `한 줄 뜻 -> 쉽게 말하면 -> 이럴 때 써요 -> 명령어`로 재배치
2. `복사하기` CTA 추가
3. `관련 용어 보기` CTA 유지/강화
4. `런치패드에서 따라하기` CTA 추가
5. 위험도 배지 추가

권장 판단:
- 초기에는 인라인 렌더를 유지해도 되지만,
- 액션이 늘어나므로 `GlossaryCommandCard` 신규 분리가 장기적으로 낫다.

### 3-5. `LaunchpadTab.tsx`

현재 역할:
- `guide / tips / clinic` 서브탭 전환

변경 목표:
1. 외부에서 특정 서브탭과 특정 명령어 블록을 포커스할 수 있게 확장
2. `Glossary -> Launchpad` 이동 시 진입 지점을 잃지 않게 처리

권장 추가 입력:
- `initialSubTab?`
- `focusCommandSlug?`

---

## 4. 신규 컴포넌트 제안

### 4-1. `GlossaryScenarioFilter`

역할:
- 카테고리와 별개로 "처음 시작 / 실행 / 에러 / 배포 / 고급" 필터 제공

이유:
- 현재 `selectedCategory`만으로는 코알못의 실제 과업 흐름을 반영하기 어렵다.

### 4-2. `GlossaryCommandCard`

역할:
- 실행 중심 카드 표현 전담

담아야 할 것:
- 상황 배지
- 위험도 배지
- 한 줄 뜻
- 쉬운 비유
- 언제 쓰는지
- 명령어 코드 줄
- 복사 CTA
- Launchpad CTA
- 관련 용어 CTA

### 4-3. `GlossaryDangerNotice`

역할:
- 위험 명령어 공통 경고 UI

이유:
- `고급/주의` 탭과 개별 카드에서 같은 경고 톤을 재사용 가능

---

## 5. 상태와 데이터 연결

### 5-1. 현재 데이터

현재 glossary 데이터는 `src/data/glossary.ts` 정적 배열 기반이다.

현재 필드:
- `id`
- `term`
- `emoji`
- `category`
- `one_liner`
- `analogy`
- `when_appears`
- `related`
- `level`

### 5-2. 프론트 임시 확장 전략

백엔드 연동 전까지는 아래를 프론트 계산값으로 둘 수 있다.

- `scenario_tags`
- `risk_level`
- `launchpad_target`

이유:
- 백엔드 파이프라인이 준비되기 전에도 UX 구현을 먼저 진행할 수 있다.

---

## 6. 구현 순서

### Step 1. `GlossaryScreen` 상단 구조 개편

- `TodayGlossaryCards` 카피 교체
- 상황 필터 추가
- 상단 설명 문구를 `VIBE_06` 기준으로 교체

### Step 2. 명령어 카드 컴포넌트 분리

- 기존 카드 렌더를 `GlossaryCommandCard`로 이동
- 복사 버튼과 Launchpad CTA 추가
- 위험도 배지 적용

### Step 3. Launchpad 딥링크 연결

- `LaunchpadTab`에 외부 포커스 입력 추가
- 특정 명령어 블록으로 스크롤 이동 가능하게 구성

### Step 4. 보조 영역 조정

- `GlossaryCardGallery` 우선순위 재배치
- 없는 용어 신청 섹션을 메인 탐색 흐름 뒤로 유지

---

## 7. 수용 기준

완료로 보기 위한 최소 조건:

1. 사용자가 상황 필터를 통해 카드를 줄일 수 있다.
2. 카드에서 바로 명령어를 복사할 수 있다.
3. 카드에서 Launchpad로 이동할 수 있다.
4. 위험 명령어는 일반 카드와 시각적으로 분리된다.
5. 현재 정적 glossary 데이터만으로도 화면이 깨지지 않는다.

---

## 8. 연결 문서

- 전략 기준: `docs/VIBE_05_glossary_tk1.md`
- UX 기준: `docs/VIBE_06_glossary_easyflow_mvp.md`
- 이슈 체크리스트: `docs/VIBE_09_glossary_issue_checklist.md`
- 실습 연결: `docs/VIBE_04_launchpad.md`
