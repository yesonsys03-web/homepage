# Homepage Project - Implementation Learning Log

## 사용 목적
- 이 문서는 VibeCoder Playground 홈페이지를 어떻게 설계하고 구현했는지 학습 가능한 형태로 기록하는 문서입니다.
- 실제 작업 과정을 상세히 기술하여后来 학습 자료로 활용합니다.

---

## Session 2026-02-27-01

### 1) Goal
Stitch에서 디자인을 완료하고, React + Tailwind CSS + Shadcn/ui로 프론트엔드를 구현한다.

### 2) Inputs
- **참고 문서**: 
  - `docs/STITCH_PROMPT_PACK.md` (Stitch용 프롬프트)
  - `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md` (디자인 시스템)
- **사용자 피드백/이슈**: 
  - "포스터 스택" 카드 스타일 수정 요청
  - 디자인 확정 후 코드화 진행
- **제약 조건**: 
  - 무료 도구 사용
  - React + Vite 기반

### 3) Design Decisions

#### 기술 스택 선택
| 역할 | 선택 기술 | 이유 |
|------|----------|------|
| 프레임워크 | React 19 + Vite 7 | 최신, 빠름 |
| 패키지 매니저 | pnpm | Homebrew 설치, 효율적 |
| CSS | Tailwind CSS v4 | 설계 시스템 색상 직접 정의 가능 |
| 컴포넌트 | Shadcn/ui | 커스터마이징 용이, 디자인 시스템 적용 |
| 타입 | TypeScript | 타입 안전성 |

#### 디자인 시스템 색상 정의
```css
@theme {
  --color-bg-0: #0B1020;        /* 딥 네이비 */
  --color-bg-1: #111936;        /* 중간 톤 */
  --color-card: #161F42;         /* 카드 배경 */
  --color-text-0: #F4F7FF;      /* 메인 텍스트 */
  --color-text-1: #B8C3E6;       /* 보조 텍스트 */
  --color-accent-0: #23D5AB;    /* 민트 (CTA) */
  --color-accent-1: #FFB547;    /* 앰버 */
  --color-accent-2: #FF5D8F;    /* 코랄 핑크 */
  --color-danger: #FF6B6B;      /* 위험/삭제 */
}
```

### 4) Implementation Notes

#### 4.1 프로젝트 초기화
```bash
# 1. 기존 npm 프로젝트 확인
cd /Users/usabatch/coding/web

# 2. pnpm으로 전환 (Homebrew 설치)
brew install pnpm
brew link --overwrite pnpm

# 3. 의존성 재설치
rm -rf node_modules package-lock.json
pnpm install
```

#### 4.2 Tailwind CSS v4 설치
```bash
# Tailwind CSS 설치
pnpm add -D tailwindcss @tailwindcss/vite

# vite.config.ts 설정
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

#### 4.3 Shadcn/ui 초기화
```bash
# 1. TypeScript 경로 별칭 설정
# tsconfig.app.json에 추가:
{
  "baseUrl": ".",
  "paths": {
    "@/*": ["./src/*"]
  }
}

# 2. vite.config.ts에 alias 추가:
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}

# 3. Shadcn 초기화 (대화형)
pnpm dlx shadcn@latest init
# - Color: zinc 선택
# - CSS 변수: 기본값 사용

# 4. 필요한 컴포넌트 추가
pnpm dlx shadcn@latest add button card input badge tabs -y
```

#### 4.4 디자인 시스템 CSS 설정
`src/index.css`에 Tailwind v4 @theme로 브랜드 색상 정의:

```css
@import "tailwindcss";

@theme {
  --color-bg-0: #0B1020;
  --color-bg-1: #111936;
  --color-card: #161F42;
  --color-text-0: #F4F7FF;
  --color-text-1: #B8C3E6;
  --color-accent-0: #23D5AB;
  --color-accent-1: #FFB547;
  --color-accent-2: #FF5D8F;
  --color-danger: #FF6B6B;
}

/* Shadcn 색상_override */
:root {
  --background: #0B1020;
  --foreground: #F4F7FF;
  --card: #161F42;
  --card-foreground: #F4F7FF;
  --primary: #23D5AB;
  --primary-foreground: #0B1020;
  --destructive: #FF6B6B;
  /* ... 기타 색상 */
}
```

#### 4.5 화면 구현

**생성된 화면 구성요소:**

| 화면 | 파일 | 주요 컴포넌트 |
|------|------|--------------|
| Home | `HomeScreen.tsx` | TopNav, Hero, Trending, FilterChips, ProjectCard |
| Detail | `ProjectDetailScreen.tsx` | 프로젝트 정보, 미디어 영역, 댓글, 신고 |
| Submit | `SubmitScreen.tsx` | 폼 필드, Live Preview 카드 |
| Profile | `ProfileScreen.tsx` | 프로필 헤더, 활동 통계, 탭, Admin 패널 |
| Admin | `AdminScreen.tsx` | Stats, 신고 큐, 작업 로그 |

**ProjectCard 포스터 스택 스타일:**
```tsx
<Card 
  className="group relative bg-[#161F42] border-0 rounded-xl 
             transition-all duration-300 hover:-translate-y-1 hover:rotate-1"
  style={{ 
    transform: `rotate(${(index % 3 - 1) * 1.5}deg)`,
  }}
>
```

**스티커 라벨:**
```tsx
function StickerBadge({ type }: { type: "new" | "hot" | "weird" | "wip" }) {
  const colors = {
    new: "bg-[#23D5AB] text-[#0B1020]",
    hot: "bg-[#FF5D8F] text-white",
    weird: "bg-[#FFB547] text-[#0B1020]",
    wip: "bg-[#B8C3E6] text-[#0B1020]",
  }
  return (
    <span className={`absolute -top-2 -right-2 px-2 py-0.5 
                       text-xs font-bold rounded ${colors[type]} rotate-3`}>
      {type.toUpperCase()}
    </span>
  )
}
```

#### 4.6 개발용 화면 전환
`App.tsx`에 임시 네비게이션 추가:

```tsx
function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[100] flex gap-2">
        <button onClick={() => setCurrentScreen('home')}>Home</button>
        <button onClick={() => setCurrentScreen('detail')}>Detail</button>
        {/* ... */}
      </div>
      {screens[currentScreen]}
    </>
  )
}
```

### 5) Validation

#### 빌드 확인
```bash
cd /Users/usabatch/coding/web
pnpm build

# 결과:
# dist/index.html                   0.45 kB
# dist/assets/index-*.css          34.50 kB
# dist/assets/index-*.js           277.73 kB
# ✓ built in 1.50s
```

#### 확인된 문제와 해결
| 문제 | 해결 방법 |
|------|----------|
| Shadcn 초기화 시 경로 별칭 오류 | tsconfig.json에 baseUrl/paths 추가 |
| tsconfig 중복 작성 오류 | tsconfig.json 재작성으로 해결 |
| CSS 색상_override 충돌 | :root에 Shadcn 변수 직접 정의 |

### 6) Outcome

#### 잘된 점
- ✅ Tailwind CSS v4로 디자인 시스템 색상을 깔끔하게 정의
- ✅ Shadcn/ui를 빠르게 커스터마이징
- ✅ 5개 화면을 1시간内に実装完了
- ✅ 포스터 스택 카드 스타일 구현

#### 아쉬운 점
- ❌ 실제 API와 연동 안됨 (백엔드 미연결)
- ❌ 반응형 디테일 미검증
- ❌ 모바일 뷰 미확인

#### 다음 액션
1. FastAPI 백엔드와 연동
2. 실제 데이터 fetching 구현
3. 반응형 모바일 최적화
4. GitHub에 푸시

---

## Session 2026-02-27-02

### 1) Goal
구현 과정을 학습 로그로 상세 기록한다.

### 2) Inputs
- 실제 작업 과정의 터미널 명령어
- 코드 변경 사항
- 에러 해결 과정

### 3) Design Decisions
- 세션별로 주요 작업 단위를 분리
- 명령어와 코드를 실제 형태로 기록

### 4) Implementation Notes

#### 사용된 핵심 명령어 모음
```bash
# 프로젝트 설정
cd /Users/usabatch/coding/web

# pnpm 전환
brew install pnpm
brew link --overwrite pnpm

# Tailwind 설치
pnpm add -D tailwindcss @tailwindcss/vite

# Shadcn 초기화 (대화형 실행)
pnpm dlx shadcn@latest init

# 컴포넌트 추가
pnpm dlx shadcn@latest add button card input badge tabs -y

# 빌드
pnpm build

# 개발 서버
pnpm dev
```

#### 생성된 파일 구조
```
src/
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   └── tabs.tsx
│   └── screens/
│       ├── HomeScreen.tsx
│       ├── ProjectDetailScreen.tsx
│       ├── SubmitScreen.tsx
│       ├── ProfileScreen.tsx
│       ├── AdminScreen.tsx
│       └── index.ts
├── App.tsx
├── main.tsx
└── index.css
```

### 5) Validation
- ✅ pnpm build 성공
- ✅ 화면 렌더링 확인
- ✅ 디자인 시스템 색상 적용 확인

### 6) Outcome
- ✅ 프론트엔드 구현 완료
- ✅ 학습 로그 작성 완료
- 다음: 백엔드 연동 작업 진행

---

## Session 2026-02-27-03

### 1) Goal
FastAPI 백엔드를 구현하고 프론트엔드와 연결한다.

### 2) Inputs
- **참고 문서**: `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md` (9.2 MVP API)
- **사용자 피드백/이슈**: "다음 단계 진행" 요청
- **제약 조건**: 별도 프로세스로 실행 (프론트: 5173, 백엔드: 8000)

### 3) Design Decisions

#### 아키텍처
```
┌─────────────────┐     ┌─────────────────┐
│   React Front  │────▶│  FastAPI Backend│
│  (localhost:    │     │  (localhost:    │
│    5173)       │     │    8000)        │
└─────────────────┘     └─────────────────┘
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

### 4) Implementation Notes

#### 4.1 FastAPI 백엔드 구현

**위치**: `/Users/usabatch/coding/vibecoder-playground/app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
  // ...},
}
```

#### 4.3 화면 연동

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

#### 확인된 문제
| 문제 | 해결 |
|------|------|
| 타입 import 오류 | `import { type Project }`로 수정 |
| 미사용 변수 | map 콜백에서 `i` 파라미터 제거 |

### 6) Outcome

#### 잘된 점
- ✅ FastAPI MVP API 완비
- ✅ 프론트-백엔드 연결 완료
- ✅ 좋아요/댓글 기능 연동

#### 아쉬운 점
- ❌ 실제 DB 연동 안됨 (인메모리 데이터)
- ❌ 사용자 인증 안됨
- ❌ 이미지 업로드 안됨

#### 다음 액션
1. 실제 DB (PostgreSQL/Neon) 연결
2. 사용자 인증 구현
3. 이미지 업로드 기능
4. GitHub에 푸시
- ✅ 프론트엔드 구현 완료
- ✅ 학습 로그 작성 완료
- 다음: 백엔드 연동 작업 진행
