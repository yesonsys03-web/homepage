# A-1 페이지 스키마 명세

## 목적

페이지 편집 도메인의 단일 계약 모델을 정의한다.

## 문서 상태

- 상태: Draft v1
- Sprint: 1
- 선행: 없음
- 후행: A-2, A-3

## 엔티티

### 1) PageDocument

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
  blocks: PageBlock[]
  updatedBy: string
  updatedAt: string
}
```

### 2) PageBlock

```ts
type PageBlock = {
  id: string
  type: "hero" | "rich_text" | "image" | "cta" | "faq" | "gallery" | "feature_list"
  order: number
  visible: boolean
  content: Record<string, unknown>
  style?: Record<string, unknown>
}
```

## 필드 제약

- `pageId`: URL-safe slug, immutable
- `version`: 1부터 시작, 저장 시 증가 정책은 A-2에서 확정
- `blocks[].id`: 문서 내 유일
- `blocks[].order`: 0 이상의 정수, 중복 불가
- `seo.metaTitle`: 최대 70자 권장
- `seo.metaDescription`: 최대 160자 권장

## 블록별 content 최소 스키마 (MVP)

- `hero`: `{ headline: string, subheadline?: string, ctaLabel?: string, ctaHref?: string }`
- `rich_text`: `{ body: string }`
- `image`: `{ src: string, alt: string, caption?: string }`
- `cta`: `{ label: string, href: string, style?: "primary" | "secondary" }`

## 검증 분류

- Blocking
  - 필수 필드 누락
  - URL 필드 형식 오류
  - 블록 order 충돌
- Warning
  - 권장 길이 초과
  - alt/caption 미작성

## 변경 이력

- 2026-03-04: Sprint 1 초기 명세 작성
