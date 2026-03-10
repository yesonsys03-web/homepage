# 바이브 용어사전 자동 수집/검수 기술 설계서 (VIBE_08)

> 역할: `VIBE_05`의 전략 방향을 서버/DB/운영 플로우로 구체화하는 기술 문서
> 범위: glossary term 자동 초안 생성, 저장, 검수, 노출 제어

---

## 1. 목표

정적 glossary를 한 번에 버리지 않고,
LLM이 매일 새 명령어/용어 초안을 수집해 운영자가 검수할 수 있는 구조를 만든다.

이 문서의 핵심은 세 가지다.

1. 어떤 데이터를 저장할지
2. 어떤 기준으로 초안을 거를지
3. 어떤 흐름으로 `pending -> active`가 되는지

---

## 2. 현재 기준점

현재 확인된 기반:
- 스케줄 루프 패턴 존재: `server/scheduler.py`
- 앱 시작 시 반복 작업 연결 패턴 존재: `server/main.py`
- Gemini 호출 패턴 존재: `server/gemini_curator.py`
- glossary 요청 적재 API 존재: `server/translation_routes.py`, `server/db.py`

현재 없는 것:
- 사용자용 DB-backed glossary terms 소스
- glossary term 승인/반려 관리자 플로우
- 자동 생성 term dedupe 정책의 명시적 구현

---

## 3. 권장 아키텍처

### 3-1. 원칙

- 초기에는 정적 glossary와 DB glossary를 병행한다.
- 자동 생성 결과는 항상 별도 저장소에 먼저 적재한다.
- 사용자 노출은 `active` 상태만 허용한다.

### 3-2. 상위 흐름

```text
Scheduler
  -> Generate 3 draft terms with Gemini
  -> Validate structure/safety/dedupe
  -> Save as pending
  -> Admin review
  -> Mark active or rejected
  -> Frontend reads active terms only
```

---

## 4. 구현 전 고정 계약

이 섹션은 프론트/백엔드가 따로 구현돼도 깨지지 않도록 먼저 고정하는 계약이다.

### 4-1. command slug 계약

- glossary와 launchpad를 잇는 기본 키는 `slug`다.
- `slug`는 소문자 kebab-case를 기본으로 한다.
- 공백은 `-`로 치환한다.
- 점(`.`)은 유지하지 않고 하이픈으로 치환한다. 예: `package.json` -> `package-json`
- 현재 정적 glossary에서는 `id`를 launchpad 연결용 기본 slug로 사용한다.
- `focusCommandSlug`는 glossary term의 `slug` 또는 static phase에서는 `id`와 동일한 값으로 본다.
- 타겟을 찾지 못하면 launchpad 기본 탭으로 이동하고 상단 안내 메시지를 보여준다.

예시:
- `pnpm install` -> `pnpm-install`
- `pnpm dev` -> `pnpm-dev`
- `uv sync` -> `uv-sync`

### 4-2. scenario / workflow taxonomy 계약

- 사용자 노출용 이름은 `상황 필터`다.
- 저장/생성/조회의 단일 canonical 필드는 `workflow_tags`다.
- `scenario_tags`는 장기 필드가 아니라, static glossary phase에서만 쓰는 프론트 임시 계산값이다.
- Phase B부터는 프론트도 `workflow_tags`만 사용한다.

허용 집합:
- `setup`
- `run`
- `error`
- `deploy`
- `advanced`

UI 라벨 매핑:
- `setup` -> `처음 시작할 때`
- `run` -> `실행할 때`
- `error` -> `에러 났을 때`
- `deploy` -> `배포할 때`
- `advanced` -> `고급/주의`

### 4-3. 오늘 막힘 방지 3개 선정 계약

- source는 `active` term만 허용한다.
- `risk_level = danger`는 기본 제외한다.
- 우선순위는 아래 순서를 따른다.
  1. 운영자가 `featured_today = true`로 지정한 term
  2. 최근 14일 내 활성화된 auto-generated term
  3. fallback으로 beginner-safe term
- 같은 날에는 결정적 결과가 나오도록 date seed 기반 정렬을 사용한다.
- 후보가 3개 미만이면 static seed data로 보강할 수 있다.

### 4-4. related -> related_slugs 전환 계약

- static glossary의 `related: string[]`는 Phase A에서 그대로 유지한다.
- seed import 시 아래 규칙으로 `related_slugs`를 만든다.
  - 먼저 기존 term의 `id` 매칭 시 `id`를 사용
  - term 문자열 정규화 매칭 시 해당 slug 사용
  - 매칭 실패 시 `unresolved_related` 로그에 기록하고 저장은 생략
- Phase B까지는 프론트에서 `related`와 `related_slugs`를 모두 읽을 수 있게 허용한다.
- Phase C부터는 `related_slugs`를 단일 소스로 고정한다.

### 4-5. 관리자 편집 계약

- 사용자에게 표시되는 glossary command는 어드민이 직접 편집 가능해야 한다.
- 편집은 승인 단계에서만 가능한 보조 기능이 아니라, `active` 상태 항목도 즉시 수정 가능해야 한다.
- 어드민 편집 화면은 "폼 한 장에서 빠르게 수정" 가능한 구조를 우선한다.
- 수정 가능한 핵심 필드:
  - `term`
  - `one_liner`
  - `analogy`
  - `when_appears`
  - `workflow_tags`
  - `risk_level`
  - `related_slugs`
  - `status`
- 모든 write 액션은 `write_admin_action_log(...)`에 기록한다.
- `updated_at`, `updated_by`, `reviewed_at`, `reviewed_by`를 구분해 기록한다.

---

## 5. 데이터 모델 제안

### 5-1. glossary_terms

사용자 노출 기준이 되는 본 테이블.

필수 필드:
- `id`
- `slug`
- `term`
- `aliases` text[]
- `category`
- `one_liner`
- `analogy`
- `when_appears`
- `related_slugs` text[]
- `risk_level`
- `workflow_tags` text[]
- `status`
- `is_auto_generated`
- `source_model`
- `prompt_version`
- `created_at`
- `updated_at`
- `updated_by`
- `reviewed_at`
- `reviewed_by`

### 5-2. glossary_generation_runs

스케줄러 실행 단위 로깅.

필드 예시:
- `id`
- `run_type` (`scheduled`, `manual`)
- `started_at`
- `finished_at`
- `status`
- `generated_count`
- `saved_count`
- `rejected_count`
- `error_message`

### 5-3. glossary_generation_candidates

LLM 원본 초안과 검증 메타데이터 저장.

필드 예시:
- `id`
- `run_id`
- `raw_term`
- `normalized_slug`
- `payload_json`
- `validation_errors` jsonb
- `dedupe_reason`
- `status` (`pending`, `promoted`, `rejected`)
- `created_at`

이 테이블을 두는 이유:
- 어떤 초안이 왜 버려졌는지 기록 가능
- 프롬프트 품질 개선 근거 확보 가능

### 5-4. 권장 SQL 초안

```sql
CREATE TABLE IF NOT EXISTS glossary_terms (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    term TEXT NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    category TEXT NOT NULL,
    one_liner TEXT NOT NULL,
    analogy TEXT NOT NULL,
    when_appears TEXT NOT NULL,
    related_slugs TEXT[] DEFAULT '{}',
    risk_level TEXT NOT NULL DEFAULT 'safe',
    workflow_tags TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    is_auto_generated BOOLEAN NOT NULL DEFAULT FALSE,
    source_model TEXT,
    prompt_version TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS glossary_generation_runs (
    id SERIAL PRIMARY KEY,
    run_type TEXT NOT NULL DEFAULT 'scheduled',
    status TEXT NOT NULL DEFAULT 'running',
    generated_count INTEGER NOT NULL DEFAULT 0,
    saved_count INTEGER NOT NULL DEFAULT 0,
    rejected_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS glossary_generation_candidates (
    id SERIAL PRIMARY KEY,
    run_id INTEGER NOT NULL REFERENCES glossary_generation_runs(id) ON DELETE CASCADE,
    raw_term TEXT NOT NULL,
    normalized_slug TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    validation_errors JSONB DEFAULT '[]'::jsonb,
    dedupe_reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. 생성 규칙

LLM 입력 컨텍스트에 반드시 포함할 것:
- 이미 존재하는 active term 목록
- 최근 pending 후보 목록
- 금지/주의 명령어 정책
- 허용 카테고리 목록
- 출력 JSON 스키마

LLM 출력 필드 최소 요구:
- `term`
- `category`
- `one_liner`
- `analogy`
- `when_appears`
- `related`
- `risk_level`
- `workflow_tags`

---

## 7. 검증 규칙

### 7-1. 구조 검증

- 필수 필드 누락 금지
- 문자열 길이 최소 기준 충족
- 배열 필드 타입 검증
- 허용 카테고리 외 값 차단

### 7-2. 중복 검증

기준:
- 같은 slug
- 같은 term 정규화값
- aliases 충돌
- 기존 active/pending term과의 유사도 충돌

처리:
- 완전 중복이면 저장하지 않음
- 애매한 유사 항목이면 pending 저장 + 검수 플래그

### 7-3. 위험도 검증

자동 플래그 대상 예시:
- `rm`
- `sudo`
- 전역 권한 변경
- destructive reset 계열

정책:
- 위험 명령어는 기본 추천 탭 제외
- `risk_level = caution | danger` 자동 부여

---

## 8. 상태 전이

### 8-1. 후보 상태

- `pending`: 자동 생성 직후, 검수 대기
- `promoted`: 본 glossary term으로 승격 완료
- `rejected`: 저장/검수 과정에서 반려

### 8-2. 본 term 상태

- `pending`: 관리자 승인 대기
- `active`: 사용자 노출 가능
- `rejected`: 운영상 반려
- `archived`: 과거 보관

### 8-3. 전이 규칙

```text
generated candidate
  -> validation pass
  -> glossary_terms.pending
  -> admin review
  -> active | rejected
```

---

## 9. 스케줄러 설계

### 9-1. 실행 빈도

- 기본: 하루 1회
- 초기 운영: 수동 트리거도 허용

### 9-2. 안정성 원칙

- 중복 실행 방지 필요
- 실패 시 전체 중단보다 부분 실패 기록 우선
- 실행 로그는 반드시 남긴다

### 9-3. 실패 처리

- Gemini 실패: run 실패 기록 + 재시도 없음 또는 제한적 재시도
- 일부 후보 검증 실패: 나머지 후보는 계속 처리
- DB 저장 실패: candidate/run 단위 에러 기록

---

## 10. 관리자 검수 플로우

관리자 화면에서 최소한 필요한 액션:

1. pending term 목록 보기
2. 초안 원문 보기
3. 중복/위험도 경고 보기
4. 승인
5. 반려
6. 필요 시 문구 수정 후 승인
7. active term 바로 수정
8. active -> archived 또는 archived -> active 상태 변경

검수 화면에서 함께 보여줄 정보:
- term
- one_liner
- analogy
- related
- workflow_tags
- risk_level
- 생성 모델
- validation flags

운영 UX 원칙:
- 리스트에서 바로 `수정`, `승인`, `반려` 액션이 보여야 한다.
- 상세 이동 없이 인라인 수정 또는 단일 드로어 편집을 우선한다.
- 어드민이 복잡한 JSON을 직접 만지지 않도록 폼 기반으로 제공한다.
- 자주 바꾸는 필드(`one_liner`, `analogy`, `risk_level`)는 가장 위에 둔다.

---

## 11. 프론트 연결 전략

초기 연결은 점진적으로 한다.

### 11-1. Phase A

- 기존 `src/data/glossary.ts` 유지
- `scenario_tags`는 프론트 임시 계산값으로만 사용
- DB의 active terms는 "오늘 막힘 방지 3개" 또는 별도 섹션에만 시범 반영

### 11-2. Phase B

- active DB terms를 glossary main source에 병합
- 프론트 필터는 `workflow_tags`를 canonical로 사용
- static term은 seed data 역할로 축소

### 11-3. Phase C

- glossary source of truth를 DB로 완전 전환

---

## 12. API 설계 방향

최소 필요 API 예시:

- `GET /api/glossary/terms`
- `GET /api/glossary/terms/today`
- `GET /api/admin/glossary/pending`
- `GET /api/admin/glossary/terms`
- `PATCH /api/admin/glossary/{id}`
- `POST /api/admin/glossary/{id}/approve`
- `POST /api/admin/glossary/{id}/reject`
- `POST /api/admin/glossary/generate-now`

### 12-1. 공개 API 응답 형태

`GET /api/glossary/terms`

```json
{
  "items": [
    {
      "id": 1,
      "slug": "pnpm-install",
      "term": "pnpm install",
      "category": "터미널",
      "one_liner": "프로젝트 준비물을 설치해요",
      "analogy": "장바구니 재료를 한 번에 사오는 단계예요.",
      "when_appears": "처음 프로젝트를 열 때 자주 써요.",
      "related_slugs": ["pnpm", "node-modules"],
      "risk_level": "safe",
      "workflow_tags": ["setup"],
      "status": "active",
      "is_auto_generated": true
    }
  ]
}
```

`GET /api/glossary/terms/today`

```json
{
  "items": [
    {
      "id": 1,
      "slug": "pnpm-install",
      "term": "pnpm install",
      "category": "터미널",
      "one_liner": "프로젝트 준비물을 설치해요",
      "when_appears": "처음 프로젝트를 열 때 자주 써요.",
      "risk_level": "safe",
      "workflow_tags": ["setup"]
    }
  ],
  "source": "auto-generated",
  "selection_rule": "featured_or_recent_safe"
}
```

### 12-2. 관리자 API 응답 형태

`GET /api/admin/glossary/pending`

```json
{
  "items": [
    {
      "id": 12,
      "slug": "uv-sync",
      "term": "uv sync",
      "status": "pending",
      "risk_level": "safe",
      "source_model": "gemini-2.0-flash",
      "validation_errors": []
    }
  ],
  "next_cursor": null
}
```

`GET /api/admin/glossary/terms`

```json
{
  "items": [
    {
      "id": 12,
      "slug": "uv-sync",
      "term": "uv sync",
      "status": "active",
      "one_liner": "파이썬 준비물을 맞춰요",
      "risk_level": "safe",
      "updated_at": "2026-03-10T20:10:00Z",
      "updated_by": "admin-user-id"
    }
  ],
  "next_cursor": null
}
```

`PATCH /api/admin/glossary/{id}`

request:

```json
{
  "term": "uv sync",
  "one_liner": "파이썬 준비물을 맞춰요",
  "analogy": "작업실 공구함을 설명서대로 다시 채우는 단계예요.",
  "when_appears": "처음 환경을 맞추거나 의존성 오류가 날 때 써요.",
  "workflow_tags": ["setup"],
  "risk_level": "safe",
  "related_slugs": ["python", "dependency"],
  "status": "active",
  "reason": "copy clarity update"
}
```

response:

```json
{
  "ok": true,
  "item": {
    "id": 12,
    "status": "active",
    "updated_at": "2026-03-10T20:10:00Z"
  }
}
```

`POST /api/admin/glossary/{id}/approve`

request:

```json
{
  "reason": "beginner-safe and useful",
  "edits": {
    "one_liner": "파이썬 준비물을 맞춰요"
  }
}
```

response:

```json
{
  "ok": true,
  "item": {
    "id": 12,
    "status": "active"
  }
}
```

`POST /api/admin/glossary/{id}/reject`

```json
{
  "reason": "duplicate of existing term"
}
```

`POST /api/admin/glossary/generate-now`

```json
{
  "count": 3,
  "reason": "manual refresh"
}
```

### 12-3. 관리자 권한 패턴

이 레포의 기존 패턴에 맞춰 아래를 따른다.

- 읽기/승인/반려는 `require_admin`
- 직접 편집도 `require_admin`
- 강제 수동 실행은 `require_admin` 또는 필요 시 `require_super_admin`
- 승인/반려/수동 실행은 `write_admin_action_log(...)` 기록

### 12-4. 프론트 타입 제안

`src/lib/api-types.ts`에 추가될 후보:

- `GlossaryTermApiItem`
- `GlossaryTermListResponse`
- `AdminGlossaryPendingItem`
- `AdminGlossaryPendingListResponse`
- `AdminGlossaryTermItem`
- `AdminGlossaryUpdatePayload`
- `AdminGlossaryApproveResponse`
- `AdminGlossaryGenerateRunResponse`

---

## 13. 구현 순서

1. DB 스키마 초안 확정
2. generation run / candidate 저장 구조 추가
3. Gemini glossary prompt 유틸 분리
4. scheduler job 연결
5. 관리자 pending 검수 API/화면 추가
6. 관리자 직접 편집 API/화면 추가
7. 사용자용 active terms 읽기 API 추가
8. 프론트 시범 연결

---

## 14. 수용 기준

최소 완료 조건:

1. 수동 또는 스케줄 실행으로 3개 초안 생성 가능
2. 검증 실패 사유가 기록됨
3. pending term 승인 후 active 전환 가능
4. active term만 사용자 화면에 노출 가능
5. 위험 명령어는 일반 추천 목록에서 분리됨

---

## 15. 연결 문서

- 전략 문서: `docs/VIBE_05_glossary_tk1.md`
- UX 문서: `docs/VIBE_06_glossary_easyflow_mvp.md`
- 컴포넌트 실행 계획: `docs/VIBE_07_glossary_component_execution.md`
- 이슈 체크리스트: `docs/VIBE_09_glossary_issue_checklist.md`
