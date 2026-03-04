# C-2 Publish 플로우 명세

## 목적

승인 가능한 상태에서만 안전하게 publish되도록 흐름을 정의한다.

## 문서 상태

- 상태: Draft v1
- Sprint: 2
- 선행: C-1, A-4
- 후행: C-3, D-2

## 진입 조건

- 유효성 검증 통과
- 저장된 최신 draft 존재
- 사용자 권한 `super_admin`

## Publish 절차

1. Publish 클릭
2. 확인 모달 표시
3. reason 입력 필수 확인
4. `POST /api/admin/pages/:id/publish` 호출
5. 성공 시 publishedVersion 표시 및 알림

## 실패 시나리오

- 403: 권한 부족
- 409: 대상 draftVersion 충돌
- 422: reason/유효성 오류

## 운영 규칙

- publish는 롤백 가능한 버전 이력을 남겨야 함
- 같은 draft를 중복 publish하면 idempotent 처리 또는 명확한 경고

## 감사 로그

- 이벤트: `page_published`
- 필수 필드: actor, page_id, source_version, published_version, reason, timestamp

## DoD

- 확인 모달/사유 필수/권한 검증 규칙 문서화
- 성공/실패 UX 및 응답 처리 정의
- 감사 로그 필드 정의 완료

## 변경 이력

- 2026-03-04: Sprint 2 초안 작성
