# VibeCoder Playground 기술 스택 문서

## 개요

VibeCoder Playground는 개발자들이 자신의 프로젝트를 공유하고 서로의 작품에 대한 피드백을 받을 수 있는 커뮤니티 플랫폼입니다. 

프로젝트 구조는 다음과 같이 분리되어 있습니다:
- **프론트엔드**: `src/` 디렉토리 (React + TypeScript)
- **백엔드**: `server/` 디렉토리 (Python FastAPI)

---

## 프론트엔드 (Frontend)

###核心技术 (Core Technologies)

| 기술 | 버전 | 용도 |
|------|------|------|
| **React** | 19.2.0 | UI 라이브러리 |
| **TypeScript** | ~5.9.3 | 타입 시스템 |
| **Vite** | 7.3.1 | 빌드 도구 / 개발 서버 |
| **Tailwind CSS** | 4.2.1 | CSS 프레임워크 |

### 상태 관리 및 데이터 페칭 (State Management & Data Fetching)

| 기술 | 버전 | 용도 |
|------|------|------|
| **@tanstack/react-query** | 5.90.21 | 서버 상태 관리, 캐싱, 데이터 페칭 |
| **@tanstack/react-table** | 8.21.3 | 테이블 UI 구축 |
| **React Context** | (React 내장) | 클라이언트 상태 관리 (인증, UI 상태) |

### UI 컴포넌트 라이브러리

| 기술 | 버전 | 용도 |
|------|------|------|
| **Radix UI** | 1.4.3 | 접근성 높은 기본 컴포넌트 (Dialog, Dropdown, Tabs 등) |
| **Lucide React** | 0.575.0 | 아이콘 라이브러리 |
| **Class Variance Authority** | 0.7.1 | 컴포넌트 variant 관리 |
| **Tailwind Merge** | 3.5.0 | Tailwind 클래스 병합 유틸리티 |
| **CLSX** | 2.1.1 | 조건부 CSS 클래스 병합 |
| **tw-animate-css** | 1.4.0 | 애니메이션 유틸리티 |

### 애니메이션

| 기술 | 버전 | 용도 |
|------|------|------|
| **GSAP** | 3.14.2 | 고급 애니메이션 (ScrollTrigger, SplitText 등) |

### 라우팅 및 SEO

| 기술 | 버전 | 용도 |
|------|------|------|
| **React Router DOM** | 7.13.1 | 클라이언트 라우팅 |
| **React Helmet Async** | 3.0.0 | SEO를 위한 메타 태그 관리 |

### 개발 도구 (Development Tools)

#### 테스트

| 기술 | 버전 | 용도 |
|------|------|------|
| **Vitest** | 4.0.18 | 단위 테스트 실행기 |
| **jsdom** | 28.1.0 | 테스트용 DOM 환경 |
| **@testing-library/react** | 16.3.2 | React 컴포넌트 테스트 유틸리티 |
| **@testing-library/jest-dom** | 6.9.1 | DOM 단언 유틸리티 |

#### 린트 및 포맷

| 기술 | 버전 | 용도 |
|------|------|------|
| **ESLint** | 9.39.1 | 코드 린트 |
| **typescript-eslint** | 8.48.0 | TypeScript ESLint 지원 |
| **eslint-plugin-react-hooks** | 7.0.1 | React Hooks 규칙 |
| **eslint-plugin-react-refresh** | 0.4.24 | HMR 호환성 검사 |

#### 빌드

| 기술 | 버전 | 용도 |
|------|------|------|
| **@vitejs/plugin-react** | 5.1.1 | Vite React 플러그인 |
| **@tailwindcss/vite** | 4.2.1 | Vite Tailwind 플러그인 |
| **esbuild** | 0.27.3 | 고속 번들러 (Vite 내부 사용) |

### 프로젝트 구조 (Frontend)

```
src/
├── App.tsx                 # 메인 앱 라우터 + 인증 컨텍스트
├── main.tsx               # React 앱 진입점
├── index.css              # 전역 스타일 + Tailwind
├── components/
│   ├── ui/               # shadcn/ui 기본 컴포넌트
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   └── tabs.tsx
│   ├── screens/          # 페이지 단위 컴포넌트
│   │   ├── HomeScreen.tsx
│   │   ├── ExploreScreen.tsx
│   │   ├── ProjectDetailScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── SubmitScreen.tsx
│   │   ├── AboutScreen.tsx
│   │   ├── ChallengesScreen.tsx
│   │   ├── AdminScreen.tsx
│   │   └── admin/        # 관리자 페이지
│   │       ├── AdminUsersTab.tsx
│   │       ├── AdminReportsTab.tsx
│   │       └── ...
│   ├── TopNav.tsx        # 상단 네비게이션
│   ├── HeroBanner.tsx    # 히어로 배너
│   ├── Toast.tsx         # 알림 컴포넌트
│   └── ...
├── lib/
│   ├── api.ts            # API 호출 함수
│   ├── auth-context.tsx  # 인증 컨텍스트
│   ├── auth-store.ts     # 인증 상태 저장소
│   ├── auth-types.ts     # 인증 관련 타입 정의
│   ├── query-client.ts   # React Query 클라이언트
│   ├── utils.ts          # 유틸리티 함수
│   └── roles.ts          # 권한 정의
├── assets/               # 정적 자원
└── test/
    └── setup.ts          # 테스트 환경 설정
```

### 주요 특징

1. **React 19** 최신 버전 사용 (React 19.2.0)
2. **Tailwind CSS v4**latest 버전 사용
3. **React Query**를 통한 서버 상태 관리 (캐싱, 백그라운드 리패치)
4. **shadcn/ui** 패턴 기반의 커스텀 컴포넌트
5. **GSAP**를 활용한 고급 애니메이션
6. **Vitest** + **@testing-library** 기반 테스트 구조
7. **ESLint flat config** 설정 (ESLint 9.x)

---

## 백엔드 (Backend)

### 핵심 기술 (Core Technologies)

| 기술 | 버전 | 용도 |
|------|------|------|
| **FastAPI** | ≥0.132.0 | 웹 프레임워크 |
| **Python** | ≥3.12 | 런타임 |
| **Uvicorn** | ≥0.41.0 | ASGI 서버 |
| **Pydantic** | ≥2.0.0 | 데이터 검증 |

### 데이터베이스

| 기술 | 버전 | 용도 |
|------|------|------|
| **NeonDB** | (Serverless) | 서버리스 PostgreSQL 데이터베이스 |
| **psycopg2-binary** | ≥2.9.0 | PostgreSQL 드라이버 |
| **python-dotenv** | ≥1.0.0 | 환경 변수 로드 (.env) |
| **python-multipart** | ≥0.0.22 | 멀티파트 폼 데이터 파싱 |

### 인증 및 보안

| 기술 | 버전 | 용도 |
|------|------|------|
| **python-jose** | ≥3.5.0 | JWT 토큰 생성/검증 |
| **passlib** | ≥1.7.4 | 비밀번호 해싱 |
| **bcrypt** | ≥5.0.0 | 비밀번호 암호화 |

### 개발 도구

| 기술 | 버전 | 용도 |
|------|------|------|
| **pytest** | (dev) | 테스트 프레임워크 |
| **ruff** | (dev) | Python 린터/포맷터 |
| **basedpyright** | (dev) | Python 타입 체커 |
| **httpx** | ≥0.28.1 | HTTP 클라이언트 (테스트용) |

### 프로젝트 구조 (Backend)

```
server/
├── main.py               # FastAPI 앱 + API 엔드포인트
├── db.py                 # 데이터베이스 연결 및 쿼리
├── auth.py               # 인증 유틸리티 (JWT, 비밀번호 해싱)
├── tests/
│   ├── test_admin_user_enforcement.py
│   └── test_oauth_regression.py
├── .env.example          # 환경 변수 예시
└── pyproject.toml        # Python 의존성 정의
```

### 백엔드 주요 기능

1. **JWT 기반 인증** - `python-jose`를 사용한 access token 관리
2. **OAuth 2.0 (Google)** - 소셜 로그인 지원
3. **RBAC (역할 기반 접근 제어)** - user, admin, super_admin 역할
4. **속도 제한 (Rate Limiting)** - 로그인/회원가입 요청 제한
5. **관리자 기능**
   - 사용자 관리 (정지, 탈퇴 예약, 권한 변경)
   - 프로젝트 관리
   - 신고 처리
   - 활동 로그
6. **커뮤니티 기능**
   - 프로젝트 CRUD
   - 댓글 시스템
   - 좋아요
   - 신고
7. ** 콘텐츠 관리**
   - About 페이지 동적 관리
   - 필터 탭 커스터마이징
   - 금칙어 필터링

### API 엔드포인트 구조

| Prefix | 설명 |
|--------|------|
| `/health` | 헬스 체크 |
| `/api/projects` | 프로젝트 CRUD |
| `/api/comments` | 댓글 CRUD |
| `/api/auth` | 인증 (로그인, 회원가입, OAuth) |
| `/api/admin` | 관리자 API |
| `/api/content` | 컨텐츠 관리 |
| `/sitemap.xml` | SEO sitemap |

---

## 개발 워크플로우

### 로컬 개발 실행

**프론트엔드:**
```bash
pnpm dev
```

**백엔드:**
```bash
pnpm dev:backend
# 또는
cd server && uv run uvicorn main:app --reload --port 8000
```

### 빌드 및 테스트

```bash
# 프론트엔드 빌드
pnpm build

# 테스트 실행
pnpm test

# 린트 검사
pnpm lint
```

---

## 기술 선택 이유

1. **React 19** - 최신 React 기능 (Server Components 준비, 성능 개선)
2. **Vite** - 빠른 개발 서버, 효율적인 번들링
3. **Tailwind CSS v4** - 유틸리티 퍼스트 접근, 개발 속도
4. **FastAPI** - 비동기 지원, 자동 API 문서화, 타입 힌트Friendly
5. **React Query** - 서버 상태의 복잡한 상태 관리 해결
6. **NeonDB** - 서버리스 PostgreSQL, 자동 스케일링
7. **JWT** - stateless 인증, 확장성

---

## 참고

- 이 문서는 프로젝트의 현재 상태를 기반으로 작성되었습니다.
- 의존성 버전은 `package.json`과 `server/pyproject.toml`을 참고하세요.
- 업데이트 시 이 문서도 함께 업데이트해야 합니다.
