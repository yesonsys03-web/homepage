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

## 관리자 설정 페이지 개편 계획 (안전 단계)

### 진행 현황 (2026-03-03)
- [x] Stage 1 완료
- [ ] Stage 2 진행 중 (reports/users/content React Query 전환 완료, 나머지 탭 정리 필요)
- [ ] Stage 3 미착수
- [ ] Stage 4 미착수
- [ ] Stage 5 미착수

### 목표
- [ ] 관리자 화면 품질을 높이되, 중간 장애 없이 단계적으로 개선한다.
- [ ] 대규모 동시 리팩토링을 피하고 기능 안정성을 우선한다.

### 단계별 실행 원칙
- [ ] 한 단계에서 하나의 축만 바꾼다. (구조/데이터/입력/UI 껍데기 분리)
- [ ] 각 단계 완료 후에만 다음 단계로 이동한다.
- [ ] 단계 종료 게이트: `pnpm lint`, `pnpm test`, `pnpm build` 통과.

### Stage 1. 파일 분리만 먼저 (기능 변경 없음)
- [x] 대상: `src/components/screens/AdminScreen.tsx`를 탭/섹션 단위로 분리
- [x] 공유 상태(`activeTab`, `reports`, `users`, `projects`, `actionLogs`, `loading*`)는 `AdminScreen` 루트에 유지
- [x] Stage 1에서는 Context를 새로 도입하지 않음 (Context 검토는 Stage 2 이후)
- [x] 분리된 Manager 컴포넌트는 props로만 데이터/핸들러 수신, 자체 fetch 금지
- [x] Stage 1 완료 시 각 Manager의 props 수(데이터/핸들러)를 기록해 Stage 2 의사결정 근거로 남김
- [x] 금지: API 로직 변경, 상태 흐름 변경, UI 동작 변경
- [x] 완료 조건: 화면/동작이 이전과 동일하고 파일 구조만 개선됨

### Stage 2. 데이터 접근 레이어 정리 (기반 단계)
- [x] 현재 `src/lib/api.ts`의 캐시/SWR 패턴을 우선 유지하며 hook 래퍼를 정리
- [x] PoC 범위는 신고 탭 1개로 제한
- [x] PoC 측정 항목: 로딩/에러/재요청 처리 코드량, 중복 상태/이펙트 수, 캐시 재검증 일관성
- [x] 전면 도입 기준: 신고 탭 기준 데이터 처리 코드량 또는 상태/이펙트 수 30% 이상 감소
- [x] 기준 미달 시 React Query 전면 도입 보류, 기존 패턴 부분 개선 (해당 없음: 기준 충족)
- [ ] 완료 조건: 데이터 호출/재검증 경로가 일관되고 탭별 로딩 코드 중복 감소

### Stage 3. 입력 UX 교체 (prompt 제거)
- [ ] `window.prompt/confirm` 기반 액션을 Modal/Form 패턴으로 교체
- [ ] 공통 `ConfirmModal`, `FormModal` 컴포넌트를 Stage 3에서 선제 정의 (전역 상태 없이 컴포넌트만 공유)
- [ ] 모달 상태는 각 Manager 컴포넌트 로컬 상태로 관리
- [ ] 전역 모달 시스템은 도입하지 않음 (Stage 5 이후 검토)
- [ ] 위험 작업(삭제/정지)은 필수 사유 입력 + 명시적 확인 절차 적용
- [ ] 완료 조건: 운영 액션이 모달에서 재현 가능하고 기존 API 계약 유지

### Stage 4. 테이블 고도화
- [ ] TanStack Table 기반으로 정렬/필터/페이지네이션/선택 처리 표준화
- [ ] 공통 AdminTable 계층 도입으로 탭 간 테이블 중복 제거
- [ ] Bulk Action API 엔드포인트 존재 여부 확인
- [ ] Bulk API가 없으면 Stage 4는 프론트 선택 UX만 구현하고 API는 별도 백엔드 티켓으로 분리
- [ ] 완료 조건: 신고/사용자/콘텐츠 목록 UX와 운영 효율 개선

### Stage 5. 레이아웃/사이드바 교체 (마지막)
- [ ] 상단 요약 + 좌측 네비 + 우측 작업영역 구조로 개편
- [ ] 내부 컴포넌트 안정화 이후 껍데기 교체로 회귀 리스크 최소화
- [ ] 완료 조건(반응형): 768px / 1280px 브레이크포인트에서 레이아웃 깨짐 없음
- [ ] 완료 조건(접근성): 키보드만으로 모든 핵심 관리 액션 수행 가능
- [ ] 완료 조건(가독성): 기존 탭 기준 주요 작업 클릭 수 동일하거나 감소

### 리스크 관리 체크리스트
- [ ] 레이아웃 선변경 금지 (내부 작업 중 UI 깨짐/충돌 방지)
- [ ] 단계별 PR 분리 (리뷰/롤백 용이성 확보)
- [ ] 기존 관리자 액션 로그/권한 가드 회귀 테스트 유지
- [x] Stage 1 시작 전 테스트 현황 점검: `pnpm test` 대상 프론트 테스트 범위 확인
- [x] 프론트 smoke test 최소 2개 확보: `/admin` 접근 가드(비관리자 차단, 관리자 허용)
- [x] 관리자 핵심 액션 smoke test 1개 이상 확보 (예: 신고 상태 변경 플로우)
- [x] 프론트 smoke test는 Stage 1 첫 번째 커밋 전에 작성/통과 후 분리 작업 시작
- [x] Stage 1 시작 전 현재 권한 가드 동작 방식 문서화
- [ ] `/admin` 라우트 보호 방식(프론트/백엔드) 확인 후 권한 기준 단일화
- [ ] 권한 정책 결정 전 Stage 1 착수 금지

### 권한 가드 동작 현황 (2026-03-03)
- 프론트 `/admin` 진입 조건: `user?.role === "admin"`일 때만 허용
- 프론트에서 비관리자/비로그인 사용자는 `Admin` 이동 시 차단됨 (smoke test로 확인)
- 백엔드 관리자 권한 허용 범위: `admin`, `super_admin`
- 현재 상태는 프론트/백 권한 기준이 불일치하므로, 단일화 전까지는 운영 정책을 명시적으로 유지해야 함
- 단일화 권장안: 프론트 가드를 백엔드 정책과 동일한 기준(`admin` 또는 `super_admin`)으로 정렬
