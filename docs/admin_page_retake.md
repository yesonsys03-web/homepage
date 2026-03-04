# Admin 페이지 리테이크 기획서

## 구현 동기화 체크리스트 (2026-03-04)

> 기준: 현재 코드베이스 실제 구현 상태를 반영한 체크리스트.
>
> 마커: `DONE`(완료) / `PARTIAL`(부분 반영) / `TODO`(미반영)

| 항목 | 마커 | 비고 |
|------|------|------|
| Phase 1-1 URL 기반 라우팅 전환 | `DONE` | `/admin`, `/admin/users`, `/admin/content`, `/admin/reports`, `/admin/pages`, `/admin/policies`, `/admin/logs` 적용 (`src/App.tsx`) |
| Phase 1-2 AdminLayout 분리 | `DONE` | `AdminLayout + Outlet` 구조로 권한 가드 이관 (`src/components/screens/admin/AdminLayout.tsx`) |
| Phase 1-3 AdminDashboard 신설 | `DONE` | KPI 카드/최근 활동/빠른 액션 구현 (`src/components/screens/admin/pages/AdminDashboard.tsx`) |
| Phase 2-4 행 드롭다운 액션 | `DONE` | `RowActions` 공통 컴포넌트 도입 (`src/components/screens/admin/components/RowActions.tsx`) |
| Phase 2-5 Slide-in Drawer 편집 패널 | `DONE` | `EditDrawer` 공통 컴포넌트 도입 (`src/components/screens/admin/components/EditDrawer.tsx`) |
| Phase 2-6 Skeleton 로딩 | `DONE` | 주요 테이블/페이지 로딩에 `animate-pulse` 반영 |
| Phase 3-7 사이드바 알림 배지 | `DONE` | 신고 대기/승인 대기 배지 연동 (`AdminLayout`, `AdminSidebar`) |
| Phase 3-8 어드민 다크 테마 | `DONE` | `slate` 기반 어드민 전용 톤 적용 |
| Phase 3-9 AdminScreen 훅 분리 | `DONE` | `useAdminUsers`, `useAdminContent`, `useAdminReports`로 분리 |
| 레거시 AdminScreen 제거 | `DONE` | `AdminScreen.tsx` 및 구형 `Admin*Tab` 계열 제거 |
| shadcn Sheet/Dropdown 파일 생성 | `DONE` | `src/components/ui/sheet.tsx`, `src/components/ui/dropdown-menu.tsx` 생성 |
| DataTable 공통 컴포넌트화 | `DONE` | `src/components/screens/admin/components/DataTable.tsx` 추가 후 `AdminUsers/AdminContent/AdminReports`에 적용 |
| 이번 주 증감(+47) KPI | `DONE` | `/api/admin/stats` 도입 후 `users_week_delta`, `projects_week_delta` 반영 |
| 고급 차트(Recharts) | `DONE` | `recharts` 설치 후 대시보드 주간 유입 차트 반영 (`AdminDashboard.tsx`) |
| 커맨드 팔레트(cmdk) | `DONE` | `cmdk` 설치 후 `AdminHeader`에 `Cmd/Ctrl+K` 빠른 이동 팔레트 적용 |

### 참고

- 현재 어드민 구조는 문서의 목표 파일 구조와 거의 일치하며, `DataTable.tsx`를 공통 컴포넌트로 추가해 `AdminUsers/AdminContent/AdminReports`에 반영했습니다.
- 테스트도 신구 구조 정리를 반영해 갱신되었습니다 (`src/components/screens/admin/pages/AdminReports.report-action.smoke.test.tsx`).

## 현재 문제점 진단

| 항목 | 현재 상태 | 문제 |
|------|-----------|------|
| **AdminScreen.tsx** | 51KB 단일 파일 | 40+ useState 변수, 유지보수 지옥 |
| **내비게이션** | 탭 + 사이드바 혼재 | 일관성 없음, 모바일 UX 최악 |
| **대시보드 홈** | 없음 | 들어가자마자 Reports 탭만 보임 |
| **데이터 시각화** | 텍스트/뱃지만 | 숫자 나열로 직관성 부족 |
| **행 액션** | 모달 반복 열기 | 테이블마다 다른 UX 패턴 |
| **URL 상태** | 없음 | 새로고침하면 초기화됨 |

---

## 목표 레이아웃 — Fixed Sidebar + Header

```
┌──────────────────────────────────────────────────────────┐
│ [VC Admin]  ·  Users > 사용자 목록          [🔔] [avatar] │  ← 상단 헤더 (브레드크럼 + 알림)
├────────────┬─────────────────────────────────────────────┤
│            │                                             │
│  📊 개요   │   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
│  👥 사용자 │   │총유저│  │프로젝│  │오픈신│  │이번주│  │  ← KPI 카드
│  📁 콘텐츠 │   │ 1,284│  │  342 │  │  12  │  │  +47 │  │
│  🚨 신고   │   └──────┘  └──────┘  └──────┘  └──────┘  │
│  📄 페이지 │                                             │
│  ⚙️ 정책   │   최근 신고      ──────────────────         │
│  📋 로그   │   최근 가입      ──────────────────         │  ← 빠른 요약 피드
│            │   최근 활동      ──────────────────         │
│  [← 사이트]│                                             │
└────────────┴─────────────────────────────────────────────┘
```

---

## Phase 1 — 레이아웃 & 라우팅 (즉시 효과 큼)

### 1. URL 기반 라우팅 전환

현재 `/admin` 단일 URL에서 탭 전환만 하는 구조를 React Router 중첩 라우팅으로 분리한다.

```
현재: /admin  (탭 클릭해도 URL 안 바뀜)

변경:
/admin              → 대시보드 개요
/admin/users        → 사용자 관리
/admin/content      → 콘텐츠 관리
/admin/reports      → 신고 처리
/admin/pages        → 페이지 편집
/admin/policies     → 정책 설정
/admin/logs         → 활동 로그
```

URL이 바뀌면 새로고침해도 위치 유지되고, 북마크 가능해진다.

### 2. AdminLayout.tsx — 공통 레이아웃 분리

사이드바 + 상단 헤더를 하나의 레이아웃 컴포넌트로 분리하고, 각 페이지는 `<Outlet />`으로 렌더링한다.

**사이드바 구성 요소:**
- 로고 / 서비스명
- 내비게이션 메뉴 (아이콘 + 텍스트 + 대기 배지)
- 하단 "사이트로 돌아가기" 링크

**상단 헤더 구성 요소:**
- 브레드크럼 (현재 위치 표시)
- 알림 아이콘
- 관리자 아바타 + 이름

### 3. AdminDashboard.tsx — 개요 페이지 신규 생성

들어가자마자 현황을 한눈에 볼 수 있는 홈 역할의 페이지.

**KPI 카드 4개:**
- 총 사용자 수 (이번 주 증감 표시)
- 총 프로젝트 수 (이번 주 증감 표시)
- 처리 대기 신고 건수
- 이번 주 신규 가입자

**최근 활동 피드:**
- "홍길동이 프로젝트를 신고했습니다 — 5분 전"
- "새 사용자 김철수가 가입 승인을 기다립니다 — 1시간 전"

**빠른 액션 버튼:**
- "대기 신고 보기"
- "신규 사용자 승인"

---

## Phase 2 — UX 개선

### 4. 행 드롭다운 액션 메뉴 (⋮)

테이블 행마다 별도 모달을 여는 방식에서 인라인 드롭다운 메뉴로 전환한다.
Radix UI `DropdownMenu`는 이미 설치되어 있어 추가 패키지 불필요.

```
현재: "정지" 버튼 클릭 → 별도 모달 → 입력 → 확인

변경: 행 우측 [⋮] 클릭 → 드롭다운 메뉴
     ├── 역할 변경
     ├── 계정 제한
     ├── 계정 정지   (빨간 텍스트)
     └── 삭제        (빨간 텍스트)
```

### 5. Slide-in Drawer — 편집 패널

모달 팝업 대신 화면 오른쪽에서 슬라이드인되는 패널로 편집 UX를 통일한다.
shadcn/ui `Sheet` 컴포넌트 활용. 추가 설치 불필요.

```
현재: 모달 팝업 → 닫힘 → 다시 테이블 로드 → 불편

변경: 테이블은 그대로 보이면서 오른쪽에서 편집 패널 슬라이드인
     ├── 사용자 상세 정보
     ├── 편집 폼
     └── 저장 / 취소 버튼
```

### 6. Skeleton 로딩

데이터 로딩 중 빈 화면 대신 회색 골격 UI를 표시해 사용자 경험을 개선한다.
Tailwind CSS `animate-pulse`로 구현. 추가 패키지 불필요.

---

## Phase 3 — 완성도

### 7. 사이드바 알림 배지

처리가 필요한 항목의 건수를 사이드바 메뉴 옆에 실시간으로 표시한다.

```
🚨 신고      [12]   ← 처리 대기 건수
👥 사용자    [3]    ← 승인 대기 신규 가입자
```

### 8. 어드민 전용 다크 테마

일반 사이트와 시각적으로 명확히 구분되도록 어드민 전용 다크 색상 시스템을 적용한다.

| 역할 | 색상 | Tailwind |
|------|------|----------|
| 메인 배경 | `#0F172A` | `slate-900` |
| 카드/패널 | `#1E293B` | `slate-800` |
| 구분선 | `#334155` | `slate-700` |
| 메인 텍스트 | `#F8FAFC` | `slate-50` |
| 보조 텍스트 | `#94A3B8` | `slate-400` |
| 브랜드 포인트 | `#FF5D8F` | (기존 유지) |

**상태 뱃지 색상:**
- 활성 → `emerald-500`
- 정지 → `red-500`
- 대기 → `amber-500`
- 삭제 → `slate-500`

### 9. AdminScreen.tsx 분해 — 훅 분리

51KB 단일 파일을 도메인별 커스텀 훅으로 분리해 유지보수성을 확보한다.

```
hooks/
├── useAdminUsers.ts     ← 사용자 데이터 + 뮤테이션
├── useAdminContent.ts   ← 콘텐츠 데이터 + 뮤테이션
└── useAdminReports.ts   ← 신고 데이터 + 뮤테이션
```

---

## 비주얼 디자인 스펙

구조와 UX만으로는 고급스러운 느낌이 나지 않는다. 아래 스펙을 함께 구현해야 한다.

### 타이포그래피 체계

| 용도 | 크기 | 굵기 | 색상 |
|------|------|------|------|
| 페이지 제목 | `text-2xl` (24px) | `font-semibold` | `slate-50` |
| 섹션 제목 | `text-lg` (18px) | `font-medium` | `slate-100` |
| 테이블 헤더 | `text-xs` (12px) | `font-semibold` | `slate-400` |
| 본문 | `text-sm` (14px) | `font-normal` | `slate-300` |
| 보조/레이블 | `text-xs` (12px) | `font-normal` | `slate-500` |
| KPI 숫자 | `text-3xl` (30px) | `font-bold` | `slate-50` |

테이블 헤더는 전부 **대문자(uppercase) + letter-spacing** 처리해 구분감을 높인다.

### 여백 체계 (Spacing)

일관된 여백 시스템으로 시각적 정돈감을 만든다.

| 구분 | 값 |
|------|----|
| 사이드바 너비 | `240px` (고정) |
| 상단 헤더 높이 | `56px` (고정) |
| 페이지 내부 패딩 | `px-6 py-6` |
| 카드 내부 패딩 | `p-5` |
| 카드 사이 간격 | `gap-4` |
| 테이블 셀 패딩 | `px-4 py-3` |
| 섹션 사이 간격 | `space-y-6` |

### 카드 & 컴포넌트 스타일

**KPI 카드:**
```
배경: slate-800
테두리: 1px solid slate-700
라운딩: rounded-xl
왼쪽 포인트 바: 4px 세로 바, 브랜드 컬러 (#FF5D8F)
호버: slate-750 (약간 밝아짐) + scale-[1.01] 트랜지션
shadow: shadow-lg (subtle)
```

**데이터 테이블:**
```
헤더 행: slate-900 배경, 하단 border-b slate-700
데이터 행: slate-800 배경
홀수 행: slate-800 / 짝수 행: slate-750 (zebra stripe)
호버 행: slate-700
행 구분선: border-b slate-700/50
```

**사이드바:**
```
배경: slate-900 (메인 배경보다 약간 더 어둡게)
메뉴 아이템 기본: 투명 배경, slate-400 텍스트
메뉴 아이템 호버: slate-800 배경, slate-200 텍스트
메뉴 아이템 활성: #FF5D8F/10 배경, #FF5D8F 텍스트, 왼쪽 2px border #FF5D8F
아이콘 크기: 18px, 텍스트와 gap-3
```

**드롭다운 메뉴:**
```
배경: slate-800
테두리: 1px solid slate-700
라운딩: rounded-lg
shadow: shadow-2xl
위험 항목: red-400 텍스트, 호버 시 red-500/10 배경
```

### 애니메이션 & 트랜지션

모든 인터랙션에 일관된 트랜지션을 적용해 부드러운 느낌을 만든다.

| 대상 | 효과 | 속도 |
|------|------|------|
| 버튼 호버 | `brightness-110` + `scale-[1.02]` | `150ms ease` |
| 메뉴 아이템 호버 | 배경색 변화 | `150ms ease` |
| KPI 카드 호버 | `translateY(-2px)` + shadow 강화 | `200ms ease` |
| Drawer 열림/닫힘 | 오른쪽에서 슬라이드인 | `300ms ease-out` |
| 드롭다운 열림 | 위에서 fade+scale | `150ms ease` |
| 페이지 전환 | `opacity 0→1` | `200ms ease` |
| Skeleton 펄스 | `animate-pulse` | Tailwind 기본 |

GSAP는 이미 설치되어 있으므로 페이지 진입 애니메이션(KPI 카드 순차 등장 등)에 선택적으로 활용 가능하다.

### 마이크로인터랙션

| 상황 | 동작 |
|------|------|
| 테이블 행 호버 | 배경 변화 + 액션 버튼(⋮) 표시 (평소엔 숨김) |
| 정지/삭제 등 위험 액션 | 버튼이 red 계열로 색상 변화 후 확인 요구 |
| 저장 성공 | 버튼이 체크 아이콘으로 잠깐 변경 후 원복 |
| 데이터 리패치 | 헤더 우측 새로고침 아이콘 회전 애니메이션 |
| 배지 숫자 변경 | 숫자가 위에서 아래로 flip 전환 |
| 검색 입력 | 300ms debounce 후 자동 필터링 |

### 아이콘 사용 규칙

Lucide React 아이콘(이미 설치됨)으로 통일. 이모지 혼용 금지.

| 메뉴 | 아이콘 |
|------|--------|
| 개요 | `LayoutDashboard` |
| 사용자 | `Users` |
| 콘텐츠 | `FolderOpen` |
| 신고 | `Flag` |
| 페이지 | `FileText` |
| 정책 | `Settings` |
| 로그 | `ScrollText` |
| 경고/삭제 | `AlertTriangle` |
| 성공 | `CheckCircle` |

아이콘 크기: 사이드바 `18px` / 버튼 내부 `16px` / KPI 카드 `24px`

---

## 최종 파일 구조

```
src/components/screens/admin/
├── AdminLayout.tsx          ← 사이드바 + 헤더 공통 레이아웃
├── pages/
│   ├── AdminDashboard.tsx   ← 개요 페이지 (신규)
│   ├── AdminUsers.tsx       ← 사용자 관리
│   ├── AdminContent.tsx     ← 콘텐츠 관리
│   ├── AdminReports.tsx     ← 신고 처리
│   ├── AdminPages.tsx       ← 페이지 편집
│   ├── AdminPolicies.tsx    ← 정책 설정
│   └── AdminLogs.tsx        ← 활동 로그
├── components/
│   ├── AdminSidebar.tsx     ← 사이드바 내비게이션
│   ├── AdminHeader.tsx      ← 상단 헤더 + 브레드크럼
│   ├── KpiCard.tsx          ← KPI 통계 카드
│   ├── ActivityFeed.tsx     ← 최근 활동 피드
│   ├── DataTable.tsx        ← 범용 테이블 (현 AdminTable.tsx 대체)
│   ├── RowActions.tsx       ← 행 드롭다운 액션
│   └── EditDrawer.tsx       ← 슬라이드인 편집 패널
└── hooks/
    ├── useAdminUsers.ts
    ├── useAdminContent.ts
    └── useAdminReports.ts
```

---

## 추가 설치 여부 정리

> **표기 기준**: "npm 패키지 추가 설치 불필요"와 "컴포넌트 파일 생성 필요"를 구분한다.
> Radix UI 패키지는 이미 설치되어 있지만, shadcn 래퍼 파일이 없으면 생성 커맨드가 필요하다.

| 기능 | 구현 방법 | npm 패키지 | 컴포넌트 파일 |
|------|-----------|-----------|--------------|
| Slide-in Drawer | `pnpm dlx shadcn@latest add sheet` | ❌ 불필요 | ⚠️ 생성 필요 |
| 행 드롭다운 | `pnpm dlx shadcn@latest add dropdown-menu` | ❌ 불필요 | ⚠️ 생성 필요 |
| Skeleton 로딩 | Tailwind `animate-pulse` | ❌ 불필요 | ❌ 불필요 |
| URL 기반 라우팅 | React Router (이미 설치됨) | ❌ 불필요 | ❌ 불필요 |
| KPI 카드 | 커스텀 컴포넌트 | ❌ 불필요 | ⚠️ 신규 작성 |
| 아이콘 | Lucide React (이미 설치됨) | ❌ 불필요 | ❌ 불필요 |
| 페이지 진입 애니메이션 | GSAP (이미 설치됨) | ❌ 불필요 | ❌ 불필요 |
| 간단한 차트 | Tailwind CSS bar (CSS만으로) | ❌ 불필요 | ⚠️ 신규 작성 |
| 고급 차트 (선형/도넛) | Recharts 추가 설치 | ✅ 선택적 | ✅ 선택적 |
| 커맨드 팔레트 | cmdk 추가 설치 | ✅ 선택적 | ✅ 선택적 |

---

## 구현 후 확정 사항 (해결됨)

### 1. 권한 가드 재설계 (해결)

기존 가드(`currentScreen === 'admin'`)는 중첩 라우팅에서 누락 가능성이 있었고,
현재는 `AdminLayout` 내부 권한 가드로 이관되어 `/admin/*` 전 구간에서 일관 동작한다.

**변경 방향:**

```tsx
// AdminLayout.tsx 안에서 처리
function AdminLayout() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <AdminSkeleton />
  if (!isAdminRole(user?.role)) {
    return <Navigate to={user ? '/' : '/login'} replace />
  }

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div>
        <AdminHeader />
        <Outlet />
      </div>
    </div>
  )
}
```

`App.tsx`의 기존 `useEffect` 기반 문자열 가드는 제거되었고, 라우트 진입 제어는 `AdminLayout`이 담당한다.

---

### 2. 대시보드 KPI 데이터 소스 확정 (해결)

`/api/admin/perf/projects`는 응답속도 스냅샷 전용이라 사용자·프로젝트 집계 데이터를 제공하지 않는다.
각 KPI 지표의 데이터 소스를 아래와 같이 확정한다.

| KPI 지표 | 데이터 소스 | 방법 |
|----------|------------|------|
| 총 사용자 수 | `/api/admin/users` | `total` 필드 재활용 |
| 총 프로젝트 수 | `/api/admin/projects` | `total` 필드 재활용 |
| 처리 대기 신고 수 | `/api/admin/reports?status=open` | `total` 필드 재활용 |
| 이번 주 신규 가입자 | `/api/admin/users` | 클라이언트에서 `created_at` 기준 필터링 |
| 이번 주 증감 (↑↓) | `/api/admin/stats` 도입 완료 | `users_week_delta`, `projects_week_delta`로 제공 |

**해결:** 옵션 A를 적용해 백엔드 `/api/admin/stats` 집계 엔드포인트를 추가했고,
대시보드에서 `users_week_delta`, `projects_week_delta`, `weekly_trend`를 사용해 증감과 주간 추이를 표시한다.
