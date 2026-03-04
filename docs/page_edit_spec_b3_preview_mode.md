# B-3 프리뷰 모드 명세

## 목적

편집 중 결과를 빠르게 검수할 수 있는 프리뷰 동작을 정의한다.

## 문서 상태

- 상태: Draft v1
- Sprint: 2
- 선행: B-2
- 후행: D-3

## MVP 범위

- 디바이스: desktop, mobile
- 데이터 소스: 현재 draft
- 렌더 모드: 읽기 전용

## 후속 범위

- tablet 프리뷰 (Phase 4)
- 공유 가능한 프리뷰 링크

## 동작 규칙

- 저장 전 변경도 프리뷰에서 반영(로컬 상태 기반)
- publish 상태와 draft 상태를 명확히 구분 배지로 표기
- 로딩 실패 시 skeleton + 오류 메시지 표준 노출

## DoD

- desktop/mobile 토글 규칙 확정
- draft/published 구분 표기 규칙 문서화
- tablet 범위가 후속임을 명시

## 변경 이력

- 2026-03-04: Sprint 2 초안 작성
