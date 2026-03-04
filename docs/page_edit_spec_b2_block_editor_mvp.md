# B-2 블록 에디터 MVP 명세

## 목적

MVP에서 제공할 블록 에디팅 기능 범위를 고정한다.

## 문서 상태

- 상태: Draft v1
- Sprint: 2
- 선행: B-1
- 후행: B-4

## MVP 블록 범위

- Hero
- RichText
- Image
- CTA

## 공통 편집 기능

- 블록 추가
- 블록 복제
- 블록 삭제
- 드래그 정렬
- visible 토글

## UI 구성

- 좌측: 블록 리스트/정렬 핸들
- 중앙: 캔버스
- 우측: 속성 패널

## 블록별 최소 필드

- Hero: headline, subheadline, ctaLabel, ctaHref
- RichText: body
- Image: src, alt, caption
- CTA: label, href, style

## 비범위(후속)

- FAQ/Gallery/FeatureList 편집 UI
- 고급 스타일 토큰 편집
- 멀티 섹션 동시 편집

## DoD

- 4개 블록 생성/수정/정렬/삭제/복제 정의 완료
- 공통 컴포넌트 책임 분리안 문서화
- 후속 확장 블록 항목 분리 완료

## 변경 이력

- 2026-03-04: Sprint 2 초안 작성
