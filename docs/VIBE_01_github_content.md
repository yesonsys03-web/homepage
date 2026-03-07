# GitHub 바이브코딩 콘텐츠 자동 등록 시스템

> **목표**: GitHub에서 바이브코딩 관련 레포지토리를 하루 최대 5개 자동 수집하고,
> Gemini AI로 3단계 한국어 요약을 생성해 카드로 노출하는 시스템 구축

- **수집 규모**: 하루 최대 5개 (품질 우선)
- **LLM**: Google Gemini 2.0 Flash (무료 티어, API Key만 있으면 됨)
- **DB**: NeonDB (PostgreSQL, 기존 연결 사용)
- **스케줄**: 매일 새벽 2시 자동 실행 (cron)
- **검토**: 어드민이 하루 5개 확인 후 승인/거절

---

## 서비스 컨셉 및 포지셔닝

### 핵심 인사이트: 바이브코더의 실제 정체

바이브코딩은 흔히 "개발자가 AI로 더 빠르게 코딩하는 것"으로 오해받는다.
실제 바이브코딩 사용자의 대부분은 **코알못(코딩을 알지 못하는 사람)**이다.

```
바이브코더의 실제 구성:
├── 창업 아이디어는 있지만 개발을 모르는 비개발자
├── 디자이너인데 직접 앱을 만들고 싶은 사람
├── 마케터인데 반복 업무를 자동화하고 싶은 사람
├── 직장인인데 나만의 업무 도구를 만들고 싶은 사람
└── 아이디어만 있는 학생

공통점: 코드를 "읽지" 못한다
```

### 문제 정의: GitHub은 개발자의 언어로 쓰여 있다

```
GitHub README 전형적인 첫 문장:
"A lightweight, zero-dependency TypeScript
 implementation of the MCP protocol with
 built-in middleware support"

코알못 입장:
"...?" → 뒤로가기 → 다시는 안 봄
```

GitHub은 콘텐츠의 보고지만, 입문자에게는 영어 장벽 + 기술 용어 장벽이
이중으로 막고 있다. 좋은 도구가 있어도 접근조차 못 하고 포기한다.

### 우리의 답: 3레벨 한국어 번역

```
같은 레포, 우리 서비스에서는:

[🌱 입문자] 버튼 클릭 시:
"내가 Claude한테 말하면 Claude가 앱을 만들어 주잖아요.
 그런데 이 도구를 쓰면 Claude가 내 말을 더 잘 이해해요.
 설치 5분, 지금 바로 써볼 수 있어요."

→ "오 이거 나 쓸 수 있겠는데?" → 클릭
```

3레벨 설명은 단순한 번역이 아니다. **같은 정보를 읽는 사람의 수준에 맞게
완전히 다른 언어로 재구성하는 것**이다.

| 레벨 | 대상 | 설명 포커스 |
|------|------|------------|
| 🌱 **입문자** (중학생) | 코딩 모르는 바이브코더 | "이게 뭔지, 나 쓸 수 있는지" |
| 💻 **개발자 지망생** (대학생) | 공부 중인 비전공/전공자 | "어떤 기술, 어떻게 활용하는지" |
| 🔧 **현업 개발자** (전문가) | 실무 경험 있는 개발자 | "아키텍처, 성능, 실무 포인트" |

> **중학생 설명이 가장 어렵고, 가장 중요하다.**
> 기술 설명을 빼고 "나한테 뭘 해주는가"만 남기는 것이 핵심이다.

### 경쟁 우위: 아무도 이 조합을 하지 않는다

| 서비스 | 자동 수집 | 바이브코딩 특화 | 한국어 | 3레벨 설명 | 입문자 배려 |
|--------|----------|--------------|--------|-----------|-----------|
| GitHub Trending | ✅ | ❌ | ❌ | ❌ | ❌ |
| daily.dev | ✅ | ❌ | ❌ | ❌ | ❌ |
| 벨로그 | ❌ | ❌ | ✅ | ❌ | △ |
| **이 서비스** | ✅ | ✅ | ✅ | ✅ | ✅ |

### 한 줄 포지셔닝

> **"GitHub은 개발자의 언어로 쓰여 있다. 우리는 사람의 언어로 번역한다."**

### 미래 확장 방향

지금은 GitHub 레포 카드로 시작하지만, 3레벨 포맷 자체가 플랫폼이 된다.

```
v1  GitHub 레포 카드          ← 지금 기획
v2  AI 도구 리뷰 카드         (Cursor, Windsurf, Bolt 등)
v3  바이브코딩 뉴스 카드       (업계 소식 3레벨 요약)
v4  커뮤니티 직접 등록 프로젝트 (국내 개발자 갤러리)

→ 최종: "코알못을 위한 바이브코딩 백과사전"
```

---

## 범례

- `[ ]` 개발자 작업 (코드 작성)
- `[🔑 어드민]` 사이트 어드민이 직접 해야 하는 작업
- `[🔑 어드민 + 개발]` 어드민이 설정값 제공 → 개발자가 적용

---

## Phase 0. 사전 준비 (시작 전 필수)

> 어드민이 직접 처리해야 하는 항목들. 이 단계 완료 후 개발 시작.

- [ ] 🔑 **[어드민] Google AI Studio API Key 발급**
  - 접속: https://aistudio.google.com/app/apikey
  - 무료 계정으로 API Key 생성
  - 발급된 Key를 개발자에게 전달 (또는 직접 .env에 입력)
  - > ⚠️ Key는 절대 GitHub에 커밋하지 말 것

- [ ] 🔑 **[어드민] GitHub Personal Access Token (PAT) 발급**
  - 접속: https://github.com/settings/tokens → "Generate new token (classic)"
  - 필요 권한: `public_repo` (읽기 전용으로 충분)
  - Expiration: 1년 설정 (만료 시 재발급 필요)
  - 발급된 Token을 개발자에게 전달

- [ ] 🔑 **[어드민] 바이브코딩 관련 GitHub 검색 키워드 확정**
  - 예시 후보: `vibe-coding`, `cursor-ai`, `claude-mcp`, `ai-coding-starter`
  - 검색 제외 키워드 (스팸 필터용) 목록 작성
  - > 개발자에게 전달 → 수집기 코드에 하드코딩

- [ ] **[개발] `server/.env`에 환경변수 추가**
  ```
  GEMINI_API_KEY=발급받은_API_KEY
  GITHUB_TOKEN=발급받은_PAT
  GITHUB_SEARCH_TOPICS=vibe-coding,cursor-ai,claude-mcp
  GITHUB_MIN_STARS=30
  DAILY_COLLECT_LIMIT=5
  ```

---

## Phase 1. 데이터베이스 테이블 설계

- [ ] **[개발] `curated_content` 테이블 생성 (마이그레이션 SQL 작성)**

  ```sql
  CREATE TABLE curated_content (
    id              SERIAL PRIMARY KEY,
    source_type     TEXT NOT NULL DEFAULT 'github',
    source_url      TEXT UNIQUE NOT NULL,
    canonical_url   TEXT UNIQUE NOT NULL,      -- 정규화 URL (중복 방지)
    repo_name       TEXT,
    repo_owner      TEXT,
    title           TEXT NOT NULL,
    category        TEXT,                      -- tool | template | tutorial | showcase
    language        TEXT,                      -- 주요 프로그래밍 언어
    is_korean_dev   BOOLEAN DEFAULT FALSE,     -- 국내 개발자 여부
    stars           INTEGER DEFAULT 0,
    license         TEXT,                      -- MIT | Apache-2.0 | GPL 등

    -- LLM 품질 점수
    relevance_score  INTEGER,                  -- 0~10: 바이브코딩 관련성
    beginner_value   INTEGER,                  -- 0~10: 입문자 유용성
    quality_score    INTEGER,                  -- 0~100: 종합 점수

    -- LLM 생성 콘텐츠 (3레벨 요약)
    summary_beginner TEXT,                     -- 중학생 수준
    summary_mid      TEXT,                     -- 대학생/취업 준비생 수준
    summary_expert   TEXT,                     -- 현업 개발자 수준
    tags             TEXT[],                   -- 자동 생성 태그

    -- 운영 상태
    status          TEXT DEFAULT 'pending',    -- pending | approved | rejected | auto_rejected
    reject_reason   TEXT,                      -- 거절 사유
    approved_at     TIMESTAMP,
    approved_by     INTEGER REFERENCES users(id),

    -- 메타
    github_pushed_at TIMESTAMP,               -- 레포 마지막 업데이트
    collected_at     TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
  );

  -- 인덱스
  CREATE INDEX idx_curated_content_status   ON curated_content(status);
  CREATE INDEX idx_curated_content_category ON curated_content(category);
  CREATE INDEX idx_curated_content_score    ON curated_content(quality_score DESC);
  CREATE INDEX idx_curated_content_approved ON curated_content(approved_at DESC);
  ```

- [ ] **[개발] NeonDB에 마이그레이션 실행 후 테이블 생성 확인**

- [ ] **[개발] `pg_trgm` 확장 활성화 (검색용)**
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX idx_curated_content_title_trgm ON curated_content
    USING gin(title gin_trgm_ops);
  CREATE INDEX idx_curated_content_summary_trgm ON curated_content
    USING gin(summary_beginner gin_trgm_ops);
  ```

---

## Phase 2. 백엔드 - GitHub 수집기 구현

- [ ] **[개발] `server/github_collector.py` 파일 생성**
  - GitHub Search API 호출 함수 작성
  - 검색 조건: topic 기반 + 최소 스타 수 + 최근 3개월 업데이트
  - 응답에서 필요한 필드만 추출 (name, url, description, stars, language, pushed_at, license)

- [ ] **[개발] 중복 체크 로직 구현**
  - `canonical_url` 기준으로 이미 수집된 레포 제외
  - URL 정규화: `https://github.com/user/repo` 형태로 통일 (`.git` 제거)

- [ ] **[개발] 국내 개발자 판별 로직 구현**
  - GitHub 유저 프로필 API 조회
  - `location` 필드에 "Korea", "Seoul", "한국", "서울" 포함 시 `is_korean_dev = true`

- [ ] **[개발] 하루 수집 한도 제한 적용**
  - 이미 오늘 수집된 건수 확인 → `DAILY_COLLECT_LIMIT`(5) 초과 시 중단
  - 로그에 수집 결과 기록

---

## Phase 3. 백엔드 - Gemini AI 연동

- [ ] **[개발] `server/gemini_curator.py` 파일 생성**
  - `google-generativeai` Python 패키지 설치 (`uv add google-generativeai`)

- [ ] **[개발] 1차 판단 프롬프트 구현 (큐레이션 채점)**

  ```python
  CURATION_PROMPT = """
  다음 GitHub 레포지토리가 '바이브코딩(AI 보조 코딩)' 입문자에게
  유용한지 평가해줘.

  레포 정보:
  - 이름: {name}
  - 설명: {description}
  - 주요 언어: {language}
  - 스타 수: {stars}
  - README 첫 500자: {readme_excerpt}

  평가 기준:
  1. 바이브코딩(Cursor, Claude, Copilot 등 AI 도구 활용)과 관련 있는가? (0~10)
  2. 한국 입문자가 오늘 바로 사용해볼 수 있는가? (0~10)
  3. 카테고리: tool(개발도구) | template(시작템플릿) | tutorial(학습자료) | showcase(완성앱)

  JSON만 응답:
  {
    "relevance_score": 0~10,
    "beginner_value": 0~10,
    "category": "tool|template|tutorial|showcase",
    "tags": ["태그1", "태그2", "태그3"],
    "reason": "한 줄 이유"
  }
  """
  ```

- [ ] **[개발] 2차 3레벨 요약 프롬프트 구현**

  ```python
  SUMMARY_PROMPT = """
  다음 GitHub 레포지토리를 한국어로 3가지 수준으로 설명해줘.
  각 설명은 2~3문장 이내로 핵심만 담아야 해.

  레포: {name}
  설명: {description}
  README: {readme_excerpt}

  [작성 원칙]
  - beginner: 코딩을 전혀 모르는 사람 기준. 기술 용어 사용 금지.
    "이게 뭔지"보다 "나한테 뭘 해주는지"에 집중.
    읽고 나서 "나도 써볼 수 있겠다"는 느낌이 들어야 함.
  - mid: 개발 공부 중인 사람 기준. 기술 용어는 짧게 설명 포함.
    어떤 기술 스택인지, 어떻게 활용하는지 중심.
  - expert: 현업 개발자 기준. 설명 없이 용어 사용 가능.
    아키텍처, 성능, 실무 활용 포인트 중심.

  3개 설명이 서로 뚜렷하게 달라야 함. 비슷하면 안 됨.

  JSON만 응답:
  {
    "beginner": "코딩 몰라도 이해 가능한 2~3문장",
    "mid": "개발 공부 중인 사람용 2~3문장",
    "expert": "현업 개발자용 2~3문장"
  }
  """
  ```

  **중학생(beginner) 설명 작성 기준 — 어드민 검수 시 참고**
  ```
  ✅ 좋은 예시:
  "Claude한테 말하면 앱을 만들어 주잖아요. 그런데 이 도구를 쓰면
   Claude가 내 말을 더 잘 이해해서 원하는 대로 더 잘 만들어줘요.
   설치 5분이면 되고, 지금 바로 써볼 수 있어요."

  ❌ 나쁜 예시:
  "MCP 프로토콜을 구현한 TypeScript 라이브러리로, Claude API와
   연동하여 컨텍스트 관리를 최적화합니다."
   → 기술 용어 가득, 코알못은 읽다가 포기
  ```

- [ ] **[개발] 요약 품질 자동 검증 로직 추가**
  - 3레벨 요약이 모두 50자 이상인지 확인
  - 3레벨 내용이 서로 너무 비슷하면 재생성 (1회 재시도)
  - 재시도 후에도 실패 시 `status='pending'`으로 어드민에게 넘김

- [ ] **[개발] 종합 점수(`quality_score`) 계산 로직**
  ```python
  def calc_quality_score(repo, llm_result):
      score = 0
      score += min(repo['stars'] / 10, 20)           # 스타 (최대 20점)
      score += llm_result['relevance_score'] * 3      # 관련성 (최대 30점)
      score += llm_result['beginner_value'] * 3       # 입문자 가치 (최대 30점)
      if repo['is_korean_dev']:  score += 10          # 국산 보너스 (10점)
      if repo['has_readme']:     score += 10          # README 있음 (10점)
      return min(int(score), 100)
  ```

- [ ] **[개발] 자동 컷오프 정책 적용 (어드민 큐 보호)**
  ```python
  if quality_score < 30 or llm_result['relevance_score'] < 4:
      status = 'auto_rejected'
  else:
      status = 'pending'
  ```
  - `auto_rejected`는 기본 어드민 Pending 큐에서 제외
  - 어드민 전용 "자동 거절" 필터에서 복구 가능

- [ ] **[개발] 라이선스 게이트 정책 고정**
  - `license`가 `None`/빈값이면 기본 `pending` 처리 (자동 승인 금지)
  - 허용/제한 라이선스 목록을 운영 문서로 고정 후 적용
  - 카드에 원본 라이선스 값과 "확인 필요" 상태를 함께 표시

---

## Phase 4. 백엔드 - 스케줄러 및 API

- [ ] **[개발] APScheduler 설치 및 스케줄러 설정**
  ```
  uv add apscheduler
  ```
  - `server/scheduler.py` 작성
  - 매일 새벽 2:00 KST 실행
  - FastAPI lifespan에 스케줄러 등록

- [ ] **[개발] 수집 파이프라인 메인 함수 작성**
  ```
  run_daily_collection()
    ├── GitHub API → 후보 20개 수집
    ├── 중복 제거 → 신규 레포만 필터
    ├── Gemini 1차 채점 → 상위 5개 선별
    ├── Gemini 3레벨 요약 생성
    ├── 컷오프 판정 → auto_rejected | pending
    ├── NeonDB 저장
    └── 어드민 알림 이메일 발송 (pending 건수만)
  ```

- [ ] **[개발] 어드민 알림 이메일 구현**
  - 하루 수집 결과 요약 (몇 개 pending 상태인지)
  - 어드민 페이지 바로가기 링크 포함

- [ ] **[개발] API 엔드포인트 구현 (`server/main.py`에 추가)**

  | 메서드 | 경로 | 설명 | 권한 |
  |--------|------|------|------|
  | `GET` | `/api/curated` | 카드 목록 (approved만) | 공개 |
  | `GET` | `/api/curated/{id}` | 카드 상세 | 공개 |
  | `GET` | `/api/admin/curated` | 전체 목록 (pending 포함) | admin |
  | `PATCH` | `/api/admin/curated/{id}` | 승인/거절/요약 수정 | admin |
  | `POST` | `/api/admin/curated/run` | 수집 수동 실행 | admin |
  | `DELETE` | `/api/admin/curated/{id}` | 카드 삭제 | admin |

- [ ] **[개발] 수동 수집 실행 엔드포인트 구현**
  - 어드민이 버튼 클릭으로 즉시 실행 가능
  - 오늘 이미 실행했어도 재실행 허용 (단, 한도 5개는 유지)

---

## Phase 5. 어드민 UI - 승인 대기열

- [ ] **[개발] 어드민 페이지에 "GitHub 콘텐츠" 탭 추가**
  - 기존 `AdminScreen.tsx`의 탭 구조에 추가

- [ ] **[개발] Pending 목록 컴포넌트 구현**
  - 카드 목록: 레포명 / 카테고리 / 품질점수 / 수집일시
  - 각 카드 클릭 → 상세 모달 열림

- [ ] **[개발] 상세 모달 구현 (핵심)**
  ```
  ┌─────────────────────────────────────────────────────┐
  │ [tool] ⭐ 1.2k  🇰🇷 국산  품질점수: 87점           │
  │ repo명: claude-mcp-starter                          │
  │ GitHub: https://github.com/user/repo  [↗]          │
  ├─────────────────────────────────────────────────────┤
  │ 중학생 요약: [편집 가능한 텍스트 영역]               │
  │ 대학생 요약: [편집 가능한 텍스트 영역]               │
  │ 전문가 요약: [편집 가능한 텍스트 영역]               │
  │ 태그: #MCP #Claude #입문자 [편집 가능]              │
  ├─────────────────────────────────────────────────────┤
  │ 카테고리: [드롭다운] tool / template / tutorial / showcase │
  │ 거절 사유: [스팸 | 관련없음 | 품질미달 | 저작권]    │
  ├─────────────────────────────────────────────────────┤
  │           [거절]              [✅ 승인]              │
  └─────────────────────────────────────────────────────┘
  ```

- [ ] **[개발] 승인 처리 로직**
  - 승인: `status='approved'`, `approved_at`, `approved_by` 업데이트
  - 거절: `status='rejected'`, `reject_reason` 저장

- [ ] **[개발] "지금 수집 실행" 버튼 구현**
  - `/api/admin/curated/run` POST 호출
  - 실행 중 로딩 표시 → 완료 후 결과 토스트 알림

- [ ] 🔑 **[어드민] 첫 수동 실행 테스트**
  - 어드민 페이지 → "지금 수집 실행" 버튼 클릭
  - Pending 목록에 5개 이하 카드 확인
  - 각 카드 모달 열어서 요약 품질 확인
  - 문제 있는 요약 직접 수정 후 승인

---

## Phase 6. 프론트엔드 - 사용자 카드 화면

- [ ] **[개발] 전역 레벨 설정 상태 구현**
  ```typescript
  // localStorage 저장 (새로고침해도 유지)
  type Level = 'beginner' | 'mid' | 'expert'
  const [selectedLevel, setSelectedLevel] = useState<Level>(
    () => (localStorage.getItem('content_level') as Level) ?? 'beginner'
  )
  ```

- [ ] **[개발] 레벨 선택 배너/온보딩 UI**
  ```
  나는 어떤 수준이에요?
  [🌱 코딩 입문자]  [💻 개발 공부 중]  [🔧 현업 개발자]
  → localStorage에 저장 → 이후 방문 시 바로 적용
  ```

- [ ] **[개발] `CuratedContentCard` 컴포넌트 구현**
  ```
  ┌─────────────────────────────────────┐
  │ 🔧 tool    ⭐ 1.2k    🇰🇷 국산       │
  │                                     │
  │ Claude MCP Starter Kit              │
  │                                     │
  │ [입문자✓] [개발자] [전문가]          │
  │                                     │
  │ Claude AI를 내 앱에 연결하는        │
  │ 가장 쉬운 방법. 5분이면 시작 가능!  │
  │                                     │
  │ #MCP  #Claude  #입문자환영          │
  │                                     │
  │ 출처: github.com/...  [GitHub →]    │
  └─────────────────────────────────────┘
  ```
  - 레벨 버튼 클릭 시 해당 요약으로 즉시 전환 (전역 설정 변경)
  - 카테고리별 이모지: 🔧 tool / 📋 template / 📚 tutorial / 🚀 showcase

- [ ] **[개발] 카드 목록 페이지/섹션 구현**
  - 카테고리 필터 탭: 전체 / 도구 / 템플릿 / 튜토리얼 / 완성앱
  - 국내 개발자 작품 필터 토글
  - 정렬: 최신순 / 품질점수순
  - 무한 스크롤 또는 페이지네이션 (20개 단위)

- [ ] **[개발] 키워드 검색 구현**
  - `pg_trgm` 기반 백엔드 검색 API 연동
  - 디바운스 300ms 적용
  - 검색어 없을 때 전체 목록 표시

---

## Phase 7. 콘텐츠 신선도 관리

- [ ] **[개발] 주간 스타 수 업데이트 스케줄러 추가**
  - 매주 월요일 새벽 3시 실행
  - approved 상태 카드의 GitHub 스타 수 갱신
  - 6개월 이상 미업데이트 레포 → `"유지보수 중단"` 배지 추가

- [ ] **[개발] "유지보수 중단" 뱃지 카드 UI에 추가**

- [ ] 🔑 **[어드민] 월 1회 콘텐츠 품질 점검 루틴 수립**
  - 승인된 카드 중 오래된 것 (3개월 이상) 재검토
  - 더 좋은 대안 레포 등장 시 기존 카드 업데이트 또는 대체

---

## Phase 8. 사용자 피드백 (v2 준비)

> Phase 1~7 완료 후 콘텐츠 50개 이상 쌓이면 진행

- [ ] **[개발] 카드 피드백 버튼 추가**
  - 👍 도움됐어요 / 👎 어려웠어요 (로그인 없이 가능)
  - `curated_content_feedback` 테이블에 저장
  - rate limit + 중복 피드백 방지(동일 카드/동일 사용자) 적용

- [ ] **[개발] 피드백 데이터를 어드민 대시보드에 표시**
  - 카드별 도움됨/어려움 비율
  - 피드백 많은 카드 상단 노출

- [ ] 🔑 **[어드민] 피드백 데이터 월 1회 검토**
  - "어려웠어요" 많은 카드 → 요약 수준 하향 조정
  - "도움됐어요" 많은 카드의 패턴 파악 → 큐레이션 기준에 반영

---

## Phase 9. 출시 전 최종 체크

- [ ] **[개발] 저작권 표기 확인**
  - 모든 카드에 "출처: GitHub 원본 링크" 표기
  - LLM 요약 생성물임을 안내 문구 추가
  - 라이선스 정보 표시 (MIT / Apache 등)

- [ ] **[개발] GitHub API Rate Limit 예외 처리**
  - 429 응답 시 다음 날 재시도 로직
  - 실패 로그 기록
  - 시간당 호출 상한과 일일 호출 상한을 환경변수로 고정
  - 상한 초과 시 수집 중단 + 어드민 알림

- [ ] **[개발] Gemini API 실패 예외 처리**
  - 타임아웃 / 오류 시 `status='pending'` 저장 후 재시도 없이 어드민 알림
  - 1회성 재시도(짧은 backoff) 후 실패 시 fallback 요약 템플릿 저장
  - fallback 저장 건수는 운영 대시보드에서 별도 집계

- [ ] **[개발] 공개 API 남용 방지 (공통 정책)**
  - `/api/curated` 검색/목록 API에 IP 기반 rate limit 적용
  - 비정상 호출 패턴 감지 시 임시 차단 및 로그 기록

- [ ] 🔑 **[어드민] Google AI Studio 무료 티어 한도 모니터링 설정**
  - AI Studio 대시보드에서 사용량 주기적 확인
  - 한도 초과 전 알림 설정

- [ ] 🔑 **[어드민] GitHub PAT 만료일 캘린더 등록**
  - 만료 1주일 전 재발급 필요
  - 만료 시 수집 중단됨 (에러 로그 확인)

- [ ] **[개발] 통합 테스트**
  - 수집 → Gemini 채점 → 요약 생성 → DB 저장 → 어드민 승인 → 카드 노출 전체 흐름 확인
  - 중복 레포 재수집 방지 동작 확인

---

## Implementation Checklist (실행용)

### P0 (오픈 차단 항목)
- [ ] `curated_content.status`에 `auto_rejected` 반영 및 조회 필터 구현
- [ ] 자동 컷오프 적용 (`quality_score < 30` 또는 `relevance_score < 4`)
- [ ] 라이선스 게이트 적용 (`license` 없음은 자동 승인 금지)
- [ ] GitHub/Gemini 호출 상한 환경변수 적용(시간/일 단위) + 초과 시 수집 중단
- [ ] Gemini 실패 fallback 저장(1회 재시도 후 템플릿) + 운영 대시보드 집계
- [ ] 공개 API rate limit 적용 (`/api/curated` 목록/검색)

### P1 (어드민 운영 부담 절감)
- [ ] 어드민 화면에 `auto_rejected` 복구 필터 추가
- [ ] 자동 거절 사유 코드 표준화(낮은 품질/낮은 관련성/라이선스 확인 필요)
- [ ] Pending 큐 상단 정렬 규칙 고정(품질점수/최신순 토글)

### DoD (완료 기준)
- [ ] 3일치 수집 시뮬레이션에서 Pending 큐가 일일 5개 내로 유지됨
- [ ] 429/타임아웃/LLM 실패 시 API 500 없이 graceful 응답
- [ ] 카드에 출처 링크 + 라이선스 + LLM 생성 고지 노출 확인

---

## 진행 현황 요약

| Phase | 이름 | 담당 | 상태 |
|-------|------|------|------|
| 0 | 사전 준비 (API Key 발급) | 🔑 어드민 | 대기 |
| 1 | DB 테이블 설계 | 개발 | 대기 |
| 2 | GitHub 수집기 | 개발 | 대기 |
| 3 | Gemini AI 연동 | 개발 | 대기 |
| 4 | 스케줄러 + API | 개발 | 대기 |
| 5 | 어드민 승인 UI | 개발 + 🔑 어드민 | 대기 |
| 6 | 사용자 카드 화면 | 개발 | 대기 |
| 7 | 신선도 관리 | 개발 + 🔑 어드민 | 대기 |
| 8 | 피드백 시스템 | 개발 + 🔑 어드민 | v2 예정 |
| 9 | 출시 전 체크 | 개발 + 🔑 어드민 | 대기 |

---

## 어드민 반복 운영 루틴 (출시 후)

| 주기 | 작업 |
|------|------|
| **매일** | 어드민 페이지 접속 → Pending 카드 5개 확인 → 승인/거절 (약 5분) |
| **매주** | 스타 수 업데이트 확인, 유지보수 중단 레포 검토 |
| **매월** | 피드백 데이터 분석, 검색 키워드 추가/제거, 오래된 카드 재검토 |
| **매년** | GitHub PAT 재발급, Google AI Studio 무료 한도 정책 변경 확인 |

---

---

## 핵심 원칙 요약 (항상 기억할 것)

1. **타겟은 코알못이다** — 개발자를 위한 서비스가 아님
2. **중학생 설명이 1순위** — 가장 어렵고 가장 중요한 작업
3. **품질 > 수량** — 하루 5개, 전부 어드민이 직접 확인
4. **"오늘 바로 써볼 수 있는가"** — 큐레이션의 단 하나의 기준
5. **GitHub 스타 수는 참고만** — 입문자 유용성이 더 중요한 지표

---

*작성일: 2026-03-06*
*최종 업데이트: 2026-03-06*
*관련 문서: `page_edit.md`, `TECH_STACK.md`*
