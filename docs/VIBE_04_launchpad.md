# 런치패드 — 코알못을 위한 AI 코딩 도구 셋업 가이드

> **핵심 원칙**: "딸각 하나로 완벽 설치" 대신 "복사→붙여넣기 3번이면 끝. 각 줄이 뭔지 알고 넣어요."
> 설치 자체보다 **이해하면서 설치하는 경험**을 제공한다.

- **위치**: `/glossary` 페이지 내 탭 → `[📚 용어사전]` `[🚀 런치패드]`
- **타겟**: AI 코딩 도구 초기 셋업에서 막히는 코알못 바이브코더
- **방향**: 중학생도 이해할 수 있는 한국어 비유 + 에러 나면 바로 해결
- **관련 문서**: `VIBE_03_glossary.md`

---

## 배경 및 기획 의도

Glossary(용어사전)가 "이해"의 공간이라면, 런치패드는 "실천"의 공간이다.
Glossary에 이미 터미널 카테고리(pnpm, git, 포트 등)가 있고, 런치패드는 그 연장선이다.
용어를 배우고 → 실제 명령어를 쳐보는 흐름이 같은 페이지 안에서 자연스럽게 연결된다.

별도 네비게이션 항목을 추가하지 않고 Glossary 탭 안에 넣어 Nav 복잡도를 유지한다.

---

## 전체 구조

```
/glossary
┌──────────────────────────────────────┐
│  [📚 용어사전]  [🚀 런치패드]        │
└──────────────────────────────────────┘

런치패드 내부 서브 네비:
[🛠 설치 가이드]  [💡 팁 & 트릭]  [🏥 에러 클리닉]
```

---

## 파일 구조

### Frontend (신규/수정)

```
src/
├── components/screens/
│   ├── GlossaryScreen.tsx              # 탭 시스템 추가 (수정)
│   └── launchpad/
│       ├── LaunchpadTab.tsx            # 런치패드 루트 컴포넌트
│       ├── LaunchpadGuide.tsx          # 설치 가이드
│       ├── LaunchpadTipCard.tsx        # 소셜 팁 카드 (단일)
│       ├── LaunchpadTipList.tsx        # 팁 목록 + 검색/필터/정렬
│       └── LaunchpadErrorClinic.tsx    # 에러 클리닉
├── data/
│   └── launchpad-guides.ts             # 설치 가이드 정적 데이터
└── components/screens/admin/pages/
    └── AdminLaunchpadTips.tsx          # Admin 팁 관리 페이지
```

### Backend (신규/수정)

```
server/
├── main.py                 # 새 엔드포인트 추가
├── db.py                   # 2개 테이블 추가
└── launchpad_utils.py      # og 파싱, Gemini 분류, 에러 분석 유틸
```

---

## 기능 1: 설치 가이드

### UI 흐름

```
도구 선택 카드 (4개 가로 배열):
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 🤖       │ │ 💎       │ │ ⚡       │ │ 🔓       │
│ Claude   │ │ Gemini   │ │ Codex    │ │ OpenCode │
│ Code     │ │ CLI      │ │ CLI      │ │          │
│ [선택]   │ │ [준비중] │ │ [준비중] │ │ [준비중] │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

선택된 도구 상세:
┌─────────────────────────────────────────┐
│ 🤖 Claude Code                          │
│ AI 페어 프로그래밍의 시작               │
│                                         │
│ 📋 먼저 필요한 것들                     │
│  ✓ Node.js 18+  [확인 방법 ▼]          │
│                                         │
│ [🍎 Mac]  [🪟 Windows]                 │
│                                         │
│ 1단계                                   │
│ ┌─────────────────────────┐  [📋 복사] │
│ │ brew install node       │            │
│ └─────────────────────────┘            │
│ ☕ Homebrew한테 "Node.js 주문해줘"      │
│    라고 말하는 거예요.                  │
│                                         │
│ ⚙️ 기본 세팅 파일 (CLAUDE.md)          │
│  [📋 텍스트 복사]  [⬇️ 파일 다운로드]  │
│                                         │
│ 📱 모바일로 보고 계신가요?              │
│  터미널 명령어는 PC에서 진행해 주세요. │
└─────────────────────────────────────────┘
```

### 데이터 구조 (`src/data/launchpad-guides.ts`, 정적)

```typescript
type InstallStep = {
  command: string
  explanation: string   // 중학생 눈높이 한국어 설명
  note?: string         // ⚠️ 주의사항 (선택)
}

type Prerequisite = {
  name: string           // Node.js 18+
  check_command: string  // node --version
  install_guide: string  // 없으면 이렇게 설치해요
}

type SettingsTemplate = {
  filename: string       // CLAUDE.md
  content: string        // 실제 파일 내용
  explanation: string    // 이게 왜 필요한지 설명
}

type InstallGuide = {
  tool: "claude-code" | "gemini-cli" | "codex-cli" | "opencode"
  name: string
  emoji: string
  tagline: string
  status: "ready" | "coming-soon"
  prerequisites: Prerequisite[]
  steps: {
    mac: InstallStep[]
    windows: InstallStep[]
  }
  settings_template?: SettingsTemplate
  tips_b: string[]        // 정적으로 작성하는 활용 팁
}
```

### Phase 별 데이터 계획

| 도구 | Phase 1 | Phase 2 |
|------|---------|---------|
| Claude Code | 완전 (설치 + 세팅 + 팁) | - |
| Gemini CLI | coming-soon | 완전 |
| Codex CLI | coming-soon | 완전 |
| OpenCode | coming-soon | 완전 |

### 명령어 설명 톤 가이드

Glossary와 동일한 비유 중심 설명:

```
brew install node
→ ☕ Homebrew한테 "Node.js 주문해줘" 라고 말하는 거예요.
   Node.js가 없으면 AI 도구를 설치할 수가 없거든요.

npm install -g @anthropic-ai/claude-code
→ 📦 npm 마트에서 Claude Code를 사서 내 컴퓨터 어디서든
   쓸 수 있게 설치하는 거예요.
   -g 는 "global", 이 폴더에서만이 아니라 전체에 까는 거예요.
```

### 모바일 처리

```typescript
// 화면 너비 768px 미만이면 상단에 배너 표시
"📱 터미널 명령어는 PC에서 진행해 주세요. 모바일로 보고 계신가요?"
```

### 파일 다운로드

```typescript
const downloadFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

---

## 기능 2: 팁 & 트릭 (소셜 팁 큐레이션)

### 개념

X/Threads에서 좋은 바이브코딩 팁 글을 Admin이 URL만 붙여넣으면
og 태그 파싱 + Gemini 한국어 요약 + 자동 태그 분류 → 카드로 표시.

Curated(GitHub 레포 자동 수집)와 구분:
- Curated: GitHub 레포/프로젝트 (자동 수집)
- 팁 & 트릭: X/Threads/YouTube 팁 글 (Admin URL 입력)

### 팁 카드 UI

```
┌─────────────────────────────────────┐
│  🧵 @계정이름              [🔗 원글] │
│  ─────────────────────────────────  │
│  [og:image 썸네일]                  │
│                                     │
│  Gemini 한국어 요약...              │
│                                     │
│  🏷 Claude Code  🏷 프롬프팅        │
│  📅 2026.01                         │
└─────────────────────────────────────┘
```

플랫폼 아이콘 자동 감지:
```typescript
const PLATFORM_ICON = {
  x: "𝕏",
  threads: "🧵",
  youtube: "▶️",
  other: "🔗",
}
```

### 검색/필터/정렬 UI

```
[🔍 키워드 검색                         ]

도구:  [전체] [Claude Code] [Gemini CLI] [Codex CLI] [OpenCode] [공통]
주제:  [전체] [셋업] [프롬프팅] [워크플로우] [에러해결] [팁]

정렬:  [최신순 ▼]   →   최신순 / 이름순 / 알파벳순
```

- 키워드 검색: 클라이언트사이드 (Glossary 패턴 재사용)
- 태그 필터 + 정렬: API 파라미터로 백엔드 처리

### DB 테이블: `launchpad_tips`

```sql
CREATE TABLE IF NOT EXISTS launchpad_tips (
    id SERIAL PRIMARY KEY,
    source_url TEXT UNIQUE NOT NULL,
    platform TEXT NOT NULL,          -- 'x', 'threads', 'youtube', 'other'
    author_handle TEXT,              -- @levelsio
    og_title TEXT NOT NULL,          -- 원문 제목
    og_image_url TEXT,               -- 썸네일
    description_kr TEXT NOT NULL,    -- Gemini 한국어 요약
    tool_tags TEXT[] DEFAULT '{}',   -- 'claude-code', 'gemini-cli', etc.
    topic_tags TEXT[] DEFAULT '{}',  -- 'setup', 'prompt', 'workflow', 'error', 'tip'
    is_link_valid BOOLEAN DEFAULT TRUE,
    last_link_checked_at TIMESTAMP,
    status TEXT DEFAULT 'active',    -- 'active', 'hidden'
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 공개 API 엔드포인트

```
GET /api/launchpad/tips
  params: tool_tag, topic_tag, search, sort (date|name|alpha), limit, offset
  → { items: LaunchpadTip[], total: number }
```

---

## 기능 3: 에러 클리닉

### UI

```
┌──────────────────────────────────────────┐
│  🏥 에러 클리닉                           │
│  설치하다 막혔나요? 에러를 붙여넣으면     │
│  해결책을 바로 알려드려요.               │
│  당연한 거예요, 다들 겪어요 😄           │
│                                          │
│  어떤 도구?   [Claude Code ▼]            │
│  OS?          [Mac ▼]                    │
│  버전? (선택) [v1.2.3        ]           │
│                                          │
│  에러 로그:                              │
│  ┌────────────────────────────────┐     │
│  │ 여기에 에러 메시지를 붙여넣기  │     │
│  └────────────────────────────────┘     │
│                                          │
│  [🔍 분석하기]                           │
│                                          │
│  ─── 결과 ───────────────────────────   │
│  🔎 진단: ...                           │
│  💊 해결책: ...                          │
│  📋 실행할 명령어:                       │
│  ┌────────────────────┐  [📋 복사]      │
│  │ brew install node  │                 │
│  └────────────────────┘                 │
└──────────────────────────────────────────┘
```

### 분석 흐름

```
사용자 입력: 에러 로그 + OS + 도구 + 버전(선택)
→ POST /api/launchpad/error-clinic
→ Gemini API: 에러 분석 + 해결책 생성
→ { diagnosis, solution, commands[] }
→ DB 저장 (launchpad_error_logs, 패턴 축적용)
→ 화면에 결과 표시
```

### DB 테이블: `launchpad_error_logs`

```sql
CREATE TABLE IF NOT EXISTS launchpad_error_logs (
    id SERIAL PRIMARY KEY,
    error_text TEXT NOT NULL,
    tool TEXT,           -- 'claude-code', 'gemini-cli', etc.
    os TEXT,             -- 'mac', 'windows'
    tool_version TEXT,
    gemini_diagnosis TEXT,
    gemini_solution TEXT,
    client_ip TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

Rate limiting: client IP 기준 시간당 10회 (glossary_term_request 패턴 참고)

---

## Admin 기능

### URL 추가 워크플로우

```
Admin 패널 → [+ URL 추가]
→ URL 입력
→ [가져오기] → POST /api/admin/launchpad/tips/fetch-url
→ 자동 채워진 폼:
    - platform (URL에서 자동 감지)
    - author_handle (og 파싱)
    - og_title (og 파싱)
    - og_image_url (og 파싱)
    - description_kr (Gemini 한국어 요약)
    - tool_tags (Gemini 자동 분류)
    - topic_tags (Gemini 자동 분류)
→ Admin 확인/수정
→ [게시]
```

### Admin 팁 목록

컬럼: 플랫폼 아이콘 | 제목 | 도구 태그 | 주제 태그 | 링크 상태 | 날짜 | 수정/삭제

링크 만료: `is_link_valid = false` → "🔴 만료" 배지

기존 컴포넌트 재사용: DataTable, EditDrawer, RowActions (AdminCurated 패턴)

### Admin 엔드포인트

```
POST /api/admin/launchpad/tips/fetch-url   # URL → og + Gemini 분류
POST /api/admin/launchpad/tips             # 팁 추가
PUT  /api/admin/launchpad/tips/{id}        # 팁 수정
DELETE /api/admin/launchpad/tips/{id}      # 팁 삭제
POST /api/admin/launchpad/tips/check-links # 링크 유효성 일괄 체크
```

---

## `server/launchpad_utils.py` 주요 함수

```python
# og 태그 파싱 (github_collector.py 패턴 재사용)
def fetch_og_tags(url: str) -> dict
def detect_platform(url: str) -> str  # x / threads / youtube / other

# Gemini 팁 분류 (gemini_curator.py 패턴 재사용)
# model: gemini-2.0-flash
def classify_launchpad_tip(og_title: str, og_description: str, api_key: str) -> dict
# → { tool_tags, topic_tags, description_kr }

# Gemini 에러 분석
def analyze_error_with_gemini(
    error_text: str, tool: str, os: str,
    tool_version: str | None, api_key: str
) -> dict
# → { diagnosis, solution, commands }

# 링크 유효성 체크 (HEAD request, timeout=5)
def check_link_valid(url: str) -> bool
```

API 키: 기존 Google AI Studio API 키 재사용 (Curated와 동일)

---

## `src/lib/api.ts` 추가 메서드

```typescript
// 공개
getLaunchpadTips(params?: {
  tool_tag?: string
  topic_tag?: string
  search?: string
  sort?: "date" | "name" | "alpha"
  limit?: number
  offset?: number
}): Promise<{ items: LaunchpadTip[]; total: number }>

submitErrorClinic(payload: {
  error_text: string
  tool: string
  os: string
  tool_version?: string
}): Promise<{ diagnosis: string; solution: string; commands: string[] }>

// Admin
adminFetchTipUrl(url: string): Promise<TipUrlPreview>
adminCreateLaunchpadTip(data: TipCreate): Promise<LaunchpadTip>
adminUpdateLaunchpadTip(id: number, data: Partial<TipCreate>): Promise<LaunchpadTip>
adminDeleteLaunchpadTip(id: number): Promise<void>
adminCheckLaunchpadLinks(): Promise<{ checked: number; invalid: number }>
```

---

## 재사용 패턴 참조

| 기능 | 참조 위치 |
|------|-----------|
| 탭/카테고리 버튼 스타일 | `GlossaryScreen.tsx:135-149` |
| API 요청 + 에러 처리 | `api.ts:1171-1183` |
| Toast 알림 | `Toast.tsx`, `GlossaryScreen.tsx` |
| Admin CRUD 패턴 | `AdminCurated.tsx` |
| DataTable / EditDrawer / RowActions | `admin/components/` |
| Gemini API 호출 | `gemini_curator.py` |
| 외부 URL 요청 | `github_collector.py` |
| Rate limiting | `main.py` (glossary_term_request 패턴) |
| Admin 권한 체크 | `require_admin` dependency |

---

## GlossaryScreen.tsx 수정 포인트

```tsx
// 추가 state
const [activeTab, setActiveTab] = useState<"glossary" | "launchpad">("glossary")

// 탭 버튼 (기존 카테고리 필터와 동일 스타일)
<div className="flex gap-2 mb-4">
  <button onClick={() => setActiveTab("glossary")}
    style={{ borderColor: activeTab === "glossary" ? "#23D5AB" : "#111936" }}>
    📚 용어사전
  </button>
  <button onClick={() => setActiveTab("launchpad")}
    style={{ borderColor: activeTab === "launchpad" ? "#23D5AB" : "#111936" }}>
    🚀 런치패드
  </button>
</div>

{activeTab === "glossary" && <GlossaryContent ... />}
{activeTab === "launchpad" && <LaunchpadTab />}
```

---

## 구현 순서

| 순서 | 작업 | 비고 |
|------|------|------|
| 1 | DB 테이블 2개 추가 | `db.py` |
| 2 | `launchpad_utils.py` 작성 | og 파싱, Gemini, 링크 체크 |
| 3 | Backend 엔드포인트 | `main.py` |
| 4 | API 레이어 | `api.ts` |
| 5 | `launchpad-guides.ts` | Claude Code 완전히 |
| 6 | GlossaryScreen 탭 시스템 | |
| 7 | LaunchpadGuide | 설치 가이드 UI |
| 8 | LaunchpadTipCard + TipList | 팁 카드 UI |
| 9 | LaunchpadErrorClinic | 에러 클리닉 UI |
| 10 | AdminLaunchpadTips | Admin 관리 페이지 |
| 11 | AdminSidebar + AdminLayout 연결 | |

---

## 검증 체크리스트

- [ ] `/glossary` 탭 전환 (용어사전 ↔ 런치패드)
- [ ] 도구 카드 4개 표시, Claude Code만 활성화
- [ ] Mac/Windows 탭 전환 + 명령어 복사
- [ ] CLAUDE.md 텍스트 복사 + 파일 다운로드
- [ ] 모바일 (375px) → PC 안내 배너
- [ ] Admin URL 추가 → og 파싱 → Gemini 분류 → 게시
- [ ] 팁 카드 플랫폼 아이콘 자동 표시
- [ ] 팁 키워드 검색 + 태그 필터 + 정렬
- [ ] 에러 로그 입력 → Gemini 분석 결과
- [ ] Admin 팁 수정/삭제
- [ ] 링크 유효성 체크 → 만료 배지
- [ ] `pnpm test` + `uv run pytest` 통과
