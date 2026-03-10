# Page Edit 실행 요약 (One Pager)

## 목적

페이지 편집 기능을 "단순 입력 폼"에서 "운영 가능한 편집 시스템"으로 전환한다.

- 편집 속도 향상
- 배포 안정성 강화
- 롤백/감사 가능성 확보

## 현재 문제

- 저장과 반영이 분리되지 않아 배포 리스크가 큼
- 버전/롤백 흐름이 약해 운영 복구가 어려움
- 블록 재사용/정렬/미리보기가 약해 편집 생산성이 낮음

## 핵심 방향

1. Draft/Publish 분리
2. 버전 이력 + 롤백
3. 블록 기반 편집(MVP: 4개 블록)
4. 디바이스 프리뷰(desktop/mobile)
5. 권한/감사 로그 강제

## MVP 범위 (이번 사이클)

- Draft 저장 / Publish 분리
- 버전 스냅샷 조회 + 롤백
- Hero / RichText / Image / CTA 블록
- desktop/mobile 프리뷰
- 충돌 감지 **전략 확정만** 수행 (구현 제외)

### MVP 제외

- 예약 발행
- 충돌 감지 실제 구현
- tablet 프리뷰(Phase 4 확장)

## 권한 정책

- `admin`: draft 수정 가능, publish 불가
- `super_admin`: publish/rollback 가능
- publish/rollback 시 reason 필수

## API 최소 계약

- `GET /api/admin/pages/:id/draft`
- `PUT /api/admin/pages/:id/draft`
- `POST /api/admin/pages/:id/publish`
- `GET /api/admin/pages/:id/versions`
- `GET /api/admin/pages/:id/versions/:version`
- `POST /api/admin/pages/:id/rollback`

모든 write 액션은 admin action log와 연결한다.
(admin_action_logs 인프라 기존재 - 신규 구축 불필요)

## 실행 순서 (우선순위)

1. A-1 페이지 스키마 확정
2. A-2 버전 저장 모델 확정
3. A-3 API 계약 확정
4. A-4 권한 정책 상세화
5. B-1 편집기 IA 고정
6. C-1/C-2 Draft/Publish 플로우 확정
7. B-2/B-3 블록 MVP + 프리뷰 설계
8. B-4 편집 UX 가드레일 확정
9. C-1a 충돌 감지 전략 결정
10. C-3 버전 비교/롤백 플로우 정리

## 스프린트 계획 (2주 기준)

- Sprint 1: A-1, A-2, A-3, A-4, B-1
- Sprint 2: C-1, C-2, B-2, B-3, B-4, C-1a
- Sprint 3: C-3, D-1, D-2, D-3, E-1, E-2, E-3
- Sprint 4(선택): 예약 발행, 충돌 감지 구현, 확장 블록

## 품질/운영 기준

- 테스트: 단위/통합/E2E 매트릭스 필수
- 관측: publish/rollback/draft_saved 이벤트 로깅
- 성능 기준선: Lighthouse CI + Web Vitals + 편집 이벤트 커스텀 메트릭

## 성공 지표

- 페이지 수정 소요 시간 40% 단축
- 배포 후 핫픽스 건수 50% 감소
- 롤백 평균 시간 10분 이내
- 관리자 만족도(내부 설문) 4.0/5.0 이상

## 즉시 의사결정 필요 항목

1. publish 권한을 super_admin 고정할지
2. 충돌 전략 최종 확정 (권장: 낙관적 동시성 -> 추후 편집 락 검토)
3. 마이그레이션 범위를 전량/핵심 페이지 중 어디까지로 할지

---

참고 문서:

- `docs/page_edit.md`
- `docs/page_edit_tasks.md`
