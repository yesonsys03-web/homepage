# 나머지 기능구현

## 개요
- [ ] 현재 코드 기준 미구현/부분구현 항목을 P0 -> P2 순서로 완료한다.
- [ ] 1차 목표: 핵심 사용자 플로우(내 프로젝트, 상세, 탐색, 관리자 처리)를 실데이터 기반으로 전환한다.

## P0 (핵심 기능)

### P0-1. 내 프로젝트 API 구현 (예상 0.5d)
- [ ] 백엔드 `GET /api/me/projects`를 실제 DB 조회로 구현 (`server/main.py:322`, `server/db.py`)
- [ ] 프론트 `api.getMyProjects()` 연결 확인 (`src/lib/api.ts:182`)
- [ ] 완료 조건: 로그인 사용자 기준 내 프로젝트 목록이 반환된다.

### P0-2. 상세 페이지 동적 ID 연동 (예상 1.0d)
- [ ] `ProjectDetailScreen`의 프로젝트 ID 하드코딩(`"1"`) 제거 (`src/components/screens/ProjectDetailScreen.tsx:58`, `src/components/screens/ProjectDetailScreen.tsx:85`, `src/components/screens/ProjectDetailScreen.tsx:101`)
- [ ] 네비게이션 상태에 `projectId` 전달 구조 추가 (`src/App.tsx:33`)
- [ ] 완료 조건: 카드 클릭 프로젝트가 상세/좋아요/댓글 대상과 일치한다.

## P1 (주요 화면 실데이터화)

### P1-1. Explore API 연동 (예상 0.5d)
- [ ] 정적 `trendingProjects` 제거 후 `api.getProjects()`로 교체 (`src/components/screens/ExploreScreen.tsx:27`)
- [ ] 필터/정렬 파라미터를 서버 조회 파라미터와 매핑한다.
- [ ] 완료 조건: 카테고리/정렬이 서버 데이터 기반으로 동작한다.

### P1-2. Profile 화면 실데이터화 (예상 1.0d)
- [ ] `myProjects`, `myComments`, `likedProjects` mock 제거 (`src/components/screens/ProfileScreen.tsx:22`, `src/components/screens/ProfileScreen.tsx:28`, `src/components/screens/ProfileScreen.tsx:33`)
- [ ] 1차 범위: 내 프로젝트 우선 연동, 댓글/좋아요는 API 준비 상태에 맞춰 확장
- [ ] 완료 조건: 프로필 진입 시 실제 사용자 데이터가 표시된다.

### P1-3. Admin 화면 실데이터화 (예상 1.0d)
- [ ] 정적 `reports`, `stats`, `recentActions` 제거 (`src/components/screens/AdminScreen.tsx:13`, `src/components/screens/AdminScreen.tsx:20`, `src/components/screens/AdminScreen.tsx:73`)
- [ ] `api.getReports`, `api.updateReport` 연동 (`src/lib/api.ts:166`, `src/lib/api.ts:172`)
- [ ] 완료 조건: 신고 상태 변경이 서버 반영되고 재조회 시 유지된다.

## P2 (안정성/권한)

### P2-1. 인증 복원/세션 검증 개선 (예상 0.5d)
- [ ] 앱 시작 시 `getMe()` 호출로 토큰 유효성 검증 (`src/lib/auth-context.tsx:28`, `src/lib/api.ts:95`)
- [ ] 만료/실패 시 자동 로그아웃 처리
- [ ] 완료 조건: 만료 토큰 상태에서 UI/권한이 안전하게 초기화된다.

### P2-2. 권한 가드 및 접근 제어 (예상 0.5d)
- [ ] admin 화면 접근을 `user.role === "admin"`으로 제한 (`src/App.tsx:33`)
- [ ] 비로그인 사용자 submit/profile 접근 가드 적용
- [ ] 완료 조건: 비권한 사용자는 보호 화면 접근이 불가하다.

## 예상 일정
- [ ] 총 예상 작업량: 약 5.0일 (개발 4일 + 검증 1일)

## 권장 구현 순서
- [ ] 1) P0-1 (내 프로젝트 API)
- [ ] 2) P0-2 (상세 동적 ID)
- [ ] 3) P1-1 (Explore 연동)
- [ ] 4) P1-2 (Profile 실데이터화)
- [ ] 5) P1-3 (Admin 실데이터화)
- [ ] 6) P2-1 (세션 검증)
- [ ] 7) P2-2 (권한 가드)
