# A-4 권한 매트릭스

## 목적

페이지 편집 관련 액션의 역할별 허용 범위를 고정한다.

## 문서 상태

- 상태: Draft v1
- Sprint: 1
- 선행: A-3
- 후행: C-2, C-3

## 역할 정의

- `admin`: 운영 편집자
- `super_admin`: 승인/복구 권한 포함 운영 관리자

## 액션 매트릭스

| 액션 | admin | super_admin | 비고 |
|------|-------|-------------|------|
| draft 조회 | 허용 | 허용 | |
| draft 저장 | 허용 | 허용 | |
| 버전 목록/상세 조회 | 허용 | 허용 | |
| publish | 불가 | 허용 | reason 필수 |
| rollback | 불가 | 허용 | reason 필수 |
| rollback + publishNow | 불가 | 허용 | reason 필수 |

## 정책 결정 사항 (Sprint 1 블로커)

- 기본값: publish/rollback은 `super_admin`만 허용
- 대안: 승인 워크플로우 도입 시 `admin`은 publish 요청만 가능

## 서버 강제 원칙

- UI 숨김은 보조 수단, 서버 권한 검증이 최종 수단
- 민감 액션은 reason 미입력 시 400 반환

## 감사/추적

- publish/rollback에는 다음 필드 기록:
  - actor id
  - page id
  - target version
  - reason
  - timestamp

## 변경 이력

- 2026-03-04: Sprint 1 권한 초안 작성
