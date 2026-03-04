# E-1 단계적 롤아웃 계획

## 목적

리스크를 통제하면서 편집 기능을 점진적으로 운영에 적용한다.

## 문서 상태

- 상태: Draft v1
- Sprint: 3
- 선행: D-1, D-2, D-3
- 후행: E-3

## 롤아웃 단계

1. 내부 QA 전용
2. 운영자 소수 그룹 파일럿
3. 전체 운영자 오픈

## 게이트 조건

- 필수 테스트 통과
- 주요 성능 기준선 충족
- 감사 로그 수집 정상

## 롤백 트리거

- publish 실패율 급증
- rollback 비율 비정상 상승
- 충돌 처리 장애 다발

## 롤백 절차

- 즉시 feature toggle off
- 기존 편집 경로로 복귀
- 장애 원인/재발 방지 기록

## DoD

- 단계별 게이트/트리거 정의 완료
- 롤백 절차 runbook 문서화 완료

## 구현 반영 (Sprint 3)

- 정책/토글
  - `GET /api/admin/policies`, `PATCH /api/admin/policies`에 롤아웃 제어 필드 추가
    - `page_editor_enabled`
    - `page_editor_rollout_stage` (`qa` | `pilot` | `open`)
    - `page_editor_pilot_admin_ids`
    - `page_editor_publish_fail_rate_threshold`
    - `page_editor_rollback_ratio_threshold`
    - `page_editor_conflict_rate_threshold`
- 접근 게이트
  - 페이지 에디터 API 진입점에서 단계별 접근 제어 적용
    - 비활성화(`page_editor_enabled=false`) 시 차단
    - `qa` 단계: `super_admin`만 허용
    - `pilot` 단계: `super_admin` + 지정된 `pilot_admin_ids`만 허용
    - `open` 단계: 기존 admin 권한 정책에 따름
- 운영 UI
  - `AdminPolicies`에 E-1 롤아웃 제어 섹션 추가
  - 롤아웃 단계/파일럿 관리자/트리거 임계치 수정 및 저장 지원
- 롤백 절차 연결
  - 즉시 feature toggle off는 `page_editor_enabled=false`로 실행
  - 정책 변경은 `policy_updated` 로그로 감사 추적 가능

## 변경 이력

- 2026-03-04: Sprint 3 초안 작성
- 2026-03-04: E-1 롤아웃 토글/단계 게이트/API 접근 제어 반영
