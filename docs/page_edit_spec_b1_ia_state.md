# B-1 편집기 IA 및 상태전환 명세

## 목적

`/admin/pages` 편집 화면의 정보 구조와 상태 전환을 고정한다.

## 문서 상태

- 상태: Draft v1
- Sprint: 1
- 선행: A-3
- 후행: B-2, B-3, C-1

## IA

`/admin/pages` 하위 탭:

1. 개요
2. 편집기
3. 미리보기
4. 버전
5. 설정

## 탭별 핵심 책임

- 개요: 페이지 목록/상태/최근 수정자
- 편집기: 블록 편집, 순서 변경, visible 토글
- 미리보기: MVP는 desktop/mobile, tablet은 Phase 4
- 버전: 버전 목록, diff 진입, 롤백 실행
- 설정: SEO, 게시 정책

## 상태 모델

- `idle`: 로드 완료, 미수정
- `dirty`: 변경됨, 미저장
- `saving`: 저장 진행
- `conflict`: `baseVersion` 충돌
- `publish_ready`: 검증 통과

## 상태 전환

- `idle -> dirty`: 입력/정렬/토글 변경
- `dirty -> saving`: 저장 클릭
- `saving -> idle`: 저장 성공
- `saving -> conflict`: 409 충돌
- `idle/dirty -> publish_ready`: 검증 통과

## 충돌 UX (MVP)

- 충돌 발생 시 저장 중단
- "최신 버전 비교"와 "내 변경 복사" 액션 제공
- 자동 머지는 MVP 범위 밖

## 접근성/사용성 기준

- 키보드 탐색 가능(탭 이동)
- 주요 액션에 명확한 라벨
- 오류 메시지 위치 일관성 유지

## 변경 이력

- 2026-03-04: Sprint 1 IA/상태전환 초안 작성
