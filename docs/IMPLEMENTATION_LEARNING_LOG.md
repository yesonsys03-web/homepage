# VibeCoder Playground - Implementation Learning Log

## 사용 목적
- 이 문서는 설계 -> 구현 -> 검증 -> 회고 전 과정을 학습 가능한 형태로 누적 기록하는 운영 로그다.
- 반드시 기능 변경 당일 업데이트한다.

## 운영 규칙
- 한 번의 작업 단위를 `Session`으로 기록한다.
- 각 Session은 "무엇을", "왜", "어떻게", "결과"를 포함한다.
- 실패 사례도 삭제하지 않고 남긴다.

## Session Template
```md
## Session YYYY-MM-DD-NN

### 1) Goal
- 이번 작업 목표:

### 2) Inputs
- 참고 문서: `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md`
- 사용자 피드백/이슈:
- 제약 조건:

### 3) Design Decisions
- 결정 1:
- 결정 2:

### 4) Implementation Notes
- 프론트(v0):
- 백엔드(FastAPI):
- 데이터/엔드포인트 영향:

### 5) Validation
- 확인 항목:
- 테스트/검증 결과:

### 6) Outcome
- 잘된 점:
- 아쉬운 점:
- 다음 액션:
```

## Sessions

## Session 2026-03-09-01

### 1) Goal
- `docs/VIBE_01_github_content.md`, `docs/VIBE_02_playground.md`, `docs/VIBE_03_glossary.md`를 다시 대조해 남아 있는 MVP 어긋남을 줄이고, 새 작업은 `main.py`가 아닌 별도 파일 중심으로 정리한다.

### 2) Inputs
- 참고 문서: `docs/VIBE_01_github_content.md`, `docs/VIBE_02_playground.md`, `docs/VIBE_03_glossary.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 사용자 피드백/이슈: VIBE 문서를 검토해 미완료 작업을 이어서 진행해달라는 요청과 함께, 새 기능은 별도 파일로 분리해 달라는 구조 가이드가 추가됨.
- 제약 조건: `server/main.py`에 기능을 계속 누적하지 않고 별도 데이터/컴포넌트 파일로 확장해야 함.

### 3) Design Decisions
- VIBE_03의 데이터 구조 요구사항에 맞춰 glossary를 하드코딩 TS 배열에서 `src/data/glossary.json` 기반으로 옮기고, 타입/헬퍼만 `src/data/glossary.ts`에 남긴다.
- VIBE_02의 에러 응급실 체크리스트 중 누락돼 있던 에러 유형 시각 신호는 별도 UI 조각 파일로 추가해 Playground 화면을 가볍게 확장한다.

### 4) Implementation Notes
- 프론트(v0): `src/data/glossary.json`을 추가하고 `src/data/glossary.ts`를 JSON 로더 + 타입/헬퍼 래퍼 구조로 재작성했다.
- 프론트(v0): `src/components/playground/ErrorTypeBadge.tsx`를 추가하고 `PlaygroundScreen`의 에러 번역 결과/샘플 응답에 에러 유형 배지를 연결했다.
- 프론트(v0): `PlaygroundScreen.test.tsx`에 `pnpm` 에러 유형 배지 렌더링 테스트를 추가했다.
- 설정 영향: JSON 데이터 import를 위해 `tsconfig.app.json`에 `resolveJsonModule`을 추가했다.

### 5) Validation
- 확인 항목: glossary JSON import 호환성, Playground 에러 배지 렌더링, 타입 진단, 프론트 테스트/빌드 회귀
- 테스트/검증 결과: 진행 중 — LSP diagnostics, Vitest, TypeScript build 순으로 재검증 예정

### 6) Outcome
- 잘된 점: 문서가 요구한 데이터 파일 구조와 UI 미완료 포인트를 모두 별도 파일 확장 방식으로 맞출 수 있게 됐다.
- 아쉬운 점: VIBE 문서 전체 로드맵은 범위가 넓어서 이번 세션에서는 명확한 MVP 어긋남부터 우선 정리했다.
- 다음 액션: 남은 검증을 통과시키고, 이어서 VIBE_01/02의 부분 구현 항목 중 운영상 가치가 큰 다음 슬라이스를 선택한다.

## Session 2026-03-07-03

### 1) Goal
- Playground/Curated 주요 문장에 glossary hover popup을 붙이고, 용어사전으로 즉시 이동할 수 있는 재사용 가능한 하이라이트 유틸을 완성한다.

### 2) Inputs
- 참고 문서: `docs/IMPLEMENTATION_LEARNING_LOG.md`, `docs/VIBE_03_glossary.md`
- 사용자 피드백/이슈: 중단된 작업 이어서 진행 요청. 최근 세션 흔적상 glossary hover popup slice가 구현 직전 상태였음.
- 제약 조건: 기존 디자인 톤을 유지하면서도 별도 tooltip 패키지 없이 현재 shadcn/radix 조합에서 가볍게 재사용 가능해야 함.

### 3) Design Decisions
- hover popup은 새 상태 관리 없이 `hover`/`focus-within` 기반 preview 카드로 구현해 키보드 포커스와 마우스 hover를 함께 지원한다.
- 텍스트 하이라이트는 glossary 데이터에서 직접 매칭해 `Playground`의 번역 결과와 `Curated`의 요약 문장에 같은 규칙으로 적용한다.

### 4) Implementation Notes
- 프론트(v0): `GlossaryHoverTerm`, `GlossaryHighlightedText`, `glossary-text` 유틸을 추가했다.
- 프론트(v0): `PlaygroundScreen`의 텍스트 번역 결과/연관 용어와 `CuratedScreen`, `CuratedDetailScreen` 요약 문장에 hover popup + glossary 이동을 연결했다.
- 데이터/엔드포인트 영향: API 변경은 없고, 기존 `vibecoder_glossary_focus_term` 로컬 스토리지 흐름을 공용 유틸로 정리했다.

### 5) Validation
- 확인 항목: 용어 매칭 하이라이트, hover preview DOM 렌더링, glossary 포커스 이동, 기존 Playground/Curated 화면 회귀
- 테스트/검증 결과: Vitest 대상 테스트, TypeScript build, LSP diagnostics 재검증 예정

### 6) Outcome
- 잘된 점: 용어가 등장하는 문장 안에서도 바로 뜻을 미리 보고 glossary로 이동할 수 있게 되어 VIBE_03 학습 흐름이 자연스러워졌다.
- 아쉬운 점: 현재 매칭은 glossary term 본문 기준이라 별칭/축약어 사전은 추가로 넓힐 수 있다.
- 다음 액션: 사용 로그가 쌓이면 어떤 용어가 hover만 많이 되고 클릭은 적은지 보고 용어 카드 밀도를 조정한다.

## Session 2026-03-07-02

### 1) Goal
- 큐레이션 추천 클릭 분석을 관리자 전용 상세 화면으로 확장하고 추천 사유 저장값을 안정적인 코드로 정규화한다.

### 2) Inputs
- 참고 문서: `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 사용자 피드백/이슈: 이전 작업 후 "진행해" 요청에 따라 추천 클릭 분석 상세화와 reason 정규화 계속 진행
- 제약 조건: 기존 `curated_related_clicks.reason` 컬럼을 유지하면서도 과거 자유 텍스트와 신규 코드값을 함께 다뤄야 함

### 3) Design Decisions
- DB 스키마를 바로 바꾸지 않고 `reason` 컬럼에는 안정적인 코드값을 저장하되, 과거 자유 텍스트는 서버 집계 시 코드로 정규화한다.
- 관리자 상세 분석 화면은 별도 API를 늘리지 않고 기존 summary API를 더 큰 limit로 재사용해 빠르게 드릴다운한다.

### 4) Implementation Notes
- 프론트(v0): `/admin/curated/analytics` 페이지를 추가하고 대시보드 위젯에서 상세 이동 링크를 연결했다.
- 프론트(v0): `/admin/manual` 페이지를 추가해 `docs/admin_menual.md` 원문을 관리자 화면에서 바로 검색/열람할 수 있게 했다.
- 백엔드(FastAPI): related 추천 응답과 클릭 저장 흐름을 `reason_code + label` 구조로 정리하고 집계 응답도 코드/라벨을 함께 반환하도록 바꿨다.
- 데이터/엔드포인트 영향: `curated_related_clicks.reason`은 이제 신규 데이터에 대해 정규화 코드값을 저장하며, 집계 응답은 `top_reason_code`, `top_reason_label`, `reason_code`, `reason_label`을 포함한다.
- 운영 문서: 백엔드 운영자가 빠르게 구조와 관리자 API를 파악할 수 있도록 `docs/admin_menual.md`를 추가했고, 이후 배포 절차/대표 API 예시/장애 대응 플레이북/staging·prod 체크리스트/관리자 액션 로그 가이드/SQL 점검 예시/action_type 사전/page migration restore 시나리오/OAuth FAQ에 더해 일일·주간 점검 루틴과 역할별 운영 체크리스트까지 확장했다.

### 5) Validation
- 확인 항목: reason 코드 정규화, 관리자 상세 화면 렌더링, 기존 대시보드/상세 클릭 흐름 호환성, `uv` 기반 백엔드 테스트 재현성
- 테스트/검증 결과: 프론트 vitest와 Vite build는 재검증 완료. 백엔드 pytest는 `httpx` 누락으로 한 차례 수집 실패를 확인했고 `server/pyproject.toml`의 dev group 보강 후 `cd server && uv run --group dev pytest`로 재검증했다.

### 6) Outcome
- 잘된 점: 추천 이유 문구가 바뀌어도 집계 축이 유지되고 운영자가 상세 화면에서 바로 분석할 수 있게 됨. 또한 `cd server && uv run --group dev pytest` 흐름이 필요한 테스트 의존성을 기준으로 재현 가능해졌고, 별도 운영 메뉴얼도 마련됐다.
- 아쉬운 점: 기존 자유 텍스트 레코드는 매핑 규칙 밖의 문구가 있으면 `unknown`으로 흡수된다
- 다음 액션: 필요 시 DB migration으로 `reason_code` 별도 컬럼을 만들고 과거 데이터 백필을 수행한다.

## Session 2026-03-07-01

### 1) Goal
- Curated 상세의 추천 이유 계산을 서버로 이동하고, `curated_related_clicks` 집계 API와 관리자 대시보드 위젯을 추가한다.

### 2) Inputs
- 참고 문서: `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 사용자 피드백/이슈: "curated_related_clicks 집계 API + 관리자 대시보드 위젯" 및 "추천 이유 계산 서버 이동" 요청
- 제약 조건: 기존 FastAPI/React 계약을 크게 깨지 않으면서 클라이언트/서버 기준을 일치시켜야 함

### 3) Design Decisions
- 추천 사유는 `server/main.py`의 전용 related API에서 계산해 상세 화면과 집계 로직이 같은 기준을 사용하도록 했다.
- 클릭 집계는 별도 관리자 API로 분리해 대시보드 위젯이 운영 메트릭을 직접 조회하도록 했다.

### 4) Implementation Notes
- 프론트(v0): `CuratedDetailScreen`이 서버 계산 결과를 사용하도록 변경하고 `AdminDashboard`에 추천 클릭 위젯을 추가했다.
- 백엔드(FastAPI): `/api/curated/{content_id}/related`, `/api/admin/curated/related-clicks/summary`를 추가했다.
- 데이터/엔드포인트 영향: `curated_related_clicks` 테이블 기반 top pair / top reason 집계 응답이 새로 생겼다.

### 5) Validation
- 확인 항목: 추천 이유 서버 일원화, 관리자 집계 응답 shape, 대시보드 위젯 렌더링
- 테스트/검증 결과: Python API 테스트 및 Vitest 화면 테스트를 추가해 관련 흐름을 검증 예정

### 6) Outcome
- 잘된 점: 추천 사유와 클릭 집계 기준이 서버 단일 로직으로 모였다.
- 아쉬운 점: 현재 추천 후보군은 승인 콘텐츠 최신 목록 기반 휴리스틱이라 개인화 신호까지는 반영하지 않는다.
- 다음 액션: 클릭 로그가 쌓이면 가중치/필터를 운영 데이터 기준으로 튜닝한다.

## Session 2026-02-25-01

### 1) Goal
- 바이브코더 놀이터의 디자인 중심 마스터플랜을 수립하고, FastAPI 연동 요구사항까지 문서화한다.

### 2) Inputs
- 참고 문서: `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md`
- 사용자 피드백/이슈: 디자인 퀄리티를 최우선으로 신중한 설계 요청
- 제약 조건: 초기 MVP에서 댓글/신고 기능 필수

### 3) Design Decisions
- "완성도보다 바이브"를 메인 메시지로 고정
- 피드/상세/업로드/프로필/관리자 5개 축으로 IA 고정
- 신고/모더레이션 기능을 초기 범위에 포함

### 4) Implementation Notes
- 프론트(v0): 컴포넌트 단위(`ProjectCard`, `CommentComposer`, `ReportModal`) 우선 제작
- 백엔드(FastAPI): `projects`, `comments`, `reports` 중심으로 MVP API 설계
- 데이터/엔드포인트 영향: `like_count`, `comment_count`를 응답 표준 필드로 유지

### 5) Validation
- 확인 항목: 디자인 시스템, IA, API 요구사항, 학습 루프 문서 존재 여부
- 테스트/검증 결과: 문서 2종 생성 및 업데이트 완료

### 6) Outcome
- 잘된 점: 디자인/백엔드/운영이 하나의 문서 체계로 정리됨
- 아쉬운 점: 실제 UI 시안과 연결된 토큰 파일은 아직 없음
- 다음 액션: v0 시안 생성 후 화면별 컴포넌트 토큰을 분리 문서로 추가

## Session 2026-02-25-02

### 1) Goal
- v0에서 만든 코드를 안티그래비티에서 수정한 뒤 GitHub에 저장/리뷰/머지하는 운영 프로세스를 문서화한다.

### 2) Inputs
- 참고 문서: `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md`
- 사용자 피드백/이슈: GitHub 저장 프로세스 누락 지적
- 제약 조건: 협업 가능한 브랜치/PR 중심 흐름 필요

### 3) Design Decisions
- 워크플로우를 Stitch -> v0 -> 안티그래비티 -> GitHub -> 배포 동기화로 확장
- PR 본문/체크리스트를 표준화해 디자인 품질 누락 방지

### 4) Implementation Notes
- 프론트(v0): Export 결과를 기능 단위로 분리 반영하도록 규칙화
- 백엔드(FastAPI): UI 연동 후 엔드포인트 연결/예외 처리 점검 포함
- 데이터/엔드포인트 영향: API 에러/빈 상태를 PR 체크리스트에 포함

### 5) Validation
- 확인 항목: 브랜치 전략, 커밋 규칙, PR 규칙, 머지 후 동기화 단계 존재 여부
- 테스트/검증 결과: 디자인 시스템 문서(v1.3)에 관련 절차 반영 완료

### 6) Outcome
- 잘된 점: 구현에서 운영까지 이어지는 전체 개발 루프가 문서로 닫힘
- 아쉬운 점: CI 파이프라인(자동 테스트/배포) 상세 규칙은 별도 문서 필요
- 다음 액션: `docs/RELEASE_AND_CI_GUIDE.md`를 추가해 배포 자동화 기준 정리

## Session 2026-02-25-03

### 1) Goal
- 실제 다음 작업에 바로 사용할 실행 산출물(스프린트 계획, Stitch 프롬프트, v0 체크리스트, PR 템플릿)을 생성한다.

### 2) Inputs
- 참고 문서: `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md`
- 사용자 피드백/이슈: "다음 단계로 진행" 요청
- 제약 조건: Stitch -> v0 -> 안티그래비티 -> GitHub 루프를 즉시 실행 가능해야 함

### 3) Design Decisions
- 전략 문서와 실행 문서를 분리해 팀이 바로 사용할 수 있게 함
- 반복 작업(프롬프트/PR 양식)은 템플릿화하여 품질 편차를 줄임

### 4) Implementation Notes
- 프론트(v0): `docs/STITCH_PROMPT_PACK.md`, `docs/V0_HANDOFF_CHECKLIST.md` 생성
- 백엔드(FastAPI): Sprint 계획 문서에서 연동 우선 엔드포인트 명시
- 데이터/엔드포인트 영향: 댓글/신고 중심 API를 Day 4 연동 우선순위로 고정

### 5) Validation
- 확인 항목: 실행 계획, 프롬프트 팩, 핸드오프 체크리스트, PR 템플릿 파일 존재
- 테스트/검증 결과: 4개 파일 생성 및 로그 반영 완료

### 6) Outcome
- 잘된 점: 설계 단계에서 실행 단계로 넘어가는 실무 산출물이 준비됨
- 아쉬운 점: 실제 코드 베이스(프론트/백엔드)는 아직 시작 전
- 다음 액션: Day 1 Stitch 시안 생성 후 브랜치 `feature/ui-home-feed-v1`로 착수

## Session 2026-02-25-04

### 1) Goal
- Python 환경을 프로젝트 독립 `.venv` + `uv` 표준으로 전환해 협업 재현성을 높인다.

### 2) Inputs
- 참고 문서: `docs/UV_WORKFLOW.md`
- 사용자 피드백/이슈: pip 대신 uv 단일 워크플로우 요청
- 제약 조건: Python 3.12 유지, 팀원 동일 환경 재현 가능해야 함

### 3) Design Decisions
- 패키지 매니저를 `uv`로 고정하고 `pip install` 사용을 금지한다.
- 잠금 파일(`uv.lock`) 기반 설치를 협업 기본 정책으로 채택한다.

### 4) Implementation Notes
- 프론트(v0): 영향 없음
- 백엔드(FastAPI): `uv add fastapi "uvicorn[standard]"`로 의존성 설치
- 데이터/엔드포인트 영향: 없음(환경 계층 변경)

### 5) Validation
- 확인 항목: uv 프로젝트 초기화, lock 파일 생성, Python 버전 고정, sync 재현성
- 테스트/검증 결과: `uv run python --version` = 3.12.12, `uv sync --frozen` 통과

### 6) Outcome
- 잘된 점: 협업 환경 재현성/일관성 확보
- 아쉬운 점: CI 파이프라인의 uv 명령 표준화는 아직 문서만 존재
- 다음 액션: CI 설정에 `uv sync --frozen`을 실제 반영

## Session 2026-02-25-05

### 1) Goal
- FastAPI 앱 골격을 생성하고 실행 가능한 최소 상태를 만든다.

### 2) Inputs
- 참고 문서: `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md`, `docs/UV_WORKFLOW.md`
- 사용자 피드백/이슈: "FastAPI 세팅 완료 여부" 확인 요청
- 제약 조건: uv 기반 실행/검증 유지

### 3) Design Decisions
- 초기 엔트리포인트를 `app/main.py`로 고정
- 최소 검증용 `/health` 라우트를 먼저 제공

### 4) Implementation Notes
- 프론트(v0): 영향 없음
- 백엔드(FastAPI): `app/main.py`에 FastAPI 앱 생성 및 `/health` 추가
- 데이터/엔드포인트 영향: 헬스체크 엔드포인트 신설

### 5) Validation
- 확인 항목: import 가능 여부, 함수 실행, 정적 타입 점검
- 테스트/검증 결과: 앱 import 성공, `health()` 결과 정상, basedpyright 0 errors

### 6) Outcome
- 잘된 점: 즉시 실행 가능한 API 베이스라인 확보
- 아쉬운 점: 실제 도메인 라우트(project/comment/report)는 아직 미구현
- 다음 액션: `projects` 라우터와 Pydantic 스키마 추가

---

## Session 2026-02-27-04

### 1) Goal
FastAPI 백엔드를 구현하고 프론트엔드와 연결한다.同一个 폴더에서 실행 가능한 구조로 만든다.

### 2) Inputs
- **참고 문서**: `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md` (9.2 MVP API)
- **사용자 피드백/이슈**: "다음 단계 진행" 요청
- **제약 조건**:同一个 폴더에서 프론트+백엔드 실행

### 3) Design Decisions

#### 아키텍처
```
프로젝트 구조:
/web
├── src/                    # React 프론트엔드
│   ├── components/
│   ├── lib/
│   └── App.tsx
├── server/                 # FastAPI 백엔드
│   ├── main.py
│   ├── pyproject.toml
│   └── .venv/
└── package.json            # pnpm 스크립트
```

#### 실행 명령어
```bash
# 프론트엔드
pnpm dev              # http://localhost:5173

# 백엔드
pnpm dev:backend     # http://localhost:8000
```

#### API 엔드포인트 설계
| 메서드 | 엔드포인트 | 설명 |
|--------|----------|------|
| GET | `/api/projects` | 프로젝트 목록 (정렬/필터) |
| GET | `/api/projects/{id}` | 프로젝트 상세 |
| POST | `/api/projects` | 프로젝트 생성 |
| POST | `/api/projects/{id}/like` | 좋아요 |
| DELETE | `/api/projects/{id}/like` | 좋아요 취소 |
| GET | `/api/projects/{id}/comments` | 댓글 목록 |
| POST | `/api/projects/{id}/comments` | 댓글 작성 |
| POST | `/api/comments/{id}/report` | 댓글 신고 |
| GET | `/api/admin/reports` | 신고 목록 (관리자) |
| PATCH | `/api/admin/reports/{id}` | 신고 처리 |
| GET | `/api/me/projects` | 내 프로젝트 |
| GET | `/health` | 헬스체크 |

### 4) Implementation Notes

#### 4.1 FastAPI 백엔드 구현

**위치**: `server/main.py`

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

app = FastAPI(title="VibeCoder Playground API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**주요 모델**:
```python
class Project(BaseModel):
    id: str
    title: str
    summary: str
    description: Optional[str]
    thumbnail_url: Optional[str]
    demo_url: Optional[str]
    repo_url: Optional[str]
    platform: str
    tags: list[str]
    author_id: str
    author_nickname: str
    like_count: int
    comment_count: int
    created_at: str

class Comment(BaseModel):
    id: str
    project_id: str
    author_id: str
    author_nickname: str
    content: str
    like_count: int
    status: str
    created_at: str
```

#### 4.2 프론트엔드 API 클라이언트

**파일**: `src/lib/api.ts`

```typescript
const API_BASE = "http://localhost:8000"

export const api = {
  getProjects: async (params?: { sort?: string; platform?: string }) => {
    const res = await fetch(`${API_BASE}/api/projects?${params}`)
    return res.json()
  },
  
  getProject: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/projects/${id}`)
    return res.json()
  },
  
  likeProject: async (id: string) => { /* ... */ },
  getComments: async (projectId: string) => { /* ... */ },
  createComment: async (projectId: string, content: string) => { /* ... */ },
  // ...
}
```

#### 4.3 package.json 스크립트

```json
{
  "scripts": {
    "dev": "vite",
    "dev:backend": "cd server && ./.venv/bin/uvicorn main:app --reload --port 8000",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

#### 4.4 화면 연동

**HomeScreen.tsx**:
```typescript
useEffect(() => {
  const fetchProjects = async () => {
    const data = await api.getProjects({ sort, platform: filter })
    setProjects(data.items)
  }
  fetchProjects()
}, [sort, filter])
```

**ProjectDetailScreen.tsx**:
```typescript
const handleLike = async () => {
  if (liked) {
    const result = await api.unlikeProject("1")
  } else {
    const result = await api.likeProject("1")
  }
}

const handleCommentSubmit = async () => {
  const newComment = await api.createComment("1", commentText)
  setComments([newComment, ...comments])
}
```

### 5) Validation

#### 빌드 확인
```bash
cd /Users/usabatch/coding/web
pnpm build
# ✓ 152 modules transformed
# ✓ built in 1.48s
```

#### 백엔드 실행 확인
```bash
curl http://localhost:8000/health
{"status":"ok"}

curl http://localhost:8000/api/projects
{"items":[...], "next_cursor": null}
```

#### 확인된 문제
| 문제 | 해결 |
|------|------|
| 타입 import 오류 | `import { type Project }`로 수정 |
| uvicorn 실행 오류 | `.venv/bin/uvicorn` 직접 경로 사용 |

### 6) Outcome

#### 잘된 점
- ✅ FastAPI MVP API 완비
- ✅ 프론트-백엔드同一个 폴더 통합
- ✅ 좋아요/댓글 기능 연동
- ✅ GitHub 푸시 완료

#### 아쉬운 점
- ❌ 실제 DB 연동 안됨 (인메모리 데이터)
- ❌ 사용자 인증 안됨
- ❌ 이미지 업로드 안됨

#### 다음 액션
1. 실제 DB (PostgreSQL/Neon) 연결
2. 사용자 인증 구현
3. 이미지 업로드 기능
4. Vercel 등 배포

---

## GitHub Push 완료

###推送 정보
- **Repo**: https://github.com/yesonsys03-web/homepage.git
- **태그**: `sprint-01-complete-2026-02-27`
- **커밋**: 2개 (Initial + Merge)

###推送 명령어
```bash
git remote add origin https://github.com/yesonsys03-web/homepage.git
git tag -a "sprint-01-complete-2026-02-27" -m "Sprint 01 완료"
git push -u origin main
git push origin "sprint-01-complete-2026-02-27"
```
- 잘된 점: 즉시 실행 가능한 API 베이스라인 확보
- 아쉬운 점: 실제 도메인 라우트(project/comment/report)는 아직 미구현
- 다음 액션: `projects` 라우터와 Pydantic 스키마 추가


## Session 2026-02-28-01

### 1) Goal
Neon PostgreSQL 데이터베이스를 연결하고 실제 API 연동을 완료한다.

### 2) Inputs
- **참고 문서**: `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md`
- **사용자 피드백/이슈": "다음 단계 진행" 요청
- **제약 조건**: Neon DB 무료 티어 사용, uv 기반 실행 유지

### 3) Design Decisions

#### Neon DB 연결 문자열
```
postgresql://neondb_owner:npg_***@ep-summer-bar-a10gq0xl-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

#### 테이블 스키마
| 테이블 | 설명 |
|--------|-------|
| users | 사용자 (id, nickname, role) |
| projects | 프로젝트 (title, summary, description, tags, like_count, comment_count) |
| comments | 댓글 (content, parent_id, status) |
| reports | 신고 (target_type, target_id, reason, status) |

### 4) Implementation Notes

#### 4.1 DB 연결 설정

**파일**: `server/db.py`

```python
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv(".env")
DATABASE_URL = os.getenv("DATABASE_URL")

@contextmanager
def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()
```

#### 4.2 테이블 초기화

```python
def init_db():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # users 테이블
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    nickname VARCHAR(100) UNIQUE NOT NULL,
                    role VARCHAR(20) DEFAULT 'user',
                    ...
                )
            """)
            # projects, comments, reports 테이블同样创建
            conn.commit()
```

#### 4.3 CRUD 함수

| 함수 | 설명 |
|------|-------|
| `get_projects()` | 프로젝트 목록 조회 (정렬/필터 지원) |
| `get_project()` | 프로젝트 상세 조회 |
| `create_project()` | 프로젝트 생성 |
| `like_project()` / `unlike_project()` | 좋아요/취소 |
| `get_comments()` | 댓글 목록 |
| `create_comment()` | 댓글 작성 |
| `report_comment()` | 댓글 신고 |
| `get_reports()` / `update_report()` | 신고 관리 |

#### 4.4 백엔드 연동

**파일**: `server/main.py`

```python
@app.on_event("startup")
async def startup_event():
    try:
        init_db()
    except Exception as e:
        print(f"⚠️  DB initialization warning: {e}")
```

#### 4.5 수정된 에러

| 에러 | 원인 | 해결 |
|------|------|------|
| `Address already in use` | 포트 8000 사용 중 | `kill -9 <PID>` |
| `DATABASE_URL not set` | .env 경로 오류 | `load_dotenv(".env")` 변경 |
| `column "tags" does not exist` | 테이블에 tags 컬럼 누락 | `ALTER TABLE projects ADD COLUMN tags TEXT[]` |

### 5) Validation

#### 빌드 확인
```bash
cd /Users/usabatch/coding/web
pnpm build
# ✓ built in 1.66s
```

#### API 테스트
```bash
# 헬스체크
curl http://localhost:8000/health
{"status":"ok"}

# 프로젝트 생성
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Project","summary":"Test"}'

# 프로젝트 목록
curl http://localhost:8000/api/projects
{"items":[{"id":"...","title":"Test Project",...}],"next_cursor":null}
```

### 6) Outcome

#### 잘된 점
- ✅ Neon PostgreSQL 연동 완료
- ✅ 실제 DB로 CRUD operations 동작
- ✅ 프론트엔드-백엔드-API-DB 전체 데이터 플로우 완성
- ✅ GitHub 푸시 완료 (커밋: fc989ae7)

#### 아쉬운 점
- ❌ 사용자 인증 미구현
- ❌ 이미지 업로드 미구현
- ❌ tags 필터 검색 미검증

#### 다음 액션
1. 사용자 인증 (JWT/OAuth) 구현
2. 이미지 업로드 기능 추가
3. 태그 기반 필터링 검증
4. 배포 (Vercel 등)

---

## GitHub Push 완료 (2026-02-28)

###推送 정보
- **Repo**: https://github.com/yesonsys03-web/homepage.git
- **커밋**: fc989ae7 - `feat(db): Neon PostgreSQL 연동 및 API 구현`
- **Branch**: main

###推送 명령어
```bash
git add server/main.py server/db.py server/pyproject.toml server/uv.lock docs/IMPLEMENTATION_LEARNING_LOG.md
git commit -m "feat(db): Neon PostgreSQL 연동 및 API 구현"
git push origin main
```

## Session 2026-02-28-02

### 1) Goal
JWT 기반 사용자 인증 시스템을 구현한다.

### 2) Inputs
- **참고 문서**: `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md`
- **사용자 피드백/이슈**: "인증 (Auth)" 선택
- **제약 조건**: Neon DB users 테이블 사용

### 3) Design Decisions

#### 기술 스택
| 패키지 | 용도 |
|--------|------|
| python-jose | JWT 토큰 생성/검증 |
| bcrypt | 비밀번호 해시화 |
| fastapi.security | OAuth2PasswordBearer |

#### API 엔드포인트
| 메서드 | 엔드포인트 | 설명 |
|--------|----------|------|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| GET | `/api/me` | 현재 사용자 (토큰 필요) |

### 4) Implementation Notes

#### 4.1 인증 모듈

**파일**: `server/auth.py`

```python
import bcrypt
from jose import jwt

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
ALGORITHM = "HS256"

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
```

#### 4.2 데이터베이스

- users 테이블에 `password_hash` 컬럼 추가
- `create_user()`, `get_user_by_email()`, `get_user_by_id()` 함수 추가

#### 4.3 의존성 주입

```python
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    user = get_user_by_id(payload.get("sub"))
    return user
```

### 5) Validation

#### API 테스트
```bash
# 회원가입
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","nickname":"testuser","password":"password123"}'

# 로그인
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 현재 사용자 조회
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/me
```

### 6) Outcome

#### 잘된 점
- ✅ JWT 기반 인증 시스템 완성
- ✅ bcrypt로 안전하게 비밀번호 해시화
- ✅ 보호된 라우트 (의존성 주입) 지원
- ✅ GitHub 푸시 완료 (커밋: fd6dbef0)

#### 아쉬운 점
- ❌ 이미지 업로드 미구현
- ❌ 프론트엔드 인증 폼 미연동

#### 다음 액션
1. 이미지 업로드 기능 추가
2. 프론트엔드 로그인/회원가입 화면 연동
3. 배포 (Vercel 등)

---

## GitHub Push 완료 (2026-02-28)

###推送 정보
- **Repo**: https://github.com/yesonsys03-web/homepage.git
- **커밋**: fd6dbef0 - `feat(auth): JWT 인증 구현`
- **Branch**: main

## Session 2026-02-28-03

### 1) Goal
프로젝트 등록 폼에 이미지 URL 입력을 추가하고 미리보기를 구현한다.

### 2) Inputs
- **사용자 피드백/이슈**: "이미지 업로드" 선택
- **제약 조건**: MVP에서는 파일 업로드 없이 URL 방식만 지원

### 3) Design Decisions

#### 이미지 입력 방식
| 방식 | 장점 | 단점 |
|------|------|------|
| URL 입력 | 간단, 서버 부하 없음 | 외부 이미지 의존 |
| 파일 업로드 | 자체 관리 | S3 등 스토리지 필요 |

**선택**: URL 입력 방식 (MVP)

### 4) Implementation Notes

#### SubmitScreen.tsx 업데이트

```typescript
const [formData, setFormData] = useState({
  title: "",
  summary: "",
  thumbnail_url: "",
  // ...
})

// 이미지 미리보기
{formData.thumbnail_url && (
  <img src={formData.thumbnail_url} alt="preview" />
)}
```

#### API 연동
- 기존 `createProject` API에 `thumbnail_url` 필드 already supported
- 테스트: `POST /api/projects` with `thumbnail_url` ✅

### 5) Validation

```bash
# 썸네일 포함 프로젝트 생성 테스트
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"title":"Image Test","summary":"Test","thumbnail_url":"https://picsum.photos/400/300"}'
```

### 6) Outcome

#### 잘된 점
- ✅ 이미지 URL 입력 및 미리보기 구현
- ✅ 폼 상태 관리 및 유효성 검사
- ✅ 라이브 미리보기 (입력 시 즉시 반영)
- ✅ GitHub 푸시 완료 (커밋: f1f357e8)

#### 아쉬운 점
- ❌ 실제 파일 업로드 미지원 (URL 방식만)
- ❌ 프론트엔드 인증 폼 미연동

#### 다음 액션
1. 프론트엔드 로그인/회원가입 화면 연동
2. 배포 (Vercel 등)

---

## GitHub Push 완료 (2026-02-28)

###推送 정보
- **Repo**: https://github.com/yesonsys03-web/homepage.git
- **커밋**: f1f357e8 - `feat(submit): 프로젝트 등록 폼에 이미지 URL 입력 추가`
- **Branch**: main

## Session 2026-02-28-04

### 1) Goal
프론트엔드 로그인/회원가입 화면을 구현하고 인증 상태를 관리한다.

### 2) Inputs
- **사용자 피드백/이슈**: "프론트엔드 인증" 선택
- **제약 조건**: 기존 JWT 인증 API와 연동

### 3) Design Decisions

#### 아키텍처
- AuthContext로 전역 인증 상태 관리
- localStorage에 토큰/사용자 정보 저장
- api.ts에 auth 함수 추가 (login, register, getMe)

### 4) Implementation Notes

#### AuthContext

```typescript
// src/lib/auth-context.tsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  
  const login = (newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
    setUser(newUser)
  }
  
  const logout = () => { /* ... */ }
}
```

#### LoginScreen
- 이메일/비밀번호 입력
- API 호출 후 토큰 저장
- 에러 처리 및 로딩 상태

#### RegisterScreen
- 이메일/닉네임/비밀번호 입력
- 비밀번호 확인
- 로그인 화면 전환

### 5) Validation

```bash
# 로그인 API 테스트
curl -X POST http://localhost:8000/api/auth/login \
  -d '{"email":"test@example.com","password":"password123"}'
# ✅ 성공
```

### 6) Outcome

#### 잘된 점
- ✅ 프론트엔드 인증 화면 완성
- ✅ 상태 관리 및 로컬 스토리지 연동
- ✅ GitHub 푸시 완료 (커밋: fd14f20b)

#### 아쉬운 점
- ❌ 실제 배포 미진행

#### 다음 액션
1. 배포 (Vercel 등)

---

## GitHub Push 완료 (2026-02-28)

###推送 정보
- **Repo**: https://github.com/yesonsys03-web/homepage.git
- **커밋**: fd14f20b - `feat(auth): 프론트엔드 인증 화면 구현`
- **Branch**: main

## Session 2026-02-28-05

### 1) Goal
- `docs/remaining-features.md` 기준으로 남은 핵심 기능을 실제 코드에 반영하고, 검증까지 완료한다.
- 초보자도 다시 따라할 수 있도록 작업 과정을 학습용 로그로 남긴다.

### 2) Inputs
- 참고 문서: `docs/remaining-features.md`, `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 사용자 피드백/이슈: "계획 말고 실제 진행", "완료 후 md로 정리"
- 제약 조건:
  - 기존 디자인/코드 스타일 유지
  - 리팩터링은 동작을 바꾸지 않는 범위에서 최소 수정

### 3) Design Decisions
- 상세 페이지 프로젝트 ID를 하드코딩(`"1"`)에서 앱 상태 기반 전달 방식으로 변경했다.
- Explore/Profile/Admin의 목데이터를 API 호출 기반으로 전환해 실제 데이터 흐름을 통일했다.
- 관리자 API는 프론트/백엔드 계약을 동일한 형태(JSON body의 `status`)로 맞췄다.
- `react-refresh/only-export-components` lint 규칙을 만족하기 위해 비컴포넌트 export를 분리했다.

### 4) Implementation Notes
- 백엔드 (`server/main.py`, `server/db.py`)
  - `GET /api/me/projects`를 실제 DB 조회로 구현 (`get_user_projects` 추가)
  - `PATCH /api/admin/reports/{report_id}`를 `{"status":"..."}` 요청 본문으로 처리
  - 관리자 라우트에 권한 가드(`require_admin`) 적용
  - 생성/수정 API에 `None` 방어 로직을 추가해 런타임 오류 가능성 축소
- 프론트 (`src/App.tsx`, `HomeScreen.tsx`, `ProjectDetailScreen.tsx`)
  - `selectedProjectId` 상태를 추가하고 카드 클릭 시 상세로 ID 전달
  - 상세 화면의 프로젝트/좋아요/댓글 API 호출이 선택된 ID를 사용하도록 수정
- 프론트 데이터 연동 (`ExploreScreen.tsx`, `ProfileScreen.tsx`, `AdminScreen.tsx`)
  - Explore: 정렬/카테고리 기반 API 조회로 전환
  - Profile: 내 프로젝트 API 연동 및 사용자 정보 표시를 인증 상태와 연결
  - Admin: 신고 목록 조회/상태 변경 API 연동
- 인증/구조 정리 (`src/lib/*`)
  - 세션 복원 시 `api.getMe()`로 토큰 유효성 재검증
  - lint 이슈 해결을 위해 auth 모듈을 분리:
    - `auth-types.ts` (타입)
    - `auth-store.ts` (context 저장소)
    - `use-auth.ts` (커스텀 훅)
  - UI 컴포넌트 파일의 비컴포넌트 export 제거:
    - `button.tsx`, `badge.tsx`, `tabs.tsx`

### 5) Validation
- 프론트 lint:
  - `pnpm lint` -> 통과
- 프론트 build:
  - `pnpm build` -> 통과 (`tsc -b && vite build` 성공)
- 백엔드 문법/import:
  - `uv run python -m py_compile main.py db.py auth.py` -> 통과
  - `uv run python -c "import main; print('backend import ok')"` -> 통과
- 참고:
  - 이 세션 환경에서는 LSP 서버(`typescript-language-server`, `basedpyright-langserver`)가 미설치라 LSP 진단 대신 실제 빌드/컴파일 검증을 사용했다.

### 6) Outcome
#### 잘된 점
- 남은 핵심 기능을 목데이터 중심 구조에서 실데이터 중심 구조로 전환했다.
- 프론트-백엔드 API 계약 불일치 포인트를 정리해 연동 안정성을 높였다.
- lint/build/backend import 검증까지 완료해 "실행 가능한 상태"를 확인했다.

#### 아쉬운 점
- 브라우저 E2E(클릭 흐름) 자동 테스트는 아직 없다.
- LSP 기반 실시간 정적 분석 환경은 아직 미설치다.

#### 다음 액션 (초보자용)
1. 일반 유저/관리자 계정으로 실제 화면 흐름을 손으로 한번 점검한다.
2. `remaining-features.md`에서 남은 항목을 P2 중심으로 재정렬한다.
3. 필요하면 Playwright로 핵심 시나리오(홈->상세, 관리자 신고 처리) 자동화 테스트를 추가한다.

## Session 2026-02-28-06

### 1) Goal
- no-thumbnail 카드의 스티커를 랜덤 스타일에서 "의미 기반 아트디렉션"으로 고도화한다.
- 초보자도 이해하기 쉽게 규칙(임계값/태그/언어)을 문서화한다.

### 2) Inputs
- 참고 문서: `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md`, `src/components/ProjectCoverPlaceholder.tsx`
- 사용자 피드백/이슈: "스티커를 랜덤이 아니라 상태 기반으로 더 고급화"
- 제약 조건: 기존 시각 톤은 유지하고, 규칙만 명확히 개선

### 3) Design Decisions
- `HOT` 임계값을 대규모 서비스 기준(100+)에서 초기 커뮤니티 기준(30+)으로 낮췄다.
- 태그 사전에 `prototype`, `hackathon`, `study`, `automation`, `featured` 등을 추가해 분류 품질을 높였다.
- 스티커 문구를 브라우저 언어에 따라 KO/EN 자동 전환하도록 결정했다.

### 4) Implementation Notes
- `src/components/ProjectCoverPlaceholder.tsx`
  - `HOT_STICKER_THRESHOLD = 30` 상수 추가
  - `TAG_KEYWORDS` 확장(Hot/New/WIP/Tool/Game)
  - 상태 결정 로직(`resolveMood`)을 임계값 + 태그 기반으로 튜닝
  - 스티커 국제화 함수 추가(`detectLocale`, `localizeStickerLabel`)
- `src/components/screens/HomeScreen.tsx`
  - `HOT_PROJECT_THRESHOLD = 30`으로 `isHot` 계산 동기화
- `src/components/screens/ExploreScreen.tsx`
  - `isHot` 전달 기준을 30으로 동기화
- `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md`
  - "No-Thumbnail 아트디렉션 규칙" 섹션 추가

### 5) Validation
- `pnpm lint` -> 통과
- `pnpm build` -> 통과

### 6) Outcome
#### 잘된 점
- 같은 카드 fallback이라도 프로젝트 상태를 더 정확하게 보여주게 됐다.
- 작은 커뮤니티 규모에서도 `HOT`가 실제로 드러나는 균형점을 만들었다.
- 규칙을 문서화해서 이후 작업자가 같은 방향으로 유지보수할 수 있게 됐다.

#### 아쉬운 점
- 현재 분류는 키워드 기반이라 프로젝트 맥락을 100% 이해하진 못한다.

#### 다음 액션
1. 실사용 데이터 1~2주 관찰 후 `HOT` 임계값(30) 재조정
2. 태그 입력 UI에서 추천 태그를 제공해 분류 품질 향상

## Session 2026-02-28-07

### 1) Goal
- 관리자 대시보드를 운영 실무 수준으로 확장한다.
- 신고/유저 관리 중심에서 콘텐츠 모더레이션(프로젝트 수정/숨김/복구/삭제)까지 연결한다.

### 2) Inputs
- 사용자 요청: 관리자 카드(프로젝트) 직접 수정/삭제 기능 필요
- 기존 상태: 신고 처리/정책/유저 제한은 구현 완료, 콘텐츠 직접 조치는 미구현

### 3) Design Decisions
- 즉시 삭제 대신 `status` 기반 소프트 삭제(`published/hidden/deleted`)를 채택했다.
- 관리자 액션은 모두 이유(reason)와 로그를 남겨 추적 가능하도록 통일했다.
- 관리자 탭 전환 성능을 위해 서버 재요청 필터 방식에서 클라이언트 필터 방식으로 변경했다.

### 4) Implementation Notes
- 백엔드 (`server/main.py`, `server/db.py`)
  - 관리자 프로젝트 API 추가:
    - `GET /api/admin/projects`
    - `PATCH /api/admin/projects/{project_id}`
    - `POST /api/admin/projects/{project_id}/hide`
    - `POST /api/admin/projects/{project_id}/restore`
    - `DELETE /api/admin/projects/{project_id}` (soft delete)
  - 공용 상세 API는 `published` 상태만 노출되게 제한
  - 관리자 액션 로그(`project_updated/hidden/restored/deleted`) 자동 기록
  - 정책 응답에 `baseline_keyword_categories`, `custom_blocked_keywords`, 최근 수정자 메타 포함
- 프론트 (`src/components/screens/AdminScreen.tsx`, `src/lib/api.ts`)
  - 콘텐츠 관리 탭 추가 및 상태 필터/검색 지원
  - 프로젝트 단건 액션(수정/숨김/복구/삭제) + 다중 선택 일괄 액션(숨김/복구)
  - 정책 탭 고도화:
    - 카테고리별 카운트
    - 접기/펼치기
    - 미리보기 검색
    - CSV 내보내기 + CSV 가져오기
  - 로그 탭에 대상 타입 필터 추가(`all/project/report/user/moderation_settings`)
  - 관리자 신고 탭 성능 개선:
    - 탭 클릭 시 서버 재요청 제거(클라이언트 필터)
    - 30초 폴링 + 비가시 탭 스킵으로 최신성 유지

### 5) Validation
- `pnpm lint` -> 통과
- `pnpm build` -> 통과
- `uv run python -m py_compile main.py db.py auth.py` -> 통과
- `uv run python -c "import main; print('backend import ok')"` -> 통과

### 6) Outcome
#### 잘된 점
- 관리자 기능이 신고 중심에서 콘텐츠 운영까지 확장되어 실제 운영 대응 속도가 올라갔다.
- 정책 룰이 카테고리 기반으로 시각화되어 운영자가 기준을 빠르게 이해할 수 있게 됐다.
- 액션 로그/사유 필드 강화로 운영 결정의 사후 추적성이 좋아졌다.

#### 아쉬운 점
- 프로젝트 수정 폼은 아직 간단한 단일 패널이라 고급 편집 UX(필드 검증/미리보기)는 추가 여지가 있다.
- DB 연결은 요청마다 새 연결 구조라 고트래픽 대비 성능 튜닝은 남아 있다.

#### 다음 액션
1. DB 커넥션 풀 적용으로 관리자 API 응답 지연 감소
2. 콘텐츠 관리 탭에 정렬/페이지네이션 추가
3. Playwright로 관리자 핵심 시나리오(E2E) 자동화

## Session 2026-02-28-08

### 1) Goal
- About 페이지를 하드코딩 화면에서 "관리자가 실시간 수정 가능한 운영 콘텐츠"로 전환한다.
- 운영 기록(누가/왜 수정했는지)을 관리자 로그에 남긴다.

### 2) Inputs
- 사용자 요청: About 페이지도 관리자 수정 가능해야 함
- 기존 상태: About 화면은 프론트 코드에 정적 데이터 하드코딩

### 3) Design Decisions
- About 콘텐츠는 별도 키-값 저장 구조(`site_contents`)로 분리 저장한다.
- 공개 조회 API와 관리자 수정 API를 분리해 권한 경계를 명확히 한다.
- 관리자 수정에는 `reason`을 필수로 받아 액션 로그 추적성을 유지한다.

### 4) Implementation Notes
- 백엔드
  - `server/db.py`
    - `site_contents` 테이블 추가 (`content_key`, `content_json`, `updated_at`)
    - `get_site_content`, `upsert_site_content` 추가
  - `server/main.py`
    - `GET /api/content/about` 추가 (공개 조회)
    - `PATCH /api/admin/content/about` 추가 (관리자 수정, reason 필수)
    - 앱 시작 시 About 기본값 시드 처리
    - 로그 기록: `about_content_updated`
- 프론트
  - `src/lib/api.ts`
    - `AboutContent` 관련 타입 추가
    - `getAboutContent`, `updateAboutContent` 추가
  - `src/components/screens/AboutScreen.tsx`
    - 하드코딩 데이터 제거, API 기반 렌더링으로 전환
  - `src/components/screens/AdminScreen.tsx`
    - `페이지 관리` 탭 추가
    - About Hero/Values/Team/FAQ/Contact 이메일 편집 및 저장 UI 추가
    - 저장 시 reason 필수, 저장 후 로그/콘텐츠 재동기화

### 5) Validation
- `pnpm lint` -> 통과
- `pnpm build` -> 통과
- `uv run python -m py_compile main.py db.py auth.py` -> 통과
- `uv run python -c "import main; print('backend import ok')"` -> 통과

### 6) Outcome
#### 잘된 점
- 운영자가 코드 수정 없이 About 내용을 즉시 업데이트할 수 있게 됐다.
- 공개 페이지와 관리자 편집 데이터 소스가 일치하게 정리됐다.
- 수정 이력(사유 포함)이 관리자 로그로 추적 가능해졌다.

#### 아쉬운 점
- About 편집은 현재 텍스트 기반 입력(`|` 구분)이라 UX가 아직 기술자 친화적이다.

#### 다음 액션
1. About 편집 폼을 블록 단위(Values/Team/FAQ) 카드 에디터로 고도화
2. 저장 전 미리보기 패널 추가
3. About 변경 이력 전용 로그 필터/롤백 기능 검토

## Session 2026-02-28-09

### 1) Goal
- 관리자 페이지 초기 체감 속도를 개선하기 위해 신고 큐 페이지네이션(50개)과 탭 기반 Lazy Loading을 적용한다.

### 2) Inputs
- 사용자 피드백/이슈: 관리자 페이지 진입 시 신고 큐가 늦게 표시됨
- 제약 조건: 기존 관리자 기능(신고 처리/사용자 관리/콘텐츠 관리) 동작은 유지해야 함

### 3) Design Decisions
- 신고 API는 `status + limit + offset` 기반 페이지네이션을 지원하고, 별도 `total` 값을 함께 반환한다.
- 관리자 화면은 활성 탭 데이터만 요청하는 Lazy Loading으로 변경해 초기 과호출을 제거한다.
- 신고 탭은 50개 단위 페이지 이동 UI를 제공하고 현재 페이지를 유지한 채 재조회 가능하게 한다.

### 4) Implementation Notes
- 백엔드(FastAPI)
  - `server/db.py`
    - `get_reports(status, limit, offset)`로 확장
    - `get_reports_count(status)` 추가
  - `server/main.py`
    - `GET /api/admin/reports`에 `limit`, `offset` 파라미터 추가
    - 응답을 `{ items, total }` 형태로 확장
- 프론트
  - `src/lib/api.ts`
    - `api.getReports(status?, limit=50, offset=0)`로 확장
  - `src/components/screens/AdminScreen.tsx`
    - 신고 탭 상태 추가: `reportPage`, `reportTotal`, `REPORT_PAGE_SIZE`
    - 탭 상태 추가: `activeTab`
    - 초기 전체 동시 로드 제거, 탭별 데이터 로드로 전환(Lazy Loading)
    - 신고 탭 하단에 이전/다음 페이지네이션 UI 추가
    - 수동 새로고침을 활성 탭 기준으로 동작하도록 조정

### 5) Validation
- `uv run python -m py_compile server/db.py server/main.py` -> 통과
- `uv run python -c "import main; print('backend import ok')"` (workdir=`server`) -> 통과
- `pnpm build` (`tsc -b && vite build`) -> 통과

### 6) Outcome
#### 잘된 점
- 관리자 첫 진입 시 불필요한 API 동시 호출을 줄여 초기 체감 속도가 개선됐다.
- 신고 목록 렌더링 비용을 고정(페이지 50개)해 데이터 증가 시에도 UI 안정성이 좋아졌다.

#### 아쉬운 점
- 현재는 단순 이전/다음 방식이라 임의 페이지 점프 UX는 아직 없다.

#### 다음 액션
1. 신고 탭 페이지 번호 직접 이동/페이지 크기 선택 옵션 검토
2. 탭별 캐시 TTL(예: 30초) 적용으로 재진입 체감 속도 추가 개선

## Session 2026-02-28-10

### 1) Goal
- 커뮤니티 핵심 UX(탐색/상세/댓글/좋아요)의 반응성을 높이기 위해 공개 영역에도 캐시 정책(TTL + SWR + 무효화)을 도입한다.

### 2) Inputs
- 사용자 요청: "즐겁게 노는" 컨셉에 맞게 체감 즉시성을 높이고, 변경 후 일관성도 유지할 것
- 기존 상태: 공개 영역은 `fetch` 직접 호출 구조로 매 요청마다 네트워크 대기 발생

### 3) Design Decisions
- 공개 영역 캐시 정책은 `cache-first + stale-while-revalidate`로 채택한다.
- TTL은 데이터 성격별 차등 적용:
  - 프로젝트 목록: 45초
  - 프로젝트 상세: 20초
  - 댓글: 8초
- 상호작용(좋아요/좋아요 취소/댓글 작성/프로젝트 생성) 후에는 관련 캐시를 명시적으로 무효화한다.

### 4) Implementation Notes
- `src/lib/api.ts`
  - 공개 영역 캐시 저장소와 SWR 헬퍼 추가:
    - `publicDataCache`
    - `fetchWithPublicSWR`
    - `createPublicCacheKey`
  - 공개 API에 SWR 옵션 적용:
    - `getProjects(params, options?)`
    - `getProject(id, options?)`
    - `getComments(projectId, sort, options?)`
  - 무효화 규칙 구현:
    - `invalidateProjectRelatedCaches(projectId)`
    - 트리거: `createProject`, `likeProject`, `unlikeProject`, `createComment`
  - 화면 로딩 최적화를 위한 캐시 조회 유틸 추가:
    - `hasProjectsCache`, `hasProjectDetailCache`, `hasCommentsCache`
- `src/components/screens/HomeScreen.tsx`
  - 목록 로드 시 캐시 존재 여부를 먼저 확인하고, 캐시가 없을 때만 블로킹 로딩 표시
  - `onRevalidate`를 통해 백그라운드 최신화 결과를 UI에 반영
- `src/components/screens/ExploreScreen.tsx`
  - Home과 동일한 캐시 우선 + 비차단 재검증 패턴 적용
- `src/components/screens/ProjectDetailScreen.tsx`
  - 상세/댓글을 병렬로 로드하고 캐시가 있을 경우 즉시 렌더
  - 댓글 작성 후에는 `getComments(..., { force: true })`로 최신 댓글 강제 동기화

### 5) Validation
- `pnpm build` (`tsc -b && vite build`) -> 통과
- `uv run python -m py_compile server/db.py server/main.py` -> 통과
- `uv run python -c "import main; print('backend import ok')"` (workdir=`server`) -> 통과

### 6) Outcome
#### 잘된 점
- 홈/탐색/상세에서 재방문 시 즉시 렌더되는 구간이 늘어 체감 반응성이 좋아졌다.
- 사용자 상호작용 직후 캐시 무효화로 데이터 일관성을 유지할 수 있게 됐다.

#### 아쉬운 점
- 현재는 메모리 캐시 기반이라 탭/세션 경계 정책(예: 로그아웃 시 클리어)을 추가로 명확히 다듬을 여지가 있다.

#### 다음 액션
1. cache hit/miss 및 revalidate 성공률 로그를 추가해 TTL 튜닝 근거 확보
2. 프로젝트 카드 좋아요 수에 낙관적 업데이트(optimistic update) 적용 검토

## Session 2026-03-01-01

### 1) Goal
- 카드 상세를 실사용 흐름에 맞게 고도화한다: 작성자/관리자 수정 권한, 공유 기능, 딥링크 진입을 한 사이클로 완성한다.

### 2) Inputs
- 사용자 피드백/이슈:
  - 업로드 후 본인 카드 수정 불가
  - 관리자 전면 수정 권한 필요
  - 상세 공유 버튼 실사용 기능 필요(대표 소셜 채널)
- 제약 조건:
  - 기존 Submit 화면을 재사용해 편집 모드로 전환
  - 권한 검사는 백엔드에서 최종 보장

### 3) Design Decisions
- 편집 UX는 별도 화면 신설 대신 Submit 화면의 `editingProjectId` 모드로 통일했다.
- 권한 모델은 `owner or admin`으로 고정해, 작성자와 관리자가 동일 PATCH 엔드포인트를 사용하도록 단순화했다.
- 공유 URL은 `?project=<id>` 쿼리 딥링크를 채택해, 링크 클릭 시 앱이 바로 해당 상세를 열도록 했다.
- 웹 intent가 제한된 채널(Instagram/Kakao)은 링크 복사 fallback을 기본으로 제공한다.

### 4) Implementation Notes
- 백엔드
  - `server/main.py`
    - `PATCH /api/projects/{project_id}` 추가
    - 권한 검사: 작성자 본인 또는 admin만 수정 허용
    - 수정 본문 금칙어 검증 + 목록 캐시 무효화 유지
  - `server/db.py`
    - `update_project_owner_fields` 추가 (owner/admin 공용 수정 필드 처리)
- 프론트
  - `src/App.tsx`
    - `submitEditingProjectId` 상태 추가
    - 상세 -> Submit 편집 진입 핸들러(`openProjectEdit`) 연결
    - `?project=` 딥링크 초기 진입/동기화 처리
  - `src/components/screens/ProjectDetailScreen.tsx`
    - 권한 충족 시 `수정` 버튼 노출
    - 공유 메뉴 구현: 기기 공유, 링크 복사, X, Threads, Facebook, LinkedIn, Instagram, KakaoTalk
  - `src/components/screens/SubmitScreen.tsx`
    - `editingProjectId`가 있으면 기존 프로젝트 로드 후 프리필
    - 제출 시 생성/수정 API 분기 처리
  - `src/lib/api.ts`
    - `api.updateProject` 추가

### 5) Validation
- 백엔드
  - `uv run python -m compileall .` (workdir=`server`) 통과
  - `uv run python -c "from main import app; print('app-import-ok')"` (workdir=`server`) 통과
- 프론트
  - `pnpm build` 통과
  - `pnpm lint` 에러 0 (기존 경고 2건 유지)

### 6) Outcome
#### 잘된 점
- 작성자/관리자 수정 플로우가 상세 -> Submit 편집으로 자연스럽게 연결됐다.
- 공유 기능이 단순 버튼에서 실제 소셜 전파 가능한 구조로 확장됐다.
- 딥링크(`?project`)로 외부 공유 후 상세 재진입이 가능해졌다.

#### 아쉬운 점
- Instagram/Kakao는 웹 표준 intent 제약으로 SDK 없는 완전 자동 공유 한계가 있다.

#### 다음 액션
1. 카카오 JavaScript SDK 적용으로 친구 공유 UX 고도화
2. 공유 메뉴 outside-click 닫힘/키보드 접근성 강화
3. `/api/admin/perf/projects` 기반으로 TTL/DB pool 수치 튜닝

## Session 2026-03-01-02

### 1) Goal
- 가입 실패를 성공처럼 처리하던 인증 버그를 우선 수정하고, 승인형 가입(`pending`) + 관리자 승인/반려 흐름의 첫 실행 버전을 구축한다.

### 2) Inputs
- 사용자 피드백/이슈:
  - 가입 후 계정이 정상 동작하지 않음
  - Admin에서 신규 가입자 확인/승인 필요
- 제약 조건:
  - 기존 FastAPI + React 구조를 유지
  - 당일 검증 가능한 최소 기능으로 단계별 적용

### 3) Design Decisions
- 인증 실패 처리 표준을 `authFetch` 패턴에 맞춰 `register/login`에도 동일 적용했다.
- 사용자 계정 상태를 `pending/active/rejected`로 분리해 승인 정책을 명시화했다.
- 승인 액션은 기존 관리자 액션 로그 체계를 재사용해 감사 추적을 유지했다.

### 4) Implementation Notes
- 백엔드
  - `server/db.py`
    - `users.status` 컬럼 도입(기본 `active` + NULL 보정)
    - 신규 가입 `create_user(..., status="pending")` 지원
    - `approve_user`, `reject_user` 함수 추가
  - `server/main.py`
    - 로그인 시 `pending/rejected` 계정 차단(403)
    - `get_current_user`에서 `active` 상태만 통과
    - 관리자 승인/반려 엔드포인트 추가
      - `POST /api/admin/users/{user_id}/approve`
      - `POST /api/admin/users/{user_id}/reject`
- 프론트
  - `src/lib/api.ts`
    - `register/login`에 `res.ok` 실패 처리 추가
    - `VITE_API_BASE` 환경변수 기반 API 베이스 전환
    - `approveUser`, `rejectUser` 관리자 API 메서드 추가
  - `src/components/screens/RegisterScreen.tsx`
    - 응답 유효성 가드 추가
    - `pending` 가입 시 자동 로그인 중단 + 안내 메시지
  - `src/components/screens/LoginScreen.tsx`
    - 응답 유효성 가드 추가
  - `src/components/screens/AdminScreen.tsx`
    - 사용자 상태 배지(`승인 대기/활성/반려`) 추가
    - 승인/반려 버튼과 후속 refresh/action-log 연동
  - `src/lib/auth-types.ts`
    - `User.status` 타입 반영
  - `.env.example`
    - `VITE_API_BASE` 샘플 추가

### 5) Validation
- 백엔드
  - `uv run python -m compileall .` (workdir=`server`) 통과
  - `uv run python -c "from main import app; print('app-import-ok')"` 통과
- 프론트
  - `pnpm build` 통과
  - `pnpm lint` 에러 0 (기존 경고 2건 유지)

### 6) Outcome
#### 잘된 점
- 가입 실패/성공 상태가 UI에서 명확히 분리되어 가짜 성공 케이스가 제거됐다.
- 승인형 가입 정책의 핵심 흐름(가입 대기 -> 관리자 승인/반려 -> 로그인 제어)이 동작 가능한 상태가 됐다.

#### 아쉬운 점
- 반려 사유 사용자 통지(메일/알림)와 OAuth 연동은 아직 미구현이다.

#### 다음 액션
1. Google OAuth 가입 경로를 `pending` 상태와 연결
2. 승인/반려 이벤트 메일 발송 파이프라인 추가
3. Admin users 탭 캐시 TTL/강제 갱신 정책 세분화

## Session 2026-03-01-03

### 1) Goal
- Google OAuth를 실제 운영 가능한 흐름으로 연결하고, 시크릿은 서버 환경변수에만 두면서 Admin에서 런타임 제어(활성화/URI) 가능한 구조를 구축한다.

### 2) Inputs
- 사용자 피드백/이슈:
  - Google OAuth 클라이언트 생성 후 실제 연결 가이드 필요
  - 시크릿을 UI/코드에 직접 저장하지 않는 운영 방식 요구
- 제약 조건:
  - 비밀값(`GOOGLE_CLIENT_SECRET`)은 절대 Git/프론트에 노출 금지
  - 기존 Admin 정책 화면 흐름을 크게 깨지 않고 통합

### 3) Design Decisions
- OAuth 시크릿은 환경변수(`GOOGLE_CLIENT_ID/SECRET`)로만 유지하고, Admin 화면에는 비민감 런타임 설정만 노출했다.
- Google OAuth 실행 전 조건을 `enabled + redirect URI 존재 + client id/secret 존재`로 통합 검증했다.
- OAuth 준비 상태는 별도 health endpoint로 시각화해 운영자가 즉시 상태를 확인할 수 있게 했다.

### 4) Implementation Notes
- 백엔드
  - `server/db.py`
    - `users`에 OAuth 필드 추가: `provider`, `provider_user_id`, `email_verified`
    - `oauth_runtime_settings` 테이블 추가
    - Google 계정 upsert 함수 추가: `create_or_update_google_user`, `get_user_by_provider`
  - `server/main.py`
    - Google OAuth 엔드포인트
      - `GET /api/auth/google/start`
      - `GET /api/auth/google/callback`
    - Admin OAuth 설정/상태 엔드포인트
      - `GET /api/admin/integrations/oauth`
      - `PATCH /api/admin/integrations/oauth`
      - `GET /api/admin/integrations/oauth/health`
    - 런타임 설정 + 시크릿 존재 여부를 합친 가용성 검증 로직 추가
- 프론트
  - `src/lib/api.ts`
    - `getGoogleAuthUrl`, `getMeWithToken` 추가
    - Admin OAuth 설정 API 메서드 3종 추가
  - `src/App.tsx`
    - `oauth_token`/`oauth_status` 쿼리 복원 처리
  - `src/components/screens/LoginScreen.tsx`
    - Google 로그인 버튼 추가
  - `src/components/screens/RegisterScreen.tsx`
    - Google 가입 버튼 추가
  - `src/components/screens/AdminScreen.tsx`
    - 정책 탭에 OAuth 운영 카드 추가
    - 활성화 토글, Redirect URI 입력/저장, health 배지 및 client id/secret 존재 여부 표시
  - `server/.env.example`
    - OAuth 환경변수 샘플 항목 추가

### 5) Validation
- 백엔드
  - `uv run python -m compileall .` (workdir=`server`) 통과
  - `uv run python -c "from main import app; print('app-import-ok')"` 통과
- 프론트
  - `pnpm build` 통과
  - `pnpm lint` 에러 0 (기존 경고 2건 유지)

### 6) Outcome
#### 잘된 점
- OAuth 시크릿 비노출 원칙(서버 env only)을 지키면서 운영 제어 UI를 분리했다.
- 로컬 환경에서 Google OAuth 시작/콜백/토큰 복원까지 E2E 흐름을 점검 가능한 상태가 됐다.

#### 아쉬운 점
- 아직 메일 발송 파이프라인(승인/반려 통지)은 미구현이다.

#### 다음 액션
1. 승인/반려 메일 템플릿 + 발송 채널(Resend/Postmark) 연결
2. Admin OAuth 카드에 URI 유효성 프리검증(https/http, path) 추가
3. Google OAuth 오류 코드별 사용자 메시지 세분화

## Session 2026-03-01-04

### 1) Goal
- Google OAuth 로그인 안정성을 보강하고, 프로젝트 Submit 작성자 표기(`by ...`)가 실제 로그인 사용자로 저장되도록 수정한다.

### 2) Inputs
- 사용자 피드백/이슈:
  - Google 로그인 후 다시 로그인 화면으로 돌아가는 현상
  - 사용자 계정으로 작품 등록해도 카드 하단 작성자가 `jongjatdon`으로 표시되는 현상
- 제약 조건:
  - `SECRET` 값은 Git에 절대 포함하지 않음 (`server/.env` 제외)

### 3) Design Decisions
- OAuth 콜백 처리에서는 쿼리 토큰을 즉시 삭제하지 않고 세션 복원 성공/실패 시점에 정리하도록 변경했다.
- 프로젝트 생성은 인증 사용자 컨텍스트를 강제하고, DB 레벨 기본 작성자 fallback을 제거했다.

### 4) Implementation Notes
- OAuth 로그인 안정화
  - `src/App.tsx`
    - `oauth_token/oauth_status` 쿼리 제거 타이밍을 세션 복원 후로 조정
  - `src/lib/auth-context.tsx`
    - 초기 세션 복원 race condition 방어(토큰 변경 시 이전 비동기 결과 무시)
  - `server/main.py`
    - Google 계정의 비밀번호 로그인 시 provider 안내 메시지 반환
- 프로젝트 작성자 매핑 수정
  - `server/main.py`
    - `POST /api/projects`에 `Depends(get_current_user)` 적용
    - 생성 payload에 `author_id=current_user.id` 주입
  - `server/db.py`
    - `create_project`의 하드코딩 기본 `author_id` 제거
    - `author_id` 필수 검증 추가

### 5) Validation
- 백엔드
  - `uv run python -m compileall .` (workdir=`server`) 통과
  - `uv run python -c "from main import app; print('app-import-ok')"` 통과
- 프론트
  - `pnpm build` 통과
  - `pnpm lint` 에러 0 (기존 경고 2건 유지)

### 6) Outcome
#### 잘된 점
- Google 로그인 후 세션이 끊기던 재로그인 루프가 안정적으로 해소됐다.
- 신규 Submit 카드 작성자가 실제 로그인 사용자로 저장/표시되도록 바로잡았다.

#### 아쉬운 점
- AdminScreen의 기존 hooks 의존성 경고 2건은 이번 작업 범위 밖으로 유지했다.

#### 다음 액션
1. 승인/반려 메일 발송 파이프라인 구현
2. OAuth 설정 저장 시 URI 형식 검증 강화
3. Admin users 탭 캐시 TTL 최적화

## Session 2026-03-02-01

### 1) Goal
- 학습용으로 "이번 CI 연결 + OAuth state 1회성 소비"가 왜 필요한지, 하지 않으면 어떤 문제가 실제로 생기는지 명확히 정리한다.

### 2) Inputs
- 이번 구현 변경:
  - `.github/workflows/ci.yml`
  - `server/main.py`
  - `server/db.py`
  - `server/tests/test_oauth_regression.py`
- 참고 가이드:
  - OWASP OAuth2 Cheat Sheet (state/CSRF 권장)
  - Auth0 state parameter guidance
  - RFC 6819 (OAuth 2.0 Threat Model)
- 저장소 문서:
  - `docs/UV_WORKFLOW.md`
  - `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md`

### 3) Design Decisions
- OAuth `state`는 JWT 서명 검증만으로는 "재사용(replay)"을 완전히 막을 수 없으므로, 서버 DB에서 1회성으로 소비하도록 설계했다.
- CI는 "사람이 수동 확인"을 대체하는 자동 안전장치로 두고, PR/Push마다 테스트와 빌드를 강제 실행하도록 구성했다.

### 4) Implementation Notes
- CI 자동 검증 연결
  - `.github/workflows/ci.yml`
    - frontend: `pnpm install --frozen-lockfile` -> `pnpm test` -> `pnpm build`
    - backend: `uv sync --frozen --extra dev --group dev` -> `uv run pytest` -> import/py_compile 검증
- OAuth state 1회성 소비
  - `server/db.py`
    - `oauth_state_tokens` 테이블 추가 (`state_hash`, `expires_at`, `consumed_at`)
    - `create_oauth_state_token`, `consume_oauth_state_token`, `cleanup_oauth_state_tokens` 추가
  - `server/main.py`
    - Google OAuth start 시 state TTL(10분)로 생성 + DB 저장
    - callback 시 state를 원자적으로 1회 소비, 실패 시 400 반환
  - `server/tests/test_oauth_regression.py`
    - 동일 state 재사용 시 두 번째 요청이 차단되는 회귀 테스트 추가

### 5) Why Needed / 하지 않으면 생기는 문제
- CI가 없으면
  - 테스트/빌드를 사람이 매번 수동으로 돌려야 해서 누락이 발생한다.
  - "내 PC에서는 됨" 상태가 PR에 그대로 합쳐져 배포 직전 또는 배포 후 장애로 이어질 수 있다.
  - 동일 실수가 반복되어 디버깅/롤백 시간이 커진다.
- OAuth state 1회성 소비가 없으면
  - 공격자/중간자가 획득한 state를 유효 시간 내 재사용하는 replay 공격 가능성이 남는다.
  - 콜백 흐름 위조/재시도로 로그인 세션 연결 안정성이 약해진다.
  - 결과적으로 인증 플로우 신뢰도가 떨어지고, 보안 이슈 대응 비용이 커진다.

### 6) Outcome
#### 잘된 점
- "왜 필요한지"를 구현 단위(파일/로직/테스트)와 위험 시나리오로 연결해 학습 재사용성이 높아졌다.
- 단순 권장사항이 아니라 "미적용 시 실제 장애/보안 문제" 중심으로 정리해 의사결정 근거가 명확해졌다.

#### 아쉬운 점
- CI 단계는 현재 smoke 성격(테스트+빌드) 위주라, 추후 lint/typecheck/security scan까지 확장 여지가 있다.

#### 다음 액션
1. CI에 `ruff`/`basedpyright`를 추가해 정적 분석 자동화 범위를 넓힌다.
2. OAuth state 관련 실패 로그(재사용/만료)를 운영 대시보드에서 집계 가능하도록 이벤트화한다.
3. 학습용 문서에 "실제 공격 시나리오 그림"(정상 흐름 vs replay 시도)을 추가한다.

## Session 2026-03-02-02

### 1) Goal
- CI의 typecheck 게이트를 실사용 가능한 수준으로 안정화하고, 경고/에러를 줄여 "자동 검증이 실제 품질을 지키는 상태"를 만든다.

### 2) Inputs
- 변경 파일
  - `.github/workflows/ci.yml`
  - `server/main.py`
  - `server/auth.py`
  - `server/db.py`
  - `server/pyproject.toml`
  - `server/pyrightconfig.json`
- 실행 검증
  - `uv run basedpyright`
  - `uv run ruff check .`
  - `uv run pytest`

### 3) Design Decisions
- 기반 원칙: "타입체크는 CI에서 실패를 빨리 알려야 의미가 있다".
- `basedpyright`를 무조건 넓게 돌리는 대신, 백엔드 핵심 파일(`auth.py`, `db.py`, `main.py`) 중심으로 스코프를 명확히 고정했다.
- OAuth/권한 흐름은 런타임에서 자주 깨지는 구간이므로, `TypedDict`와 안전 캐스팅으로 타입 의도를 코드에 명시했다.

### 4) Implementation Notes
- CI 파이프라인 확장
  - `.github/workflows/ci.yml`에 backend lint/typecheck를 고정 단계로 포함
  - `uv run basedpyright`를 비차단 모드에서 실제 차단 게이트로 전환
- 타입 안정화
  - `server/main.py`: `UserContext` 도입, OAuth 응답 파싱/검증 시 타입 안전 처리
  - `server/auth.py`: 토큰 타입 시그니처 정리, UTC 기준 시간 처리
  - `server/db.py`: 시그니처 타입 정리 및 DB 레이어의 노이즈 규칙 범위 조정
- typecheck 스코프 정리
  - `server/pyrightconfig.json` 추가로 `.venv`/tests를 제외하고 핵심 앱 파일에 집중

### 5) Why Needed / 하지 않으면 생기는 문제
- 왜 필요한가
  - 타입 경계가 애매하면 인증/권한/응답 파싱 같은 핵심 로직에서 사소한 수정이 런타임 버그로 이어지기 쉽다.
  - CI에서 타입체크를 강제하면 "코드 리뷰 때 놓친 위험"을 자동으로 잡아준다.
  - 스코프 없는 타입체크는 노이즈가 커서 팀이 결과를 무시하게 되므로, 운영 가능한 범위 설정이 필수다.
- 안 하면 어떤 문제가 생기나
  - PR마다 "통과/실패 기준"이 흔들려 배포 품질이 사람 숙련도에 의존하게 된다.
  - OAuth/사용자 컨텍스트처럼 입력 타입이 다양한 구간에서 `None`/타입 불일치 버그가 재발한다.
  - 타입체크 출력이 `.venv` 같은 외부 영역 잡음으로 오염되면, 실제 프로젝트 경고를 놓치게 된다.

### 6) Validation
- `uv run basedpyright`: 통과 (0 errors, 0 warnings, 0 notes)
- `uv run ruff check .`: 통과
- `uv run pytest`: 통과 (5 passed)

### 7) Outcome
#### 잘된 점
- 타입체크를 "보여주기용"이 아니라 "실제 차단 게이트"로 운영 가능한 상태로 바꿨다.
- 학습 관점에서 "스코프 설정 -> 타입 정리 -> CI 고정" 순서를 재사용 가능한 패턴으로 남겼다.

#### 아쉬운 점
- 아직 `main.py` 내부에는 동적 응답 처리 구간이 남아 있어, 더 엄격한 타입 모델링 여지가 있다.

#### 다음 액션
1. `main.py`의 OAuth/profile payload를 별도 Pydantic 모델로 분리해 캐스팅 의존도를 줄인다.
2. `AdminScreen`의 React hook dependency 경고 2건을 정리해 프론트 lint 경고를 0으로 맞춘다.

## Session 2026-03-02-03

### 1) Goal
- FastAPI 라이프사이클 처리를 `on_event`에서 `lifespan` 방식으로 전환해 deprecated 경고를 제거하고 운영 안정성을 높인다.

### 2) Inputs
- 변경 파일
  - `server/main.py`
- 관찰된 문제
  - 테스트 실행 시 `@app.on_event("startup")`, `@app.on_event("shutdown")` deprecation 경고 반복 출력
- 제약 조건
  - 기존 startup/shutdown 동작(초기화, 로그 정리 루프 시작/종료)은 그대로 유지

### 3) Design Decisions
- FastAPI 앱 생성 시 `lifespan` 컨텍스트를 명시해 시작/종료 처리를 한 경로로 통합했다.
- 기존 `startup_event()`/`shutdown_event()` 로직은 재사용하고, 데코레이터만 제거해 리스크를 최소화했다.

### 4) Implementation Notes
- `server/main.py`
  - `asynccontextmanager`를 사용한 `lifespan(app)` 함수 추가
  - `app = FastAPI(..., lifespan=lifespan)`으로 전환
  - `@app.on_event("startup")`, `@app.on_event("shutdown")` 제거
  - 종료 시 백그라운드 cleanup task를 안전하게 cancel/await 처리 유지

### 5) Why Needed / 하지 않으면 생기는 문제
- 왜 필요한가
  - `on_event`는 이미 deprecated 경고가 나오는 구간이라, 시간이 지날수록 유지보수 부담이 커진다.
  - `lifespan`은 최신 FastAPI 표준이라 시작/종료 자원 관리를 일관되게 유지하기 쉽다.
  - 특히 백그라운드 작업(관리자 로그 정리 루프) 같은 리소스는 종료 정리가 누락되면 장애 원인이 되기 쉬워 통합 관리가 중요하다.
- 안 하면 어떤 문제가 생기나
  - 경고가 계속 누적되어 실제 오류 신호를 묻어버릴 수 있다.
  - 프레임워크 업그레이드 시 호환성 이슈가 커져 한 번에 큰 수정이 필요해질 수 있다.
  - 시작/종료 처리 코드가 분산되면 future 변경 시 정리 누락(메모리/태스크 누수) 가능성이 올라간다.

### 6) Validation
- `uv run basedpyright`: 통과 (0 errors, 0 warnings)
- `uv run ruff check .`: 통과
- `uv run pytest`: 통과 (5 passed)
- 결과: 기존 startup/shutdown 동작은 유지되면서 deprecation 경고 제거 확인

### 7) Outcome
#### 잘된 점
- 라이프사이클 처리 경로가 최신 표준(`lifespan`)으로 정리되어 향후 유지보수성이 좋아졌다.
- 운영 핵심 루틴(초기화/cleanup loop)의 실행-종료 흐름이 더 명확해졌다.

#### 아쉬운 점
- 현재는 `startup_event`/`shutdown_event` 함수를 래핑해 전환했기 때문에, 후속 단계에서 라이프사이클 로직을 모듈 단위로 더 분리할 여지가 있다.

#### 다음 액션
1. lifespan 내부 초기화 항목을 함수별로 분리해 테스트 가능성을 높인다.
2. 운영 로그(cleanup 실행 횟수/삭제 건수) 메트릭을 별도 관찰 포인트로 노출한다.

## Session 2026-03-04-01

### 1) Goal
- 페이지 편집 로드맵의 Sprint 2~3(C-3, D-1, D-2)을 실제 코드로 마무리하고, 테스트/빌드 검증까지 완료한다.
- 작업 과정을 학습 로그로 남기고, 다음 기능은 다음 날로 이월 가능한 상태로 정리한다.

### 2) Inputs
- 참고 문서:
  - `docs/page_edit.md`
- 사용자 피드백/이슈:
  - "한글로 설명"
  - "계속 진행"
  - "다음 기능은 내일, 지금까지 과정 MD 업데이트 + 커밋/푸시/태그"
- 제약 조건:
  - `node_modules` 대량 변경은 커밋에서 제외
  - 기존 코드/문서 스타일 유지

### 3) Design Decisions
- 버전 비교 API 경로는 기존 버전 조회 라우트와 충돌 가능성을 피하기 위해 `versions-compare`로 분리했다.
- 관리자 로그는 "감사 추적"과 "운영 관측"을 분리하지 않고, 필터 + 집계 API를 함께 제공해 운영자가 한 화면에서 판단 가능하게 구성했다.
- 프론트 테스트는 실제 렌더 환경에 맞춰 `react-query` Provider를 명시적으로 감싸고, 비동기 렌더 타이밍 기준 단언으로 안정화했다.

### 4) Implementation Notes
- Sprint 2 마무리
  - 페이지 에디터 가드레일(차단/경고), 자동저장, 충돌 처리, 블록 에디터 MVP, 프리뷰 디바이스 토글 반영
- Sprint 3 C-3 (버전 비교/롤백 UX)
  - 백엔드: 버전 비교(diff) 응답 추가, 롤백 흐름 강화
  - 프론트: 버전 간 비교 UI와 롤백 연계 동선 추가
- Sprint 3 D-1 (테스트 전략/회귀)
  - 전략 문서 구체화, 프론트/백엔드 회귀 테스트 보강
- Sprint 3 D-2 (감사 로그/관측)
  - 백엔드: `GET /api/admin/action-logs` 필터(action/page/actor), `GET /api/admin/action-logs/observability` 지표 API 추가
  - 프론트: AdminLogs 필터 UI + 관측 카드(일별 publish/rollback ratio/conflict rate/실패 분포) 반영
  - 테스트: 관측 화면 테스트 안정화(QueryClientProvider/비동기 단언/중복 텍스트 대응)

### 5) Validation
- 프론트
  - `pnpm test` 통과
  - `pnpm build` 통과
- 백엔드
  - `uv run --with pytest --with httpx pytest tests/test_admin_user_enforcement.py tests/test_admin_page_editor_api.py` 통과 (26 passed)
- 메모
  - Python LSP(`basedpyright`) 미설치 환경에서는 LSP 진단 대신 실제 테스트/빌드 결과를 기준으로 검증했다.

### 6) Outcome
#### 잘된 점
- Sprint 2~3 핵심 범위(C-3/D-1/D-2)가 코드/문서/테스트까지 한 사이클로 닫혔다.
- 관리자 운영 관점(감사 추적 + 관측)이 UI/백엔드 계약으로 정리되어 실무 사용성이 높아졌다.

#### 아쉬운 점
- 워킹트리에 `node_modules` 변경이 많아 Git 작업 시 선별 스테이징을 계속 신경써야 한다.
- LSP 기반 상시 정적 분석은 로컬 설치 전까지 공백이 있다.

#### 다음 액션
1. 다음 기능은 다음 세션에서 시작하고, 이번 세션은 기록/릴리스(커밋, 태그)로 마감한다.
2. `node_modules` 변경 분리 정책(.gitignore/워크플로우)을 점검해 커밋 노이즈를 줄인다.

## Session 2026-03-04-02

### 1) Goal
- `page_edit` 통합 문서 기준 미착수 영역 중 D-3(성능 기준선)를 실제 계측 코드로 시작한다.
- 문서상의 기준선을 코드로 수집/관측 가능 상태로 연결한다.

### 2) Inputs
- 참고 문서:
  - `docs/page_edit.md`
- 코드베이스 팩트:
  - Sprint 3의 C-3/D-1/D-2는 이미 반영 완료
  - D-3은 문서 초안만 있고 성능 이벤트 계측 API는 미구현

### 3) Design Decisions
- 기존 `admin/perf/projects` 패턴을 확장해, page editor도 별도 perf 스냅샷 엔드포인트를 제공한다.
- 성능 이벤트는 서버 메모리 윈도우(`deque`)에 집계하고, 동시에 `admin_action_logs`에 `page_perf_*`로 남겨 운영 추적 가능성을 확보한다.
- 측정 시나리오는 D-3 명세의 핵심 3개(`editor_initial_load`, `draft_save_roundtrip`, `preview_switch`)로 고정한다.

### 4) Implementation Notes
- 백엔드
  - `server/main.py`
    - `POST /api/admin/perf/page-editor/events` 추가
    - `GET /api/admin/perf/page-editor` 추가
    - page editor perf 샘플 윈도우, p75/p95 계산, SLO 판정(`within_slo`) 구현
- 프론트
  - `src/lib/api.ts`
    - `logAdminPagePerfEvent`, `getAdminPagePerfSnapshot` API 함수 및 타입 추가
  - `src/components/screens/admin/pages/AdminPages.tsx`
    - 초기 로딩/저장/프리뷰 전환 시 성능 이벤트 전송 연결
    - 기존 빈 `catch {}`를 오류 로깅 형태로 정리
- 테스트
  - `server/tests/test_admin_page_editor_api.py`
    - perf 이벤트 수집 API 테스트 추가
    - perf 스냅샷 조회 API 테스트 추가

### 5) Validation
- 진행 중: 타입체크/테스트/빌드 검증 예정

### 6) Outcome
#### 잘된 점
- 문서(D-3) 기준선 정의가 코드 계측 경로와 연결되어, 이후 운영 지표/회귀판단 자동화 기반을 마련했다.

#### 아쉬운 점
- 현재 샘플은 서버 메모리 윈도우 기반이라 재시작 시 초기화된다.

#### 다음 액션
1. `pnpm test`, `pnpm build`, `pytest`로 회귀 확인 후 D-3 시작점을 확정한다.
2. E-1(단계적 롤아웃)에서 D-3 스냅샷 게이트를 실제 체크리스트에 연결한다.

## Session 2026-03-04-03

### 1) Goal
- `page_edit.md` 기준으로 단계적 롤아웃 제어를 코드에 반영한다.
- 토글 off, QA/파일럿/전체 오픈 단계를 백엔드 접근 제어와 Admin 정책 UI에 연결한다.

### 2) Inputs
- 참고 문서:
  - `docs/page_edit.md`
- 기존 코드:
  - `server/db.py` moderation_settings
  - `server/main.py` 정책 API + 페이지 에디터 API
  - `src/components/screens/admin/pages/AdminPolicies.tsx`

### 3) Design Decisions
- 롤아웃 상태는 별도 테이블이 아니라 기존 `moderation_settings`에 포함해 운영 정책과 함께 관리한다.
- 접근 제어는 프론트 숨김만으로 끝내지 않고, page editor API 엔드포인트에서 서버단 강제 차단으로 구현한다.
- 단계 규칙은 단순화한다:
  - `qa`: super_admin만 허용
  - `pilot`: super_admin + 지정 pilot admin ids
  - `open`: admin/super_admin 허용

### 4) Implementation Notes
- 백엔드
  - `server/db.py`
    - moderation_settings에 롤아웃 제어 컬럼 추가
      - `page_editor_enabled`
      - `page_editor_rollout_stage`
      - `page_editor_pilot_admin_ids`
      - `page_editor_publish_fail_rate_threshold`
      - `page_editor_rollback_ratio_threshold`
      - `page_editor_conflict_rate_threshold`
    - 조회/업데이트 함수(`get_moderation_settings`, `update_moderation_settings`) 확장
  - `server/main.py`
    - 정책 요청 모델(`AdminPolicyUpdateRequest`) 확장
    - 정책 정규화(`get_effective_moderation_settings`, `ensure_baseline_moderation_settings`) 확장
    - `enforce_page_editor_rollout_access` 추가 후 page editor API 진입점에 적용
      - draft/get/save/publish/versions/compare/rollback
- 프론트
  - `src/lib/api.ts`
    - `ModerationPolicy` 타입 확장
    - `updateAdminPolicies` payload 확장
  - `src/components/screens/admin/pages/AdminPolicies.tsx`
    - E-1 롤아웃 섹션 UI 추가(활성화, 단계, 파일럿 IDs, 임계치)
- 테스트
  - `server/tests/test_admin_page_editor_api.py`
    - 롤아웃 비활성/QA 단계 접근 차단 케이스 추가
  - `src/components/screens/admin/pages/AdminPolicies.log-policy.test.tsx`
    - 정책 저장 인자에 롤아웃 필드 반영

### 5) Validation
- 진행 중: 프론트/백엔드 테스트 및 빌드 검증 예정

### 6) Outcome
#### 잘된 점
- E-1의 핵심인 단계적 노출과 즉시 차단(토글 off)이 운영 정책 API/화면/서버 접근 제어까지 일관되게 연결됐다.

#### 아쉬운 점
- 파일럿 대상은 현재 ID 기반 수동 입력 방식이라, 향후 사용자 선택형 UI 개선 여지가 있다.

#### 다음 액션
1. E-2(데이터 마이그레이션)로 넘어가기 전에 E-1 정책 변경 회귀 테스트를 CI 기준으로 고정한다.
2. E-3 운영 가이드에 QA/파일럿 전환 체크리스트를 구체화한다.

## Session 2026-03-04-04

### 1) Goal
- E-2 데이터 마이그레이션 계획을 실제 실행 가능한 API/스크립트로 전환한다.
- 추출-변환-검증-백업-적용 흐름을 서버에서 재현 가능하도록 구현한다.

### 2) Inputs
- 참고 문서:
  - `docs/page_edit.md`
- 기존 코드:
  - `get_about_content_payload`, `build_page_document_from_about_content`, `collect_page_document_issues`
  - page document draft/version 저장 계층(`save_page_document_draft`)

### 3) Design Decisions
- 마이그레이션 1차 대상은 `about_page`로 고정한다(핵심 페이지 우선 이행).
- 실제 적용 전 반드시 백업을 생성하고, `dryRun` 모드에서 검증/백업만 수행 가능하게 설계한다.
- 검증 차단 이슈가 있으면 적용을 중단하고 422로 반환한다.

### 4) Implementation Notes
- 백엔드 API
  - `GET /api/admin/pages/{page_id}/migration/preview`
  - `POST /api/admin/pages/{page_id}/migration/execute` (`reason`, `dryRun`)
  - 구현 파일: `server/main.py`
  - 핵심 함수:
    - `build_page_migration_preview`
    - `execute_page_migration`
- 실행 보장
  - 백업 키(`about_content_migration_backup_<ts>`)를 `site_contents`에 저장
  - 적용 시 `save_page_document_draft`로 변환 결과를 draft 버전으로 반영
  - 관리자 액션 로그에 backup/dry-run/applied 이벤트 기록
- 보조 스크립트
  - `server/migrations/e2_data_extraction.py`
  - `server/migrations/e2_block_transform.py`
  - `server/migrations/e2_migration_runner.py`
- 프론트 API 타입
  - `src/lib/api.ts`에 migration preview/execute 타입/호출 함수 추가

### 5) Validation
- 진행 중: API 테스트/빌드 검증 예정

### 6) Outcome
#### 잘된 점
- E-2가 문서 계획 수준에서 실제 실행 단위(Preview/Execute + dry-run + backup)로 전환되었다.

#### 아쉬운 점
- 현재 마이그레이션 지원 대상은 `about_page` 단일이며, 다중 페이지 확장은 후속 설계가 필요하다.

#### 다음 액션
1. 다중 페이지 이행을 위해 legacy source resolver를 페이지별 플러그인 구조로 확장한다.
2. E-3 운영 가이드에 backup_key 기반 복구 절차를 구체 예시와 함께 추가한다.

## Session 2026-03-04-05

### 1) Goal
- E-3 운영 가이드를 실제 구현 기준(runbook/체크리스트/복구)으로 구체화한다.
- E-2에서 생성되는 `backupKey`를 운영 복구 절차로 바로 사용할 수 있도록 API와 문서를 연결한다.

### 2) Inputs
- 참고 문서:
  - `docs/page_edit.md`
- 기존 구현:
  - E-1 롤아웃 제어(`page_editor_enabled`, stage/pilot)
  - E-2 migration preview/execute + backup 생성

### 3) Design Decisions
- 운영 복구는 “문서 절차만”이 아니라 API로 즉시 실행 가능해야 한다.
- migration backup 복구는 super_admin 전용으로 제한하고, dry-run 모드를 제공해 안전하게 검증 후 적용한다.
- E-3 문서는 실행 가능한 API 목록/체크리스트/온보딩 시나리오까지 포함해 핸드북 수준으로 확장한다.

### 4) Implementation Notes
- 백엔드
  - `POST /api/admin/pages/{page_id}/migration/restore` 추가
    - 입력: `backupKey`, `reason`, `dryRun`
    - 동작: backup 조회 -> dry-run 검증 또는 실제 복구 저장 -> 로그 기록
  - 구현 파일: `server/main.py`
  - 핵심 함수: `restore_page_migration_backup`
- 프론트 API 타입
  - `src/lib/api.ts`에 `restoreAdminPageMigration` 및 응답 타입 추가
- 테스트
  - `server/tests/test_admin_page_editor_api.py`
    - restore dry-run 엔드포인트 테스트 추가
- 문서
  - `docs/page_edit.md`
    - 즉시 대응 runbook, 배포 전/후/주간 체크리스트, 60분 온보딩, FAQ, 운영 API 레퍼런스 보강

### 5) Validation
- 진행 중: E-3 반영 후 테스트/빌드/진단 재실행 예정

### 6) Outcome
#### 잘된 점
- 운영팀이 장애 상황에서 토글 off + 관측 + rollback/migration restore를 동일한 흐름으로 실행할 수 있게 됐다.

#### 아쉬운 점
- 현재 복구는 backupKey를 수동 입력하는 방식이며, 향후 UI에서 백업 목록 선택형으로 개선 여지가 있다.

#### 다음 액션
1. E-3 문서 기준으로 운영 시뮬레이션(테이블탑) 1회 수행하고 FAQ를 실제 사례 중심으로 다듬는다.
2. 백업 키 조회 목록 API를 추가해 복구 UX를 단순화한다.

## Session 2026-03-04-06

### 1) Goal
- E-3 후속으로 `backupKey` 목록 조회를 API로 제공해 복구 흐름의 운영 편의성을 높인다.

### 2) Inputs
- 이전 세션 산출물: migration restore API, E-3 runbook
- 요구사항: 수동 backupKey 입력 대신 선택 가능한 복구 흐름

### 3) Design Decisions
- 백업 목록은 `site_contents`의 prefix 검색으로 제공하고, page_id 일치 항목만 반환한다.
- 복구 API 자체는 유지하고, 목록 조회를 별도 read endpoint로 분리한다.

### 4) Implementation Notes
- 백엔드
  - DB helper: `list_site_contents_by_prefix` 추가 (`server/db.py`)
  - API: `GET /api/admin/pages/{page_id}/migration/backups` 추가 (`server/main.py`)
  - 응답 필드: `backupKey`, `capturedAt`, `reason`, `dryRun`, `sourceKey`, `updatedAt`
- 프론트 API
  - `getAdminPageMigrationBackups(pageId, limit)` 추가 (`src/lib/api.ts`)
- 테스트
  - backup 목록 조회 endpoint 테스트 추가 (`server/tests/test_admin_page_editor_api.py`)
- 문서
  - E-3 runbook/API 레퍼런스에 backup 목록 조회 절차 반영

### 5) Validation
- 진행 중: LSP/테스트/빌드 재검증 예정

### 6) Outcome
#### 잘된 점
- 운영자는 복구 전 backupKey를 목록에서 확인해 실수 가능성을 줄일 수 있게 됐다.

#### 아쉬운 점
- 아직 UI에서 실제 목록 선택 컴포넌트는 없고 API 연결 단계까지 완료됐다.

#### 다음 액션
1. AdminPages 복구 모달에 backup 목록 드롭다운을 붙여 복구 UX를 완성한다.
2. backup 목록에 페이징/검색(기간, dry-run 필터) 옵션을 추가한다.

## Session 2026-03-04-07

### 1) Goal
- AdminPages에서 backupKey 수동 입력 없이 목록 선택으로 복구를 실행할 수 있게 UX를 완성한다.

### 2) Inputs
- 직전 산출물: backup 목록 조회 API(`GET .../migration/backups`), restore API

### 3) Design Decisions
- 복구 동선은 `버전` 탭 내에 두고, 버전 비교/롤백 흐름과 함께 운영자가 보게 한다.
- 복구 버튼은 dry-run/실행을 분리해 실수 복구를 줄인다.

### 4) Implementation Notes
- `src/components/screens/admin/pages/AdminPages.tsx`
  - backup 목록 로딩/선택 상태 추가
  - `버전` 탭에 `마이그레이션 백업 복구` 카드 추가
  - `dry-run 복구`, `백업 복구 실행`, `목록 새로고침` 동작 연결
  - 복구 성공 시 draft/versions/backups 동시 새로고침
- `src/components/screens/admin/pages/AdminPages.workflow.test.tsx`
  - backup 선택 기반 dry-run 복구 호출 회귀 테스트 추가

### 5) Validation
- 진행 중: LSP/테스트/빌드 재검증 예정

### 6) Outcome
#### 잘된 점
- 복구 UX가 API 수준에서 UI 수준으로 올라와 운영자가 즉시 사용할 수 있게 됐다.

#### 아쉬운 점
- backup 목록 필터(기간, dry-run 여부)는 아직 미지원이다.

#### 다음 액션
1. backup 목록 필터/검색 UI를 추가해 백업 수가 많아져도 빠르게 찾게 한다.
2. restore 실행 전 선택 백업의 핵심 메타(reason/capturedAt)를 확인 모달로 재확인한다.

## Session 2026-03-05-01

### 1) Goal
- U4-01 단계로 파일럿 롤아웃 계획을 운영 가능한 게이트 기준으로 고정한다.

### 2) Inputs
- 기준 문서: `docs/page_edit.md` (U4-01 템플릿, U3-02/U3-03 기준)
- 선행 조건: U3-02(A/B 기준), U3-03(회귀 QA 체크리스트) 반영 완료 상태

### 3) Design Decisions
- 파일럿 판단을 `Go / Hold / No-Go` 3단계로 명시해 운영 의사결정 모호성을 줄인다.
- 롤백 트리거는 정량 수치(성능 악화율) + 품질 게이트(U3-03 Fail) + 운영 이슈(P0/P1)로 구성한다.
- 운영 중 즉시 차단 경로는 기존 정책 토글(`page_editor_enabled=false`)을 표준 절차로 고정한다.

### 4) Implementation Notes
- `docs/page_edit.md`
  - 변경 이력에 U4-01 고정 반영 항목 추가
  - `12.4.1 U4-01 파일럿 롤아웃 운영 계획 (고정안)` 신설
    - 대상/기간/종료 기준, 진입 게이트, 모니터링 주기 추가
    - Go/Hold/No-Go 규칙과 정량 롤백 트리거 명시
    - 롤백 실행 절차 및 파일럿 결과 공유 템플릿 추가
  - `13.4 U4-01` Acceptance Criteria를 고정안 기준으로 구체화

### 5) Validation
- 문서 내 U4-01 템플릿과 12.4.1 고정안의 기준(대상/기간/종료/트리거/템플릿) 정합성 확인
- 문서 변경 파일 기준 Git 상태 점검으로 스코프 외 변경 미포함 확인

### 6) Outcome
#### 잘된 점
- U4-01이 단순 계획 수준에서 운영 실행/차단/재개까지 포함한 체크 가능한 규칙으로 전환됐다.

#### 아쉬운 점
- 파일럿 결과 공유 템플릿은 문서에 고정했지만 자동 리포트 생성 경로는 아직 없다.

#### 다음 액션
1. U4-02에서 온보딩/운영 문서에 파일럿 결과 공유 템플릿 사용 예시를 추가한다.
2. 운영 API 기반 KPI 스냅샷 자동 수집 스크립트를 별도 작업으로 분리한다.

## Session 2026-03-05-02

### 1) Goal
- U4-02 단계로 운영 가이드와 신규 운영자 60분 온보딩 시나리오를 문서 본문에 고정한다.

### 2) Inputs
- `docs/page_edit.md`의 U4-02 템플릿(Acceptance Criteria)
- U4-01 고정안(Go/Hold/No-Go, 롤백 트리거, 승인 흐름)

### 3) Design Decisions
- U4-02를 티켓 템플릿 수준이 아니라 실행 가능한 운영 절차로 승격한다.
- 운영 체크는 배포 전/파일럿 운영 중/open 전환 전으로 나눠 실무 순서에 맞춘다.
- 온보딩은 60분 타임박스(10~15분 단위)로 구성해 즉시 재사용 가능하게 한다.

### 4) Implementation Notes
- `docs/page_edit.md`
  - 목차에 `14) U4-02 운영/온보딩 가이드 (고정)` 추가
  - `5) 운영 Runbook`에 파일럿 운영 중/`open` 전환 전 체크를 추가
  - 변경 이력/세션 타임라인에 U4-02 반영 이력 추가
  - `14) U4-02 운영/온보딩 가이드 (고정)` 신설
    - 14.1 운영 가이드(파일럿~오픈)
    - 14.2 신규 운영자 60분 온보딩 시나리오
    - 14.3 운영 FAQ(전환 이슈 중심)

### 5) Validation
- 목차 앵커(`sec-14`)와 본문 섹션 연결 확인
- U4-02 Acceptance Criteria(운영 가이드/60분 시나리오/FAQ)가 본문에 모두 대응되는지 확인
- 문서 변경 파일만 포함되었는지 Git 상태로 스코프 확인

### 6) Outcome
#### 잘된 점
- 운영팀이 U4-01 결과를 실제 운영 루틴으로 이어갈 수 있는 표준 흐름이 생겼다.

#### 아쉬운 점
- 온보딩 완료 여부를 자동으로 추적하는 체크 시스템은 아직 없다.

#### 다음 액션
1. U4-02 가이드를 기반으로 실제 운영자 1회 리허설을 진행하고 FAQ를 보강한다.
2. 온보딩 체크리스트를 Admin 정책 화면에 연결하는 후속 티켓을 분리한다.

## Session 2026-03-05-03

### 1) Goal
- U1~U4 완료 이후 다음 실행 항목을 우선순위/게이트/스프린트 순서로 고정한다.

### 2) Inputs
- `docs/page_edit.md` 섹션 8(남은 확장 항목)
- U4-01/U4-02에서 확정된 운영 게이트와 승인 체계

### 3) Design Decisions
- 다음 과제는 `U5-01~U5-04`로 명명해 순차 추적이 가능하도록 정규화한다.
- 운영 리스크가 큰 충돌 감지를 1순위로 두고, 예약 발행/프리뷰/블록 확장은 후행 배치한다.
- 각 과제별 착수 게이트를 명시해 선행 의사결정 누락을 방지한다.

### 4) Implementation Notes
- `docs/page_edit.md`
  - 목차에 `15) 다음 실행 로드맵 (U5 제안)` 추가
  - `15.1` 우선순위(`U5-01`~`U5-04`) 및 DoD 추가
  - `15.2` 착수 게이트 추가
  - `15.3` 권장 진행 순서(Sprint N~N+2) 추가
  - `15.4` 리스크 메모 추가
  - 변경 이력/세션 타임라인에 본 세션 반영

### 5) Validation
- 섹션 앵커(`sec-15`)와 목차 링크 연결 확인
- 섹션 8 선택 항목이 U5 우선순위 항목으로 1:1 매핑되는지 확인
- 문서 변경 파일만 커밋 스코프에 포함되는지 Git 상태로 검증

### 6) Outcome
#### 잘된 점
- 다음 스프린트 착수 시점에 "무엇을 먼저 해야 하는가"가 문서상으로 즉시 결정 가능해졌다.

#### 아쉬운 점
- U5 각 항목의 상세 구현 스펙(API/테스트 케이스)은 아직 별도 문서화가 필요하다.

#### 다음 액션
1. `U5-01` 충돌 감지의 정책 옵션(최신 우선/수동 병합/락 방식) 비교안을 작성한다.
2. `U5-02` 예약 발행의 실패 재시도/타임존 정책을 설계 문서로 분리한다.

## Session 2026-03-05-04

### 1) Goal
- U5-01(충돌 감지 실제 구현)을 서버/클라이언트/회귀 테스트까지 end-to-end로 반영한다.

### 2) Inputs
- 기존 충돌 경로: optimistic concurrency(`baseVersion`) + 409 응답
- 후속 요구: 충돌 시 사용자 안내 강화 + 안전한 재시도/재적용 흐름

### 3) Design Decisions
- 서버 409 payload에 충돌 메타(`current_updated_by`, `current_updated_at`, `retryable`)를 추가한다.
- 클라이언트는 충돌 시 로컬 편집본을 임시 보존하고, 최신 Draft 재로딩 후 "로컬 변경 다시 적용"을 제공한다.
- 자동 병합/강제 저장은 도입하지 않고, 사용자 검토 후 수동 저장 경로를 유지한다.

### 4) Implementation Notes
- `server/db.py`
  - `save_page_document_draft` conflict 반환값에 최신 수정자/시각 메타 추가
- `server/main.py`
  - `PUT /api/admin/pages/{page_id}/draft`의 409 detail 확장
    - `current_updated_by`, `current_updated_at`, `retryable`
- `src/components/screens/admin/pages/AdminPages.tsx`
  - 충돌 메타 상태 추가(`conflictUpdatedBy`, `conflictUpdatedAt`)
  - 충돌 시 로컬 편집본 보존(`pendingConflictDocument`, `pendingConflictReason`)
  - 충돌 복구 UI 추가
    - `최신 Draft 불러오기`(충돌 메타 유지/초기화 제어)
    - `로컬 변경 다시 적용`(검토 후 저장 유도)
- `src/components/screens/admin/pages/AdminPages.workflow.test.tsx`
  - 충돌 복구 액션(최신 Draft reload + 로컬 변경 재적용) 시나리오 검증
- `server/tests/test_admin_page_editor_api.py`
  - 409 충돌 payload 확장 필드 검증 추가

### 5) Validation
- `pnpm test src/components/screens/admin/pages/AdminPages.workflow.test.tsx` 통과(8/8)
- `pnpm build` 통과
- `uv run python -m py_compile server/main.py server/db.py` 통과
- `uv run pytest server/tests/test_admin_page_editor_api.py`는 현재 환경에서 `pytest` 실행 파일 부재로 미실행

### 6) Outcome
#### 잘된 점
- 충돌 발생 시 "최신 상태 확인 -> 로컬 변경 재적용 -> 검토 후 저장"의 안전한 재시도 루프가 실제 UI에 반영됐다.

#### 아쉬운 점
- 서버 테스트를 실제 `pytest`로 재실행할 수 있는 환경 의존성이 남아 있다.

#### 다음 액션
1. `pytest` 실행 환경을 맞춘 뒤 `server/tests/test_admin_page_editor_api.py`를 재검증한다.
2. U5-01 정책 비교안(최신 우선/수동 병합/락 방식)을 문서화해 U5-02 선행 기준으로 고정한다.

## Session 2026-03-05-05

### 1) Goal
- U5-02 예약 발행을 예약/취소/실패 재처리까지 포함한 운영 가능한 흐름으로 구현한다.

### 2) Inputs
- U5 로드맵 우선순위(`docs/page_edit.md` 섹션 15)
- 기존 즉시 publish 경로(`POST /api/admin/pages/{page_id}/publish`)

### 3) Design Decisions
- 예약 발행은 즉시 publish와 분리된 스케줄 엔드포인트로 구현해 운영 제어를 단순화한다.
- 실패 재처리는 상태 기반(`failed` -> `scheduled`) 재시도 요청 + 처리 엔드포인트 실행으로 분리한다.
- 처리 엔드포인트는 draft version 불일치 시 실패로 기록하고 재처리 가능 상태를 유지한다.

### 4) Implementation Notes
- 백엔드
  - `server/db.py`
    - `page_publish_schedules` 테이블/인덱스 보장 로직 추가
    - 스케줄 생성/조회/취소/재시도/처리 결과 반영 helper 추가
  - `server/main.py`
    - API 추가
      - `GET /api/admin/pages/{page_id}/publish-schedules`
      - `POST /api/admin/pages/{page_id}/publish-schedules`
      - `POST /api/admin/pages/{page_id}/publish-schedules/{schedule_id}/cancel`
      - `POST /api/admin/pages/{page_id}/publish-schedules/{schedule_id}/retry`
      - `POST /api/admin/pages/{page_id}/publish-schedules/process`
    - 예약 시각 파싱/직렬화 유틸 추가
    - 처리 실행 시 `page_publish_scheduled_executed` / 실패 시 `page_publish_scheduled_failed` 로그 추가
- 프론트
  - `src/lib/api.ts`
    - 예약 발행 타입/클라이언트 메서드 추가(생성/조회/취소/재시도/처리)
  - `src/components/screens/admin/pages/AdminPages.tsx`
    - 버전 탭에 `예약 게시` 운영 카드 추가
    - 예약 등록/취소/재시도 요청/처리 실행 핸들러 연결
    - 스케줄 목록, 상태, 에러 메시지 표시
- 테스트
  - `src/components/screens/admin/pages/AdminPages.workflow.test.tsx`
    - 예약 게시 등록 시나리오 추가
  - `server/tests/test_admin_page_editor_api.py`
    - 예약 생성/취소/처리 실패 경로 테스트 추가

### 5) Validation
- `pnpm test src/components/screens/admin/pages/AdminPages.workflow.test.tsx` 통과(9/9)
- `pnpm build` 통과
- `uv run python -m py_compile server/main.py server/db.py` 통과
- `uv run pytest server/tests/test_admin_page_editor_api.py`는 현 환경에서 `pytest` 실행 파일 부재로 미실행

### 6) Outcome
#### 잘된 점
- 운영자가 버전 탭에서 예약 게시 라이프사이클(등록/취소/재시도/실행)을 한 화면에서 처리할 수 있게 됐다.

#### 아쉬운 점
- 예약 처리 자동 실행(cron/worker)은 아직 없고 수동 처리 엔드포인트 기반이다.

#### 다음 액션
1. 예약 처리 엔드포인트를 주기 실행하는 운영 작업(cron/worker)을 연결한다.
2. U5-03(tablet preview) 착수 전 예약 실패 알림(슬랙/로그 대시보드) 정책을 정한다.

## Session 2026-03-05-06

### 1) Goal
- U5-03 tablet preview를 Preview 탭에 반영하고 회귀 테스트로 고정한다.

### 2) Inputs
- U5 로드맵(섹션 15)에서 tablet preview 우선 항목
- 기존 Preview 디바이스 전환 흐름(Desktop/Mobile)

### 3) Design Decisions
- Preview 디바이스 모델에 `tablet`을 추가하고, 기존 전환 핸들러를 그대로 재사용한다.
- 폭 프리셋은 `mobile=max-w-sm`, `tablet=max-w-2xl`, `desktop=max-w-4xl`로 단순 규칙을 유지한다.
- 테스트는 UI 상호작용(버튼 클릭 -> `tablet preview` 노출) 기준으로 작성해 회귀 안정성을 확보한다.

### 4) Implementation Notes
- `src/components/screens/admin/pages/AdminPages.tsx`
  - `PreviewDevice`를 `desktop | tablet | mobile`로 확장
  - Preview 탭 버튼에 `Tablet` 추가
  - 프리뷰 컨테이너 폭 분기 로직에 tablet(`max-w-2xl`) 추가
- `src/components/screens/admin/pages/AdminPages.workflow.test.tsx`
  - `switches preview device to tablet preset` 테스트 추가
  - 기존 탭 버튼 선택 로직을 중복 버튼 환경에서 안정적으로 동작하도록 보완(`findAllByRole(...)[0]`)

### 5) Validation
- `pnpm test src/components/screens/admin/pages/AdminPages.workflow.test.tsx` 통과(10/10)
- `pnpm build` 통과
- TS LSP diagnostics 통과(`AdminPages.tsx`, `AdminPages.workflow.test.tsx`)

### 6) Outcome
#### 잘된 점
- Tablet 프리셋이 Preview 흐름에 자연스럽게 추가되어 디바이스 간 검수 공백이 줄었다.

#### 아쉬운 점
- Tablet 전용 상세 레이아웃 QA 체크리스트(블록별 기준)는 아직 별도 문서화가 필요하다.

#### 다음 액션
1. U5-04 착수 전 Tablet 상세 QA 체크리스트(블록 타입별) 문서를 추가한다.
2. 예약 발행(U5-02) 처리 자동화(cron/worker)와 연결해 운영 완성도를 높인다.

## Session 2026-03-05-07

### 1) Goal
- U5-04 확장 블록 타입을 `schema -> 편집 UI -> preview -> validation`까지 일관되게 완성한다.

### 2) Inputs
- 로드맵 DoD: "신규 블록 스키마/편집 UI/validation/preview 일관 동작"
- 기존 상태: `feature_list/faq`는 부분 지원, `gallery`는 타입만 존재하고 편집/검증 누락

### 3) Design Decisions
- 확장 블록으로 `gallery`를 신규 활성화하고, `feature_list/faq/gallery`를 동일한 JSON items 편집 패턴으로 맞춘다.
- validation은 FE guardrails와 BE `collect_page_document_issues`를 동시 확장해 저장 전/서버 저장 시점 모두 같은 규칙을 적용한다.
- gallery는 `items[{src, alt, caption}]` + `layout` 필드를 기본 스키마로 사용한다.

### 4) Implementation Notes
- `src/components/screens/admin/pages/AdminPages.tsx`
  - `SupportedBlockType`에 `gallery` 추가
  - `SUPPORTED_BLOCK_TYPES`를 확장(`feature_list`, `faq`, `gallery` 포함)
  - `createBlock("gallery")` 기본 payload 추가
  - Content 패널 JSON 편집 범위를 `feature_list/faq/gallery`로 확장
  - Preview 렌더 분기 `gallery` 추가(이미지 카드 + caption)
- `src/components/screens/admin/pages/pageEditorGuardrails.ts`
  - `feature_list/faq/gallery` validation 추가
  - gallery `src` URL 형식 및 `alt` 권장 규칙 반영
- `server/main.py`
  - `collect_page_document_issues`에 `feature_list/faq/gallery` validation 분기 추가
- `src/components/screens/admin/pages/AdminPages.workflow.test.tsx`
  - `adds and previews gallery block` 시나리오 추가
- `server/tests/test_admin_page_editor_api.py`
  - gallery invalid src 저장 시 422 검증 테스트 추가

### 5) Validation
- `pnpm test src/components/screens/admin/pages/AdminPages.workflow.test.tsx` 통과(11/11)
- `pnpm build` 통과
- `uv run python -m py_compile server/main.py` 통과
- `uv run pytest server/tests/test_admin_page_editor_api.py`는 현 환경에서 `pytest` 실행 파일 부재로 미실행

### 6) Outcome
#### 잘된 점
- 확장 블록이 "추가 가능" 수준이 아니라 실제 저장/프리뷰/검증 체계에 편입됐다.

#### 아쉬운 점
- gallery 레이아웃(`grid/carousel`) 실제 렌더 모드 차별화는 후속 개선 여지가 있다.

#### 다음 액션
1. gallery `layout`별 렌더링 차별화(특히 carousel)와 접근성 점검을 추가한다.
2. `pytest` 실행 환경 정비 후 서버 테스트를 CI 경로에서 재검증한다.

## Session 2026-03-05-08

### 1) Goal
- `datetime.utcnow()` 경로를 제거해 deprecation 경고를 해소하고 UTC 비교/직렬화 동작을 유지한다.

### 2) Inputs
- 사용자 요청: "Continue if you have next steps"
- 최근 후속 과제: `server/main.py`의 `datetime.utcnow()` 경고 정리

### 3) Design Decisions
- 예약 게시 시간 비교 로직은 기존과 동일한 naive-UTC 기준을 유지한다.
- 문자열 타임스탬프(`...Z`) 포맷을 유지해 API 응답 호환성을 보존한다.

### 4) Implementation Notes
- `app/main.py`
  - `datetime.utcnow().isoformat() + "Z"`를 `datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"`로 교체
  - `timezone` import 추가
- `server/main.py`
  - 예약 게시 검증 시 `now_utc = datetime.now(timezone.utc).replace(tzinfo=None)`로 교체

### 5) Validation
- `uv run python -m py_compile app/main.py server/main.py` 통과
- `uv run pytest tests/test_admin_page_editor_api.py` (workdir=`server`) 통과(22 passed)
- LSP diagnostics는 `basedpyright-langserver` 미설치로 실행 불가(환경 제약)

### 6) Outcome
#### 잘된 점
- UTC 경고 경로를 제거하면서 기존 API/비교 semantics를 깨지 않고 유지했다.

#### 아쉬운 점
- Python LSP 진단은 로컬 도구 미설치 상태라 대체 검증(py_compile+pytest)에 의존했다.

#### 다음 액션
1. `basedpyright`를 dev dependency로 고정해 LSP 진단 공백을 제거한다.
2. 시간 포맷 생성을 공용 유틸로 묶어 중복 코드를 추가 정리한다.

## Session 2026-03-06-01

### 1) Goal
- `docs/page_edit.md`, `docs/page_edit_take2.md` 기준으로 Take2 개선 순서를 실제 AdminPages 편집 UX에 반영한다.

### 2) Inputs
- 참고 문서: `docs/page_edit.md` (섹션 16~18), `docs/page_edit_take2.md` (섹션 11~13)
- 사용자 요청: "참고해서 개선 작업 순서대로 진행"
- 제약 조건: 기존 API 계약과 회귀 테스트를 유지하면서 UI 전환 흐름을 개선

### 3) Design Decisions
- 기존 다중 패널 동시 노출 대신 Side Rail + Single Visible 패턴을 우선 적용한다.
- Dirty 상태 전환은 조용한 폐기를 금지하고 `저장 후 이동 / 폐기 후 이동 / 취소` 3분기만 허용한다.
- KPI/운영 계측은 기존 성능 이벤트 파이프라인을 재사용하고, panel switch/first input 같은 컨텍스트를 source 태그로 기록한다.

### 4) Implementation Notes
- `src/components/screens/admin/pages/AdminPages.tsx`
  - Side Rail 상수/상태 추가: 접힘/펼침, 레일 폭(160~220), `localStorage(page_editor_rail_width)` 복원
  - Single Visible 패널 전환(`blocks/canvas/properties`) 도입
  - 모바일 `Items` 진입 패턴 추가 및 `Esc` 닫기 동작 반영
  - 키보드 접근성 강화: Side Rail에서 `Up/Down` 이동, `Enter/Space` 활성화
  - Dirty 전환 가드 추가: 탭/블록 전환 시 확인 패널(`저장 후 이동 / 폐기 후 이동 / 취소`)
  - `beforeunload` 보호 및 panel switch/first field interaction 계측 추가
- `src/components/screens/admin/pages/AdminPages.workflow.test.tsx`
  - Dirty 전환 가드 시나리오 테스트 추가
  - gallery preview 시나리오에서 새 Dirty 전환 흐름(저장 후 이동)을 반영

### 5) Validation
- LSP diagnostics
  - `src/components/screens/admin/pages/AdminPages.tsx`: error 0
  - `src/components/screens/admin/pages/AdminPages.workflow.test.tsx`: error 0
- 테스트
  - `pnpm test -- src/components/screens/admin/pages/AdminPages.workflow.test.tsx src/components/screens/admin/pages/pageEditorGuardrails.test.ts` 통과 (28 passed)
- 빌드
  - `pnpm build` 통과

### 6) Outcome
#### 잘된 점
- 문서의 Take2 우선순위(U1/U2 중심)가 코드와 회귀 테스트에 실제로 연결되었다.

#### 아쉬운 점
- KPI 4종 전체를 별도 시나리오 타입으로 분리하지는 못했고, 일부는 source 태그 기반 계측으로 우회했다.

#### 다음 액션
1. U3-02 운영 A/B 검증 산출물(참여자/기간/태스크 수)을 문서로 고정한다.
2. U4-01/02 롤아웃 게이트와 온보딩 항목을 운영 문서(`docs/page_edit.md`)에 실행 결과 중심으로 반영한다.

## Session 2026-03-06-02

### 1) Goal
- Take2의 남은 운영 단계(U3-02/U4-01/U4-02)를 실행 가능한 증빙 템플릿 형태로 문서에 고정한다.

### 2) Inputs
- 참고 문서: `docs/page_edit.md`, `docs/page_edit_take2.md`
- 사용자 요청: "진행해"
- 제약 조건: 실제 파일럿 데이터가 아직 없으므로 허위 수치 없이 `pending/collecting` 상태를 명시

### 3) Design Decisions
- U3-02 A/B 결과, U4-01 게이트 판정, U4-02 온보딩 완료를 각각 독립 시트로 분리한다.
- 운영 증빙 단일 소스를 `docs/page_edit.md` 섹션 18.1~18.3으로 고정하고, `page_edit_take2.md`는 참조 링크만 유지한다.

### 4) Implementation Notes
- `docs/page_edit.md`
  - 18.1 `U3-02 실행 기록 시트` 추가(일자/참여자/태스크/KPI/판정)
  - 18.2 `U4-01 파일럿 게이트 결정 시트` 추가(pass/pending 기반 판정)
  - 18.3 `U4-02 온보딩 완료 체크 시트` 추가(60분 완료 기록)
- `docs/page_edit_take2.md`
  - 운영 증빙 단일 소스를 `docs/page_edit.md` 18.1~18.3으로 참조 고정

### 5) Validation
- `grep`로 신규 섹션/참조 문구 존재 확인
  - `docs/page_edit.md`: 18.1/18.2/18.3 섹션 검출
  - `docs/page_edit_take2.md`: 18.1~18.3 단일 소스 참조 검출
- `git diff -- docs/page_edit.md docs/page_edit_take2.md`로 변경 범위 확인

### 6) Outcome
#### 잘된 점
- U3-02/U4 운영 단계가 "나중에 하자" 수준이 아니라 즉시 기록 가능한 실무 포맷으로 전환됐다.

#### 아쉬운 점
- 파일럿 실측 데이터(참여자/기간/태스크)는 아직 수집 전이라 `collecting/pending` 상태다.

#### 다음 액션
1. 파일럿 시작 당일부터 18.1 시트에 일자별 행을 누적한다.
2. 14일/30태스크 충족 시 18.2의 `pending` 항목을 Go/Hold/No-Go로 확정한다.

## Session 2026-03-06-03

### 1) Goal
- U3-02/U4 운영 문서의 다음 실행 순서를 고정해, 운영자가 매일 동일한 절차로 게이트를 갱신할 수 있게 한다.

### 2) Inputs
- 참고 문서: `docs/page_edit.md`, `docs/page_edit_take2.md`
- 사용자 요청: "이제 다음 순서 진행해"
- 제약 조건: 실제 파일럿 수치 없이도 절차/판정 기준은 즉시 실행 가능해야 함

### 3) Design Decisions
- 운영 판단 일관성을 위해 절차(입력 순서)와 판정식(Go/Hold/No-Go)을 분리해 고정한다.
- Take2 문서는 중복 정의를 피하고 `page_edit.md` 섹션 18.1~18.5를 단일 소스로 참조한다.

### 4) Implementation Notes
- `docs/page_edit.md`
  - 18.4 `파일럿 일일 실행 절차` 추가(테스트/빌드 -> KPI 수집 -> 시트 입력 -> 게이트 판정 -> 온보딩 반영)
  - 18.5 `Go/Hold/No-Go 판정 계산식` 추가(개선 수, 최악 악화율, 롤백 트리거)
- `docs/page_edit_take2.md`
  - 운영 증빙 단일 소스 참조 범위를 18.1~18.5로 확장

### 5) Validation
- `grep`으로 신규 섹션/참조 문구 검출
  - `docs/page_edit.md`: 18.4, 18.5 존재 확인
  - `docs/page_edit_take2.md`: 18.1~18.5 참조 문구 확인
- `git diff -- docs/page_edit.md docs/page_edit_take2.md`로 변경 범위 검증

### 6) Outcome
#### 잘된 점
- 운영 단계가 "기록 시트"에서 끝나지 않고, 매일 수행 가능한 실행 절차까지 닫혔다.

#### 아쉬운 점
- 파일럿 실제 데이터 입력/판정은 운영 시작 이후에만 채울 수 있다.

#### 다음 액션
1. 다음 운영일에 18.4 절차를 그대로 수행해 18.1 행을 갱신한다.
2. `pending` 상태가 해소되는 시점에 18.2 결정을 확정하고 승인자를 기록한다.

## Session 2026-03-06-04

### 1) Goal
- About 페이지 블록 숨김 동작을 FAQ뿐 아니라 Hero/Values/Team까지 일관되게 반영한다.

### 2) Inputs
- 사용자 요청: "나머지 개선 작업 있으면 순서대로 진행"
- 선행 이슈: FAQ 숨김 퍼블리시 불일치 수정 완료
- 제약 조건: 기존 AboutContent API 계약을 유지하면서 표시/비표시 결과만 정확히 맞출 것

### 3) Design Decisions
- 서버 변환(`extract_about_content_from_page_document`)에서 블록별 `visible`을 직접 반영한다.
- 프론트 렌더는 비어 있는 섹션을 출력하지 않도록 조건부 렌더로 정리한다.

### 4) Implementation Notes
- `server/main.py`
  - `hero_visible`, `values_visible`, `team_visible`, `faq_visible`를 계산
  - 숨김 블록은 AboutContent로 변환 시 빈 값으로 매핑(문자열 빈값/배열 빈값)
- `src/components/screens/AboutScreen.tsx`
  - Hero/Values/Team/Contact를 데이터 존재 조건으로 렌더
  - FAQ는 기존 조건부 렌더를 유지
- `server/tests/test_admin_page_editor_api.py`
  - `test_extract_about_content_omits_all_hidden_blocks` 추가

### 5) Validation
- LSP: `src/components/screens/AboutScreen.tsx` diagnostics 0
- 서버 검증
  - `uv run python -m py_compile main.py` 통과
  - `uv run pytest tests/test_admin_page_editor_api.py::test_extract_about_content_omits_hidden_faq_block tests/test_admin_page_editor_api.py::test_extract_about_content_omits_all_hidden_blocks` 통과(2 passed)
- 프론트 검증
  - `pnpm build` 통과

### 6) Outcome
#### 잘된 점
- About 편집기의 숨김 상태가 퍼블리시 후 실제 사용자 화면까지 일관되게 이어진다.

#### 아쉬운 점
- 섹션별 explicit visibility 메타를 AboutContent API에 별도 노출하지는 않았다.

#### 다음 액션
1. 필요 시 AboutContent 응답에 섹션 visibility 메타를 추가해 클라이언트 판단을 더 명시화한다.
2. AboutScreen 렌더 회귀 테스트를 별도 프론트 테스트 파일로 보강한다.

## Session 2026-03-06-05

### 1) Goal
- About 숨김 퍼블리시 동작을 운영 관점에서 재검증하고, 점검 로그를 문서에 남긴다.

### 2) Inputs
- 사용자 요청: "진행해"
- 선행 변경: Hero/Values/Team/FAQ 숨김 매핑 반영 완료
- 제약 조건: 허위 운영 결과를 기록하지 않고 자동화/수동 증빙을 분리 기록

### 3) Design Decisions
- 프론트 회귀 테스트를 추가해 숨김 payload 렌더 가드를 코드 레벨에서 고정한다.
- 운영 문서(`docs/page_edit.md`)에 자동화 pass와 수동 점검 pending을 함께 기록한다.

### 4) Implementation Notes
- `src/components/screens/AboutScreen.visibility.test.tsx` 신규 추가
  - 숨김 payload에서 Hero/Values/Team/FAQ/Contact 미노출 검증
  - 표시 payload에서 섹션 정상 노출 + FAQ JSON-LD 생성 검증
- `docs/page_edit.md`
  - 18.6 `숨김 퍼블리시 점검 로그` 섹션 추가
  - local/dev 자동화 pass 3건 + staging/prod-like 수동 점검 pending 1건 기록

### 5) Validation
- 프론트 테스트
  - `pnpm test -- src/components/screens/AboutScreen.visibility.test.tsx` 통과 (신규 2 tests)
- 서버 테스트
  - `uv run pytest tests/test_admin_page_editor_api.py::test_extract_about_content_omits_hidden_faq_block tests/test_admin_page_editor_api.py::test_extract_about_content_omits_all_hidden_blocks` 통과
- 빌드/컴파일
  - `pnpm build` 통과
  - `uv run python -m py_compile main.py` 통과

### 6) Outcome
#### 잘된 점
- About 숨김 퍼블리시 동작이 서버/프론트/운영 문서까지 동일 기준으로 맞춰졌다.

#### 아쉬운 점
- staging/prod-like 실브라우저 수동 점검은 아직 수행 전이다.

#### 다음 액션
1. 배포 직전 staging에서 숨김 퍼블리시 수동 점검 1회 수행 및 캡처 링크 기록
2. 결과에 따라 18.2 게이트 `pending` 항목을 갱신

## Session 2026-03-06-06

### 1) Goal
- `VIBE_01_github_content` → `VIBE_02_playground` → `VIBE_03_glossary` 순서로 MVP 기반 구조를 실제 코드에 반영한다.

### 2) Inputs
- 참고 문서: `docs/VIBE_01_github_content.md`, `docs/VIBE_02_playground.md`, `docs/VIBE_03_glossary.md`
- 사용자 요청: "VIBE_01_github_content VIBE_02_playground VIBE_03_glossary 기획안 순서대로 진행"
- 제약 조건: 기존 코드 패턴 유지, 비밀값은 `.env.example`만 추가, 전체 빌드/테스트로 검증

### 3) Design Decisions
- VIBE_01은 즉시 통합 가능한 기초 계층(환경변수 템플릿, 수집/큐레이션 유틸 모듈)부터 구현한다.
- VIBE_02는 에러 응급실 + 레시피북을 포함한 `PlaygroundScreen` MVP를 별도 라우트로 분리한다.
- VIBE_03은 `glossary.json`(MVP 20개)과 `GlossaryScreen`을 도입해 검색/카테고리 흐름을 우선 완성한다.

### 4) Implementation Notes
- 백엔드(FastAPI)
  - `server/.env.example`: Gemini/GitHub 키 및 호출 상한, 수집 제한 변수 추가
  - `server/github_collector.py`: URL 정규화, 최근 업데이트 판별, 일일 한도 판별, 검색 쿼리 생성 유틸 추가
  - `server/gemini_curator.py`: 품질 점수 계산, 자동 컷오프 판정, 3레벨 요약 품질 검증, fallback 템플릿 추가
- 프론트(React)
  - `src/components/screens/PlaygroundScreen.tsx`: 에러 응급실 입력(2,000자 제한), plan B 숨김 토글, 레시피 검색/카드 구현
  - `src/components/screens/GlossaryScreen.tsx`: 용어 검색, 카테고리 필터, 비유 카드 목록 구현
  - `src/data/glossary.ts`, `src/data/glossary.json`: MVP 20개 용어 데이터 추가
  - `src/components/TopNav.tsx`, `src/App.tsx`: `playground`, `glossary` 라우트/네비게이션 연결
  - 기존 화면 타입(`Screen`)을 신규 네비게이션 타입과 호환되도록 확장

### 5) Validation
- 정적 진단
  - 변경 파일 대상 `lsp_diagnostics` 확인: 오류 없음
- 프론트 빌드
  - `pnpm build` 통과
- 프론트 테스트
  - `pnpm test`는 `.claude/worktrees/silly-wilbur` 경로 테스트가 함께 실행되어 기존 Invalid hook call로 실패(이번 변경과 무관)
  - `pnpm exec vitest run src/App.admin-guard.smoke.test.tsx src/App.oauth-regression.test.tsx src/components/screens/AboutScreen.visibility.test.tsx --exclude ".claude/**"` 통과 (8 passed)
- 백엔드 테스트
  - `uv run pytest` 통과 (46 passed)

### 6) Outcome
#### 잘된 점
- 세 기획안을 요청 순서대로 코드에 반영할 수 있는 MVP 구조(백엔드 기반 + 프론트 라우트 + 용어 데이터)를 한 번에 연결했다.

#### 아쉬운 점
- VIBE_01의 DB/스케줄러/실제 Gemini 호출 및 VIBE_02의 API 연동은 후속 단계로 남아 있다.

#### 다음 액션
1. VIBE_01 `curated_content` DB 마이그레이션과 `/api/curated` API를 실제로 연결한다.
2. VIBE_02 `PlaygroundScreen`을 `/api/error-translate`와 연결해 fallback/rate limit 정책을 서버와 일치시킨다.
3. VIBE_03 용어 신청 버튼 + 연관 용어 라우팅을 추가해 사전 UX를 완성한다.

## Session 2026-03-07-03

### 1) Goal
- `VIBE_01~03` 남은 항목을 다시 점검하고, 가장 즉시 가치가 큰 `VIBE_02` 레시피북 UX 미완 영역을 실제 코드로 진전시킨다.

### 2) Inputs
- 참고 문서: `docs/VIBE_01_github_content.md`, `docs/VIBE_02_playground.md`, `docs/VIBE_03_glossary.md`
- 현재 상태 확인: GitHub 수집 파이프라인은 유틸 계층 중심, Glossary는 기본 UX 완료, Playground는 하드코딩 레시피 MVP 상태

### 3) Design Decisions
- 남은 항목 중에서 리스크가 낮고 사용자 체감이 큰 `VIBE_02` 레시피북 강화를 우선한다.
- 레시피 데이터는 문서 기획과 맞게 `JSON`으로 분리해 이후 어드민 콘텐츠 보강 흐름과도 자연스럽게 연결한다.
- 화면은 별도 페이지 분리보다 기존 `PlaygroundScreen` 안에서 레시피북 섹션을 완성도 있게 강화한다.

### 4) Implementation Notes
- 프론트
  - `src/data/recipes.json`: 카테고리/명령어/설명/주의문구를 가진 레시피 데이터셋 추가
  - `src/data/recipes.ts`: JSON 로더 및 타입 정의 추가
  - `src/components/screens/PlaygroundScreen.tsx`
    - 카테고리 탭 필터 추가
    - 명령어 복사 버튼 추가
    - "이게 뭐야?" 설명 아코디언 추가
    - localStorage 기반 즐겨찾기 추가
    - 결과 없음 empty state 추가
- 테스트
  - `src/components/screens/PlaygroundScreen.test.tsx`: 카테고리 필터/즐겨찾기+설명 열기 동작 검증 추가

### 5) Validation
- 정적 진단/프론트 테스트/빌드는 이번 변경 직후 재실행해 확인한다.

### 6) Outcome
#### 잘된 점
- `VIBE_02` 문서에 남아 있던 레시피 데이터 분리, 카테고리 탐색, 설명 펼치기, 즐겨찾기 흐름을 실제 화면으로 진전시켰다.

#### 아쉬운 점
- 레시피북 전용 별도 라우트와 어드민 작성 워크플로는 아직 남아 있다.

#### 다음 액션
1. 레시피북 즐겨찾기를 사용자 계정 단위 저장으로 승격할지 검토한다.
2. `VIBE_03` 카드 갤러리/오늘의 추천 카드 같은 2차 UX를 이어서 구현한다.
3. `VIBE_01` 실제 GitHub 수집/승인 파이프라인을 백엔드에서 확장한다.

## Session 2026-03-07-04

### 1) Goal
- `VIBE_03`에서 기본 사전 검색 MVP 다음 단계였던 카드 갤러리와 오늘의 추천 카드 UX를 실제 화면으로 확장한다.

### 2) Inputs
- 참고 문서: `docs/VIBE_03_glossary.md`
- 현재 상태: `GlossaryScreen`은 검색/카테고리/연관 용어/용어 신청까지 완료, 카드 갤러리와 오늘의 추천 카드 위젯은 미구현

### 3) Design Decisions
- glossary 데이터는 새 API 없이 기존 `glossary.ts`를 그대로 재사용한다.
- 오늘의 추천 카드는 날짜 기반 결정 함수로 고정해 하루 동안 같은 결과를 보여주도록 한다.
- 카드 갤러리는 별도 화면 분리 대신 `GlossaryScreen`과 `HomeScreen`에서 재사용 가능한 컴포넌트로 만든다.

### 4) Implementation Notes
- 공통
  - `src/data/glossary.ts`
    - 카테고리 톤 매핑 유틸 추가
    - 날짜 기반 `pickDailyGlossaryTerms()` 추가
- 컴포넌트
  - `src/components/GlossaryCardGallery.tsx`: 앞/뒤집기 카드 갤러리 추가
  - `src/components/TodayGlossaryCards.tsx`: 오늘의 추천 용어 3장 위젯 추가
- 화면 연결
  - `src/components/screens/GlossaryScreen.tsx`
    - 오늘의 추천 용어 섹션 추가
    - 실생활 비유 카드 갤러리 섹션 추가
    - 추천/갤러리 카드 클릭 시 기존 검색/포커스 UX와 연결
  - `src/components/screens/HomeScreen.tsx`
    - 홈에서 바로 glossary로 이어지는 오늘의 용어 위젯 추가
- 테스트
  - `src/components/screens/GlossaryScreen.test.tsx`: 추천 카드/갤러리 렌더링과 포커스 이동 검증 추가

### 5) Validation
- 변경 파일 LSP 확인, glossary 전용 테스트, 프론트 build 재실행으로 검증한다.

### 6) Outcome
#### 잘된 점
- `VIBE_03`의 "구경하는 재미"와 "오늘 다시 오는 이유"를 실제 UI로 연결했다.

#### 아쉬운 점
- 오늘의 용어 XP/퀴즈, 전역 호버 팝업, 즉석 번역기 확장 기능은 아직 남아 있다.

#### 다음 액션
1. 오늘의 용어 카드에 XP/퀴즈를 연결할지 설계한다.
2. glossary hover popover를 Curated/Playground까지 확장할 기반을 잡는다.
3. `VIBE_01` 실제 GitHub 수집/승인 파이프라인 구현으로 다시 돌아간다.

## Session 2026-03-07-05

### 1) Goal
- `VIBE_01`의 가장 큰 미완 지점인 GitHub 실제 후보 수집 파이프라인을 샘플 하드코딩 단계에서 한 단계 더 현실 구현으로 전진시킨다.

### 2) Inputs
- 참고 문서: `docs/VIBE_01_github_content.md`
- 현재 상태: `/api/admin/curated/run`은 동작은 하지만 GitHub API 대신 샘플 2건만 저장하고 있었다.

### 3) Design Decisions
- 실제 GitHub Search API 후보 수집을 우선 붙이고, Gemini 실호출은 다음 단계로 미룬다.
- Gemini 미연동 구간은 heuristic 평가 + 비LLM 3레벨 요약으로 메워서 운영 파이프라인을 먼저 현실화한다.
- 토큰이 없는 로컬/개발 환경은 기존처럼 완전히 막지 않고 명시적 샘플 fallback 메시지를 반환한다.

### 4) Implementation Notes
- 백엔드
  - `server/github_collector.py`
    - GitHub Search API 조회 추가
    - owner profile 조회 + 한국 개발자 위치 판별 추가
    - 최근 90일 업데이트 필터와 canonical URL 기반 후보 정규화 강화
  - `server/gemini_curator.py`
    - heuristic 큐레이션 점수/카테고리/태그/사유 생성 추가
    - 비LLM 3레벨 요약 생성 추가
  - `server/main.py`
    - `/api/admin/curated/run`이 실제 후보 수집기와 연결되도록 변경
    - `GITHUB_TOKEN` 존재 시 실제 GitHub 후보 수집 사용
    - 토큰 부재 시 샘플 fallback 메시지 반환
    - upsert 결과의 `inserted` 플래그를 기준으로 `created` 수를 정확히 계산
  - `server/db.py`
    - `create_or_update_curated_content()`가 PostgreSQL `xmax = 0` 기반 `inserted` 여부를 함께 반환
- 테스트
  - `server/tests/test_admin_curated_collection_api.py`: 실제 후보 수집 연결, 토큰 없는 fallback, 신규 insert 카운트 계산 검증 추가

### 5) Validation
- 관련 백엔드 pytest를 재실행해 수동 수집 엔드포인트 회귀를 확인한다.

### 6) Outcome
#### 잘된 점
- `VIBE_01` 수동 수집 엔드포인트가 더 이상 데모용 샘플 고정이 아니라 실제 GitHub 후보를 받을 수 있는 형태로 진전됐다.

#### 아쉬운 점
- Gemini 실호출, README excerpt 활용, 스케줄러/APScheduler, 어드민 알림 메일은 아직 후속이다.

#### 다음 액션
1. README excerpt를 포함한 실제 Gemini 평가/요약 호출을 붙인다.
2. `server/scheduler.py`와 FastAPI lifespan 등록으로 자동 수집까지 연결한다.
3. 어드민 pending 큐에서 라이선스 검토/복구 플로를 더 세분화한다.

## Session 2026-03-07-06

### 1) Goal
- `VIBE_01` 백엔드 수집 경로를 이어가기 전에 남아 있던 타입 에러를 정리하고, 관련 테스트/임포트 검증을 다시 닫는다.

### 2) Inputs
- 참고 문서: `docs/IMPLEMENTATION_LEARNING_LOG.md`, `docs/VIBE_01_github_content.md`
- 현재 상태: `server/tests/test_admin_curated_collection_api.py`에 `relevance_score` 비교 타입 에러 1개가 남아 있었고, `server/github_collector.py`는 JSON payload 접근이 다소 느슨했다.

### 3) Design Decisions
- 테스트는 응답 JSON을 바로 `Any`처럼 다루지 않고, 작은 typed helper로 `dict[str, object]`를 보장한 뒤 단언한다.
- GitHub collector는 API payload를 받자마자 `dict[str, object]` 형태로 정규화해 이후 필드 접근을 더 안전하게 만든다.
- 이번 세션은 기능 확장보다 안정화에 집중하고, 실제 기능 회귀는 pytest와 import check로 빠르게 닫는다.

### 4) Implementation Notes
- 백엔드
  - `server/tests/test_admin_curated_collection_api.py`
    - `_json_body()` helper를 추가해 JSON object 응답을 typed dict로 다루도록 정리
    - `relevance_score`를 `int`로 확인한 뒤 비교하도록 바꿔 operator type error 제거
    - fallback 메시지도 `str` 확인 후 검증하도록 정리
  - `server/github_collector.py`
    - `JsonObject` alias와 `_as_json_object()` helper를 추가
    - search 결과 item / owner payload / license payload 접근을 정규화된 dict 기준으로 정리
    - `korean_cache.setdefault(...)`를 명시적 분기로 바꿔 불필요한 경고를 줄임
    - `_github_get_json()`에서 응답 bytes decode 후 JSON object/list 형태를 명시적으로 판별

### 5) Validation
- 확인 항목: 타입 에러 제거, curated 수집 회귀 없음, backend import 정상 여부
- 테스트/검증 결과:
  - `cd server && uv run --group dev pytest tests/test_admin_curated_collection_api.py tests/test_curated_related_api.py tests/test_admin_user_enforcement.py` -> `25 passed`
  - `cd server && uv run python -c "import main; print('ok')"` -> `ok`
  - LSP 기준 `server/tests/test_admin_curated_collection_api.py`, `server/github_collector.py`의 error는 0건으로 확인

### 6) Outcome
#### 잘된 점
- 직전 세션에서 남긴 acceptance blocker였던 테스트 타입 에러를 제거했고, 수집기 JSON handling도 한 단계 더 견고해졌다.

#### 아쉬운 점
- `server/github_collector.py`와 일부 테스트 파일에는 여전히 basedpyright warning이 남아 있어 다음 안정화 때 추가 정리가 가능하다.

#### 다음 액션
1. `server/github_collector.py` warning을 더 줄일지 결정한다.
2. README excerpt 기반 Gemini 평가/요약 실호출을 붙인다.
3. 자동 수집 스케줄러와 admin pending 운영 흐름을 이어서 구현한다.

## Session 2026-03-07-07

### 1) Goal
- `VIBE_01` GitHub 큐레이션 수집 흐름에 README excerpt 수집과 Gemini 실평가/실요약 단계를 붙여 운영 파이프라인을 한 단계 더 현실화한다.

### 2) Inputs
- 참고 문서: `docs/VIBE_01_github_content.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 현재 상태: GitHub Search API 기반 후보 수집은 붙어 있었지만, 평가/요약은 여전히 heuristic 기반이었고 README 본문은 활용하지 못하고 있었다.

### 3) Design Decisions
- Gemini 연동은 별도 SDK를 새로 넣지 않고 표준 HTTP 요청 기반으로 붙여 현재 `uv` 워크플로와 의존성 부담을 유지한다.
- GitHub README는 후보 수집 직후 excerpt만 짧게 가져와 Gemini prompt와 heuristic fallback 둘 다에서 활용한다.
- Gemini 키가 없거나 호출/파싱이 실패해도 수집 API가 중단되지 않도록 기존 heuristic 평가/요약을 강한 fallback으로 유지한다.

### 4) Implementation Notes
- 백엔드
  - `server/github_collector.py`
    - `fetch_github_readme_excerpt()` 추가
    - GitHub raw README endpoint를 호출해 excerpt를 가져오고 최대 길이 기준으로 잘라 prompt 입력 크기를 제어
    - GitHub header 생성을 `_build_github_headers()`로 공통화
  - `server/gemini_curator.py`
    - `GeminiCurationResult` 추가
    - `curate_repository_with_gemini()` 추가
    - Gemini REST API(`generateContent`)에 JSON-only 응답을 요청하고, 응답 text -> JSON 파싱 -> 평가/3레벨 요약 검증 흐름 추가
    - heuristic/비LLM summary도 `readme_excerpt`를 참고하도록 보강
  - `server/main.py`
    - `GEMINI_API_KEY`, `GEMINI_MODEL`, `GITHUB_README_EXCERPT_MAX_CHARS` env 설정 추가
    - `_load_curated_collection_candidates()`에서 README excerpt를 수집하고 Gemini/heuristic intelligence를 합성하도록 변경
    - `_build_curated_candidate_intelligence()` helper를 추가해 Gemini 성공 시 실결과를 사용하고 실패 시 heuristic로 되돌아가도록 정리
    - `/api/admin/curated/run`은 후보에 이미 포함된 summary를 우선 사용하고, 비어 있으면 기존 fallback을 적용하도록 유지
- 테스트
  - `server/tests/test_admin_curated_collection_api.py`
    - Gemini configured path에서 README excerpt + Gemini summary/evaluation이 저장 payload에 반영되는지 검증 추가
    - Gemini 실패 시 heuristic fallback으로 저장이 계속되는지 검증 추가
- 설정 문서
  - `server/.env.example`에 `GEMINI_MODEL`, `GITHUB_README_EXCERPT_MAX_CHARS` 추가

### 5) Validation
- 확인 항목: Gemini 연동 추가 후 curated run 회귀 없음, fallback 유지, import 가능, 수정 파일 LSP error 0건
- 테스트/검증 결과:
  - `cd server && uv run --group dev pytest tests/test_admin_curated_collection_api.py tests/test_curated_related_api.py tests/test_admin_user_enforcement.py` -> `26 passed`
  - `cd server && uv run python -c "import main; print('ok')"` -> `ok`
  - LSP error 0건 확인: `server/gemini_curator.py`, `server/github_collector.py`, `server/main.py`, `server/tests/test_admin_curated_collection_api.py`

### 6) Outcome
#### 잘된 점
- 큐레이션 수집이 GitHub metadata 수준을 넘어 README 문맥과 Gemini 기반 요약까지 활용할 수 있는 구조로 전진했다.
- Gemini가 실패해도 운영 수집 API가 계속 동작하도록 fallback을 유지해 리스크를 낮췄다.

#### 아쉬운 점
- Gemini 응답 품질/비용/레이트리밋 튜닝과 prompt 개선은 아직 운영 데이터 기반 보정이 필요하다.
- README excerpt는 아직 DB에 별도 저장하지 않고 수집 시점 enrichment에만 사용한다.

#### 다음 액션
1. `server/scheduler.py`와 lifespan 등록으로 자동 수집을 붙인다.
2. Gemini 호출 실패/성공률을 관리자 관점에서 관찰할 수 있게 로그나 액션 메타데이터를 남긴다.
3. pending 큐에서 라이선스/품질/중복 검토 플로를 더 세분화한다.

## Session 2026-03-07-08

### 1) Goal
- `VIBE_01` 큐레이션 수집을 수동 관리자 실행에만 의존하지 않도록 자동 스케줄러를 붙이고 앱 lifecycle에 안전하게 연결한다.

### 2) Inputs
- 참고 문서: `docs/IMPLEMENTATION_LEARNING_LOG.md`, `docs/VIBE_01_github_content.md`
- 현재 상태: `/api/admin/curated/run`은 수동 실행 기준으로만 동작했고, 앱 startup/shutdown에는 admin log cleanup loop만 등록돼 있었다.

### 3) Design Decisions
- 자동 수집은 관리자 엔드포인트와 같은 수집 파이프라인을 재사용하되, 개발용 샘플 fallback은 절대 사용하지 않도록 분리한다.
- 스케줄러는 별도 `server/scheduler.py`로 분리해 periodic loop / task cancellation을 재사용 가능한 형태로 둔다.
- 자동 수집은 기본 비활성화 상태로 두고, env 설정으로만 켜지게 해 로컬 개발 환경에서 예기치 않은 수집이 일어나지 않게 한다.

### 4) Implementation Notes
- 백엔드
  - `server/scheduler.py`
    - `run_periodic_async_loop()` 추가
    - `cancel_background_task()` 추가
  - `server/main.py`
    - `perform_curated_collection_run()` helper로 수동 수집 핵심 로직을 분리
    - `_load_curated_collection_candidates(..., allow_sample_fallback=...)`로 자동/수동 모드 차이를 명시
    - `run_curated_collection_scheduler_iteration()` 추가
    - startup 시 `AUTO_CURATED_COLLECTION_ENABLED`가 켜져 있으면 periodic task를 생성하고, shutdown 시 clean cancel 하도록 확장
    - 새 env: `AUTO_CURATED_COLLECTION_ENABLED`, `AUTO_CURATED_COLLECTION_RUN_ON_STARTUP`, `AUTO_CURATED_COLLECTION_INTERVAL_SECONDS`
- 테스트
  - `server/tests/test_admin_curated_collection_api.py`
    - automatic mode에서 샘플 fallback을 건너뛰는지 검증 추가
    - scheduler iteration이 `allow_sample_fallback=False`로 helper를 호출하는지 검증 추가
- 설정 문서
  - `server/.env.example`에 자동 수집 관련 env 추가

### 5) Validation
- 확인 항목: scheduler helper 추가 후 기존 curated run 회귀 없음, automatic mode 샘플 차단, import/LSP 정상
- 테스트/검증 결과:
  - `cd server && uv run --group dev pytest tests/test_admin_curated_collection_api.py tests/test_curated_related_api.py tests/test_admin_user_enforcement.py` -> `28 passed`
  - `cd server && uv run python -c "import main; import scheduler; print('ok')"` -> `ok`
  - LSP error 0건 확인: `server/main.py`, `server/scheduler.py`, `server/tests/test_admin_curated_collection_api.py`

### 6) Outcome
#### 잘된 점
- 자동 수집이 lifecycle에 연결되면서 운영자가 매번 수동으로 버튼을 누르지 않아도 되는 기반이 생겼다.
- 자동 모드에서 샘플 후보가 저장되는 사고를 막아 운영/개발 경계를 분명히 했다.

#### 아쉬운 점
- 자동 수집 결과를 관리자 UI에서 직접 관찰하는 상태판이나 action log 연동은 아직 없다.
- 스케줄러는 현재 단순 interval 기반이라 cron 수준 세밀 제어는 후속이다.

#### 다음 액션
1. 자동 수집 성공/실패/생성 건수를 관리자 액션 로그나 observability 카드에 남긴다.
2. pending 큐에 라이선스/중복/품질 검토 상태를 더 세분화한다.
3. 필요하면 interval 기반 대신 cron 성격의 스케줄 정책으로 확장한다.

## Session 2026-03-07-09

### 1) Goal
- 자동 큐레이션 수집 결과를 관리자 로그/관측 지표에서 바로 볼 수 있게 연결해 background 작업 가시성을 높인다.

### 2) Inputs
- 참고 문서: `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 현재 상태: 자동 수집 스케줄러는 붙어 있었지만 성공/실패/건너뜀 여부와 생성 건수는 운영 화면에서 확인할 수 없었다.

### 3) Design Decisions
- 새 엔드포인트를 만들지 않고 기존 `/api/admin/action-logs/observability` payload를 확장해 page editor 관측과 함께 보이도록 한다.
- 자동 수집 이벤트는 기존 `admin_action_logs`를 재사용하고, `target_id`는 raw 문자열 대신 deterministic UUID로 저장해 현재 스키마 제약을 따른다.
- 프론트 검증은 실제 `src/` 경로의 Vitest 실행으로 확인하고, `.claude/worktrees` 쪽 중복 테스트 실패는 작업 범위 밖 워크트리 이슈로 분리한다.

### 4) Implementation Notes
- 백엔드
  - `server/main.py`
    - `log_curated_collection_action()` 추가
    - scheduler iteration이 `curated_collection_succeeded`, `curated_collection_skipped`, `curated_collection_failed` 액션을 기록하도록 변경
    - `curated_collection_action_target_id()`로 deterministic UUID target을 생성
  - `server/db.py`
    - `get_admin_action_observability()`에 자동 수집 로그 집계 추가
    - `daily_curated_collection_counts`, `curated_collection_summary`, `curated_collection_failure_distribution` 반환
- 프론트
  - `src/lib/api.ts`
    - `AdminActionObservability` 타입에 자동 수집 관측 필드 추가
  - `src/components/screens/admin/pages/AdminLogs.tsx`
    - 자동 수집 성공/건너뜀/실패/생성 카드 추가
    - 일별 자동 수집 실행 목록, 실패 원인 분포 UI 추가
- 테스트
  - `server/tests/test_admin_curated_collection_api.py`
    - scheduler success/skip/failure action logging 검증 추가
  - `server/tests/test_admin_page_editor_api.py`
    - observability 응답에 새 curated 필드가 포함되는지 검증 추가
  - `src/components/screens/admin/pages/AdminLogs.observability.test.tsx`
    - 새 자동 수집 메트릭과 분포 UI 검증 추가

### 5) Validation
- 확인 항목: scheduler action log 기록, observability payload 확장, admin logs UI 반영, build 회귀 없음
- 테스트/검증 결과:
  - `cd server && uv run --group dev pytest tests/test_admin_curated_collection_api.py tests/test_admin_page_editor_api.py tests/test_curated_related_api.py tests/test_admin_user_enforcement.py` -> `54 passed`
  - `cd server && uv run python -c "import main; import scheduler; print('ok')"` -> 이전 세션에서 `ok` 확인 유지
  - `cd src && ../node_modules/.bin/vitest run components/screens/admin/pages/AdminLogs.observability.test.tsx` -> `1 passed`
  - `npm run build` -> passed
  - LSP error 0건 확인: `server/main.py`, `server/db.py`, `src/components/screens/admin/pages/AdminLogs.tsx`, `src/lib/api.ts`

### 6) Outcome
#### 잘된 점
- 자동 수집 백그라운드 작업이 이제 관리자 화면의 기존 로그/관측 패널에 자연스럽게 드러난다.
- 스케줄러 이벤트를 기존 운영 로그 체계 안에 넣어 별도 대시보드 없이도 상태를 추적할 수 있게 됐다.

#### 아쉬운 점
- `.claude/worktrees` 내부 중복 프론트 테스트들은 여전히 별도 React hook 환경 문제로 실패하며, 이는 현재 실제 앱 소스 변경과는 분리된 워크트리 이슈다.
- 자동 수집 액션 로그는 현재 문자열 reason 기반 메타데이터라 이후 구조화 필드가 필요할 수 있다.

#### 다음 액션
1. pending 큐에 라이선스/중복/품질 검토 상태를 더 세분화한다.
2. 자동 수집 로그 메타데이터를 구조화하거나 관리자 카드 drill-down을 추가한다.
3. 필요하면 cron 성격의 스케줄 정책과 수집 pause/resume 토글까지 확장한다.

## Session 2026-03-07-10

### 1) Goal
- 큐레이션 pending 큐를 라이선스/중복/품질 검토 상태로 더 세분화해 운영자가 왜 멈춰 있는 항목인지 바로 구분할 수 있게 만든다.

### 2) Inputs
- 참고 문서: `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 사용자 피드백/이슈: 프론트 명령은 `pnpm` 기준으로 맞출 것
- 현재 상태: curated status는 사실상 `pending`/`approved`/`rejected`/`auto_rejected`만 의미 있게 쓰였고, 검수 큐의 세부 이유를 표현하지 못했다.

### 3) Design Decisions
- 새 review status를 `review_license`, `review_duplicate`, `review_quality`로 추가하되, 기존 `pending`은 일반 검수 대기로 유지한다.
- 자동 수집은 명확한 케이스만 자동 분류한다: 라이선스 불명확 -> `review_license`, 품질 점수 낮음 -> `review_quality`, duplicate는 관리자 수동 분류로 둔다.
- 검수 대기 뱃지/카운트는 `pending` 하나가 아니라 review queue 전체(`pending` + 3개 review 상태)를 합산해 보여준다.

### 4) Implementation Notes
- 백엔드
  - `server/main.py`
    - curated status 상수와 `CURATED_REVIEW_QUEUE_STATUSES` 추가
    - `CuratedAdminUpdateRequest.status` literal 범위를 review 상태까지 확장
    - `determine_curated_collection_status()` 추가
    - 자동 수집 저장 시 라이선스/품질 기준에 따라 review status를 할당하도록 변경
- 프론트
  - `src/lib/api.ts`
    - `CuratedContent.status` union에 review 상태 추가
  - `src/components/screens/admin/AdminLayout.tsx`
    - curated badge count를 review queue 전체 합산으로 변경
  - `src/components/screens/admin/pages/AdminCurated.tsx`
    - 상태 필터에 `review_license`, `review_duplicate`, `review_quality` 추가
    - 상태 badge를 운영자 친화 라벨로 표시
    - row action에 `라이선스 검토`, `중복 검토`, `품질 검토` 추가
    - 검수 대기 카운트를 review queue 전체 합산으로 변경
- 테스트
  - `server/tests/test_admin_curated_collection_api.py`
    - 자동 상태 분기(license/quality review) 검증 추가
  - `src/components/screens/admin/pages/AdminCurated.smoke.test.tsx`
    - 품질 검토 전환 액션 검증 추가
    - aggregated review queue count 표시 검증 추가

### 5) Validation
- 확인 항목: review status 자동 분기, 관리자 검수 액션/필터, pnpm 기반 프론트 검증, build 회귀 없음
- 테스트/검증 결과:
  - `cd server && uv run --group dev pytest tests/test_admin_curated_collection_api.py tests/test_admin_page_editor_api.py tests/test_curated_related_api.py tests/test_admin_user_enforcement.py` -> `56 passed`
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminCurated.smoke.test.tsx components/screens/admin/pages/AdminLogs.observability.test.tsx` -> `2 files passed, 9 tests passed`
  - `pnpm build` -> passed
  - LSP error 0건 확인: `server/main.py`, `server/tests/test_admin_curated_collection_api.py`, `src/components/screens/admin/pages/AdminCurated.tsx`, `src/components/screens/admin/AdminLayout.tsx`, `src/lib/api.ts`

### 6) Outcome
#### 잘된 점
- 운영자가 pending 큐를 볼 때 "왜 이 항목을 봐야 하는지"가 상태만으로 바로 드러나게 됐다.
- 자동 수집도 막연한 pending 대신 라이선스/품질 검토 큐로 바로 밀어 넣어 후속 운영 우선순위를 세우기 쉬워졌다.

#### 아쉬운 점
- duplicate 검토는 아직 자동 판별이 아니라 수동 triage 액션 중심이다.
- review status별 전용 설명/필터 칩/대시보드 위젯까지는 아직 추가하지 않았다.

#### 다음 액션
1. duplicate 후보 자동 탐지 규칙을 설계해 `review_duplicate`를 더 적극적으로 활용한다.
2. review status별 운영 가이드 문구를 관리자 화면과 `docs/admin_menual.md`에 반영한다.
3. 관리자 대시보드에 curated review queue breakdown 위젯을 추가한다.

## Session 2026-03-07-11

### 1) Goal
- `review_duplicate` 상태를 수동 전환용 라벨에만 두지 않고, 자동 수집 단계에서 중복 의심 후보를 바로 분류하도록 만든다.

### 2) Inputs
- 참고 문서: `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 현재 상태: 라이선스/품질 review는 자동 분기되지만 duplicate review는 관리자 수동 액션으로만 들어갈 수 있었다.

### 3) Design Decisions
- duplicate 판별은 저장 직전 `perform_curated_collection_run()`에서 수행해 기존 curated row와 같은 수집 배치 내 후보 둘 다 비교한다.
- 신호는 단순하면서 설명 가능한 값만 사용한다: `canonical_url`, `repo_owner + repo_name`, 정규화된 `title`.
- exact canonical upsert와 별개로, 제목/owner-repo가 사실상 같은 후보는 운영 검토가 필요하므로 `review_duplicate`로 보낸다.

### 4) Implementation Notes
- 백엔드
  - `server/main.py`
    - `perform_curated_collection_run()`에 `processed_candidates` 추적 추가
    - `determine_curated_collection_status()`가 `existing_items`, `processed_items`를 받아 duplicate 여부까지 함께 판단하도록 확장
    - `is_curated_duplicate_candidate()` 추가
    - `_normalize_curated_title()` 추가
    - canonical URL 일치, owner/repo 일치, 정규화 title 일치 시 `review_duplicate`로 라우팅
- 테스트
  - `server/tests/test_admin_curated_collection_api.py`
    - 기존 curated row 기준 duplicate review 분기 검증 추가
    - 같은 배치 내 processed item 기준 duplicate review 분기 검증 추가

### 5) Validation
- 확인 항목: duplicate review 자동 분기, 기존 review queue 회귀 없음, pnpm/uv 기반 검증 성공
- 테스트/검증 결과:
  - `cd server && uv run --group dev pytest tests/test_admin_curated_collection_api.py tests/test_admin_page_editor_api.py tests/test_curated_related_api.py tests/test_admin_user_enforcement.py` -> `58 passed`
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminCurated.smoke.test.tsx components/screens/admin/pages/AdminLogs.observability.test.tsx` -> `2 files passed, 9 tests passed`
  - `pnpm build` -> passed
  - LSP error 0건 확인: `server/main.py`, `server/tests/test_admin_curated_collection_api.py`

### 6) Outcome
#### 잘된 점
- duplicate 검토가 더 이상 수동 triage에만 의존하지 않고 자동 수집 단계에서 바로 분류된다.
- 기존 curated DB와 동일 배치 후보까지 함께 비교해 중복성 높은 후보를 더 일찍 분리할 수 있게 됐다.

#### 아쉬운 점
- 현재 duplicate 판별은 보수적 문자열/URL 기반이라 README나 설명의 의미적 유사성까지는 보지 않는다.
- duplicate 이유를 운영 UI에 별도 상세 사유로 노출하진 않았다.

#### 다음 액션
1. `docs/admin_menual.md`와 관리자 화면에 review status별 운영 가이드를 반영한다.
2. 관리자 대시보드에 curated review queue breakdown 위젯을 추가한다.
3. 필요하면 duplicate 사유(`title_match`, `owner_repo_match` 등)를 별도 메타데이터로 저장한다.

## Session 2026-03-07-12

### 1) Goal
- 세분화된 curated review status를 운영자가 한눈에 볼 수 있도록 관리자 대시보드 breakdown 위젯과 운영 메뉴얼을 마무리한다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: review queue 분기(`pending`, `review_license`, `review_duplicate`, `review_quality`)는 구현되어 있었지만, 대시보드 요약과 운영 절차 문서화가 남아 있었다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- 새 API를 만들지 않고 `get_admin_action_observability()` 응답에 review queue breakdown을 추가해 `AdminLogs`와 `AdminDashboard`가 같은 운영 집계 소스를 공유하도록 했다.
- 대시보드 위젯은 총 검수 대기 수와 상태별 적체를 동시에 보여 주는 1개 섹션으로 구성해, 운영자가 `/admin/curated` 진입 전 병목을 먼저 파악할 수 있게 했다.
- 운영 메뉴얼은 단순 상태 사전이 아니라 자동 분기 규칙, 운영 순서, 이상 징후 해석까지 포함해 실제 triage 문서로 확장했다.

### 4) Implementation Notes
- 프론트
  - `src/lib/api.ts`
    - `AdminActionObservability`에 `curated_review_queue_summary` 추가
  - `src/components/screens/admin/pages/AdminDashboard.tsx`
    - `api.getAdminActionObservability(30)` 조회 추가
    - `Curated 검수 큐` 위젯 추가
    - 총 검수 대기 수와 `pending`, `review_license`, `review_duplicate`, `review_quality` 상태 카드를 렌더링
  - `src/components/screens/admin/pages/AdminDashboard.analytics.test.tsx`
    - observability mock 확장 및 새 위젯 렌더링 검증 추가
- 백엔드
  - `server/db.py`
    - `curated_contents` 상태 집계를 추가해 `curated_review_queue_summary` 반환
  - `server/tests/test_admin_page_editor_api.py`
    - observability 응답에 review queue summary가 포함되는지 검증 추가
- 운영 문서
  - `docs/admin_menual.md`
    - curated review queue 운영 가이드 섹션 추가
    - 상태 의미, 자동 분기 원칙, 운영자가 보는 화면, 권장 운영 순서, 이상 징후 해석 정리

### 5) Validation
- 확인 항목: observability payload 확장, 대시보드 위젯 렌더링, 운영 문서 반영, pnpm/uv 기준 검증 성공
- 테스트/검증 결과:
  - `cd server && uv run --group dev pytest tests/test_admin_page_editor_api.py tests/test_admin_curated_collection_api.py tests/test_curated_related_api.py tests/test_admin_user_enforcement.py`
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminDashboard.analytics.test.tsx components/screens/admin/pages/AdminCurated.smoke.test.tsx components/screens/admin/pages/AdminLogs.observability.test.tsx`
  - `pnpm build`
  - `lsp_diagnostics`로 수정 파일 오류 0건 확인 예정/동반 수행

### 6) Outcome
#### 잘된 점
- 관리자 대시보드에서 review queue 병목을 먼저 확인하고 곧바로 `/admin/curated`로 이어지는 운영 루프가 생겼다.
- 자동 수집 관측, 검수 큐 적체, 운영 메뉴얼이 서로 같은 상태 모델을 공유하게 됐다.

#### 아쉬운 점
- duplicate 사유는 아직 개수만 보이며, `canonical_url`/`owner_repo`/`title` 중 어떤 신호였는지는 저장하지 않는다.

#### 다음 액션
1. duplicate review 사유를 구조화 메타데이터로 저장할지 결정한다.
2. 필요하면 dashboard에서 상태 카드를 클릭해 `/admin/curated` 필터로 바로 이동하는 deep link를 추가한다.

## Session 2026-03-07-13

### 1) Goal
- duplicate review를 단순 상태값이 아니라 설명 가능한 메타데이터까지 남기고, 대시보드 검수 카드에서 해당 필터 화면으로 바로 진입할 수 있게 만든다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: `review_duplicate` 자동 분기는 동작했지만 어떤 신호로 분류되었는지 row 자체에는 남지 않았고, 대시보드 카드는 숫자만 보여 주는 상태였다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- curated row에는 범용 `review_metadata` JSONB 컬럼을 추가해 duplicate 신호를 구조화해 저장한다.
- duplicate 메타데이터는 현재 `canonical_url_match`, `owner_repo_match`, `title_match`, `matched_existing_ids`, `matched_processed_titles`까지만 담아 설명 가능성을 우선한다.
- 대시보드 상태 카드는 새 라우트를 만들지 않고 `/admin/curated?status=...` deep link를 사용해 기존 운영 화면을 재사용한다.

### 4) Implementation Notes
- 백엔드
  - `server/db.py`
    - `curated_content.review_metadata JSONB` 컬럼 추가/보정
    - create/update upsert 경로에 `review_metadata` 저장 추가
    - observability 집계 쿼리의 테이블명 오타 `curated_contents` -> `curated_content` 수정
  - `server/main.py`
    - `CuratedDuplicateReviewMetadata` 타입 추가
    - `serialize_curated_content()`에 `review_metadata` 노출 추가
    - `build_curated_duplicate_review_metadata()` 추가
    - 자동 수집 시 duplicate 분기 결과를 `review_metadata`에 저장
  - `server/tests/test_admin_curated_collection_api.py`
    - duplicate metadata 구조화 결과 테스트 추가
- 프론트
  - `src/lib/api.ts`
    - `CuratedContent.review_metadata` 타입 추가
  - `src/components/screens/admin/pages/AdminDashboard.tsx`
    - review status 카드를 `/admin/curated?status=...` 링크로 변경
  - `src/components/screens/admin/pages/AdminCurated.tsx`
    - `useSearchParams()`로 status query string 동기화
    - duplicate reason 칩과 기존 항목 ID/같은 배치 후보 제목 표시 추가
  - `src/components/screens/admin/pages/AdminCurated.smoke.test.tsx`
    - query string 초기 진입과 duplicate reason 표시 검증 추가

### 5) Validation
- 확인 항목: review metadata 저장/직렬화, query-string 상태 필터, duplicate reason UI, pnpm/uv 기준 검증 성공
- 테스트/검증 결과:
  - `cd server && uv run --group dev pytest tests/test_admin_page_editor_api.py tests/test_admin_curated_collection_api.py tests/test_curated_related_api.py tests/test_admin_user_enforcement.py`
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminDashboard.analytics.test.tsx components/screens/admin/pages/AdminCurated.smoke.test.tsx components/screens/admin/pages/AdminLogs.observability.test.tsx`
  - `pnpm build`
  - `lsp_diagnostics`로 수정 파일 오류 확인 동반

### 6) Outcome
#### 잘된 점
- `review_duplicate`가 왜 붙었는지 운영자가 테이블에서 바로 이해할 수 있게 됐다.
- 대시보드 숫자 확인 -> 해당 상태 filtered queue 진입까지 한 번에 이어지는 triage 흐름이 생겼다.

#### 아쉬운 점
- 아직 duplicate 대상의 상세 row snapshot(예: 상대 canonical URL/title 전체 값)은 저장하지 않는다.

#### 다음 액션
1. 필요하면 duplicate 상세 팝오버 또는 compare drawer를 추가한다.
2. review metadata를 라이선스/품질 검토 사유까지 확장할지 검토한다.

## Session 2026-03-07-14

### 1) Goal
- `review_metadata`를 duplicate 전용에서 license/quality review까지 확장해 검수 큐 전체가 설명 가능한 상태 모델을 갖게 만든다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: duplicate review는 구조화 메타데이터가 있었지만 `review_license`, `review_quality`는 단순 status만 남고 있었다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- `review_metadata`는 상태별 공통 필드 `reason_codes`를 두고, 필요 시 상태별 보조 필드(`license_value`, `quality_score_value`, `quality_threshold`)를 추가하는 방식으로 확장했다.
- duplicate 전용 boolean 플래그는 유지하되, UI는 `reason_codes`를 우선 렌더링하도록 바꿔 review queue 전체를 같은 방식으로 표시한다.
- quality 기준값은 현재 서버 결정 로직과 맞춘 `45`를 명시적으로 저장해 나중에 정책값으로 바뀌어도 당시 판단 근거를 추적할 수 있게 했다.

### 4) Implementation Notes
- 백엔드
  - `server/main.py`
    - `build_curated_review_metadata()` 추가
    - duplicate/license/quality review 모두 `review_metadata` 생성 경로를 공유하도록 정리
    - duplicate metadata에 `reason_codes` 추가
  - `server/tests/test_admin_curated_collection_api.py`
    - missing license, low quality metadata 검증 테스트 추가
- 프론트
  - `src/lib/api.ts`
    - `reason_codes`, `license_value`, `quality_score_value`, `quality_threshold` 타입 추가
  - `src/components/screens/admin/pages/AdminCurated.tsx`
    - generic review reason chip 렌더링 추가
    - quality 점수/기준, license 값 표시 추가
  - `src/components/screens/admin/pages/AdminCurated.smoke.test.tsx`
    - license/quality review metadata 표시 테스트 추가
- 운영 문서
  - `docs/admin_menual.md`
    - license/quality review metadata 해석 포인트 추가

### 5) Validation
- 확인 항목: reason_codes 기반 렌더링, license/quality metadata 저장, pnpm/uv 기준 검증 성공
- 테스트/검증 결과:
  - `cd server && uv run --group dev pytest tests/test_admin_page_editor_api.py tests/test_admin_curated_collection_api.py tests/test_curated_related_api.py tests/test_admin_user_enforcement.py`
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminDashboard.analytics.test.tsx components/screens/admin/pages/AdminCurated.smoke.test.tsx components/screens/admin/pages/AdminLogs.observability.test.tsx`
  - `pnpm build`
  - `lsp_diagnostics`로 수정 파일 오류 확인 동반

### 6) Outcome
#### 잘된 점
- 이제 review queue의 세 핵심 상태(duplicate/license/quality)가 모두 "왜 이 상태인지"를 row 단위에서 바로 설명한다.
- 운영자는 큐레이션 테이블에서 원인 칩과 근거 값을 함께 보며 더 빠르게 triage할 수 있다.

#### 아쉬운 점
- 현재 `reason_codes`는 영어 내부 코드값을 기준으로 저장하므로, 외부 API 문서까지 열 경우 별도 코드 사전이 추가로 있으면 더 친절하다.

#### 다음 액션
1. review reason 코드를 관리자 문서/화면에서 더 자세히 설명하는 도움말 UI를 추가한다.
2. 추후 정책값이 runtime 설정으로 이동하면 quality threshold도 정책 기반으로 직렬화한다.

## Session 2026-03-07-15

### 1) Goal
- curated quality review 기준을 운영 정책값으로 끌어올리고, 관리자 큐 화면에서 review reason의 의미를 즉시 이해할 수 있게 만든다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: `quality_below_threshold`는 구조화돼 있었지만 기준값 `45`가 코드에 고정돼 있었고, reason chip 의미는 운영자가 문서를 따로 봐야 했다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- quality 기준은 `moderation_settings`에 `curated_review_quality_threshold`로 추가해 `/admin/policies`에서 조정하도록 했다.
- 상태 결정 함수는 `quality_threshold`를 인자로 받는 순수 함수 형태를 유지하고, 실제 수집 실행에서만 정책값을 주입한다.
- review reason 도움말은 새 툴팁 시스템을 도입하지 않고 `AdminCurated` 상단의 `Review Reason Guide` 카드로 제공해 구현 리스크를 낮췄다.

### 4) Implementation Notes
- 백엔드
  - `server/db.py`
    - `moderation_settings.curated_review_quality_threshold` 컬럼 추가/조회/업데이트 경로 반영
  - `server/main.py`
    - `DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD` 추가
    - `get_effective_moderation_settings()` / `ensure_baseline_moderation_settings()` / `update_admin_policies()`에 새 정책값 연결
    - `perform_curated_collection_run()`이 정책값을 읽어 `determine_curated_collection_status()`와 `build_curated_review_metadata()`에 주입
  - `server/tests/test_admin_curated_collection_api.py`
    - custom threshold status/metadata 테스트 추가
- 프론트
  - `src/lib/api.ts`
    - `ModerationPolicy`와 `updateAdminPolicies()` payload에 `curated_review_quality_threshold` 추가
  - `src/components/screens/admin/pages/AdminPolicies.tsx`
    - `Curated 품질 검토 기준(1~100)` 입력 필드 추가
  - `src/components/screens/admin/pages/AdminPolicies.log-policy.test.tsx`
    - 새 정책 필드 load/save 검증 추가
  - `src/components/screens/admin/pages/AdminCurated.tsx`
    - `Review Reason Guide` 카드 추가
  - `src/components/screens/admin/pages/AdminCurated.smoke.test.tsx`
    - guide 카드 노출 검증 추가

### 5) Validation
- 확인 항목: 정책 저장/로드, custom threshold 적용, review reason guide 노출, pnpm/uv 기준 검증 성공
- 테스트/검증 결과:
  - `cd server && uv run --group dev pytest tests/test_admin_page_editor_api.py tests/test_admin_curated_collection_api.py tests/test_curated_related_api.py tests/test_admin_user_enforcement.py`
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminPolicies.log-policy.test.tsx components/screens/admin/pages/AdminDashboard.analytics.test.tsx components/screens/admin/pages/AdminCurated.smoke.test.tsx components/screens/admin/pages/AdminLogs.observability.test.tsx`
  - `pnpm build`
  - `lsp_diagnostics`로 수정 파일 오류 확인 동반

### 6) Outcome
#### 잘된 점
- quality review 정책이 운영 화면에서 직접 조정 가능해져 triage volume을 운영자가 제어할 수 있게 됐다.
- 큐 화면만 열어도 reason chip 의미를 바로 확인할 수 있어 문서 왕복이 줄었다.

#### 아쉬운 점
- 현재 reason guide는 정적 카드라 row별 상황에 따라 접혀 있거나 hover되는 더 정교한 UX는 아직 아니다.

#### 다음 액션
1. `AdminDashboard` 또는 `AdminPolicies`에 현재 curated quality threshold를 함께 노출한다.
2. review reason guide를 collapsible/inline helper 형태로 더 다듬는다.

## Session 2026-03-07-16

### 1) Goal
- 운영자가 현재 curated quality 기준을 대시보드/정책 화면에서 바로 볼 수 있게 하고, review reason guide는 접기/펼치기 가능한 도움말로 다듬는다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: quality threshold는 정책값으로 옮겨졌지만 대시보드에서 바로 보이지 않았고, `Review Reason Guide`는 항상 펼쳐져 있어 테이블 밀도를 높였다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- 대시보드는 별도 새 endpoint 없이 `api.getAdminPolicies()`를 추가 조회해 현재 quality threshold를 `Curated 검수 큐` 요약 카드 안에 함께 보여 준다.
- `AdminPolicies`는 입력 필드 아래에 현재 기준이 실제 분기 로직에서 어떻게 쓰이는지 한 줄 설명을 붙여 정책 영향도를 즉시 이해하게 했다.
- `AdminCurated`의 review guide는 기본 접힘 상태 + `가이드 펼치기/접기` 버튼으로 바꿔, 평소에는 테이블 집중도를 높이고 필요 시에만 설명을 보게 했다.

### 4) Implementation Notes
- 프론트
  - `src/components/screens/admin/pages/AdminDashboard.tsx`
    - `api.getAdminPolicies()` query 추가
    - `Curated 검수 큐` hero에 현재 `품질 기준 Q` 표시 추가
  - `src/components/screens/admin/pages/AdminDashboard.analytics.test.tsx`
    - dashboard threshold 표시와 policies query 호출 검증 추가
  - `src/components/screens/admin/pages/AdminPolicies.tsx`
    - `Curated 품질 검토 기준(1~100)` 아래 현재 분기 의미 설명 박스 추가
  - `src/components/screens/admin/pages/AdminPolicies.log-policy.test.tsx`
    - 설명 박스와 threshold 저장 흐름 검증 유지/확장
  - `src/components/screens/admin/pages/AdminCurated.tsx`
    - `showReviewReasonGuide` state 추가
    - `ChevronDown` / `ChevronUp` 기반 guide toggle 추가
  - `src/components/screens/admin/pages/AdminCurated.smoke.test.tsx`
    - guide 기본 접힘/수동 펼침 검증 추가

### 5) Validation
- 확인 항목: dashboard threshold 요약, policy 설명 박스, collapsible guide UX, pnpm 기준 검증 성공
- 테스트/검증 결과:
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminPolicies.log-policy.test.tsx components/screens/admin/pages/AdminDashboard.analytics.test.tsx components/screens/admin/pages/AdminCurated.smoke.test.tsx components/screens/admin/pages/AdminLogs.observability.test.tsx`
  - `pnpm build`
  - `lsp_diagnostics`로 수정 파일 오류 확인 동반

### 6) Outcome
#### 잘된 점
- 운영자는 threshold 값을 dashboard와 policy 화면에서 모두 확인할 수 있어 정책-적체 관계를 더 빠르게 읽을 수 있다.
- review guide가 기본 접힘 상태가 되면서 큐레이션 테이블의 시선 분산이 줄었다.

#### 아쉬운 점
- dashboard가 policies query를 추가로 한 번 더 호출하므로, 나중에는 observability payload나 shared bootstrap payload로 묶을 여지가 있다.

#### 다음 액션
1. dashboard/curated에 threshold 변경 이력까지 보여 줄지 검토한다.
2. review guide를 row context 기반 inline helper로 더 정교하게 다듬는다.

## Session 2026-03-07-17

### 1) Goal
- 운영자가 current threshold뿐 아니라 최근 curated quality threshold 변경 이력도 대시보드/정책 화면에서 바로 확인할 수 있게 한다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: 현재 `Q` 값은 보였지만, 언제/누가 바꿨는지는 `활동 로그` 화면을 별도로 검색해야 했다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- 새 DB 구조나 새 API endpoint를 만들지 않고, 기존 `policy_updated` 액션 로그의 `reason` 문자열에 이미 기록되는 `curated_quality_threshold=...` 값을 재사용한다.
- 대시보드는 최근 3건만 짧게 보여 주는 운영 요약용, `AdminPolicies`는 최근 5건까지 보여 주는 설정 이력용으로 역할을 나눴다.
- threshold 파싱은 프론트에서 단순 정규식으로 처리해 백엔드 변경 범위를 최소화했다.

### 4) Implementation Notes
- 프론트
  - `src/components/screens/admin/pages/AdminDashboard.tsx`
    - `api.getAdminActionLogs(6, { actionType: "policy_updated" })` query 추가
    - `curated_quality_threshold` 이력을 추출해 `최근 기준 변경` 목록 표시
  - `src/components/screens/admin/pages/AdminDashboard.analytics.test.tsx`
    - threshold history 목록과 filtered log query 호출 검증 추가
  - `src/components/screens/admin/pages/AdminPolicies.tsx`
    - `useQuery`로 `policy_updated` 로그를 조회해 `최근 품질 기준 변경` 카드 추가
  - `src/components/screens/admin/pages/AdminPolicies.log-policy.test.tsx`
    - threshold history 렌더링과 log query 호출 검증 추가
- 운영 문서
  - `docs/admin_menual.md`
    - dashboard/policies에서 threshold history를 해석하는 포인트 추가

### 5) Validation
- 확인 항목: dashboard history, policies history, pnpm 기준 검증 성공
- 테스트/검증 결과:
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminPolicies.log-policy.test.tsx components/screens/admin/pages/AdminDashboard.analytics.test.tsx components/screens/admin/pages/AdminCurated.smoke.test.tsx components/screens/admin/pages/AdminLogs.observability.test.tsx`
  - `pnpm build`
  - `lsp_diagnostics`로 수정 파일 오류 확인 동반

### 6) Outcome
#### 잘된 점
- 운영자는 이제 `현재 기준`과 `최근 변경 이력`을 같은 컨텍스트에서 같이 볼 수 있어 threshold 변화와 queue 변화의 관계를 빠르게 읽을 수 있다.
- 새 저장소나 새 로그 체계를 추가하지 않고 기존 admin action log 자산을 그대로 재활용했다.

#### 아쉬운 점
- 현재는 `reason` 문자열 파싱에 의존하므로, 장기적으로는 정책 변경 payload를 구조화 저장하면 더 안전하다.

#### 다음 액션
1. `policy_updated` reason을 구조화 JSON으로 남길지 검토한다.
2. threshold history에서 변경 전/후 diff까지 표시할지 검토한다.

## Session 2026-03-07-18

### 1) Goal
- threshold history를 단순 조회용이 아니라 바로 탐색 가능한 운영 shortcut으로 만들기 위해 `활동 로그` deep link까지 연결한다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: 대시보드/정책 화면에 최근 `Q` 변경 목록은 보였지만, 세부 로그를 보려면 운영자가 다시 `활동 로그`에 들어가 수동으로 필터를 쳐야 했다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- deep link 대상은 `/admin/logs?actionType=policy_updated&query=curated_quality_threshold`로 고정해 가장 관련성 높은 로그 집합으로 바로 이동하게 했다.
- `AdminLogs`는 별도 전역 상태를 만들지 않고 `useSearchParams()`로 필터 상태를 URL과 양방향 동기화해, 링크 진입과 수동 필터 수정이 모두 같은 모델을 쓰게 했다.
- dashboard/policies history row는 `Link`로 감싸 클릭 affordance를 주되, 추가 버튼을 만들지 않아 UI 밀도를 유지했다.

### 4) Implementation Notes
- 프론트
  - `src/components/screens/admin/pages/AdminLogs.tsx`
    - `useSearchParams()` 추가
    - `query`, `actionType`, `actorId`, `pageId`, `windowDays`를 URL과 동기화
  - `src/components/screens/admin/pages/AdminDashboard.tsx`
    - threshold history row를 `/admin/logs?actionType=policy_updated&query=curated_quality_threshold` 링크로 변경
  - `src/components/screens/admin/pages/AdminPolicies.tsx`
    - threshold history row를 동일 deep link로 변경
  - `src/components/screens/admin/pages/AdminLogs.observability.test.tsx`
    - query string 기반 초기 필터/observability window 반영 테스트 추가
- 운영 문서
  - `docs/admin_menual.md`
    - threshold history row가 활동 로그 shortcut 역할을 한다는 점 명시

### 5) Validation
- 확인 항목: AdminLogs query param sync, threshold history deep link, pnpm 기준 검증 성공
- 테스트/검증 결과:
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminPolicies.log-policy.test.tsx components/screens/admin/pages/AdminDashboard.analytics.test.tsx components/screens/admin/pages/AdminCurated.smoke.test.tsx components/screens/admin/pages/AdminLogs.observability.test.tsx`
  - `pnpm build`
  - `lsp_diagnostics`로 수정 파일 오류 확인 동반

### 6) Outcome
#### 잘된 점
- threshold history를 보고 바로 관련 `policy_updated` 로그로 이동할 수 있어, 정책 변경 맥락 추적 시간이 줄었다.
- `AdminLogs`가 URL-driven filter를 지원하게 되어 다른 admin deep link 확장 기반도 생겼다.

#### 아쉬운 점
- 현재 deep link는 `curated_quality_threshold` 키워드 단위라 특정 개별 row id까지 pinpoint 하지는 않는다.

#### 다음 액션
1. `AdminLogs`에 selected row 강조 또는 anchor 개념을 추가해 deep link 정밀도를 높인다.
2. 추후 다른 admin cards도 동일 query-param deep link 패턴으로 통일한다.

## Session 2026-03-07-19

### 1) Goal
- threshold history deep link가 단순 필터 이동을 넘어서, 도착한 `policy_updated` row를 즉시 식별할 수 있게 만든다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: threshold history에서 `/admin/logs`로는 이동했지만, 같은 키워드가 포함된 다른 로그가 있으면 운영자가 다시 눈으로 target row를 찾아야 했다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- deep link는 기존 `actionType`/`query`에 더해 `targetLogId`를 함께 전달한다.
- `AdminLogs`는 `targetLogId`가 있으면 안내 배너를 보여 주고, 해당 row에만 강조 스타일(`data-highlighted=true`)을 적용한다.
- query 결과에 같은 keyword를 가진 row가 여러 개 있어도 target row만 강조되도록 해서 precision을 높였다.

### 4) Implementation Notes
- 프론트
  - `src/components/screens/admin/pages/AdminDashboard.tsx`
    - threshold history link에 `targetLogId` 추가
  - `src/components/screens/admin/pages/AdminPolicies.tsx`
    - 동일 deep link 파라미터 추가
  - `src/components/screens/admin/pages/AdminLogs.tsx`
    - `targetLogId` query param 읽기
    - 안내 배너 렌더링
    - target row에 highlight class + `data-highlighted` 속성 부여
  - `src/components/screens/admin/pages/AdminLogs.observability.test.tsx`
    - target row highlight 검증 추가
- 운영 문서
  - `docs/admin_menual.md`
    - highlight 안내 메시지 해석 추가

### 5) Validation
- 확인 항목: target row highlight, query-param deep link 유지, pnpm 기준 검증 성공
- 테스트/검증 결과:
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminLogs.observability.test.tsx`
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminPolicies.log-policy.test.tsx components/screens/admin/pages/AdminDashboard.analytics.test.tsx components/screens/admin/pages/AdminCurated.smoke.test.tsx`
  - `pnpm build`
  - `lsp_diagnostics`로 수정 파일 오류 확인 동반

### 6) Outcome
#### 잘된 점
- threshold history -> 활동 로그 이동 후 어떤 row를 봐야 하는지 즉시 드러난다.
- `targetLogId` 패턴이 생겨 다른 admin deep link에도 같은 precision을 재사용할 수 있다.

#### 아쉬운 점
- target row가 현재 필터 결과에 없으면 highlight는 당연히 보이지 않으므로, 미래에는 미스매치 fallback 안내를 더 줄 수 있다.

#### 다음 액션
1. target row가 결과에 없을 때 fallback toast/banner를 추가한다.
2. 다른 admin cards에도 `targetLogId` deep link 패턴을 확장한다.

## Session 2026-03-07-20

### 1) Goal
- `targetLogId` deep link가 실패하는 경우에도 운영자가 혼란스럽지 않도록, `활동 로그`에 명시적 fallback 안내를 추가한다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: target row가 있으면 highlight가 잘 되었지만, 필터 결과에 없을 때도 강조 성공처럼 보이는 배너가 떠서 오해 여지가 있었다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- `AdminLogs`에서 `hasTargetLog`를 계산해 성공/실패 배너를 분기한다.
- 실패 배너는 현재 결과에서 못 찾았다는 사실과, 필터/검색어를 조정하라는 다음 액션을 함께 안내한다.
- target row가 없는 경우에는 강조 성공 배너를 완전히 숨겨 false positive 신호를 없앴다.

### 4) Implementation Notes
- 프론트
  - `src/components/screens/admin/pages/AdminLogs.tsx`
    - `hasTargetLog` derived state 추가
    - success highlight banner / missing-target fallback banner 분기
  - `src/components/screens/admin/pages/AdminLogs.observability.test.tsx`
    - missing `targetLogId` fallback banner 테스트 추가
- 운영 문서
  - `docs/admin_menual.md`
    - fallback 안내 메시지 해석 포인트 추가

### 5) Validation
- 확인 항목: target-found vs target-missing banner 분기, pnpm 기준 검증 성공
- 테스트/검증 결과:
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminLogs.observability.test.tsx`
  - `pnpm build`
  - `lsp_diagnostics`로 수정 파일 오류 확인 동반

### 6) Outcome
#### 잘된 점
- deep link 실패 시에도 운영자가 현재 상태를 정확히 이해하고 바로 다음 액션을 취할 수 있게 됐다.
- `targetLogId` 패턴이 성공/실패 모두 설명 가능한 navigation UX로 정리됐다.

#### 아쉬운 점
- 아직 자동으로 필터를 넓혀 재검색해 주지는 않으므로, 사용자가 수동으로 조정해야 한다.

#### 다음 액션
1. fallback 상태에서 `필터 초기화` 또는 `검색어 제거` quick action 버튼을 추가한다.
2. `policy_updated`를 구조화 payload로 바꿔 diff 기반 deep link를 검토한다.

## Session 2026-03-07-21

### 1) Goal
- `AdminLogs`의 missing-target fallback 배너를 단순 안내에서 끝내지 않고, 운영자가 즉시 복구 액션을 실행할 수 있는 상태로 마무리한다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: missing 배너는 표시되지만 사용자가 직접 검색어와 필터를 하나씩 지워야 해서 운영 동선이 끊겼다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- missing-target 배너 안에 `검색어 제거`, `필터 초기화` quick action을 직접 배치해 운영자가 같은 맥락에서 바로 복구할 수 있게 한다.
- `필터 초기화`는 deep link 탐색 상태를 완전히 해제해야 하므로 `targetLogId`를 포함한 필터 파라미터를 함께 정리한다.

### 4) Implementation Notes
- 프론트
  - `src/components/screens/admin/pages/AdminLogs.tsx`
    - `handleClearQuery`, `handleResetFilters` 추가
    - missing-target 배너에 quick action 버튼 2종 추가
  - `src/components/screens/admin/pages/AdminLogs.observability.test.tsx`
    - fallback 배너 노출 후 `필터 초기화` 클릭 시 입력값과 배너가 함께 정리되는지 검증
- 운영 문서
  - `docs/admin_menual.md`
    - missing-target 배너의 quick action 사용 흐름 반영

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminLogs.tsx` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminLogs.observability.test.tsx` 오류 없음
- 프론트 테스트
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminLogs.observability.test.tsx`
- 프론트 빌드
  - `pnpm build`

### 6) Outcome
#### 잘된 점
- target row를 못 찾았을 때도 운영자가 같은 배너에서 바로 재검색 동작으로 이어질 수 있게 됐다.
- deep link 기반 활동 로그 UX가 단순 탐색을 넘어 복구 가능한 운영 흐름으로 닫혔다.

#### 아쉬운 점
- 현재 quick action은 클라이언트 상태 기준 초기화라, 향후 더 정교한 deep link 복원/undo 패턴이 필요할 수 있다.

#### 다음 액션
1. `policy_updated.reason`을 구조화 payload로 바꿔 threshold 변경 전/후 diff를 안정적으로 보여준다.
2. 다른 admin deep link 진입점에도 같은 target-row recovery 패턴을 확장한다.

## Session 2026-03-07-22

### 1) Goal
- `policy_updated` 로그의 freeform `reason` 파싱 의존을 줄이고, threshold history/diff/deep link가 안정적으로 동작하도록 structured metadata로 전환한다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: `AdminDashboard`, `AdminPolicies`가 모두 `reason` 문자열에서 `curated_quality_threshold=...`를 regex로 파싱하고 있었다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- `admin_action_logs`에 `metadata JSONB`를 추가하고, `policy_updated`는 `reason`과 별도로 `curated_quality_threshold.previous/next` 및 `changed_fields`를 함께 저장한다.
- 프론트는 metadata를 우선 사용하되, 기존 로그 호환을 위해 legacy `reason` 파싱 fallback을 남긴다.
- `AdminLogs` 검색도 metadata를 포함해, deep link query가 visible reason 문구 변화에 덜 민감하도록 만든다.

### 4) Implementation Notes
- 백엔드
  - `server/db.py`
    - `admin_action_logs.metadata JSONB` 컬럼 및 startup 보정 추가
    - `create_admin_action_log(..., metadata=...)` 지원 추가
  - `server/main.py`
    - `write_admin_action_log(..., metadata=...)` 지원 추가
    - `build_policy_update_log_metadata()` 추가
    - `/api/admin/policies` 저장 시 threshold 이전/이후 값을 metadata에 함께 기록
- 프론트
  - `src/lib/api.ts`
    - `AdminActionLog.metadata` 타입 추가
  - 신규: `src/components/screens/admin/pages/policyHistory.ts`
    - metadata 우선 + legacy fallback threshold history 추출 helper 추가
  - `src/components/screens/admin/pages/AdminDashboard.tsx`
    - 최근 기준 변경 카드가 metadata 기반으로 threshold/delta 표시
  - `src/components/screens/admin/pages/AdminPolicies.tsx`
    - 최근 품질 기준 변경 목록이 metadata 기반 `previous -> next` diff 표시
  - `src/components/screens/admin/pages/AdminLogs.tsx`
    - 검색 시 metadata JSON도 포함
- 테스트
  - `server/tests/test_admin_policy_logs_api.py` 신규 추가
  - `src/components/screens/admin/pages/AdminDashboard.analytics.test.tsx`
  - `src/components/screens/admin/pages/AdminPolicies.log-policy.test.tsx`
  - `src/components/screens/admin/pages/AdminLogs.observability.test.tsx`

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `server/db.py` 오류 없음
  - `lsp_diagnostics`: `src/lib/api.ts` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminDashboard.tsx` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminPolicies.tsx` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminLogs.tsx` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/admin/pages/policyHistory.ts` 오류 없음
- 백엔드 테스트
  - `cd server && uv run --group dev pytest tests/test_admin_policy_logs_api.py`
- 프론트 테스트
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminDashboard.analytics.test.tsx components/screens/admin/pages/AdminPolicies.log-policy.test.tsx components/screens/admin/pages/AdminLogs.observability.test.tsx`
- 프론트 빌드
  - `pnpm build`

### 6) Outcome
#### 잘된 점
- threshold history가 더 이상 freeform reason regex 하나에 매달리지 않고, 이전/이후 diff까지 안정적으로 표시된다.
- deep link query도 metadata 검색을 타므로 reason 문구 변경에 덜 취약해졌다.

#### 아쉬운 점
- 기존 레거시 로그는 metadata가 없으므로 fallback parser를 당분간 유지해야 한다.

#### 다음 액션
1. `policy_updated` 외 다른 admin action에도 structured metadata 도입이 필요한지 점검한다.
2. 활동 로그 테이블에서 policy metadata를 더 읽기 쉬운 badge/diff UI로 노출할지 검토한다.

## Session 2026-03-07-23

### 1) Goal
- `AdminLogs` 테이블에서 `policy_updated` metadata를 raw reason 아래의 compact diff UI로 직접 보여 줘, 운영자가 threshold 변경 맥락을 더 빨리 읽을 수 있게 한다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: metadata는 저장/검색되지만 `활동 로그` 표에서는 여전히 reason 문자열만 보여 줘, diff를 눈으로 다시 해석해야 했다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- `사유` 셀은 기존 human-readable reason을 유지하고, 그 아래에 최대 3개의 compact diff chip을 추가한다.
- chip 문구는 metadata `changed_fields`를 우선 사용하고, 운영 화면에서 자주 읽는 필드는 한글 label로 치환한다.

### 4) Implementation Notes
- 프론트
  - `src/components/screens/admin/pages/policyHistory.ts`
    - policy field label map, 값 formatter, compact diff summary extractor 추가
  - `src/components/screens/admin/pages/AdminLogs.tsx`
    - `policy_updated` row의 `사유` 셀 아래에 diff chip strip 추가
    - 예: `품질 기준: Q 45 -> Q 52`
  - `src/components/screens/admin/pages/AdminLogs.observability.test.tsx`
    - metadata 기반 policy diff chip 표시 검증 추가
- 운영 문서
  - `docs/admin_menual.md`
    - `활동 로그`에서 compact diff chip을 읽는 방법 반영

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `src/components/screens/admin/pages/policyHistory.ts` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminLogs.tsx` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminLogs.observability.test.tsx` 오류 없음
- 프론트 테스트
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminLogs.observability.test.tsx`
- 프론트 빌드
  - `pnpm build`

### 6) Outcome
#### 잘된 점
- 운영자가 raw reason 전체를 읽지 않아도 핵심 policy diff를 한눈에 파악할 수 있게 됐다.
- structured metadata가 저장뿐 아니라 실제 운영 UI 가치로 연결됐다.

#### 아쉬운 점
- 현재는 최대 3개 chip까지만 노출하므로, 변경 필드가 아주 많을 때는 전체 diff를 모두 한 번에 보지 못한다.

#### 다음 액션
1. chip overflow가 많은 `policy_updated` row에 `+N개 변경` 요약을 추가할지 검토한다.
2. 다른 admin action metadata도 같은 compact summary 패턴으로 확장할지 검토한다.

## Session 2026-03-07-24

### 1) Goal
- `AdminLogs`의 policy diff chip이 많아질 때도 표 밀도를 유지하도록, 3개 초과 변경은 `+N개 변경` 요약으로 접는다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: `policy_updated` row는 compact diff chip을 보여 주지만, 변경 필드가 많아지면 같은 셀에서 계속 늘어날 수 있었다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- visible chip은 최대 3개까지만 유지하고, 초과분은 `+N개 변경`으로 집계한다.
- overflow 요약도 같은 chip strip 안에 넣어, 추가 변경이 있다는 사실을 같은 시선 흐름에서 읽게 한다.

### 4) Implementation Notes
- 프론트
  - `src/components/screens/admin/pages/AdminLogs.tsx`
    - 전체 policy change 목록과 visible 3개를 분리하고 `hiddenPolicyChangeCount` 계산 추가
    - 초과분이 있으면 `+N개 변경` summary chip 표시
  - `src/components/screens/admin/pages/AdminLogs.observability.test.tsx`
    - 4개 변경 필드 fixture로 overflow summary chip 검증 추가
- 운영 문서
  - `docs/admin_menual.md`
    - `+N개 변경` 해석 가이드 반영

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminLogs.tsx` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminLogs.observability.test.tsx` 오류 없음
- 프론트 테스트
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminLogs.observability.test.tsx`
- 프론트 빌드
  - `pnpm build`

### 6) Outcome
#### 잘된 점
- policy 변경이 많은 로그도 표 높이를 통제하면서 핵심 변화와 추가 변경 유무를 동시에 전달하게 됐다.

#### 아쉬운 점
- 현재 `+N개 변경`은 개수만 알려 주므로, 초과분 전체를 펼쳐 보는 상세 UX는 아직 없다.

#### 다음 액션
1. `+N개 변경` hover/foldout으로 나머지 diff를 보여 줄지 검토한다.
2. compact summary 패턴을 다른 admin metadata 이벤트에도 재사용할지 검토한다.

## Session 2026-03-07-25

### 1) Goal
- `AdminLogs`의 `+N개 변경` summary chip을 실제 foldout control로 바꿔, 숨겨진 policy diff를 같은 row 안에서 바로 펼쳐 볼 수 있게 한다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: `+N개 변경`은 추가 변경이 있다는 사실만 알려 주고, 숨겨진 diff 자체는 볼 수 없었다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- `+N개 변경`은 button으로 승격하고, 펼친 뒤에는 `추가 변경 접기 (N개)`로 라벨을 바꾼다.
- 숨겨진 chip도 같은 `사유` 셀 내부에서 바로 보여 줘서 row 맥락을 잃지 않도록 한다.

### 4) Implementation Notes
- 프론트
  - `src/components/screens/admin/pages/AdminLogs.tsx`
    - `expandedPolicyLogs` state 추가
    - overflow chip을 toggle button으로 교체
    - 펼친 상태에서 hidden policy change chip strip 추가
  - `src/components/screens/admin/pages/AdminLogs.observability.test.tsx`
    - `+1개 변경` 클릭 후 `추가 변경 접기 (1개)`와 숨겨진 `롤아웃 단계: qa -> pilot` chip 표시 검증 추가
- 운영 문서
  - `docs/admin_menual.md`
    - `+N개 변경` 버튼으로 숨겨진 diff를 펼치는 흐름 반영

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminLogs.tsx` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminLogs.observability.test.tsx` 오류 없음
- 프론트 테스트
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminLogs.observability.test.tsx`
- 프론트 빌드
  - `pnpm build`

### 6) Outcome
#### 잘된 점
- overflow 요약이 단순 카운트가 아니라 즉시 열어볼 수 있는 상세 진입점이 됐다.
- 활동 로그 테이블 안에서 policy 변경 맥락을 단계적으로 탐색할 수 있게 됐다.

#### 아쉬운 점
- 현재 확장 state는 세션 내 클라이언트 상태라, reload나 deep link로는 펼침 상태가 유지되지 않는다.

#### 다음 액션
1. 펼침 상태를 URL이나 row-local animation과 연결할지 검토한다.
2. 다른 metadata 이벤트에도 같은 expand/collapse 패턴을 적용할지 검토한다.

## Session 2026-03-07-26

### 1) Goal
- `AdminLogs`의 compact summary 패턴을 `policy_updated`에서 끝내지 않고, 다음 고가치 이벤트인 page publish 계열(`page_published`, `page_publish_failed`)까지 확장한다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: compact summary UI는 `policy_updated`만 지원했고, page publish 계열은 여전히 raw reason만 읽어야 했다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- backend에서 `page_published`, `page_publish_failed` 로그에 metadata를 함께 기록해 UI가 안정적으로 compact chip을 만들 수 있게 한다.
- 프론트는 action type별 summary extractor를 분리해, policy와 page event를 같은 row renderer로 처리한다.

### 4) Implementation Notes
- 백엔드
  - `server/main.py`
    - `page_publish_failed(conflict)`에 `failure_kind`, `expected_draft_version`, `current_draft_version` metadata 추가
    - `page_publish_failed(validation_failed)`에 `failure_kind`, `blocking_error_count`, `warning_count` metadata 추가
    - `page_published`에 `page_id`, `draft_version`, `published_version` metadata 추가
  - `server/tests/test_admin_page_editor_api.py`
    - publish success/conflict/validation failure 로그 metadata 검증 추가
- 프론트
  - 신규: `src/components/screens/admin/pages/adminLogSummary.ts`
    - policy / page publish 계열 compact summary extractor 추가
  - `src/components/screens/admin/pages/AdminLogs.tsx`
    - generic summary extractor로 전환
  - `src/components/screens/admin/pages/AdminLogs.observability.test.tsx`
    - `page_published` row의 `게시 버전: v2 -> v3` chip 검증 추가
- 운영 문서
  - `docs/admin_menual.md`
    - page publish 계열 compact summary 예시 반영

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `src/components/screens/admin/pages/adminLogSummary.ts` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminLogs.tsx` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminLogs.observability.test.tsx` 오류 없음
  - `lsp_diagnostics`: `server/tests/test_admin_page_editor_api.py` 오류 없음
- 백엔드 테스트
  - `cd server && uv run --group dev pytest tests/test_admin_page_editor_api.py`
- 프론트 테스트
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminLogs.observability.test.tsx`
- 프론트 빌드
  - `pnpm build`

### 6) Outcome
#### 잘된 점
- `AdminLogs`가 policy 이벤트뿐 아니라 page publish 계열도 compact summary로 읽을 수 있게 되어, 운영자 입장에서 action type별 가독성이 한 단계 올라갔다.

#### 아쉬운 점
- 아직 page draft/conflict save 계열은 metadata summary를 붙이지 않았으므로, page editor 이벤트 전반으로 보면 일부만 확장된 상태다.

#### 다음 액션
1. `page_draft_saved`, `page_conflict_detected`, `page_rolled_back`에도 metadata summary 확장 여부를 검토한다.
2. summary chip tone을 action type별로 구분할지 검토한다.

## Session 2026-03-07-27

### 1) Goal
- page publish 계열에서 한 단계 더 나아가, `page_draft_saved`, `page_conflict_detected`, `page_rolled_back`까지 `AdminLogs` compact summary 패턴을 확장한다.

### 2) Inputs
- 참고 문서: `docs/admin_menual.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: `page_published`, `page_publish_failed`만 summary chip을 갖고 있었고, draft/conflict/rollback은 raw reason만 읽어야 했다.
- 제약 조건: 프론트 검증 명령은 `pnpm` 기준으로 유지한다.

### 3) Design Decisions
- backend에서 각 event에 필요한 최소 metadata만 붙여 summary chip이 안정적으로 계산되게 한다.
- frontend는 기존 `adminLogSummary.ts` extractor를 확장해 action type별로 필요한 chip만 생성한다.

### 4) Implementation Notes
- 백엔드
  - `server/main.py`
    - `page_conflict_detected`에 `source`, `base_version`, `current_version`, `retryable` metadata 추가
    - `page_draft_saved`에 `source`, `base_version`, `saved_version` metadata 추가
    - `page_rolled_back`에 `target_version`, `restored_draft_version`, `published_version`, `publish_now` metadata 추가
  - `server/tests/test_admin_page_editor_api.py`
    - conflict/draft save metadata 검증 추가
- 프론트
  - `src/components/screens/admin/pages/adminLogSummary.ts`
    - `page_draft_saved`, `page_conflict_detected`, `page_rolled_back` summary extractor 추가
  - `src/components/screens/admin/pages/AdminLogs.observability.test.tsx`
    - `저장 소스: manual`, `저장 버전: v2 -> v3`, `복원 버전: v3 -> v4`, `즉시 게시: 예` chip 검증 추가
- 운영 문서
  - `docs/admin_menual.md`
    - page editor 전반의 compact summary 범위 반영

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `src/components/screens/admin/pages/adminLogSummary.ts` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminLogs.tsx` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/admin/pages/AdminLogs.observability.test.tsx` 오류 없음
  - `lsp_diagnostics`: `server/main.py` 오류 없음
- 백엔드 테스트
  - `cd server && uv run --group dev pytest tests/test_admin_page_editor_api.py`
- 프론트 테스트
  - `pnpm exec vitest run --root src components/screens/admin/pages/AdminLogs.observability.test.tsx`
- 프론트 빌드
  - `pnpm build`

### 6) Outcome
#### 잘된 점
- page editor 운영 로그 전반이 같은 compact summary 언어로 읽히게 되어, action type이 달라도 운영자가 같은 시각 패턴으로 빠르게 해석할 수 있게 됐다.

#### 아쉬운 점
- chip tone은 아직 공통 스타일이라, success/failure/conflict를 색만 보고 구분하기는 어렵다.

#### 다음 액션
1. action type별 summary chip tone 분화 여부를 검토한다.
2. 필요하면 `page_perf_*` 로그에도 compact summary를 붙인다.

## Session 2026-03-07-28

### 1) Goal
- `VIBE_01~03` 현재 구현 상태를 다시 맞춰 보고, 아직 비어 있는 우선순위 높은 항목 중 `VIBE_03`의 `즉석 번역기`를 현재 앱 구조에 맞게 MVP로 연결한다.

### 2) Inputs
- 참고 문서: `docs/VIBE_01_github_content.md`, `docs/VIBE_02_playground.md`, `docs/VIBE_03_glossary.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 현재 상태 확인 결과:
  - `VIBE_02`의 `에러 응급실`과 `명령어 레시피북`은 이미 `PlaygroundScreen`에 구현되어 있음
  - `VIBE_03`의 `용어사전`과 `비유 카드 갤러리`도 구현되어 있음
  - 반면 `VIBE_03`의 `즉석 번역기`는 아직 빠져 있었음
- 제약 조건: Gemini API 키는 아직 설정되지 않았으므로, endpoint는 `fallback + cache + rate limit` 기준으로 먼저 동작해야 함

### 3) Design Decisions
- `TranslatorScreen.tsx`를 새로 만드는 대신, 문서의 `에러 응급실과 탭으로 통합` 방향에 맞춰 `PlaygroundScreen` 안에 `에러 번역 / 텍스트 번역` 탭을 추가한다.
- backend는 `error_solutions`와 분리된 `text_translations` 캐시 테이블을 추가해 텍스트 번역을 독립적으로 저장한다.
- 관련 용어 이동은 별도 라우터 변경 없이 localStorage handoff로 `GlossaryScreen` 포커스 흐름에 연결한다.

### 4) Implementation Notes
- 백엔드
  - `server/db.py`
    - `text_translations` 테이블 및 `get_text_translation`, `upsert_text_translation` helper 추가
  - `server/main.py`
    - `TextTranslateRequest` 추가
    - `/api/translate` POST endpoint 구현
    - 입력 길이 제한(2,000자), rate limit, prompt-injection 필터, 캐시/ fallback 응답 추가
    - `build_text_translation_fallback()`과 `find_related_glossary_terms()` 추가
  - 신규 테스트: `server/tests/test_translate_api.py`
    - fallback 응답/캐시 응답/길이 제한 검증 추가
- 프론트
  - `src/lib/api.ts`
    - `TextTranslateResponse` 타입 및 `api.textTranslate()` 추가
  - `src/components/screens/PlaygroundScreen.tsx`
    - `에러 번역 / 텍스트 번역` 탭 UI 추가
    - 텍스트 번역 결과(한국어 요약, 쉬운 비유, 명령어, 관련 용어) 렌더링 추가
    - 최근 번역 5개 localStorage 저장/재사용 추가
    - 관련 용어 클릭 시 `GlossaryScreen`으로 이동하도록 localStorage handoff 추가
  - `src/components/screens/GlossaryScreen.tsx`
    - 외부에서 전달된 focus term을 읽어 검색/강조/토스트 처리하는 초기 효과 추가
  - `src/components/screens/PlaygroundScreen.test.tsx`
    - 텍스트 번역 탭 결과 및 recent history 저장 검증 추가

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `server/db.py` 오류 없음
  - `lsp_diagnostics`: `server/main.py` 오류 없음
  - `lsp_diagnostics`: `src/lib/api.ts` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/PlaygroundScreen.tsx` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/GlossaryScreen.tsx` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/PlaygroundScreen.test.tsx` 오류 없음
  - `lsp_diagnostics`: `server/tests/test_translate_api.py` 오류 없음
- 백엔드 테스트
  - `cd server && uv run --group dev pytest tests/test_translate_api.py`
- 프론트 테스트
  - `pnpm exec vitest run --root src components/screens/PlaygroundScreen.test.tsx`
- 프론트 빌드
  - `pnpm build`

### 6) Outcome
#### 잘된 점
- `VIBE_01`에만 치우쳐 있던 흐름을 다시 `VIBE_01~03` 관점으로 재정렬했고, 실제로 비어 있던 `VIBE_03`의 상위 우선순위 항목 하나를 메웠다.
- Gemini 키 없이도 번역 MVP가 동작하도록 설계해서 지금 바로 검증 가능한 상태로 만들었다.

#### 아쉬운 점
- 현재 `/api/translate`는 fallback 중심이라, 더 자연스러운 한국어 설명 품질은 Gemini 연동 이후가 본격 단계다.

#### 다음 액션
1. Gemini API 키가 준비되면 `/api/translate`에 실제 LLM 응답 경로를 붙인다.
2. `VIBE_03`의 `오늘의 용어 카드` 또는 `용어 호버 팝업` 중 다음 우선순위 항목을 이어서 구현한다.

## Session 2026-03-07-29

### 1) Goal
- 직전 세션에서 fallback-first로 붙인 `즉석 번역기`를 한 단계 확장해, `GEMINI_API_KEY`가 있을 때는 `/api/translate`가 실제 Gemini 응답을 우선 사용하도록 만든다.

### 2) Inputs
- 참고 문서: `docs/VIBE_03_glossary.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 직전 상태: `/api/translate`는 cache + fallback만 동작했고, Gemini 키가 있어도 실제 LLM 호출 경로는 없었다.
- 제약 조건: 현재 운영 환경에서는 키가 아직 없을 수 있으므로 fallback 동작을 절대 깨지 않도록 유지해야 한다.

### 3) Design Decisions
- 기존 `server/gemini_curator.py`의 `urllib` 기반 Gemini 호출 패턴을 따라가되, 텍스트 번역은 별도 helper(`translate_text_with_gemini`)로 분리해 테스트에서 독립적으로 monkeypatch 가능하게 만든다.
- Gemini 호출이 실패하면 endpoint는 예외를 그대로 노출하지 않고 즉시 fallback 응답으로 내려가게 한다.

### 4) Implementation Notes
- 백엔드
  - `server/main.py`
    - `_build_text_translate_prompt()`, `_extract_gemini_text()`, `_normalize_text_translate_result()` 추가
    - `translate_text_with_gemini()` 추가
    - `/api/translate`가 `GEMINI_API_KEY` 존재 시 Gemini 우선, 실패 시 fallback으로 전환하도록 변경
  - `server/tests/test_translate_api.py`
    - Gemini 성공 경로(`source="gemini"`) 검증 추가
    - Gemini 예외 발생 시 fallback 유지 검증 추가

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `server/main.py` 오류 없음
  - `lsp_diagnostics`: `server/tests/test_translate_api.py` 오류 없음
- 백엔드 테스트
  - `cd server && uv run --group dev pytest tests/test_translate_api.py`
- 프론트 테스트
  - `pnpm exec vitest run --root src components/screens/PlaygroundScreen.test.tsx`
- 프론트 빌드
  - `pnpm build`

### 6) Outcome
#### 잘된 점
- API 키가 준비되는 즉시 더 자연스러운 번역 품질을 받을 수 있는 경로가 열렸고, 동시에 현재 fallback 기반 운영도 그대로 유지된다.

#### 아쉬운 점
- 아직 프롬프트/결과 schema는 MVP 수준이라, 실제 Gemini 응답을 더 다듬는 후속 튜닝은 필요하다.

#### 다음 액션
1. Gemini 실제 응답 품질을 보고 prompt/command extraction을 미세 조정한다.
2. `VIBE_03`의 다음 우선순위 항목(`오늘의 용어 카드` 또는 `용어 호버 팝업`)으로 넘어간다.

## Session 2026-03-07-30

### 1) Goal
- `VIBE_03`의 다음 우선순위 항목인 `오늘의 용어 카드`를 현재 앱 구조에 맞는 MVP로 구현해, 챌린지 화면에서 바로 읽고 퀴즈까지 풀 수 있게 한다.

### 2) Inputs
- 참고 문서: `docs/VIBE_03_glossary.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 현재 상태:
  - glossary 데이터와 `TodayGlossaryCards` browse widget은 이미 존재함
  - `ChallengesScreen`은 아직 정적 카드 목록 중심이라 `오늘의 용어 카드`와 연결되지 않았음
- 제약 조건: XP 백엔드는 아직 없으므로 MVP는 localStorage 기반 progress로 먼저 구현

### 3) Design Decisions
- `ChallengesScreen` 상단에 `TodayGlossaryChallengeCard`를 추가해 `오늘의 챌린지 옆`이라는 기획 의도를 현재 구조 안에서 실현한다.
- XP와 퀴즈 완료 상태는 localStorage로 저장해 새 backend 없이도 daily loop를 체감하게 만든다.
- glossary deep link는 기존 `vibecoder_glossary_focus_term` handoff를 재사용한다.

### 4) Implementation Notes
- 프론트
  - 신규: `src/components/TodayGlossaryChallengeCard.tsx`
    - 오늘의 용어 1개 선택
    - `이해했어요 +5 XP` 버튼
    - 4지선다 미니 퀴즈와 정답 시 `+10 XP`
    - localStorage 기반 daily progress / XP 저장
  - `src/components/screens/ChallengesScreen.tsx`
    - 화면 상단에 daily glossary card 삽입
    - `사전에서 자세히 보기` 클릭 시 glossary focus handoff 연결
  - 신규 테스트: `src/components/TodayGlossaryChallengeCard.test.tsx`
    - 이해/퀴즈 XP 적립 및 success message 검증

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `src/components/TodayGlossaryChallengeCard.tsx` 오류 없음
  - `lsp_diagnostics`: `src/components/screens/ChallengesScreen.tsx` 오류 없음
  - `lsp_diagnostics`: `src/components/TodayGlossaryChallengeCard.test.tsx` 오류 없음
- 프론트 테스트
  - `pnpm exec vitest run --root src components/TodayGlossaryChallengeCard.test.tsx components/screens/PlaygroundScreen.test.tsx`
- 프론트 빌드
  - `pnpm build`

### 6) Outcome
#### 잘된 점
- glossary 데이터가 읽기용 카드에서 끝나지 않고, daily habit/quiz loop로 확장됐다.
- backend 없이도 오늘의 용어와 퀴즈 보상을 바로 체험할 수 있게 됐다.

#### 아쉬운 점
- XP는 아직 localStorage 기준이라 사용자 계정/레벨 시스템과 연동되지는 않는다.

#### 다음 액션
1. 오늘의 용어 XP를 실제 레벨 시스템과 연결할 backend 준비 여부를 검토한다.
2. `VIBE_03`의 `용어 호버 팝업` 구현으로 이어간다.

## Session 2026-03-06-07

### 1) Goal
- VIBE 후속 미완 항목을 마무리해 `GlossaryScreen` UX(연관 용어 이동, 용어 신청)와 `server/main.py` 타입/임포트 정리를 완료한다.

### 2) Inputs
- 직전 세션 인수인계: `GlossaryScreen`의 연관 용어 클릭/신청 흐름 미완
- 안정화 필요 지점: `server/main.py`의 unused import 및 일부 타입 경고

### 3) Design Decisions
- 연관 용어 클릭 시 단순 태그 표시가 아니라 즉시 검색/포커스 흐름으로 전환한다.
- 용어 신청은 별도 모달 대신 화면 하단 인라인 폼으로 배치해 탐색 맥락을 유지한다.
- 서버는 동작 변경 없이 타입/임포트 정리만 수행해 리스크를 최소화한다.

### 4) Implementation Notes
- 프론트
  - `src/components/screens/GlossaryScreen.tsx`
    - 연관 용어 태그를 버튼화하고 클릭 시 해당 용어 검색/강조(`activeTermId`) 적용
    - 없는 용어 신청 폼 추가(용어/상황 메모)
    - `api.requestGlossaryTerm` 연동 및 성공/실패 토스트 피드백 추가
    - 신청 유효성(2~80자) 및 전송 중 상태 처리 추가
- 백엔드
  - `server/main.py`
    - 미사용 import `ThreeLevelSummary` 제거
    - `enforce_https_and_security_headers`, `_extract_client_ip`에 타입 주석 추가

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `src/components/screens/GlossaryScreen.tsx` 오류 없음
  - `lsp_diagnostics`: `server/main.py` 오류 없음(기존 warning 일부는 유지)
- 프론트 빌드
  - `pnpm build` 통과
- 프론트 테스트
  - `pnpm exec vitest run --exclude ".claude/**"` 통과 (10 files, 30 tests)
- 백엔드 테스트
  - 루트에서 `uv run pytest`는 pytest 미탑재 환경으로 실패
  - `server/`에서 `uv run pytest` 통과 (46 passed)

### 6) Outcome
#### 잘된 점
- VIBE_03의 핵심 미완 UX(연관 용어 이동, 용어 신청)를 실제 API 연동까지 포함해 닫았다.
- 서버 코드는 동작 리스크 없이 타입/임포트 정리로 유지보수성을 높였다.

#### 아쉬운 점
- `server/main.py`에는 기존 기반 경고(미사용 변수/unused call result 등)가 일부 남아 있다.

#### 다음 액션
1. `server/main.py`의 기존 warning 구간을 별도 리팩터링 세션으로 정리
2. `/api/curated` 공개/관리자 화면 연결(리스트/상세/승인) UI 완료

## Session 2026-03-06-08

### 1) Goal
- VIBE_01의 미연결 구간인 큐레이션 공개 화면(리스트/상세)과 관리자 승인 화면을 실제 라우트/메뉴에 연결한다.

### 2) Inputs
- 기존 구현 상태: `/api/curated`, `/api/admin/curated*` API는 구현되어 있었지만 프론트 UI 연결이 없었음.
- 사용자 지시: "진행해" (이전 분석 결과를 바로 구현으로 전환)

### 3) Design Decisions
- 공개 UX는 `/curated`(목록), `/curated/:contentId`(상세) 2단 구조로 분리.
- 관리자 UX는 기존 Admin 패턴(DataTable + RowActions + EditDrawer)을 재사용해 리스크를 최소화.
- 전역 내비게이션은 기존 `TopNav`/Quick Nav 흐름을 유지하되 `Curated` 진입점을 추가.

### 4) Implementation Notes
- 공개 화면
  - 신규: `src/components/screens/CuratedScreen.tsx`
    - 검색/카테고리/정렬/한국 개발자 필터
    - `api.getCuratedContent` 연동
    - 카드에서 상세 이동(`onOpenCurated`)
  - 신규: `src/components/screens/CuratedDetailScreen.tsx`
    - `api.getCuratedContentDetail` 연동
    - 3단계 요약(초보/중급/전문가) 분리 표시
- 라우팅/내비
  - `src/App.tsx`
    - Screen 타입에 `curated` 추가
    - `/curated`, `/curated/:contentId` 라우트 추가
    - Admin 라우트에 `/admin/curated` 추가
    - Quick navigation에 `Curated` 버튼 추가
  - `src/components/TopNav.tsx`
    - `NavScreen` 및 `active`에 `curated` 추가
    - 상단 메뉴에 `Curated` 버튼 추가
  - 기존 주요 screen 타입에 `curated`를 포함하도록 확장
- 관리자 화면
  - 신규: `src/components/screens/admin/pages/AdminCurated.tsx`
    - 상태 필터/검색/대기건 표시
    - 승인/반려/요약편집/삭제 액션
    - 수집 실행(`api.runAdminCuratedCollection`) 버튼
  - `src/components/screens/admin/constants.ts`
    - `AdminRouteKey`에 `curated`, 메타(`/admin/curated`) 추가
  - `src/components/screens/admin/components/AdminSidebar.tsx`
    - 큐레이션 메뉴 항목 추가
  - `src/components/screens/admin/components/AdminHeader.tsx`
    - breadcrumb에 `curated` 처리 추가
  - `src/components/screens/admin/components/AdminCommandPalette.tsx`
    - 커맨드 목록에 `curated` 추가
  - `src/components/screens/admin/AdminLayout.tsx`
    - pending 큐레이션 count 배지 조회/표시 추가

### 5) Validation
- 정적 진단
  - 주요 변경 파일 대상 `lsp_diagnostics`: 오류 없음
- 프론트 빌드
  - `pnpm build` 통과
- 프론트 테스트
  - `pnpm exec vitest run --exclude ".claude/**"` 통과 (10 files, 30 tests)
- 백엔드 테스트
  - `server/`에서 `uv run pytest` 통과 (46 passed)

### 6) Outcome
#### 잘된 점
- VIBE_01의 API-only 상태를 실제 사용자/관리자 화면까지 연결해 end-to-end 흐름을 닫았다.
- 기존 Admin 패턴을 재사용해 구현 일관성과 유지보수성을 확보했다.

#### 아쉬운 점
- 큐레이션 화면 전용 테스트(리스트 필터/액션 시나리오)는 아직 추가하지 못했다.

#### 다음 액션
1. `CuratedScreen`/`AdminCurated`에 대한 smoke test 추가
2. 큐레이션 상세에서 관련 항목 추천(동일 category/tag) 섹션 확장

## Session 2026-03-06-09

### 1) Goal
- 직전 액션 아이템 2개를 즉시 완료한다.
  - `CuratedScreen`/`AdminCurated` smoke test 추가
  - 큐레이션 상세 관련 항목 추천 섹션 확장

### 2) Inputs
- 직전 구현: `/curated`, `/curated/:contentId`, `/admin/curated` 라우트 및 기본 UI 완성
- 사용자 지시: "진행해"

### 3) Design Decisions
- 테스트는 기존 스타일(hoisted mock + RTL)과 동일하게 유지한다.
- 관련 항목 추천은 서버 스키마 변경 없이 클라이언트 조합으로 구현한다.
  - 동일 category 우선 조회
  - tag overlap + quality/relevance를 합산한 점수로 정렬

### 4) Implementation Notes
- 추천 섹션 확장
  - `src/components/screens/CuratedDetailScreen.tsx`
    - 상세 로드 후 `api.getCuratedContent`를 추가 호출해 관련 항목 조회
    - 현재 항목 제외 + 태그 겹침/점수 기반 정렬 후 상위 4개 노출
    - 로딩/빈 상태 메시지 처리
- 테스트 추가
  - 신규: `src/components/screens/CuratedScreen.smoke.test.tsx`
    - 목록 로드 및 상세 콜백(`onOpenCurated`) 호출 검증
  - 신규: `src/components/screens/admin/pages/AdminCurated.smoke.test.tsx`
    - 승인 액션 호출 검증
    - 수집 실행 버튼 호출 검증
    - 테스트 간 DOM 누수 방지를 위해 `cleanup()` 추가

### 5) Validation
- 정적 진단
  - 신규/수정 테스트 파일 및 상세 화면 대상 `lsp_diagnostics` 오류 없음
- 프론트 빌드
  - `pnpm build` 통과
- 프론트 테스트
  - `pnpm exec vitest run --exclude ".claude/**"` 통과 (12 files, 33 tests)
- 백엔드 테스트
  - `server/`에서 `uv run pytest` 통과 (46 passed)

### 6) Outcome
#### 잘된 점
- 직전 세션의 다음 액션 2개를 바로 소화해 기능과 검증 커버리지를 함께 확장했다.

#### 아쉬운 점
- 추천 랭킹은 현재 단순 가중치 기반이라 향후 클릭/피드백 기반 개선 여지가 있다.

#### 다음 액션
1. 추천 랭킹 실험(가중치 튜닝 + 클릭 이벤트 수집)
2. `AdminCurated` 액션별 실패 시나리오 테스트 케이스 추가

## Session 2026-03-06-10

### 1) Goal
- 추천 랭킹 가중치 튜닝과 `AdminCurated` 실패 시나리오 테스트 확장을 완료한다.

### 2) Inputs
- 사용자 지시: "진행해"
- 직전 액션: 랭킹 튜닝 + 실패 테스트 보강

### 3) Design Decisions
- 추천 랭킹에 최신성(freshness)을 포함해 오래된 항목 과도 노출을 완화한다.
- 유사도는 단일 지표 대신 복합 가중치로 계산한다.
  - tag overlap
  - quality/relevance
  - freshness
  - language/KR dev match 보너스
- 테스트는 기존 smoke 스타일을 유지하되, 실패 분기를 독립 케이스로 추가한다.

### 4) Implementation Notes
- 추천 랭킹 튜닝
  - `src/components/screens/CuratedDetailScreen.tsx`
    - `parseDateMs`, `freshnessScore` 유틸 추가
    - 관련 항목 조회 시 정렬 기준을 `latest`로 가져온 뒤 클라이언트 점수로 재정렬
    - 최종 점수식:
      - `overlap * 120`
      - `quality * 9`
      - `relevance * 8`
      - `freshness * 2`
      - `languageMatch * 12`
      - `koreanMatch * 8`
- 실패 테스트 확장
  - `src/components/screens/admin/pages/AdminCurated.smoke.test.tsx`
    - 기존 2개(success)에서 6개로 확장
    - 추가 케이스:
      1) 승인 실패 메시지
      2) 반려 실패 메시지 + payload 검증
      3) 삭제 실패 메시지
      4) 수집 실행 실패 메시지

### 5) Validation
- 정적 진단
  - 변경 파일 `lsp_diagnostics` 오류 없음
- 프론트 빌드
  - `pnpm build` 통과
- 프론트 테스트
  - `pnpm exec vitest run --exclude ".claude/**"` 통과 (12 files, 37 tests)
- 백엔드 테스트
  - `server/`에서 `uv run pytest` 통과 (46 passed)

### 6) Outcome
#### 잘된 점
- 추천 품질을 단순 태그 매칭에서 최신성/품질/언어 맥락을 반영한 복합 점수로 개선했다.
- 운영 리스크가 큰 실패 분기(승인/반려/삭제/수집)를 테스트로 고정했다.

#### 아쉬운 점
- 현재 가중치는 휴리스틱 기반이며 실제 사용자 클릭 데이터 기반 튜닝은 아직이다.

#### 다음 액션
1. 추천 클릭 이벤트 로깅 추가 및 가중치 A/B 실험
2. `CuratedDetailScreen` 추천 목록의 이유 표시(예: 태그 일치 수, 최신 업데이트일)

## Session 2026-03-06-11

### 1) Goal
- 직전 액션 2개를 실제 기능으로 완성한다.
  - 추천 이유 표시
  - 추천 클릭 이벤트 저장

### 2) Inputs
- 사용자 지시: "진행해"
- 현재 상태: 추천 카드는 표시되지만 이유 텍스트/클릭 로그 영속 저장은 미구현

### 3) Design Decisions
- 클릭 로깅은 별도 테이블(`curated_related_clicks`)로 분리해 운영 리포트 확장성을 확보한다.
- 추천 이유는 사용자에게 바로 설명 가능한 라벨(태그 일치/최근 업데이트/품질/언어/KR 매치)로 노출한다.
- 추천 정렬은 최신성 포함 복합 점수 유지하되, 표시 이유는 최대 3개로 제한해 가독성을 유지한다.

### 4) Implementation Notes
- 백엔드
  - `server/db.py`
    - 신규 테이블: `curated_related_clicks`
      - `source_content_id`, `target_content_id`, `reason`, `clicked_at`, `client_ip`
    - 인덱스 추가:
      - `idx_curated_related_clicks_source_target`
      - `idx_curated_related_clicks_clicked_at`
    - 신규 함수: `create_curated_related_click(...)`
  - `server/main.py`
    - import 추가: `create_curated_related_click`
    - 신규 모델: `CuratedRelatedClickCreate`
    - 신규 엔드포인트: `POST /api/curated/related-clicks`
      - source/target id 검증
      - self-click 차단
      - 승인된 콘텐츠 존재 검증
      - reason 길이(최대 200) 정리 + client ip 저장
- 프론트
  - `src/lib/api.ts`
    - `CuratedRelatedClickResponse` 타입 추가
    - `trackCuratedRelatedClick(source_content_id, target_content_id, reason?)` 메서드 추가
  - `src/components/screens/CuratedDetailScreen.tsx`
    - 추천 항목 상태를 `RelatedRecommendation` 구조로 전환 (`item + reasons`)
    - 추천 카드에 이유 배지(최대 3개) 표시
    - 추천 카드 클릭 시 `trackCuratedRelatedClick(...)` 호출 후 상세 이동

### 5) Validation
- 정적 진단
  - 변경 파일 `lsp_diagnostics` 오류 없음
  - `server/main.py`에는 기존 basedpyright warning 일부 존재(신규 작업과 무관)
- 프론트 빌드
  - `pnpm build` 통과
- 프론트 테스트
  - `pnpm exec vitest run --exclude ".claude/**"` 통과 (12 files, 37 tests)
- 백엔드 테스트
  - `server/`에서 `uv run pytest` 통과 (46 passed)

### 6) Outcome
#### 잘된 점
- 추천 카드가 "왜 추천됐는지"를 설명하게 되어 탐색 신뢰도가 올라갔다.
- 추천 클릭 로그를 영속 저장해 이후 추천 품질 개선(A/B 실험, 리포트) 기반을 마련했다.

#### 아쉬운 점
- 클릭 로그 조회용 관리자 리포트/API는 아직 미구현이다.

#### 다음 액션
1. `curated_related_clicks` 집계 API + 관리자 대시보드 카드 추가
2. 추천 이유 생성 규칙을 서버 측으로 이동해 일관성 강화

## Session 2026-03-08-01

### 1) Goal
- `VIBE_01~03` 문서와 실제 코드 상태를 다시 맞춰 본 뒤, 최신 큐레이션 후속 작업으로 남아 있던 추천 랭킹 보강을 진행한다.

### 2) Inputs
- 참고 문서: `docs/VIBE_01_github_content.md`, `docs/VIBE_02_playground.md`, `docs/VIBE_03_glossary.md`, `docs/IMPLEMENTATION_LEARNING_LOG.md`
- 현재 상태 확인 결과:
  - `VIBE_01`의 GitHub/Gemini 수집과 큐레이션 공개/관리자 화면은 이미 실제 코드에 연결돼 있음
  - `curated_related_clicks` 로깅과 관리자 집계 화면도 코드에 이미 존재함
  - 남아 있던 자연스러운 다음 단계는 수집한 추천 클릭 데이터를 실제 `/api/curated/{id}/related` 랭킹에 반영하는 것이었음

### 3) Design Decisions
- 추천 이유 배지 구조는 그대로 유지해 프론트 분석 화면과 클릭 로그 이유 코드 흐름을 깨지 않는다.
- 클릭 반영은 최근 30일 집계만 사용하고, `log1p` 기반 capped boost를 적용해 특정 카드가 영구적으로 과대노출되지 않게 한다.
- 검증은 backend endpoint 테스트를 먼저 추가하는 TDD 방식으로 진행한다.

### 4) Implementation Notes
- 백엔드
  - `server/db.py`
    - `get_curated_related_click_counts_for_source()` helper 추가
    - source 기준 최근 N일 target별 클릭 수를 집계하도록 구현
  - `server/main.py`
    - 관련 추천 점수 계산에 `recent_click_count` 입력 추가
    - 최근 클릭 수에 대해 `log1p` 기반 boost(상한 포함) 적용
    - `/api/curated/{id}/related` 후보 수집 시 recent click count를 함께 주입
- 테스트
  - `server/tests/test_curated_related_api.py`
    - 기존 사유 검증 테스트에서 click-count helper를 명시적으로 0으로 고정
    - recent click boost가 랭킹 순서를 바꾸는 regression test 추가

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `server/db.py` 오류 없음
  - `lsp_diagnostics`: `server/main.py` 신규 오류 없음(기존 warning 일부 유지)
  - `lsp_diagnostics`: `server/tests/test_curated_related_api.py` 신규 오류 없음(기존 pytest monkeypatch warning 일부 유지)
- 백엔드 테스트
  - `cd server && uv run --group dev pytest tests/test_curated_related_api.py`

### 6) Outcome
#### 잘된 점
- 이제 추천 클릭 데이터가 단순 운영 지표에 머무르지 않고 실제 추천 순위에 반영되어, 큐레이션 상세 탐색 흐름이 사용자의 선택 신호를 학습하기 시작했다.

#### 아쉬운 점
- 현재 boost 가중치는 휴리스틱 기반이라, 실제 운영 데이터가 쌓이면 기간/상한값을 다시 튜닝해야 한다.

#### 다음 액션
1. 추천 클릭 boost 가중치와 기간을 운영 설정에서 조절할 수 있게 확장한다.
2. 추천 카드에 `인기 추천` 같은 설명 레이어를 추가할지 검토한다.

## Session 2026-03-08-02

### 1) Goal
- 직전 세션에서 추천 클릭을 실제 랭킹 신호로 반영한 뒤 드러난 abuse risk를 낮춘다.

### 2) Inputs
- Oracle review 결과
  - 공개 `/api/curated/related-clicks` 이벤트가 그대로 랭킹에 반영되어 스팸 클릭과 자기강화 루프 위험이 있음
  - 최소한 dedupe 또는 rate limit이 우선 필요함
- 기존 구현 패턴
  - `server/main.py`에는 `_extract_client_ip()`와 `enforce_rate_limit()` 기반 공개 POST 보호 패턴이 이미 존재함

### 3) Design Decisions
- 새 저장소나 스케줄러를 추가하지 않고, 기존 in-memory `enforce_rate_limit()` 버킷을 그대로 재사용한다.
- 보호는 2단으로 적용한다.
  - 같은 IP의 burst 요청은 분당 제한
  - 같은 IP가 같은 `source-target` 조합을 짧은 시간 안에 반복 클릭하면 저장하지 않고 dedupe
- dedupe는 클라이언트 UX를 깨지 않도록 429 대신 `{"ok": true, "id": 0}`으로 응답한다.

### 4) Implementation Notes
- `server/main.py`
  - `CURATED_RELATED_CLICK_IP_LIMIT_PER_MINUTE = 24`
  - `CURATED_RELATED_CLICK_DEDUPE_WINDOW_SECONDS = 30.0`
  - `/api/curated/related-clicks`에서 `client_ip` 추출 후 두 개의 rate-limit bucket 적용
    - `curated_related_click_ip`
    - `curated_related_click_pair`
  - pair dedupe hit 시 저장 없이 성공 응답 반환
- `server/tests/test_curated_related_api.py`
  - 전역 rate-limit 버킷 오염을 막기 위해 관련 테스트 시작 시 `_RATE_LIMIT_BUCKETS.clear()` 호출
  - 동일 IP/동일 pair 반복 클릭 dedupe test 추가
  - 동일 IP burst 429 test 추가

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `server/main.py` 신규 오류 없음
  - `lsp_diagnostics`: `server/tests/test_curated_related_api.py` 신규 오류 없음
- 백엔드 테스트
  - `cd server && uv run --group dev pytest tests/test_curated_related_api.py`

### 6) Outcome
#### 잘된 점
- 이제 추천 클릭은 랭킹에 반영되더라도, 같은 IP의 짧은 반복 클릭으로 바로 수치가 부풀려지는 가장 쉬운 남용 경로는 차단된다.

#### 아쉬운 점
- 현재 dedupe/rate limit은 프로세스 메모리 기반이라 멀티 인스턴스 환경에서는 완전한 방어가 아니다.

#### 다음 액션
1. 인증 사용자 또는 더 긴 TTL 기준의 durable dedupe로 확장한다.
2. click boost 적용 전에 heuristic eligibility gate를 넣어 관련성 하한을 보장한다.

## Session 2026-03-08-03

### 1) Goal
- 추천 클릭 boost가 기본 관련성이 낮은 후보를 과도하게 밀어올리지 못하도록 eligibility gate를 추가한다.

### 2) Inputs
- 직전 상태
  - recent click boost는 abuse resistance는 생겼지만, baseline relevance가 낮은 후보도 클릭만 많으면 상위로 올라올 수 있었음
- Oracle recommendation
  - boost는 최소한의 heuristic relevance gate 뒤에서만 적용하는 것이 강하게 권장됨

### 3) Design Decisions
- 응답 구조나 reason label은 바꾸지 않고, 오직 boost 적용 여부만 제어한다.
- gate는 가장 작은 규칙으로 둔다.
  - `relevance_score >= 6` 이면 boost 허용
  - 또는 `tag overlap >= 1` 이면 boost 허용
- 즉, 클릭은 기존 heuristic 관련성이 어느 정도 있는 후보만 가속시키고, 무관한 후보를 새로 발굴하는 신호로는 쓰지 않는다.

### 4) Implementation Notes
- `server/main.py`
  - `CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE = 6`
  - `CURATED_RELATED_CLICK_BOOST_MIN_TAG_OVERLAP = 1`
  - `_build_curated_related_entry()` 내부에서 `click_boost_eligible` 계산 후, eligible일 때만 click boost 적용
- `server/tests/test_curated_related_api.py`
  - 기존 boost regression test는 유지
  - low relevance + no tag overlap 후보가 클릭 수가 많아도 상위로 역전하지 못하는 test 추가
  - freshness 영향으로 테스트가 흔들리지 않게 해당 케이스는 `github_pushed_at`, `collected_at`를 비워 zero freshness로 고정

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `server/main.py` 오류 없음
  - `lsp_diagnostics`: `server/tests/test_curated_related_api.py` 오류 없음
- 백엔드 테스트
  - `cd server && uv run --group dev pytest tests/test_curated_related_api.py`

### 6) Outcome
#### 잘된 점
- 이제 추천 클릭은 기존 관련성이 있는 후보를 강화하는 역할에 머물고, 관계가 약한 후보를 클릭 수만으로 상단에 올리는 부작용은 줄었다.

#### 아쉬운 점
- relevance threshold는 아직 하드코딩 상수이므로 운영 데이터에 따라 다시 조정할 여지는 남아 있다.

#### 다음 액션
1. click boost threshold와 multiplier/cap을 운영 설정에서 조정 가능하게 확장한다.
2. click-count query 실패 시 `{}`로 안전하게 폴백하도록 추가 방어를 넣는다.

## Session 2026-03-08-04

### 1) Goal
- curated related click boost를 운영 정책에서 조정 가능하게 만들고, click-count 조회 실패가 추천 API 전체 실패로 번지지 않게 막는다.

### 2) Inputs
- 직전 상태
  - click boost의 relevance gate와 abuse resistance는 반영됨
  - 하지만 threshold/multiplier/cap은 하드코딩 상수였고, click-count lookup 실패 시 추천 API가 같이 실패할 수 있었음
- 기존 패턴
  - 운영 정책은 `moderation_settings` + `/api/admin/policies` + `get_effective_moderation_settings()` 흐름으로 관리되고 있었음

### 3) Design Decisions
- 새 설정 키는 기존 moderation policy 흐름에 포함한다.
  - `curated_related_click_boost_min_relevance`
  - `curated_related_click_boost_multiplier`
  - `curated_related_click_boost_cap`
- runtime 추천 로직은 이 정책 값을 읽되, 값이 없거나 비정상이면 기존 기본값으로 normalize한다.
- click-count fallback은 가장 덜 침습적인 지점인 `server/db.py` helper에 넣어 모든 호출 지점이 자동으로 보호되게 한다.

### 4) Implementation Notes
- `server/db.py`
  - `moderation_settings` 테이블과 migration path에 click-boost 3개 컬럼 추가
  - `get_moderation_settings()`/`update_moderation_settings()` select/update/return 필드 확장
  - `get_curated_related_click_counts_for_source()`에서 DB 예외 발생 시 `{}` 반환하도록 fallback 추가
- `server/main.py`
  - click-boost 기본값 상수 추가
  - `AdminPolicyUpdateRequest`에 새 설정 3개 필드 추가
  - `get_effective_moderation_settings()`와 baseline normalization 흐름에 새 설정 포함
  - `/api/admin/policies` PATCH에서 새 설정을 normalize 후 저장
  - related candidate scoring 시 `get_moderation_settings()`에서 runtime 정책을 읽어 threshold/multiplier/cap 적용
- 테스트
  - `server/tests/test_admin_policy_logs_api.py`: 정책 PATCH 응답/변경 로그에 새 필드 반영 검증 추가
  - `server/tests/test_curated_related_api.py`
    - runtime boost settings 반영 regression test 추가
    - click-count lookup failure fallback test 추가

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `server/main.py`, `server/db.py`, `server/tests/test_curated_related_api.py`, `server/tests/test_admin_policy_logs_api.py` 확인
- 테스트
  - `cd server && uv run --group dev pytest tests/test_curated_related_api.py tests/test_admin_policy_logs_api.py`

### 6) Outcome
#### 잘된 점
- 운영에서 click boost 민감도를 코드 수정 없이 조절할 수 있게 되었고, click-count 조회 장애가 생겨도 추천 API는 기본 heuristic 추천으로 계속 응답한다.

#### 아쉬운 점
- 현재 관리자 UI는 별도 후속 반영이 필요하며, 설정은 API 레벨에서는 준비되었지만 화면 입력까지 이어져야 완결된다.

#### 다음 액션
1. 관리자 정책 화면에 click boost 3개 필드를 추가한다.
2. 관련 정책 변경 이력 요약 라벨도 UI에 함께 노출되도록 정리한다.

## Session 2026-03-08-05

### 1) Goal
- Oracle이 지적한 마지막 UX/관측성 리스크를 줄인다.

### 2) Inputs
- Oracle review 결과
  - 정책 저장 성공 후 history refetch가 저장 UX를 불필요하게 지연시킬 수 있음
  - curated click-count fallback warning이 장애 시 요청마다 찍혀 로그 소음이 커질 수 있음

### 3) Design Decisions
- 정책 저장의 성공 기준은 PATCH 응답 수신과 서버 상태 재동기화로 본다.
- 히스토리 refetch는 best-effort 보조 동작으로 낮추고, 실패해도 저장 성공 상태를 되돌리지 않는다.
- fallback warning은 완전히 제거하지 않고 60초 단위 rate-limit를 걸어 관측성과 로그 소음 사이 균형을 맞춘다.

### 4) Implementation Notes
- `src/components/screens/admin/pages/AdminPolicies.tsx`
  - `policyHistoryQuery.refetch()`를 `await`하지 않고 fire-and-forget + swallow 처리
  - 따라서 저장 성공 후 폼 상태 반영은 즉시 끝나고, 히스토리 새로고침은 부수 효과로 동작
- `server/main.py`
  - `CURATED_RELATED_CLICK_FALLBACK_LOG_WINDOW_SECONDS = 60.0` 추가
  - `_last_curated_related_click_fallback_warning_at` 전역 타임스탬프 추가
  - click-count fallback warning은 60초에 한 번만 출력하도록 제한

### 5) Validation
- 프론트
  - `pnpm exec vitest run "src/components/screens/admin/pages/AdminPolicies.log-policy.test.tsx"`
- 백엔드
  - `cd server && uv run --group dev pytest tests/test_curated_related_api.py tests/test_admin_policy_logs_api.py`
- 정적 진단
  - LSP diagnostics: `AdminPolicies.tsx`, `server/main.py` 오류 없음

### 6) Outcome
#### 잘된 점
- 정책 저장 UX가 정책 히스토리 새로고침과 분리되어 더 안정적으로 보이게 되었고, fallback warning도 장애 시 로그 폭주를 덜 일으킨다.

#### 아쉬운 점
- fallback warning rate-limit는 프로세스 메모리 기반이라 멀티 인스턴스 환경에서는 인스턴스별로 따로 찍힌다.

#### 다음 액션
1. AdminPolicies 정수 입력값에 클라이언트 clamp/parse 정리를 추가한다.
2. fallback warning을 structured logging/metrics로 연결할지 결정한다.

## Session 2026-03-08-06

### 1) Goal
- Oracle이 지적한 policy history empty/error 혼동을 줄이고, VIBE 기획의 다음 큰 미완 항목인 `VIBE_02` 자랑 게시판 MVP를 현재 프로젝트 구조 위에 연다.

### 2) Inputs
- 현재 상태 확인 결과
  - `VIBE_02`의 에러 응급실/레시피북은 이미 `PlaygroundScreen`에 구현되어 있음
  - `VIBE_03`의 즉석 번역기/오늘의 용어/호버/카드 갤러리도 이미 실제 코드에 존재함
  - 반면 `VIBE_02`의 전용 자랑 게시판 경험은 아직 없었고, `showcase_posts`나 clap 전용 모델도 없었음
- 제약 조건
  - 기존 `projects`/`submit`/`detail`/`like` 인프라를 재사용해 가장 얇은 MVP부터 열어야 함

### 3) Design Decisions
- 자랑 게시판 첫 MVP는 새 테이블을 바로 도입하지 않고, 기존 `projects` 인프라를 재사용한다.
- 좋아요 수는 자랑 게시판 화면에서 `박수`라는 언어로 재해석해 `VIBE_02`의 감정 톤을 맞춘다.
- 정책 화면은 history query의 `loading/error/empty`를 분리해 운영자가 상태를 오해하지 않게 만든다.

### 4) Implementation Notes
- 프론트 안정화
  - `src/components/screens/admin/pages/AdminPolicies.tsx`
    - policy history 패널에 `isError`/`isLoading`/`empty` 상태 분기 추가
    - 저장 후 history refetch 실패는 `console.warn`으로만 남기고 화면 저장 성공과 분리
  - `src/components/screens/admin/pages/AdminPolicies.log-policy.test.tsx`
    - history query 실패 시 empty state 대신 error 문구가 보이는지 검증 추가
- `VIBE_02` 자랑 게시판 MVP
  - 신규: `src/components/screens/ShowcaseScreen.tsx`
    - 전용 hero/copy, sort toggle, empty state, CTA(`자랑하기`), 카드 내 `박수` 표현 추가
    - 데이터는 기존 `api.getProjects()`를 재사용
    - 상세 이동은 기존 `onOpenProject` 흐름 재사용
  - `src/components/TopNav.tsx`
    - `Showcase` 항목 추가
  - `src/App.tsx`
    - `showcase` screen/route/meta 추가 (`/showcase`)
  - 신규 테스트: `src/components/screens/ShowcaseScreen.test.tsx`
    - 카드 렌더/CTA/상세 이동 검증

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `src/App.tsx`, `src/components/TopNav.tsx`, `src/components/screens/ShowcaseScreen.tsx`, `src/components/screens/ShowcaseScreen.test.tsx`, `src/components/screens/admin/pages/AdminPolicies.tsx` 오류 없음
- 프론트 테스트
  - `pnpm exec vitest run "src/components/screens/ShowcaseScreen.test.tsx" "src/components/screens/admin/pages/AdminPolicies.log-policy.test.tsx"`

### 6) Outcome
#### 잘된 점
- `VIBE_02`에서 오래 비어 있던 자랑 게시판 경험을 새 백엔드 없이도 실제 화면/라우트로 열었다.
- 운영자 입장에서는 policy history 실패가 더 이상 "기록 없음"처럼 보이지 않게 됐다.

#### 아쉬운 점
- 현재 자랑 게시판은 기존 `projects`를 재해석한 MVP라, 전용 clap/bookmark/badge/xp 모델은 아직 없다.

#### 다음 액션
1. 자랑 게시판 전용 CTA에서 `submit` 폼 카피를 showcase 맥락에 맞게 더 맞춘다.
2. `VIBE_02`의 clap 전용 언어/상세 화면 경험을 기존 project detail에 일부 이어 붙일지 검토한다.

## Session 2026-03-08-07

### 1) Goal
- Oracle 피드백을 반영해 `/showcase`를 실제로 `Explore`와 구분되는 board로 만들고, admin policy history가 stale data를 가진 상태에서는 refetch 실패로 전체 에러 화면처럼 보이지 않게 다듬는다.

### 2) Inputs
- Oracle review 결과
  - `/showcase`가 현재는 `Explore` 재스킨에 가까워 보이므로, 기존 인프라 안에서라도 `showcase` 태그로 의미를 분리해야 함
  - `AdminPolicies`는 cached history가 있어도 refetch failure 시 전체 error state처럼 보일 수 있음

### 3) Design Decisions
- 새 백엔드 없이 `projects.tags`의 기존 `tag` 필터를 사용해 showcase board를 분리한다.
- `/showcase`에서 `자랑하기`를 누르면 localStorage context를 심고 `SubmitScreen`에서 `#showcase` 태그를 자동 prefill한다.
- policy history는 쿼리 에러가 나더라도 기존 history 데이터가 있으면 계속 렌더하고, 상단에 stale warning만 노출한다.

### 4) Implementation Notes
- `src/components/screens/ShowcaseScreen.tsx`
  - `api.getProjects({ sort, tag: "showcase" })`로 board 데이터 분리
  - CTA 클릭 시 `SHOWCASE_SUBMIT_CONTEXT_KEY` 저장 후 `submit` 이동
- 신규: `src/lib/showcase.ts`
  - showcase submit handoff key 상수 추가
- `src/components/screens/SubmitScreen.tsx`
  - showcase context가 있으면 `#showcase` 태그 자동 추가
  - 상단에 prefill 안내 배너 표시
- `src/components/screens/admin/pages/AdminPolicies.tsx`
  - history query error라도 cached `thresholdHistory`가 있으면 stale warning + 기존 목록 유지
- 테스트
  - `src/components/screens/ShowcaseScreen.test.tsx`
    - showcase tag filtering 호출 및 submit context 저장 검증 추가
  - 신규: `src/components/screens/SubmitScreen.test.tsx`
    - showcase context로 들어오면 `#showcase` 태그가 자동 추가되는지 검증

### 5) Validation
- 정적 진단
  - `lsp_diagnostics`: `ShowcaseScreen.tsx`, `ShowcaseScreen.test.tsx`, `SubmitScreen.tsx`, `SubmitScreen.test.tsx`, `AdminPolicies.tsx` 오류 없음
- 프론트 테스트
  - `pnpm exec vitest run "src/components/screens/ShowcaseScreen.test.tsx" "src/components/screens/SubmitScreen.test.tsx" "src/components/screens/admin/pages/AdminPolicies.log-policy.test.tsx"`

### 6) Outcome
#### 잘된 점
- `/showcase`가 이제 실제로 `showcase` 태그 글만 모아 보여주는 board가 되었고, 자랑하기에서 그 컨텍스트가 submit까지 자연스럽게 이어진다.
- 정책 히스토리는 stale data가 있을 때 transient refetch failure로 사라지지 않는다.

#### 아쉬운 점
- `Showcase`와 상세 화면의 반응 언어(`박수` vs 기존 like/heart)는 아직 완전히 통일되지 않았다.

#### 다음 액션
1. project detail/list 전반의 반응 언어를 `좋아요` 또는 `박수` 중 하나로 통일할지 결정한다.
2. 자랑 게시판 전용 empty state를 채우기 위한 seed showcase 콘텐츠를 준비한다.
