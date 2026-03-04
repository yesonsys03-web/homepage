# C-1 Draft 저장 플로우 명세

## 목적

편집 데이터 유실 없이 draft를 저장하는 흐름을 고정한다.

## 문서 상태

- 상태: Draft v1
- Sprint: 2
- 선행: A-3, B-1
- 후행: C-1a, C-3

## 저장 시나리오

### 수동 저장

1. 사용자가 저장 클릭
2. 클라이언트가 변경 검증 수행
3. `PUT /api/admin/pages/:id/draft` 호출 (`baseVersion` 포함)
4. 성공 시 `savedVersion` 반영, 상태 `idle`

### 자동 저장(권장)

- 입력 후 3~5초 debounce로 저장 시도
- 자동 저장 실패 시 배너 알림 + 수동 재시도 버튼 노출

## 실패 처리

- 409 충돌: `conflict` 상태 전환, 비교/재시도 UX 제공
- 422 검증 실패: 필드별 오류 표시
- 5xx 서버 오류: 임시 저장(local) + 재시도 안내

## 상태 전환

- `dirty -> saving -> idle`
- `saving -> conflict`
- `saving -> error`

## 감사 로그

- 이벤트: `page_draft_saved`
- 필수 필드: actor, page_id, version, source(manual/auto), timestamp

## DoD

- 수동 저장 플로우 문서화 완료
- 자동 저장 정책 확정(주기/재시도 규칙)
- 충돌/검증/서버 오류 대응 시나리오 문서화 완료

## 변경 이력

- 2026-03-04: Sprint 2 초안 작성
