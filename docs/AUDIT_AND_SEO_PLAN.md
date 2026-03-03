# 코드 감사 & SEO 기획서

> 작성일: 2026-03-03 대상: VibeCoder Playground 홈페이지 스택: React 19 + Vite 7 + FastAPI + PostgreSQL

---

## 목차

1. [현실 우선순위 재분류 (2026-03-03)](#0-%ED%98%84%EC%8B%A4-%EC%9A%B0%EC%84%A0%EC%88%9C%EC%9C%84-%EC%9E%AC%EB%B6%84%EB%A5%98-2026-03-03)
2. [위험도별 수정 우선순위](#1-%EC%9C%84%ED%97%98%EB%8F%84%EB%B3%84-%EC%88%98%EC%A0%95-%EC%9A%B0%EC%84%A0%EC%88%9C%EC%9C%84)
   - [🔴 CRITICAL — 즉시 수정 필수](#-critical--%EC%A6%89%EC%8B%9C-%EC%88%98%EC%A0%95-%ED%95%84%EC%88%98)
   - [🟠 HIGH — 빠른 시일 내 수정](#-high--%EB%B9%A0%EB%A5%B8-%EC%8B%9C%EC%9D%BC-%EB%82%B4-%EC%88%98%EC%A0%95)
   - [🟡 MEDIUM — 계획적으로 개선](#-medium--%EA%B3%84%ED%9A%8D%EC%A0%81%EC%9C%BC%EB%A1%9C-%EA%B0%9C%EC%84%A0)
   - [🟢 LOW — 여유 있을 때 개선](#-low--%EC%97%AC%EC%9C%A0-%EC%9E%88%EC%9D%84-%EB%95%8C-%EA%B0%9C%EC%84%A0)
3. [Google SEO 기획](#2-google-seo-%EA%B8%B0%ED%9A%8D)
4. [Naver SEO 기획](#3-naver-seo-%EA%B8%B0%ED%9A%8D)
5. [실행 체크리스트 (재분류 반영)](#4-%EC%8B%A4%ED%96%89-%EC%B2%B4%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8-%EC%9E%AC%EB%B6%84%EB%A5%98-%EB%B0%98%EC%98%81)

---

## 0. 현실 우선순위 재분류 (2026-03-03)

> 목적: 기존 문서의 항목을 "배포 차단 리스크(보안/운영)"와 "성장 리스크(SEO/성능)"로 분리해 실제 실행 우선순위를 명확히 합니다.

### 0-1. 재분류 기준

- **CRITICAL**: 배포 전 미해결 시 보안 사고/서비스 신뢰성 훼손 가능성이 높은 항목
- **HIGH**: 초기 운영 품질에 직접 영향, 가능한 빠르게 해결해야 하는 항목
- **MEDIUM**: 계획적으로 개선 가능한 항목
- **LOW**: 장기 최적화 또는 운영 안정화 이후 추진 항목

### 0-2. 항목별 재분류 결과

| 기존 항목 | 기존 등급 | 재분류 | 판단 근거 |
| --- | --- | --- | --- |
| C-1 JWT Secret Key 기본값 사용 위험 | CRITICAL | **CRITICAL (유지)** | 운영에서 토큰 위조 리스크. 배포 차단급 |
| C-3 OAuth 토큰이 URL에 노출 | CRITICAL | **CRITICAL (유지)** | URL/로그/Referrer를 통한 토큰 유출 가능 |
| C-4 인증 엔드포인트 레이트 리밋 없음 | CRITICAL | **CRITICAL (유지)** | 인증 엔드포인트는 오픈 직후 공격 표적이 되기 쉬우며 배포 전 보호가 필요 |
| C-2 댓글 Stored XSS | CRITICAL | **MEDIUM (하향, 검증 필요)** | 현재 즉시 실행형 증거(`dangerouslySetInnerHTML`) 확인 전 단정 어려움 |
| H-1 SEO 기본 메타태그 전무 | HIGH | **HIGH (유지)** | 검색/공유 품질에 즉시 영향 |
| H-2 robots/sitemap 부재 | HIGH | **HIGH (유지)** | 색인 효율 및 크롤링 속도 영향 |
| H-3 파비콘 기본값 | HIGH | **MEDIUM (하향)** | 브랜드 품질 이슈이나 배포 차단급 아님 |
| H-4 코드 스플리팅/레이지 로딩 미적용 | HIGH | **MEDIUM (하향)** | 개선 효과는 크지만 즉시 차단급은 아님 |
| H-5 HTTPS 강제 리디렉션 미설정 | HIGH | **CRITICAL (상향, 운영 도메인 기준)** | 보안/신뢰/랭킹 신호 측면에서 필수 |
| M-2 구조화 데이터(JSON-LD) 미적용 | MEDIUM | **LOW (하향)** | 초기 단계 ROI 상대적으로 낮음 |
| M-4 CSP 및 보안 헤더 미설정 | MEDIUM | **HIGH (상향)** | XSS/클릭재킹 완화 핵심 방어선 |
| M-6 운영 환경변수 문서화 미비 | MEDIUM | **HIGH (상향)** | 운영 사고 예방 관점에서 중요 |

### 0-3. 이번 스프린트 "즉시" 권장 묶음

아래 항목은 **이번 스프린트 내 우선 처리**를 권장합니다.

1. JWT 시크릿 운영 강제 및 미설정 시 서버 부팅 차단
2. OAuth 토큰 URL 전달 방식 제거(코드 기반 교환 등)
3. HTTPS 강제 리디렉션 + 보안 헤더 기본 세트 적용
4. 로그인/회원가입 레이트 리밋 적용
5. `index.html` 기본 메타 + `robots.txt` + `sitemap.xml` 최소 세트 적용

### 0-4. 실행 원칙

- 보안/운영 차단 항목을 SEO 확장 항목보다 우선합니다.
- "즉시" 항목은 배포 체크리스트에 포함하고, 미해결 시 릴리즈를 보류합니다.
- 성능/구조화 데이터/콘텐츠 확장은 배포 안정화 이후 단계적으로 진행합니다.

---

## 1. 위험도별 수정 우선순위

---

### 🔴 CRITICAL — 즉시 수정 필수

서비스 보안 또는 사용자 데이터에 직접 영향을 미치는 문제. **배포 전 반드시 해결해야 합니다.**

---

#### C-1. JWT Secret Key 기본값 사용 위험

**파일:** `server/auth.py`, `server/.env.example`

```python
# 현재 코드 (위험)
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
```

**문제:**

- 환경변수가 설정되지 않은 경우 공개된 기본값으로 JWT 서명
- 공격자가 임의 토큰을 위조해 관리자 계정 탈취 가능
- 개발/운영 환경 분리가 되지 않은 상태로 배포 위험

**수정 방향:**

- 운영 환경에서는 환경변수 미설정 시 서버 시작 자체를 중단시켜야 함
- `secrets.token_urlsafe(64)` 로 64자 이상 무작위 키 생성
- 절대 코드에 하드코딩하지 말 것

---

#### C-2. 댓글 저장된 XSS (Stored Cross-Site Scripting)

**파일:** `src/components/CommentList.tsx`, `server/main.py`

**문제:**

- 사용자가 입력한 댓글을 HTML로 렌더링 시 XSS 공격 가능
- 악의적인 `<script>` 태그나 이벤트 핸들러를 댓글에 삽입하면 다른 사용자의 브라우저에서 실행됨
- 세션 탈취, 악성 리디렉션, 계정 정보 유출로 이어질 수 있음

**수정 방향:**

- 프론트엔드: `DOMPurify` 라이브러리로 댓글 렌더링 전 HTML 새니타이즈
- 백엔드: 저장 시점에 `bleach` 또는 `html.escape()` 처리 추가
- React의 `dangerouslySetInnerHTML` 사용 여부 전수 점검

---

#### C-3. OAuth 토큰이 URL에 노출

**파일:** `src/App.tsx` (15번 줄)

```typescript
// 현재 코드 (위험)
const initialOauthToken = initialUrl.searchParams.get('oauth_token')
```

**문제:**

- JWT 토큰이 URL 쿼리 파라미터로 전달됨
- 브라우저 방문 기록, 서버 액세스 로그, HTTP Referer 헤더에 토큰 노출
- 악의적인 JavaScript 광고 등이 `document.referrer`로 토큰 수집 가능

**수정 방향:**

- OAuth 콜백을 POST 방식으로 변경하거나 Fragment(`#`) 사용
- 또는 단기 일회성 코드(code)를 URL에 담고, 토큰 교환은 서버-서버 간 수행
- 콜백 처리 후 즉시 URL 클린업 (현재 부분적으로 구현되어 있으나 불충분)

---

#### C-4. 인증 엔드포인트 레이트 리밋 없음

**파일:** `server/main.py`

**문제:**

- `/api/auth/login`, `/api/auth/register` 에 요청 제한 없음
- 자동화 공격으로 무제한 비밀번호 시도 가능 (Credential Stuffing)
- 대량 허위 계정 생성 가능

**수정 방향:**

- `slowapi` (FastAPI용 레이트 리밋 라이브러리) 적용
- 로그인: IP당 분당 10회, 계정당 시간당 20회로 제한
- 회원가입: IP당 시간당 5회 제한
- 잠금 후 CAPTCHA(reCAPTCHA v3) 검증 추가 고려

---

### 🟠 HIGH — 빠른 시일 내 수정

서비스 품질, 검색 노출, 운영에 직접 영향을 주는 문제.

---

#### H-1. SEO 기본 메타태그 전무 (가장 시급한 SEO 문제)

**파일:** `index.html`

```html
<!-- 현재 상태 — 검색엔진이 인식할 수 있는 정보 없음 -->
<title>web</title>
```

**문제:**

- 타이틀이 `"web"` — 구글/네이버 검색 결과에 이 텍스트가 노출됨
- `description` 메타태그 없음 → 검색 결과 스니펫이 랜덤 텍스트로 채워짐
- OG 태그 없음 → SNS 공유 시 썸네일/제목 미표시
- 언어 속성 `lang="en"` → 한국어 서비스인데 영어로 선언됨

**수정 방향:**

- `lang="ko"` 로 변경
- `react-helmet-async` 설치 후 화면별 동적 메타태그 관리
- 최소한 홈, 프로젝트 상세, 소개 페이지의 메타 정보 구성
- 상세 내용은 [Google SEO 기획](#2-google-seo-%EA%B8%B0%ED%9A%8D) 섹션 참고

---

#### H-2. robots.txt 및 sitemap.xml 부재

**경로:** `public/robots.txt`, `public/sitemap.xml` (미존재)

**문제:**

- 검색 크롤러에게 크롤링 허용/차단 범위를 알려주지 못함
- 사이트맵이 없어 새 콘텐츠가 색인되는 속도가 느림
- 구글 서치 콘솔 등록 시 사이트맵 URL이 필수

**수정 방향:**

- `public/robots.txt` 생성 (관리자 경로 차단 포함)
- `public/sitemap.xml` 정적 생성 또는 FastAPI에서 동적 제공
- Google Search Console, Naver Search Advisor에 사이트맵 등록

---

#### H-3. 파비콘이 Vite 기본값

**파일:** `index.html` 5번 줄

```html
<link rel="icon" type="image/svg+xml" href="/vite.svg" />
```

**문제:**

- 브라우저 탭, 북마크, 검색 결과에 Vite 로고가 표시됨
- 브랜드 신뢰도 저하

**수정 방향:**

- 서비스 로고 기반 favicon.ico (16x16, 32x32) 제작
- apple-touch-icon (180x180) 추가
- manifest.json (PWA 설정) 구성

---

#### H-4. 코드 스플리팅 / 레이지 로딩 미적용

**파일:** `src/App.tsx` 1번 줄

```typescript
// 현재: 모든 스크린을 한 번에 임포트
import { HomeScreen, ProjectDetailScreen, SubmitScreen, ProfileScreen, AdminScreen, ... } from './components/screens'
```

**문제:**

- 초기 번들에 어드민, 로그인, 소개 화면 등 불필요한 코드 포함
- 첫 페이지 로딩 속도 저하 → Google Core Web Vitals(LCP) 점수 하락
- LCP 3초 이상이면 Google 검색 순위에 직접 불이익

**수정 방향:**

- `React.lazy()` + `Suspense`로 각 스크린을 동적 임포트로 전환
- 어드민 탭(6개)은 별도 청크로 분리
- Vite의 `manualChunks` 설정으로 벤더 번들 최적화

---

#### H-5. HTTPS 강제 리디렉션 미설정

**문제:**

- HTTP로 접근 시 자동 HTTPS 전환 로직 없음
- 구글은 HTTPS를 랭킹 신호로 사용
- HTTP 연결에서 OAuth 토큰 전송 시 평문 노출 위험

**수정 방향:**

- 배포 서버(Nginx/Caddy)에서 301 리디렉션 설정
- HSTS(Strict-Transport-Security) 헤더 추가
- CORS 설정에 운영 도메인만 허용 (현재 localhost만 설정됨)

---

### 🟡 MEDIUM — 계획적으로 개선

서비스 안정성, 접근성, 운영 효율에 영향을 주는 문제.

---

#### M-1. 시맨틱 HTML 구조 부재

**문제:**

- SPA 전체가 `<div id="root">` 하위에 CSS 기반으로만 구성
- `<nav>`, `<main>`, `<header>`, `<footer>`, `<article>`, `<section>` 미사용
- 검색 크롤러가 페이지 구조를 파악하지 못함
- 스크린 리더 사용자 접근 불가

**수정 방향:**

- TopNav → `<header>` + `<nav>` 로 래핑
- 각 스크린의 메인 콘텐츠 영역 → `<main>` 으로 래핑
- 프로젝트 카드 → `<article>` 태그 사용
- 헤딩 계층(h1 → h2 → h3) 논리적으로 정리

---

#### M-2. 구조화 데이터(JSON-LD) 미적용

**문제:**

- 구글 리치 결과(별점, 썸네일, FAQ 확장 등) 노출 불가
- 검색 결과 CTR 상승 기회 미활용

**수정 방향:**

- 홈페이지: `WebSite` + `SearchAction` 스키마
- 프로젝트 상세: `SoftwareApplication` 또는 `CreativeWork` 스키마
- 소개 페이지 FAQ: `FAQPage` 스키마
- 조직 정보: `Organization` 스키마

---

#### M-3. 이미지 Alt 텍스트 및 최적화

**문제:**

- 프로젝트 썸네일의 `alt` 속성 누락 가능성
- WebP 사용 중이나 `srcset` + `sizes` 최적화 미확인
- 이미지 lazy loading (`loading="lazy"`) 적용 여부 미확인

**수정 방향:**

- 모든 `<img>` 태그에 의미 있는 `alt` 속성 추가
- `loading="lazy"` + `decoding="async"` 속성 추가
- LCP 대상 이미지(히어로 배너)는 `fetchpriority="high"` 설정

---

#### M-4. Content-Security-Policy 헤더 미설정

**문제:**

- XSS 공격 시 악성 스크립트 실행을 브라우저 레벨에서 차단하지 못함
- 인라인 스크립트, 외부 도메인 리소스 로드에 대한 통제 없음

**수정 방향:**

- FastAPI 미들웨어 또는 Nginx 설정에 CSP 헤더 추가
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

#### M-5. 접근성(Accessibility) 개선

**문제:**

- 아이콘 버튼에 `aria-label` 누락 (스크린 리더에서 버튼 역할 불명확)
- 모달 창에서 포커스 트랩 미구현
- 일부 텍스트 색상 조합이 WCAG AA 기준(4.5:1) 미달 가능성
  - `#B8C3E6` 텍스트 on `#0B1020` 배경 — 검토 필요
- 콘텐츠 건너뛰기(skip link) 없음

**수정 방향:**

- 아이콘 전용 버튼: `aria-label="닫기"` 등 추가
- 모달: `role="dialog"`, `aria-modal="true"`, 포커스 트랩 구현
- axe DevTools Chrome 확장 설치 후 전체 페이지 감사 실행
- `prefers-reduced-motion` 적용 상태 유지 (이미 일부 적용 중 — 좋음)

---

#### M-6. 환경변수 운영 설정 미비

**파일:** `server/.env.example`

**문제:**

- 운영용 환경변수 목록이 불완전
- CORS 허용 도메인이 코드에 하드코딩 (localhost만)
- OAuth 클라이언트 ID/Secret 설정 방법 문서화 없음

**수정 방향:**

- `.env.example` 에 모든 운영 필수 변수 주석과 함께 문서화
- `ALLOWED_ORIGINS` 환경변수로 분리
- 운영 배포 체크리스트 문서 작성

---

### 🟢 LOW — 여유 있을 때 개선

장기적 코드 품질, 개발자 경험에 영향을 주는 문제.

---

#### L-1. README.md 내용 부재

**현재 내용:**

```markdown
# homepage
홈페이지 작업
```

**수정 방향:**

- 로컬 개발 환경 설정 가이드
- 환경변수 설명
- 폴더 구조 설명
- 기여 방법(PR 가이드)

---

#### L-2. OpenAPI 문서 미활성화

**문제:**

- FastAPI의 자동 API 문서(`/docs`, `/redoc`)가 운영에서도 노출될 수 있음
- 또는 반대로 개발 시 편의를 위해 활성화되어 있을 수 있음

**수정 방향:**

- 운영 환경에서 `/docs`, `/redoc` 비활성화 또는 인증 보호
- `docs_url=None if not DEBUG else "/docs"` 패턴 사용

---

#### L-3. 에러 바운더리(Error Boundary) 미구현

**문제:**

- React 컴포넌트 렌더링 오류 발생 시 전체 화면 흰 화면(WSOD) 현상
- 사용자에게 아무 안내 없이 빈 화면만 표시

**수정 방향:**

- `ErrorBoundary` 컴포넌트 구현 또는 `react-error-boundary` 라이브러리 사용
- 스크린 레벨, 컴포넌트 레벨 이중 적용

---

#### L-4. 소셜 공유 최적화 (OG Image)

**문제:**

- 카카오톡, 트위터, 슬랙 등으로 링크 공유 시 썸네일 이미지 없음

**수정 방향:**

- 기본 OG 이미지 (`/og-image.png`, 1200×630) 제작
- 프로젝트 상세 페이지는 프로젝트 썸네일을 OG 이미지로 동적 설정

---

---

## 2. Google SEO 기획

### 2-1. 핵심 전략 개요

VibeCoder Playground는 **바이브코딩 프로젝트 쇼케이스 플랫폼**입니다. Google 검색에서 노출되기 위한 주요 타겟 키워드와 콘텐츠 전략을 정의합니다.

**타겟 검색 의도:**

- `바이브코딩 프로젝트` / `vibe coding portfolio`
- `AI 코딩 쇼케이스` / `AI 사이드 프로젝트`
- `웹 개발 포트폴리오 사이트`

---

### 2-2. 기술적 SEO 구현 목록

#### A. index.html 기본 설정

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Primary Meta -->
    <title>VibeCoder Playground — AI 바이브코딩 프로젝트 쇼케이스</title>
    <meta name="description" content="AI와 함께 만든 사이드 프로젝트를 공유하고 발견하세요. 바이브코딩 커뮤니티의 창작물을 탐색해보세요." />
    <meta name="keywords" content="바이브코딩, vibe coding, AI 프로젝트, 사이드 프로젝트, 포트폴리오, 웹 개발" />
    <meta name="author" content="VibeCoder" />

    <!-- Canonical URL -->
    <link rel="canonical" href="https://vibecoder.io/" />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://vibecoder.io/" />
    <meta property="og:title" content="VibeCoder Playground — AI 바이브코딩 프로젝트 쇼케이스" />
    <meta property="og:description" content="AI와 함께 만든 사이드 프로젝트를 공유하고 발견하세요." />
    <meta property="og:image" content="https://vibecoder.io/og-image.png" />
    <meta property="og:locale" content="ko_KR" />
    <meta property="og:site_name" content="VibeCoder Playground" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="VibeCoder Playground" />
    <meta name="twitter:description" content="AI 바이브코딩 프로젝트 쇼케이스" />
    <meta name="twitter:image" content="https://vibecoder.io/og-image.png" />

    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

    <!-- Preconnect (성능) -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
  </head>
```

---

#### B. 화면별 동적 메타태그 (react-helmet-async)

```typescript
// 설치: pnpm add react-helmet-async

// 홈 화면
<Helmet>
  <title>VibeCoder Playground — AI 바이브코딩 프로젝트 쇼케이스</title>
  <meta name="description" content="바이브코딩으로 만든 프로젝트를 공유하세요." />
  <link rel="canonical" href="https://vibecoder.io/" />
</Helmet>

// 프로젝트 상세
<Helmet>
  <title>{project.title} — VibeCoder Playground</title>
  <meta name="description" content={project.summary} />
  <link rel="canonical" href={`https://vibecoder.io/?project=${project.id}`} />
  <meta property="og:title" content={project.title} />
  <meta property="og:image" content={project.thumbnail_url} />
</Helmet>

// 소개 페이지
<Helmet>
  <title>소개 — VibeCoder Playground</title>
  <meta name="description" content="VibeCoder Playground는 무엇인가요? 팀 소개와 자주 묻는 질문을 확인하세요." />
</Helmet>
```

---

#### C. robots.txt

```
# public/robots.txt

User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

# Google 이미지 크롤러 허용
User-agent: Googlebot-Image
Allow: /

Sitemap: https://vibecoder.io/sitemap.xml
```

---

#### D. sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 정적 페이지 -->
  <url>
    <loc>https://vibecoder.io/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://vibecoder.io/?screen=explore</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://vibecoder.io/?screen=about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://vibecoder.io/?screen=challenges</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

> **장기 계획:** 프로젝트 수가 늘어나면 FastAPI에서 `GET /sitemap.xml` 엔드포인트를 만들어 등록된 프로젝트 URL을 동적으로 포함시키는 것을 권장합니다.

---

#### E. 구조화 데이터 (JSON-LD)

홈 화면에 추가:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "VibeCoder Playground",
  "url": "https://vibecoder.io",
  "description": "AI 바이브코딩 프로젝트 쇼케이스 플랫폼",
  "inLanguage": "ko-KR",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://vibecoder.io/?search={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
</script>
```

소개 페이지 FAQ에 추가:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "바이브코딩이란 무엇인가요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "AI 도구를 활용해 빠르게 프로토타입을 제작하는 개발 방식입니다."
      }
    }
  ]
}
</script>
```

---

### 2-3. Core Web Vitals 최적화 목표

| 지표 | 현재 추정 | 목표 | 주요 개선 방법 |
| --- | --- | --- | --- |
| **LCP** (최대 콘텐츠 페인트) | 3\~5초 (추정) | &lt; 2.5초 | 코드 스플리팅, 이미지 preload |
| **FID/INP** (입력 지연) | 양호 (추정) | &lt; 200ms | 이벤트 핸들러 최적화 |
| **CLS** (누적 레이아웃 이동) | 미확인 | &lt; 0.1 | 이미지 크기 명시, font swap |

**즉시 적용 가능한 LCP 개선:**

```html
<!-- 히어로 배너 이미지 preload -->
<link rel="preload" as="image" href="/img/master.webp" />
```

---

### 2-4. URL 구조 개선 (장기)

현재 SPA 라우팅 방식은 SEO에 불리합니다.

| 현재 | 권장 |
| --- | --- |
| `/?project=abc-123` | `/projects/abc-123` |
| `/?screen=explore` | `/explore` |
| `/?screen=about` | `/about` |

**단기 대안:** History API + SSG/SSR 도입 전까지는 URL 쿼리 파라미터 구조를 유지하되, canonical 태그로 중복 URL 문제 완화.

**장기 권장:** React Router v7 또는 Next.js로 마이그레이션 고려. SSR을 통해 크롤러가 JavaScript 실행 없이 콘텐츠를 읽을 수 있게 됩니다.

---

### 2-5. Google Search Console 등록 절차

1. [Google Search Console](https://search.google.com/search-console) 접속
2. 도메인 또는 URL prefix 방식으로 속성 추가
3. 소유권 확인: HTML 파일 방식 (`public/google{id}.html`) 또는 DNS TXT 레코드
4. 사이트맵 제출: `https://vibecoder.io/sitemap.xml`
5. URL 검사 도구로 주요 페이지 색인 요청
6. Core Web Vitals 리포트 모니터링 설정

---

## 3. Naver SEO 기획

네이버는 구글과 다른 별도 크롤러(Yeti)와 색인 알고리즘을 사용합니다. 국내 검색 점유율 약 60% (모바일 기준)를 차지하므로 별도 전략이 필요합니다.

---

### 3-1. 네이버와 구글 SEO의 차이점

| 항목 | Google | Naver |
| --- | --- | --- |
| **크롤러** | Googlebot | Yeti |
| **JS 실행** | 가능 (느림) | 제한적 — 서버사이드 렌더링 유리 |
| **신뢰 신호** | 백링크 품질 | 네이버 자체 서비스 통합 (블로그, 카페, 지식iN) |
| **구조화 데이터** | JSON-LD 지원 | 제한적 (Open Graph 위주) |
| **사이트맵** | 필수 | 네이버 서치어드바이저 직접 제출 필수 |
| **로컬 SEO** | Google My Business | 네이버 플레이스 |

---

### 3-2. 네이버 서치어드바이저(Naver Search Advisor) 등록

1. [네이버 서치어드바이저](https://searchadvisor.naver.com/) 접속
2. 사이트 등록 → 소유권 확인 (HTML 파일 업로드 또는 메타태그)

   ```html
   <!-- index.html 에 추가 -->
   <meta name="naver-site-verification" content="{발급받은 코드}" />
   ```
3. 사이트맵 제출 (`/sitemap.xml`)
4. RSS 피드 제출 (선택사항 — 프로젝트 피드가 있다면 유리)
5. 웹마스터 도구에서 색인 현황 모니터링

---

### 3-3. 네이버 콘텐츠 전략 (블로그 유입)

네이버 검색은 **네이버 블로그 &gt; 공식 사이트** 순으로 우선 노출하는 경향이 있습니다. 브랜드 키워드 검색 시 공식 블로그가 상단에 노출되도록 운영이 필요합니다.

**권장 콘텐츠 채널:**

| 채널 | 목적 | 게시 주기 |
| --- | --- | --- |
| **네이버 블로그** | SEO 유입, 서비스 소개, 프로젝트 하이라이트 | 주 1회 |
| **네이버 카페** | 바이브코딩/개발 커뮤니티 참여 | 수시 |
| **네이버 지식iN** | 바이브코딩 관련 질문 답변 | 수시 |

**블로그 콘텐츠 예시:**

- `"바이브코딩으로 만든 사이드 프로젝트 모음"` — 프로젝트 큐레이션
- `"AI 코딩 도구 비교 — ChatGPT vs Claude vs Cursor"` — 도구 가이드
- `"VibeCoder 플레이그라운드 소개 및 사용법"` — 서비스 튜토리얼
- 월별 `"이달의 바이브코딩 프로젝트"` 시리즈

---

### 3-4. 네이버 검색 최적화를 위한 사이트 내 콘텐츠 전략

**키워드 구성:**

| 유형 | 키워드 예시 | 타겟 페이지 |
| --- | --- | --- |
| 브랜드 | `바이브코더`, `vibecoder` | 홈 |
| 카테고리 | `바이브코딩 프로젝트`, `AI 사이드 프로젝트` | 탐색 페이지 |
| 롱테일 | `바이브코딩으로 만든 웹앱`, `Claude로 만든 포트폴리오` | 프로젝트 상세 |
| 정보성 | `바이브코딩 방법`, `AI 코딩 입문` | 소개/챌린지 페이지 |

**콘텐츠 최적화 원칙:**

- 각 페이지의 첫 번째 `<h1>` 태그에 핵심 키워드 포함
- 본문 내 자연스러운 키워드 반복 (키워드 밀도 2\~3%)
- 프로젝트 설명에 태그(플랫폼, 기술스택) 적극 활용 → 롱테일 유입

---

### 3-5. 네이버 Open Graph 설정

네이버 카페/블로그 공유 시 미리보기에 사용됩니다.

```html
<!-- 네이버 카카오 공유 최적화 (OG 태그) -->
<meta property="og:title" content="VibeCoder Playground — AI 바이브코딩 프로젝트 쇼케이스" />
<meta property="og:description" content="AI와 함께 만든 사이드 프로젝트를 공유하고 발견하세요." />
<meta property="og:image" content="https://vibecoder.io/og-image.png" />
<!-- OG 이미지 권장 크기: 1200×630px, 5MB 이하 -->
```

---

### 3-6. 카카오 공유 최적화

카카오톡은 국내 최대 메신저로, 콘텐츠 바이럴에 중요합니다.

```html
<!-- Kakao SDK (필요시) -->
<!-- OG 태그로 자동 처리되므로 별도 SDK 불필요 -->
<!-- 단, 카카오 공유하기 버튼 구현 시 Kakao JS SDK 필요 -->
```

**권장 구현:**

- 프로젝트 상세 페이지에 카카오 공유하기 버튼 추가
- 공유 시 프로젝트 썸네일 + 제목 + 요약 자동 삽입

---

## 4. 실행 체크리스트 (재분류 반영)

### Phase 1 — 즉시 (배포 전 차단 항목)

#### 보안/운영 (릴리즈 블로커)

- [x] JWT 시크릿 운영 강제 (`SECRET_KEY` 미설정 시 서버 시작 차단)

- [x] OAuth 토큰 URL 전달 방식 제거 (코드 교환 기반으로 전환)

- [x] HTTPS 강제 리디렉션 + HSTS 적용

- [x] 보안 헤더 기본 세트 적용 (최소: CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)

- [x] 로그인/회원가입 레이트 리밋 적용

#### SEO 최소 세트 (색인/공유 기반)

- [x] `index.html` `lang="ko"` 변경

- [x] `<title>` 태그를 서비스명으로 변경

- [x] 기본 `<meta name="description">` 추가

- [x] OG 태그 4종 추가 (`og:title`, `og:description`, `og:image`, `og:url`)

- [x] `public/robots.txt` 생성

- [x] `public/sitemap.xml` 생성

#### Phase 1 완료 기록 (2026-03-03)

- JWT 시크릿: `APP_ENV`가 `production/staging`일 때 기본값 또는 미설정 `SECRET_KEY`를 허용하지 않도록 변경. 운영에서 토큰 위조 리스크를 배포 단계에서 차단하기 위함.
- OAuth 보안: Google 콜백의 `oauth_token` 직접 전달을 제거하고, 단기 만료/1회성 `oauth_code` 교환 플로우로 전환. URL/로그/Referrer를 통한 액세스 토큰 노출 위험을 줄이기 위함.
- 보안 헤더/HTTPS: FastAPI 미들웨어에 HTTPS 강제(환경 플래그), HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` 적용. 기본 브라우저 방어선을 확보하기 위함.
- 인증 레이트 리밋: 로그인(IP/계정)과 회원가입(IP) 요청 제한을 서버 레벨에 추가. 오픈 직후 무차별 대입/계정 남용 공격면을 줄이기 위함.
- SEO 최소 세트: `index.html` 기본 메타와 OG 적용, `public/robots.txt`, `public/sitemap.xml` 추가. 색인 안정성과 공유 미리보기 품질을 확보하기 위함.

### Phase 2 — 배포 후 1\~2주 (안정화)

- [ ] Google Search Console 사이트 등록 + 사이트맵 제출

- [ ] 네이버 서치어드바이저 사이트 등록 + 사이트맵 제출

- [x] CORS 허용 도메인 운영 환경변수화 (`ALLOWED_ORIGINS`)

- [x] 운영 필수 환경변수 목록을 `.env.example`에 완성

- [ ] Google PageSpeed Insights로 Core Web Vitals 실측 및 기준선 수립

- [x] 댓글 XSS 실제 위험 검증 (`dangerouslySetInnerHTML` 사용 여부/입출력 경로 점검)

#### Phase 2 진행 기록 (2026-03-03)

- CORS 환경변수화: `server/main.py`에서 `ALLOWED_ORIGINS`를 파싱해 CORS 미들웨어에 적용. 배포 환경별 프런트 도메인을 코드 수정 없이 주입하기 위함.
- 환경변수 예시 정비: `server/.env.example`에 `APP_ENV`, `ALLOWED_ORIGINS`, `ENFORCE_HTTPS`를 추가. 운영 시 필수 보안/네트워크 설정 누락을 줄이기 위함.
- XSS 위험 검증: `src/components/CommentList.tsx`에서 `dangerouslySetInnerHTML` 없이 텍스트 노드로 렌더링됨을 확인했고, `server/main.py` → `server/db.py` 댓글 입출력 경로를 추적해 현재 위험도를 재검증함.
- 외부 도구 연동 보류: Search Console/네이버 서치어드바이저 등록과 PageSpeed 실측은 배포 도메인 접근성과 계정 권한이 필요해 현재 환경에서 자동 완료 불가.
- 도메인 접근 상태: `https://vibecoder.io`에 대한 `curl` 접근이 타임아웃으로 실패하여(포트 443 연결 불가) 외부 제출/실측 단계는 배포 접근성 복구 후 재시도 필요.

### Phase 3 — 1개월 내 (품질 개선)

- [x] `react-helmet-async` 도입 + 화면별 동적 메타태그 구현

- [x] 코드 스플리팅 + 레이지 로딩 적용 (LCP 개선)

- [x] 시맨틱 HTML 구조 개선 (`<main>`, `<nav>`, `<article>`)

- [x] 이미지 `alt` 텍스트 전수 점검 + `loading="lazy"` 점검

- [x] OG 이미지 (`og-image.png`) 제작 및 배포

- [x] Vite 기본 파비콘 교체

#### Phase 3 진행 기록 (2026-03-03)

- 동적 메타태그: `react-helmet-async`를 도입해 `src/main.tsx`에 `HelmetProvider`를 적용하고, `src/App.tsx`에서 화면 상태별 `title`/`description`/`canonical`/`og:*` 메타를 `Helmet`으로 선언형 관리하도록 전환.
- 코드 스플리팅: `src/App.tsx`의 화면 컴포넌트를 `React.lazy`로 분리하고 `Suspense` 경계를 추가. 초기 번들 크기를 줄이고 첫 로드 시 필요한 화면만 내려받도록 하기 위함.
- 시맨틱 구조: `src/App.tsx` 빠른 내비게이션 영역을 `nav`로 명시하고 주요 렌더 영역을 `main`으로 감쌈. `src/components/screens/HomeScreen.tsx`에도 `main` 랜드마크를 추가해 스크린리더 탐색성을 개선함.
- 이미지 점검: `Home/Explore/Detail/Profile/Submit` 화면의 콘텐츠 이미지에 `loading="lazy"`와 `decoding="async"`를 적용하고, 기존 `alt` 텍스트 사용을 유지/검증함.
- OG 이미지: `public/og-image.png`를 생성하고 `index.html`의 `og:image`를 해당 자산으로 연결. 링크 공유 시 미리보기 품질을 확보하기 위함.
- 파비콘 교체: 기본 `vite.svg` 대신 브랜드 아이콘 `public/favicon.svg`를 추가하고 `index.html` 파비콘 링크를 교체. 탭/북마크에서 브랜드 식별성을 높이기 위함.

### Phase 4 — 2\~3개월 (확장/장기)

- [x] FastAPI 동적 sitemap 엔드포인트 구현 (프로젝트 URL 포함)

- [x] React Router 기반 독립 URL 구조 전환 검토/적용

- [x] 프로젝트별 구조화 데이터 (`SoftwareApplication`) 추가

- [x] FAQ/소개 페이지 JSON-LD 추가

- [ ] 네이버 블로그 채널 운영 시스템화

- [x] 카카오 공유하기 버튼 구현

- [ ] Core Web Vitals 모든 지표 `Good` 등급 달성

#### Phase 4 진행 기록 (2026-03-03)

- 동적 사이트맵: `server/main.py`에 `/sitemap.xml` 엔드포인트를 추가해 정적 화면 URL과 공개 프로젝트 URL(`/project/{id}`)을 XML로 동적 생성하도록 적용.
- 프로젝트 JSON-LD: `src/components/screens/ProjectDetailScreen.tsx`에 `SoftwareApplication` 스키마를 추가해 상세 페이지의 제목/요약/작성자/링크 정보를 구조화 데이터로 노출.
- 소개/FAQ JSON-LD: `src/components/screens/AboutScreen.tsx`에 `FAQPage` 스키마를 추가해 FAQ 콘텐츠를 검색엔진이 구조적으로 해석할 수 있도록 구성.
- 라우팅 전환: `src/App.tsx`를 React Router 기반으로 전환해 `?screen`/`?project` 상태 라우팅을 경로 라우팅(`/explore`, `/about`, `/project/:id`, `/submit/:id/edit`)으로 교체하고 canonical URL 계산을 경로 기준으로 정리.
- 카카오 공유: `src/components/screens/ProjectDetailScreen.tsx`의 공유 메뉴에 `KakaoTalk 공유` 액션을 추가하고, Web Share API 우선/링크 복사+카카오스토리 fallback으로 동작하도록 구성.

---

*이 문서는 2026-03-03 기준 코드 감사 결과를 바탕으로 작성되었습니다.서비스 도메인 확정 후 URL 예시(*`vibecoder.io`*)를 실제 도메인으로 교체하세요.*