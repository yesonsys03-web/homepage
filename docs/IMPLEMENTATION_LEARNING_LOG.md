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
