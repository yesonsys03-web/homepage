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
- [11) [DEPRECATED] 편집 UX 개선 기획 (캔버스/속성 패널, Legacy)](#sec-11)
- [12) [DEPRECATED] UX 개선 개발 티켓 분해 (U1~U4, Legacy)](#sec-12)
- [13) Jira 이슈 템플릿 (U1~U4)](#sec-13)
- [14) U4-02 운영/온보딩 가이드 (고정)](#sec-14)
- [15) 다음 실행 로드맵 (U5 제안)](#sec-15)
- [16) Take2 UX 개선안 통합 (Side Rail + Single Visible)](#sec-16)
- [17) Take2 구현 티켓 분해 (Take2-U1~U4)](#sec-17)
- [18) Take2 Release Gate 체크리스트](#sec-18)
- [19) Take2 Jira 템플릿 바로가기](#sec-19)

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

### 파일럿 운영 중(일일)

- 오전/오후 점검 주기에 맞춰 KPI 스냅샷(`GET /api/admin/perf/page-editor`) 확인
- U3-03 회귀 체크리스트 `Fail` 발생 여부 확인
- 차단 이슈(P0/P1) 발생 시 즉시 `page_editor_enabled=false` 전환 여부 판단

### `open` 전환 전

- U4-01 Go 조건(4개 KPI 중 3개 이상 개선, 악화 저하 폭 10% 이내) 재확인
- 파일럿 결과 공유 템플릿(기간/대상/KPI/이슈/최종결정/승인) 작성 완료 확인
- QA Owner/Dev Owner 공동 승인 여부 확인

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
- 2026-03-05: U4-02 운영/온보딩 가이드를 본문 섹션으로 고정(일일 운영 체크, 60분 온보딩, FAQ).
- 2026-03-05: U1~U4 완료 이후 다음 실행 우선순위(U5 제안)와 단계별 완료 기준을 추가.
- 2026-03-05: U5-01 충돌 감지 실구현 반영(충돌 메타 노출, 로컬 변경 재적용, 안전 재시도 흐름).
- 2026-03-05: U5-02 예약 발행 반영(예약/취소/실패 재처리 API, AdminPages 운영 카드, 회귀 테스트).
- 2026-03-05: U5-03 tablet preview 반영(Preview 탭 Tablet 프리셋/폭 규칙 추가, 워크플로우 테스트 갱신).
- 2026-03-05: U5-04 확장 블록 타입 반영(gallery 추가 + feature_list/faq/gallery validation/preview 일관화).

<a id="sec-10"></a>
## 10) 세션별 변경 타임라인

- 2026-03-04-01: Sprint 3 C-3/D-1/D-2 완료. 버전 비교/롤백 UX, 감사 로그 필터/관측 API, 관련 테스트/빌드 검증 반영.
- 2026-03-04-02: D-3 성능 기준선 구현 시작. `page-editor` 성능 이벤트 수집 및 스냅샷 API 추가, AdminPages 계측 연결.
- 2026-03-04-03: E-1 롤아웃 제어 반영. 정책 필드 확장(`page_editor_enabled`, rollout stage, pilot IDs, 임계치) 및 서버 접근 게이트 적용.
- 2026-03-04-04: E-2 마이그레이션 실행 경로 반영. preview/execute API, dry-run, backup 생성, 변환 스크립트 추가.
- 2026-03-04-05: E-3 운영 가이드 고도화와 migration restore API 반영. runbook/체크리스트/FAQ/API 레퍼런스 보강.
- 2026-03-04-06: backupKey 목록 조회 API(`migration/backups`) 추가로 복구 실행 전 선택/검증 흐름 개선.
- 2026-03-05: 분산된 Page Edit 문서군(one pager, tasks, sprint index, spec 문서)을 본 문서로 통합하고, 학습 로그 참조를 단일 경로로 정리.
- 2026-03-05: U4-02 운영/온보딩 본문 추가. 파일럿 운영 체크와 신규 운영자 60분 시나리오를 표준화.
- 2026-03-05: 확장 항목을 실행 순서 기반(U5-01~U5-04)으로 재정렬해 다음 스프린트 착수 기준을 명확화.
- 2026-03-05: U5-01 구현 완료. 409 충돌 응답에 최신 수정자/시각 메타를 추가하고, 충돌 후 최신 Draft 재로딩 + 로컬 변경 재적용 흐름을 UI/테스트에 반영.
- 2026-03-05: U5-02 구현 완료. 예약 게시 생성/조회/취소/재시도/처리 엔드포인트와 버전 탭 운영 UI를 연결하고, 워크플로우 테스트를 갱신.
- 2026-03-05: U5-03 구현 완료. Preview 디바이스에 Tablet 옵션을 추가하고, tablet 전환 회귀 테스트를 확장.
- 2026-03-05: U5-04 구현 완료. Gallery 블록을 생성/편집/프리뷰 가능하게 확장하고, feature_list/faq/gallery 검증 규칙을 FE/BE에 동기화.

<a id="sec-11"></a>
## 11) [DEPRECATED] 편집 UX 개선 기획 (캔버스/속성 패널, Legacy)

`Legacy` 섹션이다. 실행 기준은 섹션 16~18을 우선한다.

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
- [Legacy] A/B 종료 기준(통일): 참여자 3~5명 데이터 확보 + 최소 2주 운영 + 누적 30개 태스크를 모두 충족
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
## 12) [DEPRECATED] UX 개선 개발 티켓 분해 (U1~U4, Legacy)

`Legacy` 섹션이다. 실행 기준은 섹션 16~18을 우선한다.

본 섹션은 섹션 11 기획을 실제 구현 착수 가능한 티켓 단위로 분해한 백로그다.
Take2 적용 이후의 **최신 기준은 섹션 16~18을 우선**하며, 본 섹션은 이력/비교 참조용으로 본다.

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
- [Legacy] 기간/종료(통일): 최소 `2주` 운영 + 누적 `30태스크`를 모두 충족 시 종료
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

<a id="sec-14"></a>
## 14) U4-02 운영/온보딩 가이드 (고정)

### 14.1 운영 가이드 (파일럿~오픈)

- 운영 시작 전: `page_editor_enabled=true`, `page_editor_rollout_stage=pilot`, 파일럿 대상 ID 최신화
- 일일 운영: KPI/관측 로그/U3-03 체크리스트를 1일 1~2회 점검하고 이상 징후를 기록
- 이상 대응: 성능 15% 악화 연속 관측 또는 회귀 `Fail` 발생 시 즉시 차단(`page_editor_enabled=false`)
- 오픈 전환: U4-01 Go 규칙 충족 + QA/Dev 공동 승인 + 공유 템플릿 작성 완료 시 `open` 전환

### 14.2 신규 운영자 60분 온보딩 시나리오

- 0~10분: 권한/정책 개요 (`admin`/`super_admin`, rollout stage, 즉시 차단 토글)
- 10~25분: 편집 기본 플로우 실습 (블록 선택 -> 속성 수정 -> Draft 저장 -> 미리보기)
- 25~35분: 버전 운영 실습 (버전 비교, 롤백, reason 기반 감사 로그 확인)
- 35~45분: 파일럿 운영 실습 (KPI 확인, Go/Hold/No-Go 판정, 롤백 트리거 읽기)
- 45~55분: 장애 대응 실습 (`page_editor_enabled=false` 차단, 원인 확인, 복구 경로 선택)
- 55~60분: 체크아웃 (핵심 API 위치, 체크리스트 위치, 승인 라인 재확인)

### 14.3 운영 FAQ (전환 이슈 중심)

- Q. 파일럿 중 편집 속도가 느려졌다고 느껴지면?
  - A. 체감 이슈를 기록한 뒤 KPI(p75) 악화율을 확인한다. 15% 이상 악화가 연속 관측되면 즉시 차단 후 원인 분석한다.
- Q. 회귀 체크리스트에서 한 항목이라도 Fail이면?
  - A. `open` 전환을 보류하고 U3-03 Fail 원인 해소 후 재검증 Pass를 확보한다.
- Q. 운영자가 잘못된 Draft를 저장했을 때 우선 조치는?
  - A. 버전 탭에서 비교 후 롤백 후보를 확인하고, 필요 시 migration backup restore를 dry-run으로 먼저 검증한다.

<a id="sec-15"></a>
## 15) 다음 실행 로드맵 (U5 제안)

U1~U4 범위가 완료되어, 이후 항목은 확장 과제로 분리해 순차 진행한다.

### 15.1 우선순위 (권장)

- `U5-01` 충돌 감지 실제 구현
  - 배경: 저장 충돌은 운영 사고로 직결되므로 우선 대응이 필요
  - DoD: 동시 편집 충돌 감지 + 사용자 안내 + 안전한 재시도/병합 정책 문서화
- `U5-02` 예약 발행
  - 배경: 운영 효율성과 캠페인/공지 스케줄링 수요가 높음
  - DoD: 예약/취소/실패 재처리 흐름과 감사 로그가 end-to-end로 동작
- `U5-03` tablet preview
  - 배경: 모바일/데스크톱 사이 구간 검수 공백 해소
  - DoD: tablet 프리셋 추가 + 주요 블록 레이아웃 검수 체크리스트 반영
- `U5-04` 확장 블록 타입
  - 배경: 에디터 표현력 확장 필요, 다만 운영 안정화 이후 착수 권장
  - DoD: 신규 블록 스키마/편집 UI/validation/preview가 일관되게 동작

### 15.2 착수 게이트

- `U5-01` 착수 전: U4 파일럿 결과가 `Go` 또는 `Hold(재평가 계획 포함)` 상태여야 한다.
- `U5-02` 착수 전: `U5-01` 충돌 정책(저장 우선순위, 재시도 규칙) 확정이 선행되어야 한다.
- `U5-03` 착수 전: tablet 브레이크포인트/디자인 토큰 합의가 필요하다.
- `U5-04` 착수 전: 기존 블록 에디터 회귀 테스트와 운영 FAQ가 최신 상태여야 한다.

### 15.3 권장 진행 순서

- Sprint N: `U5-01`
- Sprint N+1: `U5-02`, `U5-03` 병행
- Sprint N+2: `U5-04`

### 15.4 리스크 메모

- 충돌 감지 미구현 상태에서 예약 발행을 먼저 도입하면 운영 충돌 케이스가 증가할 수 있다.
- 블록 타입 확장은 테스트/문서 부채를 빠르게 키우므로 마지막 단계로 배치한다.

<a id="sec-16"></a>
## 16) Take2 UX 개선안 통합 (Side Rail + Single Visible)

본 섹션은 `docs/page_edit_take2.md`의 핵심 내용을 통합한 요약본이다. 목표는 Notebook 구간에서 발생하는 "속성 패널 접근을 위해 스크롤이 필요한 문제"를 구조적으로 해소하는 것이다.

### 16.1 문제 재정의

- 현행 편집기에서 블록 목록/캔버스/속성 패널이 화면 폭에 따라 배치가 흔들리며, 특히 1024~1439 구간에서 속성 패널 접근성이 저하된다.
- 사용자는 블록 선택 후 속성 편집까지 이동 비용이 커지고, 캔버스-속성 왕복 시 맥락이 자주 끊긴다.

### 16.2 개선 원칙

- 편집 화면 좌측 고정 Side Rail(접기/펼치기 가능)에 `블록 목록 / 캔버스 미리보기 / 속성 패널` 3개 항목 고정 배치
- 본문은 한 번에 1개 패널만 노출(Single Visible)
- 전환 시 컨텍스트(선택 블록/입력값/캔버스 스크롤) 유지
- 기본 진입은 `블록 목록`, 블록 미선택 상태에서 속성 패널은 `No selection` 안내만 노출
- 블록 클릭 시 속성 패널 자동 전환은 기본 `ON` 정책
- Dirty 상태에서 블록 변경/탭 이탈/새로고침 시 `저장 후 이동 / 폐기 후 이동 / 취소` 확인 모달 강제

### 16.2.1 레일 폭 규칙

- Expanded: 기본 `176px` (최소 `160px`, 최대 `220px`)
- Collapsed: `48px`
- 레일 리사이즈는 Desktop/Notebook에서만 허용
- 리사이즈 핸들은 레일 우측 엣지에 고정
- 리사이즈 중 본문 패널은 실시간 재배치(reflow)
- 리사이즈 폭은 `localStorage`(`page_editor_rail_width`)에 저장하고 재진입 시 복원

### 16.3 반응형 정책 (Take2)

- Desktop(>=1440): Single Visible 기본값 적용, 3패널 병행 패러다임 유지하지 않음
- Notebook(1024~1439): Single Visible 기본값 적용 (Desktop과 동일한 상호작용 원칙)
- Mobile(<1024): 고정 상단 세그먼트 대신 `Items` 버튼 기반 드로어/바텀시트로 항목 선택
- Mobile Items 사양: 리스트 아이콘 + `Items` 라벨 기본 노출
- Mobile 표시 기준: portrait=바텀시트, landscape=좌측 드로어
- Mobile 닫기 규칙: 뒤로가기/`Esc`/오버레이 클릭 시 닫고, 본문 상태 유지

### 16.4 성공 지표 (Take2 KPI)

- 속성 패널 접근 시 평균 스크롤 횟수: 0회
- 블록 선택 -> 첫 필드 입력 시간: 현행 대비 30% 단축
- 패널 전환 응답 시간: 평균 1초 이내
- 편집 세션 스크롤 거리/횟수: 현행 대비 20% 이상 감소

<a id="sec-17"></a>
## 17) Take2 구현 티켓 분해 (Take2-U1~U4)

### 17.1 U1 레이아웃/상태 스펙

- `Take2-U1-01` Side Rail IA 확정
  - 범위: 항목 구조, 기본 활성 항목, 접기/펼치기 시각 규칙
  - DoD: Desktop/Notebook/Mobile 동작 모호성 0건
- `Take2-U1-02` Single Visible 상태 전이 명세
  - 범위: 패널 전환, 자동 전환 옵션, 상태 유지 규칙
  - DoD: 전환 중 데이터 유실 시나리오 0건 + `PO 1명`과 `FE Lead 1명` 설계 검토 승인

### 17.2 U2 인터랙션

- `Take2-U2-01` Side Rail 접기/펼치기 컨트롤
  - DoD: 마우스/키보드 전환 정상 동작
- `Take2-U2-02` 단일 패널 전환 컨테이너
  - DoD: 패널 전환 후 첫 상호작용 1초 이내
- `Take2-U2-03` 컨텍스트 유지 로직
  - DoD: 대표 시나리오 3종 상태 복원 100%
- `Take2-U2-04` 자동 전환 옵션(블록/캔버스 -> 속성)
  - DoD: 옵션 ON/OFF 모두에서 흐름 일관성 확보

### 17.3 U3 QA/계측

- `Take2-U3-01` KPI 계측 이벤트 연결
  - DoD: KPI 4종(속성 패널 접근 스크롤 횟수, 블록 선택->첫 필드 입력 시간, 패널 전환 시간, 편집 세션 스크롤 거리) 대시보드/로그 조회 가능
  - 집계 이벤트: `consecutive_15pct_regression_events`(15% 이상 성능 악화 2회 연속 관측 횟수) 정의 및 조회 가능
- `Take2-U3-02` A/B 비교 테스트(현행 vs Take2)
  - DoD: 참여자 3명 이상, 운영 기간 최소 2주, 누적 30태스크를 모두 충족
- `Take2-U3-03` 접근성 회귀 QA
  - DoD: 차단 이슈 0건

### 17.4 U4 롤아웃/온보딩

- `Take2-U4-01` 파일럿 롤아웃 기준 정의
  - DoD:
    - 참여자 3명 이상, 운영 기간 최소 2주, 누적 30태스크를 모두 충족
    - 진입 게이트: `U3-01 KPI 4종 계측 가능` + `U3-03 Fail=0` + `page_editor_rollout_stage=pilot`
    - Go 기준: KPI 4개 중 3개 이상 개선 + 악화 항목 저하 폭 10% 이내
    - 롤백 트리거(정량):
      - `edit_completion_time` p75가 baseline 대비 15% 이상 악화가 2회 연속 관측
      - `draft_save_roundtrip` p75가 baseline 대비 15% 이상 악화가 2회 연속 관측
      - `U3-03` 회귀 체크리스트 `Fail` 1건 이상
      - 운영 차단 이슈(P0/P1) 1건 이상
- `Take2-U4-02` 운영 문서/온보딩 반영
  - DoD: 60분 온보딩 시나리오 최신화

<a id="sec-18"></a>
## 18) Take2 Release Gate 체크리스트

체크 방식: 항목별 `Pass/Fail/N.A.` 기록, `Fail` 1건 이상 시 릴리즈 보류.

`A. 레이아웃`

- [ ] Notebook(1024~1439)에서 속성 패널 접근을 위한 세로 스크롤이 필요하지 않다.
- [ ] Side Rail 접힘/펼침 전환 시 본문 레이아웃이 깨지지 않는다.
- [ ] 단일 패널 전환 시 잔상/중첩 렌더링이 없다.

`B. 상태 유지`

- [ ] 블록 선택 상태가 패널 전환 후 유지된다.
- [ ] 미저장 입력값이 패널 전환 후 유지된다.
- [ ] 캔버스 복귀 시 스크롤 위치가 복원된다.

`C. 접근성`

- [ ] 접힘 상태에서도 레일 항목이 `aria-label`로 식별 가능하다.
- [ ] `Up/Down`, `Enter/Space` 키로 레일 탐색/활성화가 가능하다.
- [ ] 오버레이/드로어 열린 상태에서 `Esc` 닫기가 동작한다.

`D. 성능/사용성`

- [ ] 패널 전환 직후 체감 지연(1초 초과)이 없다.
- [ ] 블록 선택 -> 첫 입력까지 단계 수가 현행 대비 감소했다.
- [ ] 편집 세션 평균 스크롤 거리/횟수가 현행 대비 감소했다.

`E. 사인오프`

- [ ] A~D `Fail=0`
- [ ] 파일럿 게이트(U4-01 기준: 참여자 3명+, 2주+, 30태스크+)를 모두 충족했다.
- [ ] Go 기준(4개 KPI 중 3개 이상 개선 + 악화 10% 이내)을 충족했다.
- [ ] 회귀 테스트 `src/components/screens/admin/pages/AdminPages.workflow.test.tsx` 결과 `PASS`
- [ ] 회귀 테스트 `src/components/screens/admin/pages/pageEditorGuardrails.test.ts` 결과 `PASS`
- [ ] Dev/QA 사인오프(담당자/일시/커밋 SHA) 기록 완료

`실행 커맨드 예시`

- `pnpm test -- src/components/screens/admin/pages/AdminPages.workflow.test.tsx`
- `pnpm test -- src/components/screens/admin/pages/pageEditorGuardrails.test.ts`

### 18.1 U3-02 실행 기록 시트 (A/B 비교)

아래 표를 파일럿 기간 동안 일자별로 누적한다. 행 단위 누적이 최소 14일이 되기 전까지는 U3-02를 완료로 판정하지 않는다.

| date | cohort | participant_count | task_count | improved_kpi_count | worst_regression_pct | decision | note |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 2026-03-06 | take2 pilot | 0 | 0 | 0 | 0 | collecting | 기술 게이트 선행 완료(테스트/빌드 통과), 운영 데이터 수집 전 |

`판정 규칙`
- `participant_count >= 3`
- `task_count >= 30`
- 누적 기간 `>= 14일`
- `improved_kpi_count >= 3`
- `worst_regression_pct <= 10`

### 18.2 U4-01 파일럿 게이트 결정 시트

Go/Hold/No-Go 판단은 아래 단일 표만 사용한다. 중복 문서에 분산 기록하지 않는다.

| check_item | status | evidence |
| --- | --- | --- |
| KPI 4종 계측 가능 (`Take2-U3-01`) | pass | `src/components/screens/admin/pages/AdminPages.tsx` 계측 이벤트 연결 완료 |
| 접근성 회귀 차단 이슈 0건 (`Take2-U3-03`) | pass | 레일 키보드 탐색(`Up/Down`,`Enter/Space`) + `Esc` 닫기 구현 및 테스트 검증 |
| 회귀 테스트 `AdminPages.workflow` | pass | `pnpm test -- src/components/screens/admin/pages/AdminPages.workflow.test.tsx src/components/screens/admin/pages/pageEditorGuardrails.test.ts` (28 passed) |
| 프로덕션 빌드 | pass | `pnpm build` 통과 |
| 파일럿 조건(참여자 3명+, 14일+, 30태스크+) | pending | 운영 데이터 수집 전 |
| Go 기준(4 KPI 중 3개 개선 + 악화 10% 이내) | pending | U3-02 수집 완료 후 판정 |

`결정 규칙`
- 위 표에서 `pending`이 하나라도 남아 있으면 `open` 전환 금지
- `pending`이 0이고 `fail`이 0이면 `Go` 검토 가능
- `fail` 1개 이상이면 즉시 `No-Go` 또는 `Hold`

### 18.3 U4-02 온보딩 완료 체크 시트

신규 운영자 온보딩은 아래 체크 시트로 기록한다.

| onboarding_date | operator | completed_60m | notes | approver |
| --- | --- | --- | --- | --- |
| 2026-03-06 | TBD | no | 문서 갱신 완료, 실제 운영자 세션 미실행 | TBD |

`완료 조건`
- 60분 시나리오(14.2) 전 단계 수행
- `completed_60m=yes` 기록 1건 이상
- 승인자(`approver`) 실명 기록

### 18.4 파일럿 일일 실행 절차 (운영 입력 순서)

아래 순서를 매일 동일하게 수행하고, 18.1/18.2 표를 즉시 갱신한다.

1. 회귀/빌드 상태 확인
   - `pnpm test -- src/components/screens/admin/pages/AdminPages.workflow.test.tsx src/components/screens/admin/pages/pageEditorGuardrails.test.ts`
   - `pnpm build`
2. KPI 수집
   - `GET /api/admin/perf/page-editor`로 당일 p75 값 수집
   - 전일 대비 변화율(%) 계산 후 `improved_kpi_count`, `worst_regression_pct` 산출
3. 운영 입력
   - 18.1 표에 `date/cohort/participant_count/task_count/improved_kpi_count/worst_regression_pct/decision/note` 입력
4. 게이트 판정
   - 18.2의 `pending` 항목 재평가
   - `fail` 발생 시 즉시 `Hold` 또는 `No-Go`로 전환
5. 온보딩 반영
   - 신규 운영자 세션이 있으면 18.3에 `completed_60m`/`approver` 기록

### 18.5 Go/Hold/No-Go 판정 계산식 (운영 고정)

운영자가 판단을 다르게 해석하지 않도록 아래 계산식을 고정한다.

`용어`
- `improved_kpi_count`: 기준 KPI 4개 중 baseline 대비 개선된 항목 수
- `worst_regression_pct`: baseline 대비 악화된 항목 중 최대 악화율(%)

`규칙`
- `Go`:
  - `improved_kpi_count >= 3`
  - `worst_regression_pct <= 10`
  - 회귀 테스트/빌드 `pass`
  - 파일럿 조건(참여자 3+, 14일+, 30태스크+) 충족
- `Hold`:
  - `Go` 미충족이지만 롤백 트리거 미충족
  - 48시간 내 원인/재평가 계획을 `note`에 기록
- `No-Go`:
  - 롤백 트리거 1개 이상 충족
  - 즉시 `page_editor_enabled=false` 전환 검토

`롤백 트리거`
- `edit_completion_time` p75 15% 이상 악화가 2회 연속
- `draft_save_roundtrip` p75 15% 이상 악화가 2회 연속
- `U3-03` 회귀 체크리스트 `Fail >= 1`
- 운영 차단 이슈(P0/P1) 발생

<a id="sec-19"></a>
## 19) Take2 Jira 템플릿 바로가기

- 상세 Jira 템플릿은 `docs/page_edit_take2.md`의 `14) Jira 이슈 템플릿 (Take2-U1~U4)`를 사용한다.
- 템플릿 구성: `Summary / Description / Acceptance Criteria / DoD / Metric Query`
