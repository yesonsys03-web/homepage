# E-3 운영 가이드 명세

## 목적

편집자/승인자가 일관된 절차로 운영할 수 있도록 가이드를 정의한다.

## 문서 상태

- 상태: Draft v1
- Sprint: 3
- 선행: C-2, C-3, D-2, E-1
- 후행: 없음

## 역할별 운영 절차

### 편집자(admin)

1. draft 편집
2. 가드레일 검증
3. 승인 요청

실행 체크:
- Draft 저장 전 `blockingIssues=0` 확인
- Preview(Desktop/Mobile) 확인 후 변경 이유(reason) 정리
- 충돌 발생 시 `최신 Draft 불러오기` 후 재적용

### 승인자(super_admin)

1. diff 검토
2. reason 확인
3. publish 또는 반려

실행 체크:
- `baseVersion/publishedVersion` 정합성 확인
- publish 실패 시 validation 응답 필드/메시지 확인
- 필요 시 `rollback`으로 직전 안정 버전 복원

## 장애 대응

- publish 실패: 원인 확인 -> 재시도 또는 롤백
- 충돌 빈발: 동시 편집 패턴 점검
- 성능 저하: D-3 기준선과 비교

### 즉시 대응 Runbook

1. 기능 차단(필요 시)
   - 정책에서 `page_editor_enabled=false` 적용
2. 상태 확인
   - 관측 API: `GET /api/admin/action-logs/observability`
   - 성능 API: `GET /api/admin/perf/page-editor`
3. 복구 선택
   - 버전 복구: `POST /api/admin/pages/{page_id}/rollback`
   - 백업 목록 조회: `GET /api/admin/pages/{page_id}/migration/backups`
   - 마이그레이션 복구: `POST /api/admin/pages/{page_id}/migration/restore`
4. 사후 기록
   - `policy_updated`, `page_rolled_back`, `page_migration_restored` 로그 확인

## 운영 체크리스트

- 배포 전: validation pass, preview 확인
- 배포 후: 로그 이벤트 확인
- 주간: rollback/publish 비율 점검

### 배포 전
- [ ] 롤아웃 단계(`qa/pilot/open`)가 배포 목표와 일치
- [ ] `page_editor_enabled=true` 상태 확인
- [ ] diff/preview 검증 완료
- [ ] reason 정책(필수 입력) 준수 확인

### 배포 후
- [ ] `page_published` 이벤트 확인
- [ ] `page_publish_failed`/`page_conflict_detected` 급증 여부 확인
- [ ] `page_perf_*` p75가 기준선 이내인지 확인

### 주간 점검
- [ ] rollback ratio가 임계치 이하인지 확인
- [ ] publish failure distribution 상위 원인 추적
- [ ] 마이그레이션 백업 키(`about_page_migration_backup_*`) 보존 상태 확인

## 온보딩

- 신규 운영자 교육 시나리오
- 자주 발생하는 실수/FAQ

### 신규 운영자 60분 온보딩 시나리오

1. 0~15분: 권한/역할 설명(admin vs super_admin)
2. 15~30분: Draft 편집/가드레일/Preview 실습
3. 30~45분: 승인자 diff 검토 + publish 실습
4. 45~60분: 장애 대응(롤백/토글 off/로그 추적) 실습

### FAQ

- Q. publish 실패가 반복될 때 우선순위는?
  - A. `page_editor_enabled=false`로 즉시 차단 후, observability/validation 원인 분석
- Q. 마이그레이션 적용 후 이상이 있으면?
  - A. backup 목록 API에서 `backupKey`를 선택한 뒤 migration restore를 dry-run 확인 후 복구 실행
- Q. 파일럿 운영자만 접근시키려면?
  - A. `page_editor_rollout_stage=pilot` + `page_editor_pilot_admin_ids` 설정

## 운영 API 레퍼런스

- 정책/롤아웃
  - `GET /api/admin/policies`
  - `PATCH /api/admin/policies`
- 페이지 편집
  - `GET /api/admin/pages/{page_id}/draft`
  - `PUT /api/admin/pages/{page_id}/draft`
  - `POST /api/admin/pages/{page_id}/publish`
  - `POST /api/admin/pages/{page_id}/rollback`
- 관측/성능
  - `GET /api/admin/action-logs/observability`
  - `GET /api/admin/perf/page-editor`
- 마이그레이션
  - `GET /api/admin/pages/{page_id}/migration/preview`
  - `GET /api/admin/pages/{page_id}/migration/backups`
  - `POST /api/admin/pages/{page_id}/migration/execute`
  - `POST /api/admin/pages/{page_id}/migration/restore`

## DoD

- 역할별 운영 절차 문서화
- 장애 대응 절차 문서화
- 온보딩/FAQ 초안 작성
- 운영 API 레퍼런스와 복구 절차가 실제 구현과 일치

## 변경 이력

- 2026-03-04: Sprint 3 초안 작성
- 2026-03-04: E-1/E-2 실제 구현 반영한 운영 runbook/체크리스트/FAQ/API 레퍼런스 보강
