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