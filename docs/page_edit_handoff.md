# Page Edit 실행 Handoff

## 문서 목적

`page_edit` 관련 기획/태스크/스펙을 한 문서에서 실행 가능하도록 통합한다.

- 대상: PM, FE, BE, QA, 운영
- 범위: Sprint 1~3 + Sprint 4(선택)
- 상태: 구현 전 handoff 완료본

## 1) 소스 문서 맵

기획/태스크/요약:

- `docs/page_edit.md`
- `docs/page_edit_tasks.md`
- `docs/page_edit_one_pager.md`

Sprint 인덱스:

- `docs/page_edit_sprint1_index.md`
- `docs/page_edit_sprint2_index.md`
- `docs/page_edit_sprint3_index.md`

Sprint 1 스펙:

- `docs/page_edit_spec_a1_schema.md`
- `docs/page_edit_spec_a2_version_model.md`
- `docs/page_edit_spec_a3_api_contract.md`
- `docs/page_edit_spec_a4_auth_matrix.md`
- `docs/page_edit_spec_b1_ia_state.md`

Sprint 2 스펙:

- `docs/page_edit_spec_c1_draft_flow.md`
- `docs/page_edit_spec_c2_publish_flow.md`
- `docs/page_edit_spec_b2_block_editor_mvp.md`
- `docs/page_edit_spec_b3_preview_mode.md`
- `docs/page_edit_spec_b4_guardrails.md`
- `docs/page_edit_spec_c1a_conflict_strategy.md`

Sprint 3 스펙:

- `docs/page_edit_spec_c3_version_rollback.md`
- `docs/page_edit_spec_d1_test_strategy.md`
- `docs/page_edit_spec_d2_audit_observability.md`
- `docs/page_edit_spec_d3_performance_baseline.md`
- `docs/page_edit_spec_e1_rollout_plan.md`
- `docs/page_edit_spec_e2_migration_plan.md`
- `docs/page_edit_spec_e3_operations_guide.md`

## 2) 최종 범위 확정

MVP 포함:

- Draft/Publish 분리
- 버전 이력/롤백
- 블록 에디터 MVP(Hero/RichText/Image/CTA)
- 프리뷰 desktop/mobile
- 충돌 전략 확정(구현 제외)

MVP 제외:

- 예약 발행
- 충돌 감지 실제 구현
- tablet 프리뷰

## 3) 스프린트 실행 순서

### Sprint 1 (설계 기반 고정)

1. A-1 페이지 스키마
2. A-2 버전 저장 모델
3. A-3 API 계약
4. A-4 권한 매트릭스
5. B-1 IA/상태전환

게이트:

- 권한 블로커 합의 완료
- API/스키마 승인 완료

### Sprint 2 (핵심 편집 흐름)

1. C-1 Draft 저장 플로우
2. C-2 Publish 플로우
3. B-2 블록 에디터 MVP
4. B-3 프리뷰 모드
5. B-4 UX 가드레일
6. C-1a 충돌 전략

게이트:

- 저장/배포/충돌 UX 시나리오 승인
- B-4 검증 기준 승인

### Sprint 3 (품질/운영 이행)

1. C-3 버전 비교/롤백
2. D-1 테스트 전략
3. D-2 감사로그/관측
4. D-3 성능 기준선
5. E-1 롤아웃 계획
6. E-2 마이그레이션 계획
7. E-3 운영 가이드

게이트:

- 스테이징 점검 통과
- 운영 runbook 검토 완료

### Sprint 4 (선택)

- 예약 발행
- 충돌 감지 구현
- tablet 프리뷰
- 확장 블록 타입

## 4) 즉시 의사결정 블로커

아래는 구현 착수 전 반드시 결정해야 하는 항목이다.

1. publish 권한을 `super_admin`으로 고정할지
2. 마이그레이션 범위를 전량/핵심 페이지 중 어디까지 할지

참고: 충돌 전략은 권장 기본값(낙관적 동시성)이 정의됨.

## 5) 운영/보안 고정 원칙

- UI 숨김이 아니라 서버 권한 검증이 최종 방어선
- publish/rollback reason 필수
- write 액션은 기존 `admin_action_logs` 인프라 사용

## 6) 품질 기준(Go/No-Go)

- 기능:
  - 필수 시나리오(저장/배포/롤백/충돌) 문서화 및 승인
- 테스트:
  - 단위/통합/E2E 매트릭스 작성
- 성능:
  - Lighthouse CI + Web Vitals + 커스텀 메트릭 기준선 확보
- 운영:
  - 장애 대응/롤백 runbook 준비

## 7) 착수 체크리스트

- [ ] Sprint 1 블로커 2건 합의
- [ ] API 계약 리뷰 승인
- [ ] 데이터 모델 리뷰 승인
- [ ] QA 참여 범위 확정
- [ ] 운영 담당자 지정

## 8) 전달 상태

- 문서 전달 대상: PM/FE/BE/QA/운영
- 전달 형식: 본 문서 + Sprint 인덱스 + 세부 스펙 링크
- 다음 액션: Sprint 1 kickoff 일정 확정
