# Page Edit 기능 개선 통합 문서 (최종)

이 문서는 `docs/` 내 Page Edit 관련 분산 문서를 통합한 단일 기준 문서다.
기획(초안), 스프린트 계획, 운영 가이드, 성능/롤아웃/마이그레이션 내용을 현재 구현 상태 기준으로 정리했다.

## 목차

- [1) 목적과 현재 상태](#sec-1)
- [2) 구현 완료 범위](#sec-2)
- [3) 권한 및 운영 원칙](#sec-3)
- [4) 주요 API 레퍼런스](#sec-4)
- [5) 운영 Runbook (요약)](#sec-5)
- [6) 성능 기준선](#sec-6)
- [7) 마이그레이션 기준](#sec-7)
- [8) 남은 확장 항목 (선택)](#sec-8)
- [9) 변경 이력](#sec-9)
- [10) 세션별 변경 타임라인](#sec-10)
- [11) 편집 UX 개선 기획 (캔버스/속성 패널)](#sec-11)
- [12) UX 개선 개발 티켓 분해 (U1~U4)](#sec-12)
- [13) Jira 이슈 템플릿 (U1~U4)](#sec-13)

<a id="sec-1"></a>
## 1) 목적과 현재 상태

- 목적: 페이지 편집 기능을 단순 입력 폼에서 운영 가능한 편집 시스템으로 전환
- 현재 상태: Sprint 1~3 범위 완료, 운영/복구 API까지 반영
- 문서 정책: Page Edit 관련 변경 사항은 이 문서 하나만 업데이트

<a id="sec-2"></a>
## 2) 구현 완료 범위

### 핵심 기능

- Draft/Publish 분리
- 버전 이력 조회/비교 및 롤백
- 블록 에디터 MVP (Hero, RichText, Image, CTA)
- Preview (desktop/mobile)
- 권한/감사 로그 연동

### 운영 기능

- 롤아웃 단계 제어 (`qa`/`pilot`/`open`)
- 정책 기반 즉시 차단 (`page_editor_enabled=false`)
- 마이그레이션 preview/execute/dry-run/restore
- 운영 관측 지표 API 및 성능 스냅샷 API

<a id="sec-3"></a>
## 3) 권한 및 운영 원칙

- `admin`: draft 편집 중심
- `super_admin`: publish/rollback/복구 포함 전체 운영 권한
- 민감 작업(publish/rollback/migration restore)은 reason 기반 감사 추적
- UI 숨김이 아니라 서버 권한 검증을 최종 방어선으로 사용

<a id="sec-4"></a>
## 4) 주요 API 레퍼런스

### 페이지 편집

- `GET /api/admin/pages/{page_id}/draft`
- `PUT /api/admin/pages/{page_id}/draft`
- `POST /api/admin/pages/{page_id}/publish`
- `GET /api/admin/pages/{page_id}/versions`
- `GET /api/admin/pages/{page_id}/versions-compare`
- `POST /api/admin/pages/{page_id}/rollback`

### 운영 정책/관측

- `GET /api/admin/policies`
- `PATCH /api/admin/policies`
- `GET /api/admin/action-logs/observability`
- `GET /api/admin/perf/page-editor`
- `POST /api/admin/perf/page-editor/events`

### 마이그레이션

- `GET /api/admin/pages/{page_id}/migration/preview`
- `POST /api/admin/pages/{page_id}/migration/execute`
- `GET /api/admin/pages/{page_id}/migration/backups`
- `POST /api/admin/pages/{page_id}/migration/restore`

<a id="sec-5"></a>
## 5) 운영 Runbook (요약)

### 배포 전

- 롤아웃 단계(`qa`/`pilot`/`open`)가 목표와 일치하는지 확인
- `page_editor_enabled=true` 확인
- diff/preview/validation 결과 확인

### 장애 시 즉시 대응

1. 정책에서 `page_editor_enabled=false`로 즉시 차단
2. 관측/성능 API로 원인 확인
3. 필요 시 rollback 또는 migration restore 수행
4. 로그(`policy_updated`, `page_rolled_back`, `page_migration_restored`) 확인

<a id="sec-6"></a>
## 6) 성능 기준선

- editor initial load: p75 <= 2500ms
- draft save roundtrip: p75 <= 800ms
- preview switch: p75 <= 500ms
- 회귀 판단: 기준선 대비 20% 이상 경고, 35% 이상 릴리즈 차단 검토

<a id="sec-7"></a>
## 7) 마이그레이션 기준

- 1차 대상: `about_page` (핵심 페이지 우선)
- 절차: source 추출 -> 변환 -> validation -> backup -> draft 반영
- `dryRun=true`로 안전 검증 후 실제 적용
- 백업 키 기반 복구 경로를 표준 복구 절차로 사용

<a id="sec-8"></a>
## 8) 남은 확장 항목 (선택)

- 예약 발행
- 충돌 감지 실제 구현(전략 확정 이후)
- tablet preview
- 확장 블록 타입

<a id="sec-9"></a>
## 9) 변경 이력

- 2026-03-05: Page Edit 관련 문서를 본 파일로 통합하고, 분산 스펙/인덱스/핸드오프 문서를 정리함.
- 2026-03-05: 캔버스 미리보기/속성 패널 협소 이슈에 대한 편집 UX 개선 기획(섹션 11) 추가.
- 2026-03-05: UX 개선 실행을 위한 개발 티켓 분해(U1~U4, 섹션 12) 추가.
- 2026-03-05: U1~U4 티켓을 Jira 등록 가능한 이슈 템플릿 형식(섹션 13)으로 변환.
- 2026-03-05: 섹션 11/12/13에 레이아웃 기준 정합화(1440 기준), baseline/종료 기준, 상태 저장 정책, 접근성/리스크/운영 필드 보강.
- 2026-03-05: 단축키 충돌 회피(`Cmd/Ctrl+Shift+1/2/3`), Go/No-Go 악화 임계치(10%) 추가, Jira 템플릿별 필수 운영 필드(TBD) 반영.
- 2026-03-05: U4-01 파일럿 롤아웃 계획을 운영 게이트(진입/모니터링/Go-NoGo/롤백/공유 템플릿) 수준으로 고정.

<a id="sec-10"></a>
## 10) 세션별 변경 타임라인

- 2026-03-04-01: Sprint 3 C-3/D-1/D-2 완료. 버전 비교/롤백 UX, 감사 로그 필터/관측 API, 관련 테스트/빌드 검증 반영.
- 2026-03-04-02: D-3 성능 기준선 구현 시작. `page-editor` 성능 이벤트 수집 및 스냅샷 API 추가, AdminPages 계측 연결.
- 2026-03-04-03: E-1 롤아웃 제어 반영. 정책 필드 확장(`page_editor_enabled`, rollout stage, pilot IDs, 임계치) 및 서버 접근 게이트 적용.
- 2026-03-04-04: E-2 마이그레이션 실행 경로 반영. preview/execute API, dry-run, backup 생성, 변환 스크립트 추가.
- 2026-03-04-05: E-3 운영 가이드 고도화와 migration restore API 반영. runbook/체크리스트/FAQ/API 레퍼런스 보강.
- 2026-03-04-06: backupKey 목록 조회 API(`migration/backups`) 추가로 복구 실행 전 선택/검증 흐름 개선.
- 2026-03-05: 분산된 Page Edit 문서군(one pager, tasks, sprint index, spec 문서)을 본 문서로 통합하고, 학습 로그 참조를 단일 경로로 정리.

<a id="sec-11"></a>
## 11) 편집 UX 개선 기획 (캔버스/속성 패널)

본 섹션은 구현 지시가 아닌 기획안이다. 목표는 현재 편집 화면의 작업 가시성과 입력 효율을 높이는 것이다.

### 11.1 문제 정의

- 현재 레이아웃에서 캔버스 미리보기와 속성 패널의 실사용 폭이 좁아 동시 편집이 불편하다.
- 긴 텍스트/이미지/CTA 속성 편집 시 스크롤 이동이 과도하고, 미리보기 확인-수정 왕복 비용이 크다.
- 결과적으로 편집 시간 증가, 입력 실수 증가, 배포 전 검수 품질 저하가 발생한다.

### 11.2 목표 / 비목표

- 목표
  - 캔버스 가시 영역 확대(특히 desktop)
  - 속성 패널 입력 효율 개선(필드 밀도/고정/접기)
  - 미리보기-편집 전환 횟수 감소
- 비목표
  - 블록 타입 추가/변경
  - API 계약 변경
  - 권한/롤아웃 정책 변경

### 11.3 레이아웃 개선안 (권장안)

- 데스크톱(>=1440px): 3-패널 가변 레이아웃
  - 좌측: 블록 목록/구조(고정 폭 240~300)
  - 중앙: 캔버스 미리보기(최소 720, 우선 확장 영역)
  - 우측: 속성 패널(기본 360, 최소 320, 최대 440)
  - 폭 검증 기준: 최소 조합 240 + 720 + 320 = 1280이며, 1440 기준에서 여백/스크롤바를 포함한 안전 구간을 확보한다.
- 노트북(1024~1439px): 2-패널 + 드로어
  - 중앙 캔버스 우선, 속성 패널은 우측 드로어 토글 방식
- 태블릿/모바일(<1024px): 단일 포커스 모드
  - `캔버스 모드` / `속성 모드`를 상단 탭으로 전환
- 수치 단일 소스 원칙: 패널 폭/브레이크포인트의 기준 수치는 본 섹션(11.3)만 소스로 관리하고, 하위 티켓(12/13)은 참조만 유지한다.

### 11.4 편집 모드 정의

- `Balanced`(기본): 캔버스와 속성 패널 동시 노출
- `Canvas Focus`: 속성 패널 축소/숨김으로 미리보기 최대화
- `Property Focus`: 속성 패널 확장(폼 입력 집중), 캔버스는 썸네일/미니 프리뷰
- 모드 전환 단축키(기획): `Cmd/Ctrl+Shift+1`(Balanced), `Cmd/Ctrl+Shift+2`(Canvas Focus), `Cmd/Ctrl+Shift+3`(Property Focus)
- 모드 상태 저장 정책(기본안): 사용자 로컬(`localStorage`)에 마지막 모드를 저장하고 재진입 시 복원한다. 계정 단위 서버 동기화는 후속 확장으로 분리한다.

### 11.5 속성 패널 사용성 개선

- 패널 상단 고정 헤더: 블록 타입, 저장 상태, 빠른 액션(복제/삭제)
- 섹션 아코디언: Content / Style / Advanced 기본 3그룹
- 중요 필드(제목, CTA 텍스트, URL)는 첫 화면에 우선 배치
- 장문 입력 필드는 높이 확장 가능(기본 6~8줄)
- validation 에러는 필드 근처 + 패널 상단 요약 배지 동시 제공

### 11.6 캔버스 미리보기 개선

- 확대 수준 `80%/100%/120%` 프리셋 제공
- viewport 토글(desktop/mobile)은 상단 고정 컨트롤 유지
- 선택된 블록은 캔버스 내 하이라이트, 패널과 양방향 동기화
- 스크롤 위치 보존: 패널 수정 후 캔버스 복귀 시 동일 위치 유지

### 11.7 성공 지표 (UX KPI)

- "블록 1개 수정 완료 시간" 25% 이상 단축
- "미리보기-속성 패널 왕복 횟수" 30% 이상 감소
- "편집 중 스크롤 거리" 20% 이상 감소
- "배포 전 검수 누락"(QA 발견) 20% 이상 감소
- 기준점(baseline): 구현 전 태스크 인터뷰(11.8)에서 측정한 값을 baseline으로 사용한다.

### 11.8 검증 계획 (구현 전/후)

- 구현 전: 운영자 3~5명 태스크 기반 인터뷰(현행 pain point 계량)
- 구현 후: 동일 시나리오 A/B 비교(기존 vs 개선 UI)
- A/B 종료 기준: 최소 2주 운영 또는 누적 30개 태스크 완료(둘 중 하나 충족) + 참여자 3~5명 데이터 확보 시 종료
- 측정 시나리오
  - Hero 문구/CTA 동시 수정
  - 이미지 교체 + 정렬 변경
  - mobile 미리보기 기준 최종 검수

### 11.9 단계별 실행 계획 (기획)

- Phase U1: 레이아웃 와이어프레임 확정 (Desktop/Notebook/Tablet)
- Phase U2: 인터랙션 명세 확정 (모드 전환, 패널 토글, 동기화)
- Phase U3: QA 시나리오/측정 지표 확정
- Phase U4: 개발 티켓 분해 및 우선순위 확정

### 11.10 리스크 및 대응

- 리스크: 패널 기능이 늘며 복잡도가 증가할 수 있음
  - 대응: 기본 모드는 단순 유지, 고급 옵션은 접힌 상태 기본값
- 리스크: 화면 크기별 일관성 저하
  - 대응: 브레이크포인트별 단일 원칙(캔버스 우선) 고정
- 리스크: 줌/하이라이트/패널-캔버스 동기화 동시 동작 시 렌더 부하 증가
  - 대응: 동기화 이벤트 debounce 적용, 줌은 CSS transform 기반으로 제한
- 리스크: 기존 `AdminPages` 상태 관리 구조 영향도 확산
  - 대응: U1 완료 후 영향도 분석을 U2 착수 gate 조건으로 강제

### 11.11 결정 필요 항목

- 기본 모드를 `Balanced`로 고정할지 여부(기본안: 고정)
- 노트북 구간에서 속성 패널 기본 상태(열림/닫힘)
- 속성 패널 최대 폭(440 유지 vs 460으로 확대) 기준
- 모드 상태 저장 범위(`localStorage` 고정 vs 계정 단위 서버 동기화)

<a id="sec-12"></a>
## 12) UX 개선 개발 티켓 분해 (U1~U4)

본 섹션은 섹션 11 기획을 실제 구현 착수 가능한 티켓 단위로 분해한 백로그다.

### 12.1 U1 레이아웃 와이어프레임/스펙 고정

- `U1-01` 브레이크포인트 레이아웃 스펙 문서화
  - 범위: Desktop(>=1440), Notebook(1024~1439), Mobile(<1024) 레이아웃 규칙 확정
  - 산출물: 폭 규칙(좌/중/우), 최소/최대 폭, 패널 우선순위 표
  - DoD: 디자이너/FE 리뷰에서 레이아웃 모호성 0건
- `U1-02` 편집 모드 전환 UX 스펙
  - 범위: `Balanced`, `Canvas Focus`, `Property Focus` 전환 규칙 및 상태 유지 정의
  - 산출물: 상태 전이 다이어그램, 기본 모드 규칙, 단축키(`Cmd/Ctrl+Shift+1/2/3`) 정의
  - DoD: 모드 전환 시 레이아웃/상태 충돌 시나리오 문서화 완료

### 12.2 U2 인터랙션 구현 티켓

- `U2-01` 3-패널 가변 레이아웃 적용 (Desktop)
  - 범위: 중앙 캔버스 우선 확장, 우측 속성 패널 리사이즈(최소/기본/최대)
  - DoD: 최소 폭 제약에서 레이아웃 깨짐 0건, 리사이즈 상태 복원 동작 확인
- `U2-02` Notebook 드로어형 속성 패널
  - 범위: 속성 패널 토글/오버레이, ESC/외부 클릭 닫기, 포커스 트랩
  - DoD: 키보드 접근성 통과(Tab 순서/ESC 닫기)
- `U2-03` 속성 패널 정보 구조 개선
  - 범위: 고정 헤더, 아코디언(Content/Style/Advanced), 핵심 필드 상단 배치
  - DoD: Hero/CTA/Image 블록 편집 시 첫 화면 내 핵심 필드 90% 이상 노출
- `U2-04` 캔버스 상호작용 강화
  - 범위: 줌 프리셋(80/100/120), 선택 블록 하이라이트, 패널-캔버스 동기화
  - DoD: 블록 선택/수정 후 하이라이트 불일치 0건
- `U2-05` 스크롤 위치 보존
  - 범위: 패널 수정/모드 전환 후 캔버스 스크롤 복원
  - DoD: 대표 편집 시나리오 3종에서 위치 복원 성공률 100%

### 12.3 U3 QA/측정 티켓

- `U3-01` UX 계측 이벤트 정의 및 수집 연결
  - 범위: 왕복 횟수, 편집 완료 시간, 스크롤 거리 이벤트 정의
  - DoD: KPI 4종이 대시보드/로그에서 추적 가능
- `U3-02` 태스크 기반 비교 테스트(A/B)
  - 범위: 현행 UI vs 개선 UI 비교 시나리오(문구+CTA, 이미지+정렬, 모바일 검수)
  - DoD: 최소 3~5명 실험 데이터 확보 + 종료 기준(2주 또는 30태스크) 충족 + 개선/유지/악화 항목 분류 완료
- `U3-03` 회귀 QA 체크리스트
  - 범위: 레이아웃/접근성/validation/viewport 전환 회귀 항목
  - DoD: 릴리즈 전 필수 체크 항목 누락 0건

#### 12.3.1 U3-03 고정 회귀 QA 체크리스트 (Release Gate)

- 체크 방식: 각 항목은 `Pass/Fail/N.A.` 중 하나로 기록하고, `Fail` 1건 이상이면 릴리즈 보류
- 적용 범위: `AdminPages` 편집 탭(`Hero`) 기준, Desktop/Notebook/Mobile 뷰포트 전환 포함
- 증빙 원칙: 수동 QA 캡처 1건 이상 + 자동화 테스트 결과 1건 이상을 항목별로 남긴다

`A. 레이아웃`
- [ ] Desktop(>=1440)에서 3-패널(블록 목록/캔버스/속성 패널) 구조가 깨지지 않는다.
- [ ] Desktop에서 속성 패널 리사이즈 핸들이 노출되고 조작 가능하다.
- [ ] Notebook(1024~1439)에서 속성 패널이 드로어 형태로 동작한다.
- [ ] Mobile(<1024)에서 편집 핵심 흐름(블록 선택, 속성 수정, 저장)이 차단되지 않는다.

`B. 접근성`
- [ ] Notebook 드로어 열린 상태에서 `ESC` 입력 시 드로어가 닫힌다.
- [ ] Notebook 드로어 오버레이 클릭 시 드로어가 닫힌다.
- [ ] 패널 열기/닫기 컨트롤이 버튼 역할/라벨을 유지한다.

`C. Validation`
- [ ] `items JSON`에 잘못된 JSON 입력 시 오류 메시지가 즉시 노출된다.
- [ ] `items JSON`에 배열이 아닌 JSON 입력 시 배열 제약 오류 메시지가 노출된다.
- [ ] 유효한 JSON 배열 입력 시 오류 메시지가 해소되고 편집 상태가 유지된다.

`D. Viewport 전환`
- [ ] Desktop -> Notebook 전환 시 편집 세션이 유지되고 크래시/초기화가 발생하지 않는다.
- [ ] Notebook -> Mobile 전환 시 패널 상태가 안전하게 정리되고 편집이 계속 가능하다.

`E. 릴리즈 사인오프`
- [ ] 위 A~D 항목의 `Fail`이 0건이다.
- [ ] 자동화 테스트(`AdminPages.workflow.test.tsx`) 결과가 최신 커밋 기준 `PASS`다.
- [ ] 사인오프 기록(Dev 1명, QA 1명, 일시, 커밋 SHA)이 남아 있다.

### 12.4 U4 릴리즈 준비 티켓

- `U4-01` 점진 적용 전략
  - 범위: 내부 운영자 파일럿 그룹 선적용, 피드백 회수 기준 정의
  - DoD: 파일럿 종료 기준과 롤백 조건 문서화
- `U4-02` 온보딩/운영 문서 업데이트
  - 범위: 새 편집 모드/패널 사용법을 운영 가이드에 반영
  - DoD: 신규 운영자 60분 온보딩 시나리오에 반영 완료

#### 12.4.1 U4-01 파일럿 롤아웃 운영 계획 (고정안)

- 대상: 내부 운영자 `3~5명`(role: `admin`/`super_admin`) + QA Owner 1명 + Dev Owner 1명
- 기간/종료: 최소 `7일` 운영 또는 누적 `30태스크` 충족 시 종료(둘 중 늦게 충족되는 조건 기준)
- 진입 게이트:
  - `U3-02` 비교 결과에서 4개 KPI 중 3개 이상 개선 + 악화 항목 저하 폭 10% 이내
  - `U3-03` 회귀 QA 체크리스트 `Fail=0`
  - 정책값 `page_editor_enabled=true`, `page_editor_rollout_stage=pilot`

`A. 모니터링 주기`
- Day 1~2: 1일 2회(오전/오후) 점검
- Day 3~종료: 1일 1회 점검
- 점검 소스: `GET /api/admin/perf/page-editor`, `GET /api/admin/action-logs/observability`, QA 체크리스트

`B. Go / Hold / No-Go 규칙`
- Go: KPI 4개 중 3개 이상 개선, 악화 항목 저하 폭 10% 이내, 차단 이슈 0건
- Hold: KPI 개선 조건 미충족이지만 롤백 트리거 미충족 상태(원인 분석 후 48시간 내 재평가)
- No-Go: 아래 롤백 트리거 1개 이상 충족

`C. 롤백 트리거 (정량)`
- 편집 완료 시간(`edit_completion_time`) p75가 baseline 대비 `15% 이상` 악화가 2회 연속 관측
- Draft 저장 왕복(`draft_save_roundtrip`) p75가 baseline 대비 `15% 이상` 악화가 2회 연속 관측
- U3-03 회귀 체크리스트에서 `Fail` 1건 이상 발생
- 운영 차단 이슈(P0/P1) 1건 이상 발생

`D. 롤백 실행 절차`
- 1단계(즉시): 정책 `page_editor_enabled=false`로 전환해 편집 진입 차단
- 2단계(안정화): 원인 분류(성능/UX/접근성/운영) 및 담당자 배정, 24시간 내 임시 리포트 작성
- 3단계(재개 조건): 트리거 해소 + U3-03 체크리스트 재검증 Pass + QA/Dev 공동 승인

`E. 파일럿 결과 공유 템플릿`
- 기간/대상: YYYY-MM-DD~YYYY-MM-DD, 참여자 N명, 태스크 N건
- KPI 요약: 개선/유지/악화 항목, 최악 저하 폭(%), Go/Hold/No-Go 판단
- 이슈/대응: 차단 이슈 유무, 발생 시점, 완화/롤백 조치
- 최종 결정: `open` 전환 / 파일럿 연장 / 롤백 유지
- 승인: Dev Owner, QA Owner, 최종 승인자(운영 책임자)

### 12.5 우선순위/의존성

- 우선순위
  - P0: `U1-01`, `U1-02`, `U2-01`, `U2-03`
  - P1: `U2-02`, `U2-04`, `U2-05`, `U3-01`
  - P2: `U3-02`, `U3-03`, `U4-01`, `U4-02`
- 의존성
  - U1 완료 -> U2 착수
  - U2 핵심 완료(`U2-01`,`U2-03`) -> U3 비교 테스트 착수
  - U3 결과 확인 -> U4 파일럿/문서 반영

### 12.6 완료 기준 (전체)

- 캔버스/속성 패널 협소 이슈에 대한 운영자 불편 리포트 감소(정성 피드백)
- KPI 기준 4개 중 최소 3개 개선 달성
- 악화 항목이 있는 경우 저하 폭 10% 이내
- 회귀/접근성/모바일 편집 시나리오에서 차단 이슈 0건

<a id="sec-13"></a>
## 13) Jira 이슈 템플릿 (U1~U4)

기본 필드 규칙:
- Epic: `PAGE-EDIT-UX-ENHANCEMENT`
- Components: `AdminPages`, `EditorLayout`, `PreviewCanvas`, `PropertyPanel`
- Labels: `page-edit`, `ux`, `admin-editor`
- Priority: P0/P1/P2는 섹션 12.5 우선순위를 따른다.
- Owner: 담당자 1명 명시(개발), QA Owner 1명 명시(검증)
- Due: 목표 완료일(YYYY-MM-DD) 명시
- Risk Level: `low`/`medium`/`high` 중 하나 필수

### 13.1 U1 이슈 템플릿

`U1-01`
- Summary: `[PageEdit][U1-01] 브레이크포인트별 편집 레이아웃 스펙 고정`
- Description: Desktop/Notebook/Mobile 편집 레이아웃 규칙과 패널 폭 제약을 확정해 구현 기준을 단일화한다.
- Acceptance Criteria:
  - Desktop/Notebook/Mobile 별 레이아웃 규칙이 문서화되어 있다.
  - 좌/중/우 패널 최소/기본/최대 폭이 수치로 명시되어 있다.
  - 리뷰 결과 모호/충돌 항목이 0건이다.
- Estimate: `3 SP`
- Depends On: 없음
- Owner(Dev): TBD
- QA Owner: TBD
- Due: TBD
- Risk Level: low

`U1-02`
- Summary: `[PageEdit][U1-02] 편집 모드 전환 UX 스펙 정의`
- Description: Balanced/Canvas Focus/Property Focus 모드 전환과 상태 유지 규칙을 정의한다.
- Acceptance Criteria:
  - 모드 상태 전이 다이어그램이 있다.
  - 모드 전환 시 유지/초기화되는 상태가 명시되어 있다.
  - 모드 단축키(`Cmd/Ctrl+Shift+1/2/3`)와 충돌 단축키 예외가 정의되어 있다.
  - 충돌 시나리오(패널 열림 상태, viewport 전환)가 정리되어 있다.
- Estimate: `2 SP`
- Depends On: `U1-01`
- Owner(Dev): TBD
- QA Owner: TBD
- Due: TBD
- Risk Level: medium

### 13.2 U2 이슈 템플릿

`U2-01`
- Summary: `[PageEdit][U2-01] Desktop 3-패널 가변 레이아웃 적용`
- Description: 중앙 캔버스를 우선 확장 영역으로 두고 우측 패널 리사이즈를 지원한다.
- Acceptance Criteria:
  - 1440px 이상에서 3-패널 레이아웃이 정상 동작한다.
  - 우측 패널 최소/기본/최대 폭 제약이 적용된다.
  - 패널 폭/브레이크포인트는 11.3 기준 수치를 참조하며 독자 수치를 추가하지 않는다.
  - 레이아웃 깨짐 이슈가 재현되지 않는다.
- Estimate: `5 SP`
- Depends On: `U1-01`
- Owner(Dev): TBD
- QA Owner: TBD
- Due: TBD
- Risk Level: medium

`U2-02`
- Summary: `[PageEdit][U2-02] Notebook 속성 패널 드로어 토글`
- Description: 1024~1439px 구간에서 속성 패널을 드로어 기반으로 전환한다.
- Acceptance Criteria:
  - 드로어 열기/닫기 토글이 동작한다.
  - ESC/외부 클릭 닫기 및 포커스 트랩이 동작한다.
  - 키보드 탭 순서 접근성이 유지된다.
  - 드로어 라벨/상태가 스크린리더에 전달되며, 포커스 가시성이 WCAG 2.1 AA 기준을 충족한다.
- Estimate: `3 SP`
- Depends On: `U1-01`
- Owner(Dev): TBD
- QA Owner: TBD
- Due: TBD
- Risk Level: medium

`U2-03`
- Summary: `[PageEdit][U2-03] 속성 패널 정보 구조 개편`
- Description: 패널을 고정 헤더+아코디언 구조로 재배치해 핵심 입력을 상단에 노출한다.
- Acceptance Criteria:
  - 고정 헤더(블록 타입/저장상태/빠른액션)가 있다.
  - Content/Style/Advanced 아코디언 구조가 적용된다.
  - Hero/CTA/Image 핵심 필드의 첫 화면 노출 비율이 90% 이상이다.
- Estimate: `5 SP`
- Depends On: `U1-02`
- Owner(Dev): TBD
- QA Owner: TBD
- Due: TBD
- Risk Level: medium

`U2-04`
- Summary: `[PageEdit][U2-04] 캔버스 상호작용 강화(줌/하이라이트/동기화)`
- Description: 줌 프리셋과 선택 블록 하이라이트를 제공하고 패널-캔버스를 양방향 동기화한다.
- Acceptance Criteria:
  - 줌 프리셋(80/100/120) 적용이 가능하다.
  - 선택 블록 하이라이트가 정확하게 표시된다.
  - 패널 선택과 캔버스 선택이 일관되게 동기화된다.
- Estimate: `3 SP`
- Depends On: `U2-01`
- Owner(Dev): TBD
- QA Owner: TBD
- Due: TBD
- Risk Level: high

`U2-05`
- Summary: `[PageEdit][U2-05] 편집 컨텍스트 스크롤 위치 보존`
- Description: 패널 수정/모드 전환 후에도 사용자가 보던 캔버스 위치로 복원한다.
- Acceptance Criteria:
  - 모드 전환 후 이전 스크롤 위치가 복원된다.
  - 주요 편집 시나리오 3개에서 복원 성공률 100%를 만족한다.
  - 의도치 않은 상단 점프 현상이 없다.
- Estimate: `2 SP`
- Depends On: `U2-01`, `U2-03`
- Owner(Dev): TBD
- QA Owner: TBD
- Due: TBD
- Risk Level: medium

### 13.3 U3 이슈 템플릿

`U3-01`
- Summary: `[PageEdit][U3-01] UX KPI 계측 이벤트 정의/수집 연결`
- Description: 왕복 횟수, 편집 완료 시간, 스크롤 거리 등 UX KPI 이벤트를 측정 가능하게 만든다.
- Acceptance Criteria:
  - KPI 이벤트 스키마가 정의되어 있다.
  - 대시보드/로그에서 KPI 4종을 조회할 수 있다.
  - Desktop/Notebook/Mobile 및 3개 모드(Balanced/Canvas/Property)별 최소 샘플 수집 기준이 정의되어 있다.
  - 누락 이벤트 비율이 허용 임계치 이하다.
- Estimate: `3 SP`
- Depends On: `U2-01`, `U2-03`
- Owner(Dev): TBD
- QA Owner: TBD
- Due: TBD
- Risk Level: medium

`U3-02`
- Summary: `[PageEdit][U3-02] 개선 UI A/B 태스크 비교 테스트`
- Description: 기존 UI와 개선 UI를 동일 태스크로 비교해 개선 효과를 검증한다.
- Acceptance Criteria:
  - 3~5명 대상 비교 테스트 데이터가 수집된다.
  - KPI 변화(개선/유지/악화)가 항목별로 분류된다.
  - 종료 조건(2주 또는 30태스크)이 충족된다.
  - Go/No-Go 규칙(4개 KPI 중 3개 이상 개선 + 악화 항목 저하 폭 10% 이내 시 Go)이 명시된다.
  - 주요 개선 근거가 문서화된다.
- Estimate: `3 SP`
- Depends On: `U3-01`
- Owner(Dev): TBD
- QA Owner: TBD
- Due: TBD
- Risk Level: medium

`U3-03`
- Summary: `[PageEdit][U3-03] 회귀 QA 체크리스트 확정`
- Description: 레이아웃/접근성/validation/viewport 전환 회귀 체크리스트를 고정한다.
- Acceptance Criteria:
  - 릴리즈 체크리스트에 필수 항목이 반영된다.
  - 누락 항목 없이 QA 사인오프가 가능하다.
  - 차단 이슈 발생 시 롤백 기준이 명시된다.
- Estimate: `2 SP`
- Depends On: `U2-02`, `U2-04`, `U2-05`
- Owner(Dev): TBD
- QA Owner: TBD
- Due: TBD
- Risk Level: medium

### 13.4 U4 이슈 템플릿

`U4-01`
- Summary: `[PageEdit][U4-01] 개선 UX 파일럿 롤아웃 계획`
- Description: 내부 운영자 파일럿 적용 기준과 피드백/롤백 조건을 정의한다.
- Acceptance Criteria:
  - 대상(3~5명), 기간(최소 7일), 종료 기준(최소 30태스크)이 명시된다.
  - 진입 게이트(`U3-02` KPI 기준 + `U3-03` Fail 0건)가 명시된다.
  - 롤백 트리거(성능 15% 악화 연속 관측, 회귀 Fail, P0/P1 이슈)와 책임자가 명시된다.
  - 파일럿 결과 공유 템플릿(기간/대상/KPI/이슈/최종결정/승인)이 준비된다.
- Estimate: `2 SP`
- Depends On: `U3-02`, `U3-03`
- Owner(Dev): TBD
- QA Owner: TBD
- Due: TBD
- Risk Level: medium

`U4-02`
- Summary: `[PageEdit][U4-02] 운영/온보딩 문서 업데이트`
- Description: 새로운 편집 모드/패널 사용법을 운영 가이드와 온보딩 자료에 반영한다.
- Acceptance Criteria:
  - 운영 가이드에 새 편집 흐름이 반영된다.
  - 60분 온보딩 시나리오가 최신 UI 기준으로 갱신된다.
  - FAQ에 자주 발생하는 전환 이슈 대응이 추가된다.
- Estimate: `2 SP`
- Depends On: `U4-01`
- Owner(Dev): TBD
- QA Owner: TBD
- Due: TBD
- Risk Level: medium
