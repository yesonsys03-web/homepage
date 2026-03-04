# E-2 데이터 마이그레이션 계획

## 목적

기존 페이지 데이터를 새 블록 모델로 안전하게 이행한다.

## 문서 상태

- 상태: Draft v1
- Sprint: 3
- 선행: A-1, A-2
- 후행: E-1

## 범위 결정

- 옵션 A: 전량 이행
- 옵션 B: 핵심 페이지 우선 이행(권장)

## 매핑 규칙

- 기존 hero 영역 -> Hero 블록
- 기존 본문 -> RichText 블록
- 기존 대표 이미지 -> Image 블록
- 기존 CTA 링크 -> CTA 블록

## 이행 절차

1. 소스 데이터 추출
2. 변환 스크립트 실행
3. 샘플 페이지 검수
4. 전체 적용
5. 이력 백업 보관

## 검증 기준

- 필수 필드 누락 0건
- 주요 페이지 렌더 깨짐 0건
- 롤백 가능 스냅샷 확보

## DoD

- 변환 규칙표 확정
- 샘플 변환 결과 문서화
- 이행 실패 시 복구 절차 문서화

## 구현 반영 (Sprint 3)

- 마이그레이션 API
  - Preview: `GET /api/admin/pages/{page_id}/migration/preview`
  - Execute: `POST /api/admin/pages/{page_id}/migration/execute`
- 현재 지원 대상
  - `about_page` (legacy `site_contents.about_content` -> page document)
- 실행 동작
  - 소스 추출(`about_content`) -> 블록 문서 변환 -> validation 점검 -> 백업 생성 -> draft 저장
  - 모든 실행은 사전 백업(`about_content_migration_backup_*`)을 남긴 뒤 진행
  - `dryRun=true`는 백업/검증만 수행하고 실제 저장은 하지 않음
- 복구 절차
  - 저장 충돌/검증 실패 시 `backup_key`를 기준으로 원본 payload를 조회해 복구 가능
  - 운영자 로그(`page_migration_backup_created`, `page_migration_dry_run`, `page_migrated`)로 추적
- 보조 스크립트
  - `server/migrations/e2_data_extraction.py`
  - `server/migrations/e2_block_transform.py`
  - `server/migrations/e2_migration_runner.py`

## 변경 이력

- 2026-03-04: Sprint 3 초안 작성
- 2026-03-04: E-2 preview/execute API + 백업/검증/드라이런 + migration 스크립트 반영
