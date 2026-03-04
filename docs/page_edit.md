# Page Edit 기능 개선 기획안

## 1) 배경과 문제

현재 페이지 편집 기능은 단순 입력 중심이라 운영팀이 실제로 원하는 편집 흐름을 지원하지 못한다.

- 구성 단위가 고정되어 재배치/재사용이 어렵다
- 저장과 반영이 분리되지 않아 실수 배포 위험이 있다
- 변경 이력/승인/롤백 흐름이 약해 운영 통제가 어렵다
- 모바일/데스크톱 결과를 편집 중 즉시 검증하기 어렵다

## 2) 목표

"폼 입력"이 아니라 "콘텐츠 운영 도구"로 전환한다.

- 블록 기반 편집으로 섹션 조립/순서 변경/가시성 제어
- Draft/Publish 분리로 안전한 반영
- 버전 이력 + 롤백으로 운영 안정성 강화
- 실시간 프리뷰(디바이스별)로 배포 전 검수 품질 향상

## 3) 핵심 컨셉

### 3.1 블록 에디터

페이지를 다음 블록 조합으로 구성한다.

- Hero
- RichText
- Image
- CTA
- FAQ
- Gallery
- FeatureList

각 블록은 공통적으로 `id`, `type`, `visible`, `order`, `content`, `style` 속성을 가진다.

### 3.2 편집 상태 분리

- `draft`: 작업 중 상태, 외부 노출 없음
- `published`: 실제 사용자 노출 상태

편집자는 draft를 여러 번 저장하고, 승인/확인 후 publish한다.

### 3.3 버전/감사

- 버전 스냅샷(누가/언제/무엇 변경)
- 버전 간 diff 비교
- 원클릭 롤백
- 모든 publish/rollback 액션은 관리자 로그에 기록

## 4) 사용자 시나리오

### 4.1 콘텐츠 매니저

1. 페이지 선택
2. 블록 추가/수정/순서 변경
3. 미리보기로 검수
4. draft 저장
5. 승인 요청

### 4.2 수퍼 어드민(승인자)

1. 변경 diff 확인
2. 정책/품질 체크
3. publish 승인
4. 문제 발생 시 이전 버전 롤백

## 5) 정보 구조(IA)

`/admin/pages` 하위에 다음 탭을 둔다.

- `개요`: 페이지 목록, 상태, 마지막 수정자
- `편집기`: 블록 캔버스 + 속성 패널
- `미리보기`: desktop/tablet/mobile 토글 (tablet은 Phase 4 확장 범위)
- `버전`: 이력, 비교, 롤백
- `설정`: SEO 메타, 공개 스케줄, 권한 정책

## 6) 기능 요구사항

### 6.1 편집기

- 블록 추가/복제/삭제
- 드래그 앤 드롭 정렬
- 섹션 가시성 토글
- 공통 템플릿 불러오기

### 6.2 검증

- 필수 필드 누락 검사
- 텍스트 길이/이미지 비율 검사
- 금칙어 및 정책 위반 검사
- 배포 가능 여부 체크리스트 제공

### 6.3 배포

- 저장(draft) / 반영(publish) 버튼 분리
- 예약 발행(후속 단계: Phase 4)
- publish 전 확인 모달

### 6.4 협업

- 변경자/검토자 표시
- 코멘트(선택)
- 충돌 감지(다중 편집 시): MVP는 전략 확정만 수행하고 구현은 후속 단계로 분리

## 7) 데이터 모델 초안

```ts
type PageDocument = {
  pageId: string
  status: "draft" | "published"
  version: number
  title: string
  seo: {
    metaTitle: string
    metaDescription: string
    ogImage?: string
  }
  blocks: Array<{
    id: string
    type: "hero" | "rich_text" | "image" | "cta" | "faq" | "gallery" | "feature_list"
    order: number
    visible: boolean
    content: Record<string, unknown>
    style?: Record<string, unknown>
  }>
  updatedBy: string
  updatedAt: string
}
```

## 8) API 초안

- `GET /api/admin/pages/:id/draft`
- `PUT /api/admin/pages/:id/draft`
- `POST /api/admin/pages/:id/publish`
- `GET /api/admin/pages/:id/versions`
- `GET /api/admin/pages/:id/versions/:version`
- `POST /api/admin/pages/:id/rollback`

모든 write 액션은 admin action log와 연결한다.

## 9) 권한 정책

- `admin`: draft 수정 가능, publish 불가
- `super_admin`: publish/rollback 포함 전체 권한

민감 액션(publish/rollback)은 reason 입력을 강제한다.

## 10) 단계별 구현 계획

### Phase 1 (1주) - 안정성 기반

- Draft/Publish 분리
- 버전 스냅샷 저장
- 기본 롤백

### Phase 2 (1~2주) - 편집 경험 강화

- 블록 에디터 + 드래그 정렬
- 실시간 프리뷰(3 디바이스, tablet은 후속 확장)
- 필수 검증 체크리스트

### Phase 3 (1주) - 운영 고도화

- 승인 흐름/코멘트
- 이력 diff UI

### Phase 4 (선택) - 고급 운영 기능

- 예약 발행
- 충돌 감지 구현(선택된 전략 적용)

## 11) 성공 지표(KPI)

- 페이지 수정 소요 시간 40% 단축
- 배포 후 핫픽스 건수 50% 감소
- 롤백 평균 시간 10분 이내
- 관리자 만족도(내부 설문) 4.0/5.0 이상

## 12) 리스크 및 대응

- 복잡도 급상승: 블록 타입을 7개로 제한해 시작
- 기존 데이터 호환: 마이그레이션 스크립트/백필 준비
- 성능 저하: 블록 단위 렌더 최적화 및 지연 로딩 적용
- 측정 불일치 리스크: Lighthouse CI + Web Vitals + 편집 이벤트 커스텀 메트릭으로 기준선 고정

## 13) 바로 실행 가능한 최소 범위(MVP)

이번 스프린트에서는 아래만 먼저 구현한다.

- Draft/Publish 분리
- 버전 이력/롤백
- Hero/RichText/Image/CTA 4개 블록
- desktop/mobile 프리뷰
- 충돌 감지 전략 확정(구현 제외)

MVP 제외 항목:

- 예약 발행
- 충돌 감지 실제 구현
- tablet 프리뷰(초기 MVP에서는 desktop/mobile 우선)

이 MVP만 완료해도 "편집 부실"의 핵심 원인은 대부분 해소된다.
