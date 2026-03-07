# Backend Server Admin Menual

## 1. 문서 목적
- 이 문서는 VibeCoder Playground 백엔드 서버를 나중에 내가 다시 봐도 빠르게 이해하고 운영할 수 있도록 만든 실무용 관리 메뉴얼이다.
- 대상 범위는 `server/` 기준 FastAPI 서버, 관리자 API, 인증/권한, DB 초기화, 운영 점검, 테스트, 장애 대응의 기초 절차다.
- 이 문서는 개발이 완료될 때까지 계속 업데이트한다.

## 2. 업데이트 원칙
- 백엔드 구조, 환경 변수, 관리자 API, 운영 절차가 바뀌면 같은 날 이 문서를 먼저 또는 함께 업데이트한다.
- 기능 구현 문맥은 `docs/IMPLEMENTATION_LEARNING_LOG.md`에 남기고, 실제 운영 절차와 제어 포인트는 이 문서에 반영한다.
- 명령어는 실제 repo에서 검증된 것만 적는다.

## 3. 현재 백엔드 한눈에 보기

### 핵심 경로
- `server/main.py`: FastAPI 앱, 인증 의존성, 관리자 API 라우트, startup/shutdown 흐름
- `server/db.py`: PostgreSQL 연결 풀, 테이블 초기화, admin/curated/page 관련 DB 함수
- `server/auth.py`: JWT 생성/검증, 비밀번호 해시
- `server/tests/`: 관리자 권한, curated analytics, page editor 등의 회귀 테스트
- `server/pyproject.toml`: 백엔드 의존성 및 dev test 그룹
- `server/.env.example`: 서버 환경 변수 예시
- `docs/UV_WORKFLOW.md`: `uv` 기반 실행/테스트 규칙
- `docs/ADMIN_USER_ENFORCEMENT_PLAN.md`: 관리자 사용자 제재 정책 설계 메모

### 실제 패키지 경계
- 프론트 루트와 별도로, Python 백엔드의 실제 실행 경계는 `server/`다.
- 백엔드 테스트도 `server/`에서 실행하는 것을 기준으로 삼는다.

## 4. 서버 실행과 기본 명령어

### 최초 세팅
```bash
cd server
uv sync
```

### 개발 서버 실행
```bash
cd server
uv run uvicorn main:app --reload
```

### 백엔드 테스트
```bash
cd server
uv run --group dev pytest
```

### 특정 테스트만 실행
```bash
cd server
uv run --group dev pytest tests/test_admin_user_enforcement.py
uv run --group dev pytest tests/test_curated_related_api.py
```

### 의존성 변경 후 잠금 파일 갱신
```bash
cd server
uv lock
```

## 5. 환경 변수 체크 포인트

### 자주 보는 값
- `DATABASE_URL`: DB 연결. 없으면 서버 부팅이 실패한다.
- `SECRET_KEY`: JWT 서명 키. 운영 환경에서는 반드시 안전한 값이어야 한다.
- `ALLOWED_ORIGINS`: 프론트 허용 출처
- `ENFORCE_HTTPS`: HTTPS 강제 여부
- `PUBLIC_BASE_URL`: 외부 공개 기준 URL
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth 운영값
- `GEMINI_API_KEY`, `GITHUB_TOKEN`: curated/github 수집 기능에 필요

### 주의
- `server/.env.example`에 있는 값만 믿지 말고, 실제 `server/main.py`, `server/db.py`, `server/auth.py`에서 읽는 값을 기준으로 관리한다.
- 특히 `DATABASE_URL`은 `server/.env.example`에 빠져 있어도 실제 서버에는 반드시 필요하다.

## 6. 부팅 시 서버가 하는 일
- `server/main.py`의 startup 흐름에서 DB 초기화가 먼저 돈다.
- `server/db.py:init_db()`가 테이블 생성/보정, 일부 컬럼 추가, 인덱스 생성, 기본 데이터 준비를 담당한다.
- moderation baseline, curated 관련 테이블, admin action log, page 문서 관련 구조도 startup 흐름에 묶여 있다.
- 즉, 서버가 안 뜨면 먼저 `DATABASE_URL`, DB 접속 가능 여부, startup 중 예외를 의심해야 한다.

## 7. 인증과 관리자 권한 구조

### 핵심 함수
- `get_current_user`: JWT 기반 현재 사용자 조회
- `require_admin`: `admin`, `super_admin` 허용
- `require_super_admin`: `super_admin`만 허용
- `require_admin_from_request`: request에서 관리자 권한을 바로 검사하는 경량 경로

### 운영 이해 포인트
- `/api/admin/*` 전체가 다 같은 권한이 아니다.
- 일반 admin으로 가능한 작업과 super_admin 전용 작업이 분리되어 있다.
- 계정 삭제, 페이지 publish/rollback 일부, 강한 제어 작업은 super_admin 여부를 꼭 확인해야 한다.

## 8. 관리자 API 영역 지도

### 8-1. 대시보드/운영 메트릭
- `GET /api/admin/stats`
- `GET /api/admin/action-logs`
- `GET /api/admin/action-logs/observability`
- `GET /api/admin/perf/projects`
- `GET /api/admin/perf/page-editor`
- `POST /api/admin/perf/page-editor/events`

### 8-2. 사용자 관리
- `GET /api/admin/users`
- `PATCH /api/admin/users/{user_id}/role`
- `POST /api/admin/users/{user_id}/limit`
- `DELETE /api/admin/users/{user_id}/limit`
- `POST /api/admin/users/{user_id}/suspend`
- `DELETE /api/admin/users/{user_id}/suspend`
- `POST /api/admin/users/{user_id}/tokens/revoke`
- `POST /api/admin/users/{user_id}/delete-schedule`
- `DELETE /api/admin/users/{user_id}/delete-schedule`
- `POST /api/admin/users/{user_id}/delete-now`
- `POST /api/admin/users/{user_id}/approve`
- `POST /api/admin/users/{user_id}/reject`

### 8-3. 프로젝트/신고 관리
- `GET /api/admin/projects`
- `PATCH /api/admin/projects/{project_id}`
- `POST /api/admin/projects/{project_id}/hide`
- `POST /api/admin/projects/{project_id}/restore`
- `DELETE /api/admin/projects/{project_id}`
- `GET /api/admin/reports`
- `PATCH /api/admin/reports/{report_id}`

### 8-4. curated 운영
- `GET /api/admin/curated`
- `PATCH /api/admin/curated/{content_id}`
- `DELETE /api/admin/curated/{content_id}`
- `POST /api/admin/curated/run`
- `GET /api/admin/curated/related-clicks/summary`

### 8-5. 페이지/콘텐츠 운영
- `GET /api/admin/policies`
- `PATCH /api/admin/policies`
- `PATCH /api/admin/content/about`
- `GET /api/admin/pages/{page_id}/draft`
- `PUT /api/admin/pages/{page_id}/draft`
- `POST /api/admin/pages/{page_id}/publish`
- `GET /api/admin/pages/{page_id}/versions`
- `GET /api/admin/pages/{page_id}/versions/{version}`
- `POST /api/admin/pages/{page_id}/rollback`

### 8-6. 페이지 배포 스케줄/마이그레이션
- `GET /api/admin/pages/{page_id}/publish-schedules`
- `POST /api/admin/pages/{page_id}/publish-schedules`
- `POST /api/admin/pages/{page_id}/publish-schedules/{schedule_id}/cancel`
- `POST /api/admin/pages/{page_id}/publish-schedules/{schedule_id}/retry`
- `POST /api/admin/pages/{page_id}/publish-schedules/process`
- `GET /api/admin/pages/{page_id}/migration/preview`
- `GET /api/admin/pages/{page_id}/migration/backups`
- `POST /api/admin/pages/{page_id}/migration/execute`
- `POST /api/admin/pages/{page_id}/migration/restore`

### 8-7. OAuth 운영 설정
- `GET /api/admin/integrations/oauth`
- `PATCH /api/admin/integrations/oauth`
- `GET /api/admin/integrations/oauth/health`

## 9. 최근 curated analytics 흐름
- 사용자 화면은 `GET /api/curated/{content_id}/related`로 추천 후보와 추천 이유를 서버에서 받는다.
- 추천 클릭 시 `POST /api/curated/related-clicks`로 source/target/reason 정보가 저장된다.
- 운영 화면은 `GET /api/admin/curated/related-clicks/summary`로 집계 데이터를 본다.
- 최근 작업 기준으로 추천 이유는 `reason_code + label` 기준으로 정리되어 있고, 과거 자유 텍스트 reason은 서버에서 정규화해 집계한다.
- 운영자가 봐야 할 핵심 지표는 top pair, top reason, source content 기준 필터다.

## 10. curated review queue 운영 가이드

### 10-1. 현재 review status 의미
- `pending`
  - 일반 검수 대기
  - 자동 수집은 통과했지만 운영자가 최종 확인해야 하는 기본 상태다.
- `review_license`
  - 라이선스 정보가 비어 있거나 불명확한 후보
  - 재사용 가능 여부를 먼저 확인해야 한다.
  - `review_metadata.reason_codes`에 `license_missing` 또는 `license_unrecognized`가 남는다.
- `review_duplicate`
  - 기존 curated 또는 같은 수집 배치 안에서 중복 의심 신호가 감지된 후보
  - 현재 신호는 `canonical_url`, `repo_owner + repo_name`, 정규화된 `title` 기준이다.
  - 관리자 화면에서는 `review_metadata` 기반으로 `URL 일치`, `owner/repo 일치`, `제목 일치` 칩을 함께 보여 준다.
- `review_quality`
  - 수집은 되었지만 quality 기준이 낮아 추가 검토가 필요한 후보
  - README/Gemini/heuristic 결과를 함께 보고 유지 여부를 판단한다.
  - 현재 기준 미달 신호는 `review_metadata.reason_codes = ["quality_below_threshold"]`이며 `quality_score_value`, `quality_threshold`도 함께 저장된다.
  - `quality_threshold`는 이제 정책 설정의 `Curated 품질 검토 기준` 값과 동기화된다.
- `approved`
  - 공개 노출 가능한 상태
- `rejected`
  - 운영자가 수동 반려한 상태
- `auto_rejected`
  - 자동 수집 단계에서 cutoff에 걸려 바로 제외된 상태

### 10-2. 자동 수집 후 상태 분기 원칙
- `POST /api/admin/curated/run` 수동 실행과 startup/scheduler 자동 실행 모두 같은 분기 로직을 탄다.
- 현재 분기 순서
  1. auto cutoff면 `auto_rejected`
  2. duplicate 신호면 `review_duplicate`
  3. 라이선스 없음/불명확이면 `review_license`
  4. quality 낮으면 `review_quality`
  5. 그 외는 `pending`
- 즉, 운영자가 수동 triage하지 않아도 라이선스/중복/품질 이슈가 먼저 분리된다.

### 10-3. 운영자가 실제로 보는 화면
- `/admin`
  - 대시보드의 `Curated 검수 큐` 카드에서 상태별 적체 현황을 먼저 본다.
  - 총 대기 건수와 `pending`, `review_license`, `review_duplicate`, `review_quality` 분포를 바로 확인할 수 있다.
  - 상태 카드를 클릭하면 `/admin/curated?status=...`로 바로 이동한다.
  - 같은 카드 안에 현재 `품질 기준(Q)`이 함께 보이므로, queue 증가가 기준 상향 때문인지도 바로 해석할 수 있다.
  - 카드 하단의 `최근 기준 변경` 목록은 `policy_updated.metadata.curated_quality_threshold` 기준으로 추출한 최근 품질 기준 변경 이력이다.
  - metadata에 이전 값이 있으면 `Q 52 (+7)`처럼 변화량도 함께 보여 준다.
  - 이력 행을 클릭하면 `/admin/logs?actionType=policy_updated&query=curated_quality_threshold`로 이동해 관련 로그만 바로 본다.
  - 최근 버전부터 이동 직후 해당 로그 row는 강조 표시되어 어떤 이력에서 내려왔는지 한눈에 확인할 수 있다.
  - 만약 target row가 현재 결과에 없으면 `요청한 로그를 현재 필터 결과에서 찾지 못했습니다...` 안내가 표시되며, 이 경우 배너의 `검색어 제거` 또는 `필터 초기화`로 즉시 범위를 넓혀 다시 확인할 수 있다.
- `/admin/curated`
  - 실제 검수/승인/반려 작업을 수행하는 화면
  - 상태 필터를 `pending`, `review_license`, `review_duplicate`, `review_quality`, `approved`, `rejected`, `auto_rejected` 기준으로 좁혀 본다.
  - `review_duplicate` 항목은 duplicate reason 칩과 기존 항목 ID/같은 배치 후보 제목까지 함께 확인할 수 있다.
  - `review_license`, `review_quality`도 reason 칩과 추가 수치/라이선스 값이 함께 보이므로 별도 원문 로그를 열지 않고 1차 triage가 가능하다.
- `/admin/logs`
  - 자동 수집 성공/건너뜀/실패 건수와 실패 사유를 본다.
  - 큐가 갑자기 늘면 같은 기간의 `curated_collection_failed`, `curated_collection_skipped`도 함께 확인한다.
  - `policy_updated` row는 최근 버전부터 raw reason 아래에 compact diff chip을 함께 보여 준다.
  - 예를 들어 `품질 기준: Q 45 -> Q 52`처럼 핵심 변경만 빠르게 읽고, 필요할 때만 전체 reason 문구를 확인하면 된다.
  - chip이 3개를 넘으면 마지막에 `+N개 변경` 버튼이 붙고, 이를 누르면 숨겨진 diff chip이 같은 row 아래에 펼쳐진다.
  - 같은 compact summary 패턴은 `page_published`, `page_publish_failed`에도 적용된다.
  - 예를 들어 `게시 버전: v2 -> v3`, `실패 유형: validation_failed`, `차단 오류: 1건` 같은 chip으로 페이지 운영 로그를 빠르게 읽을 수 있다.
  - 최근 버전부터는 `page_draft_saved`, `page_conflict_detected`, `page_rolled_back`도 `저장 소스`, `저장 버전`, `버전 충돌`, `복원 버전`, `즉시 게시` 같은 chip으로 함께 읽을 수 있다.

### 10-4. 추천 운영 순서
1. `/admin` 대시보드에서 어떤 review 상태가 몰리는지 먼저 본다.
2. `/admin/logs`에서 같은 기간 자동 수집 실패/건너뜀 이상이 있었는지 확인한다.
3. `/admin/curated`에서 가장 많이 쌓인 상태부터 필터링해 처리한다.
4. `review_duplicate`는 기존 승인 콘텐츠와 URL/owner-repo/title이 정말 같은지 확인한다.
   - 보이는 칩이 무엇인지 먼저 보고, `기존 항목 ID` 또는 `같은 배치 후보` 표기를 함께 확인한다.
5. `review_license`는 repo license, README, upstream 정책을 확인한 뒤 승인/반려를 결정한다.
6. `review_quality`는 summary/README/stars/category 적합성을 함께 보고 승인 여부를 정한다.

### 10-6. 정책과 연결된 운영 포인트
- `/admin/policies`
  - `Curated 품질 검토 기준(1~100)`을 올리면 더 많은 후보가 `review_quality`로 들어간다.
  - 기준을 내리면 `pending`으로 바로 넘어가는 후보가 늘어난다.
  - 같은 화면의 `최근 품질 기준 변경` 목록에서 최근 누가 어떤 `Q` 값으로 바꿨는지, 가능하면 `이전 -> 현재` diff까지 바로 확인할 수 있다.
  - 각 이력 행은 `활동 로그`의 해당 정책 변경 맥락으로 바로 이동하는 shortcut 역할도 한다.
  - 이동 후 `threshold history에서 이동한 로그를 강조 표시하고 있습니다.` 안내가 보이면 정상적으로 target row가 잡힌 상태다.
  - 반대로 target row가 없다는 배너가 뜨면, 같은 배너의 quick action으로 현재 필터를 바로 정리해 재검색한다.
- 운영자가 quality queue 급증을 볼 때는 대시보드/큐만 보지 말고 현재 정책값도 함께 확인한다.
- 현재 UI의 `Review Reason Guide` 카드가 각 reason chip의 의미를 바로 설명해 준다.
- 최근 버전부터 `Review Reason Guide`는 기본 접힘 상태이며, 필요한 순간에만 펼쳐 본다.

### 10-5. 상태가 갑자기 치우칠 때 해석
- `review_duplicate` 급증
  - GitHub 검색 키워드가 너무 넓거나 같은 주제 레포가 반복 수집되는지 본다.
- `review_license` 급증
  - GitHub API 응답에 license 누락이 많거나 upstream repo가 SPDX를 비워둔 경우일 수 있다.
- `review_quality` 급증
  - README 품질 저하, Gemini fallback 비중 증가, heuristic 기준 과민 반응 가능성을 의심한다.
- `pending` 급증
  - 자동 triage는 통과하지만 운영 처리 속도가 밀린 상태일 수 있으므로 검수 우선순위를 다시 잡는다.

## 11. DB 관점에서 기억할 점
- DB는 PostgreSQL이고 드라이버는 `psycopg2-binary`다.
- 연결은 `SimpleConnectionPool`을 사용한다.
- 스키마 변경은 전통적인 외부 마이그레이션 툴보다 `init_db()` 내부 보정 패턴이 섞여 있다.
- 따라서 새 컬럼/인덱스 추가 시 `server/db.py` startup 경로까지 같이 확인해야 한다.
- 운영 이슈가 생기면 테이블 구조보다 먼저 startup에서 어떤 보정 로직이 도는지 보는 것이 빠를 때가 많다.

## 12. 운영자가 자주 확인할 파일

### 장애/버그 확인용
- `server/main.py`
- `server/db.py`
- `server/auth.py`

### 권한/정책 확인용
- `server/tests/test_admin_user_enforcement.py`
- `docs/ADMIN_USER_ENFORCEMENT_PLAN.md`

### 페이지 운영 확인용
- `server/tests/test_admin_page_editor_api.py`

### curated 분석 확인용
- `server/tests/test_curated_related_api.py`

## 13. 운영 체크리스트

### 서버가 안 뜰 때
1. `server/.env`에 `DATABASE_URL`, `SECRET_KEY`가 맞는지 확인
2. `cd server && uv sync` 재실행
3. `cd server && uv run uvicorn main:app --reload`로 에러 원문 확인
4. startup 중 DB 초기화 실패인지 확인

### 관리자 API가 401/403일 때
1. 토큰이 유효한지 확인
2. 대상 계정 role이 `admin`인지 `super_admin`인지 확인
3. 해당 엔드포인트가 `require_admin`인지 `require_super_admin`인지 `server/main.py`에서 확인

### curated 통계가 이상할 때
1. `GET /api/admin/curated/related-clicks/summary` 응답 shape 확인
2. `reason_code`와 `reason_label`이 기대대로 내려오는지 확인
3. `server/db.py`의 reason 정규화/backfill 로직 확인

### 페이지 운영이 막힐 때
1. page editor rollout 관련 정책값 확인
2. super_admin 전용 엔드포인트인지 확인
3. publish schedule/process 루트가 필요한 상황인지 구분

## 14. 변경 시 반드시 같이 업데이트할 문서
- `docs/admin_menual.md`: 운영 절차/관리 포인트 변경 시 즉시 반영
- `docs/IMPLEMENTATION_LEARNING_LOG.md`: 왜 바뀌었는지 기록
- `docs/UV_WORKFLOW.md`: 실행/테스트 명령이 바뀌면 반영
- `docs/ADMIN_USER_ENFORCEMENT_PLAN.md`: 관리자 제재 정책이 바뀌면 반영

## 15. 운영 배포 절차

### 14-1. 배포 전 준비
1. DB 연결 정보 준비
   - Neon PostgreSQL 기준 `DATABASE_URL` 확보
2. 보안 값 준비
   - `SECRET_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
3. 외부 URL 준비
   - `PUBLIC_BASE_URL`
   - `ALLOWED_ORIGINS`
   - `GOOGLE_REDIRECT_URI`
   - `GOOGLE_FRONTEND_REDIRECT_URI`
4. 운영 모드 점검
   - `ENFORCE_HTTPS=true` 여부 검토
   - Cloudflare 또는 프록시 환경이면 `x-forwarded-proto`가 정상 전달되는지 확인

### 14-2. 서버 반영 전 점검 순서
```bash
cd server
uv sync
uv run --group dev pytest
uv run uvicorn main:app --reload
```

- 로컬 또는 스테이징에서 최소 확인 항목
  - `/health` 응답이 `{"status": "ok"}` 인지 확인
  - admin 로그인/권한 체크가 되는지 확인
  - `GET /api/admin/stats` 응답 확인
  - `GET /api/admin/curated/related-clicks/summary` 응답 확인

### 14-3. 권장 운영 구성
- 프론트: Cloudflare Pages
- API: 별도 Python 런타임에서 FastAPI 구동
- DB: Neon PostgreSQL
- DNS/보안: Cloudflare Proxy + WAF + auth 관련 rate limit

### 14-4. 운영 배포 체크리스트
- `server/.env` 또는 배포 환경 변수에 필수 값 반영 완료
- `DATABASE_URL` 실제 접근 가능
- `SECRET_KEY` 운영용 안전 값 반영
- OAuth redirect URI가 실제 도메인과 일치
- `ALLOWED_ORIGINS`에 실제 프론트 도메인 포함
- `PUBLIC_BASE_URL`이 실제 공개 API 기준 URL과 일치
- 배포 후 `/health`, 로그인, 관리자 핵심 API 최소 1회 확인

## 16. 대표 관리자 API 요청/응답 예시

### 15-1. 관리자 통계 조회
```bash
curl -X GET "https://api.example.com/api/admin/stats" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

예상 응답 예시:
```json
{
  "total_users": 128,
  "published_projects": 42,
  "open_reports": 3,
  "pending_users": 5
}
```

### 15-2. 사용자 정지
```bash
curl -X POST "https://api.example.com/api/admin/users/<USER_ID>/suspend" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "반복적인 스팸 댓글"
  }'
```

운영 해석:
- reason 없이 호출하면 400 가능성이 높다.
- 관리자/슈퍼관리자 대상 적용 제한도 있으므로 403 응답을 확인해야 한다.

### 15-3. curated 클릭 요약 조회
```bash
curl -X GET "https://api.example.com/api/admin/curated/related-clicks/summary?days=30&limit=20" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

예상 응답 예시:
```json
{
  "window_days": 30,
  "total_clicks": 54,
  "top_pairs": [
    {
      "source_content_id": "a1",
      "target_content_id": "b2",
      "clicks": 7,
      "reason_code": "tag_overlap",
      "reason_label": "태그 일치"
    }
  ],
  "top_reason_code": "tag_overlap",
  "top_reason_label": "태그 일치",
  "available_sources": [
    {
      "content_id": "a1",
      "title": "Starter Repo"
    }
  ]
}
```

### 15-4. 페이지 발행 스케줄 등록
```bash
curl -X POST "https://api.example.com/api/admin/pages/about/publish-schedules" \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "publishAt": "2026-03-08T09:00:00Z",
    "reason": "메인 소개 문구 개편 반영"
  }'
```

운영 해석:
- page editor rollout 정책, super_admin 여부, publish 시간 형식을 함께 확인해야 한다.
- 실패 시 400/403/409 계열 응답일 수 있다.

### 15-5. 공통 에러 응답 해석
- 단순 에러:
```json
{
  "detail": "관리자 권한이 필요합니다"
}
```
- 구조화된 검증 에러 예시:
```json
{
  "detail": {
    "code": "page_migration_validation_failed",
    "message": "마이그레이션 변환 결과에 차단 이슈가 있습니다",
    "field_errors": [
      {
        "field": "blocks[0].src",
        "message": "Image src URL 형식이 올바르지 않습니다"
      }
    ]
  }
}
```

운영 해석:
- `detail`이 문자열인지 객체인지 먼저 구분한다.
- 객체일 경우 `code`, `message`, `field_errors` 순서로 보면 원인 파악이 빠르다.

## 17. 장애 대응 플레이북

### 16-1. 1차 공통 대응
1. 증상 범위 확인
   - 전체 서버 장애인지, admin API만 문제인지, 특정 기능만 문제인지 구분
2. `/health` 확인
3. 최근 변경 파일 확인
   - `server/main.py`
   - `server/db.py`
   - `server/auth.py`
4. 환경 변수 변경 여부 확인
5. DB 접속 가능 여부 확인

### 16-2. 로그인/OAuth 장애
증상:
- 로그인 실패
- Google OAuth 시작/콜백 실패

우선 확인:
1. `SECRET_KEY` 변경 여부
2. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 누락 여부
3. `GOOGLE_REDIRECT_URI`, `GOOGLE_FRONTEND_REDIRECT_URI` 불일치 여부
4. `PUBLIC_BASE_URL`과 실제 도메인 차이 여부
5. Cloudflare 프록시/리다이렉트 설정 영향 여부

### 16-3. 관리자 권한 장애
증상:
- admin 페이지에서 401/403
- 특정 작업만 super_admin 필요 에러

우선 확인:
1. 토큰 만료 여부
2. user role이 `admin` 또는 `super_admin`인지
3. 대상 엔드포인트가 `require_super_admin`인지
4. self-action 금지 조건에 걸렸는지

### 16-4. curated 통계 이상
증상:
- 대시보드 위젯 빈 값
- top reason 이상
- source 필터 결과 이상

우선 확인:
1. `/api/admin/curated/related-clicks/summary` 직접 호출
2. 최근 클릭 저장 API 성공 여부 확인
3. `reason_code`, `reason_label` 정규화 결과 확인
4. startup 중 `init_db()` backfill/컬럼 보정 영향 확인

### 16-5. 페이지 발행/복구 장애
증상:
- draft 저장 실패
- publish 실패
- migration execute/restore 실패

우선 확인:
1. page editor rollout 정책 확인
2. super_admin 필요 작업인지 확인
3. 409 conflict 응답이면 최신 버전 충돌 여부 확인
4. migration backup 존재 여부 확인
5. 필요 시 `migration/backups` 조회 후 restore 또는 rollback 검토

### 16-6. 복구 우선순위 원칙
- 1순위: 추가 손상 방지
- 2순위: 읽기 기능 복구
- 3순위: 관리자 쓰기 기능 복구
- 4순위: 원인 분석 및 문서 반영

### 16-7. 장애 후 문서화
- 장애 원인
- 영향 범위
- 임시 조치
- 근본 수정
- 재발 방지 항목
- 관련 코드 경로
- 관련 테스트 경로

이 항목은 작업 후 `docs/IMPLEMENTATION_LEARNING_LOG.md`와 이 문서에 같이 반영한다.

## 18. 다음 업데이트 후보
- 실제 배포 플랫폼별 실행 명령 정리
- 관리자 액션 로그 조회 예시 추가
- 자주 쓰는 SQL/DB 점검 예시 추가
- OAuth 장애 사례집 추가
- 배포 체크리스트를 staging/prod 이중 버전으로 분리

## 19. staging / prod 분리 체크리스트

### 18-1. staging 체크리스트
- 목적: 운영 반영 전 기능/권한/로그/복구 흐름 검증
- 필수 환경 변수
  - `DATABASE_URL`
  - `SECRET_KEY`
  - `ALLOWED_ORIGINS`
  - `PUBLIC_BASE_URL`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- 최소 점검 항목
  - `cd server && uv run --group dev pytest`
  - `/health` 확인
  - admin 로그인 확인
  - `GET /api/admin/stats` 확인
  - `GET /api/admin/action-logs?limit=20` 확인
  - `GET /api/admin/action-logs/observability?window_days=30` 확인
  - `GET /api/admin/curated/related-clicks/summary?days=30&limit=20` 확인
  - page editor draft/publish-schedule/backups 경로 중 최소 1개 확인

### 18-2. prod 체크리스트
- 목적: 실제 사용자 영향 최소화, 보안/복구 우선
- 필수 추가 확인
  - `ENFORCE_HTTPS=true` 검토 또는 프록시단 HTTPS 강제 확인
  - Cloudflare Proxy / WAF / auth rate limit 정책 적용 여부
  - OAuth redirect URI가 실제 운영 도메인과 일치하는지 확인
  - 관리자 계정 role 분리 상태 확인 (`admin`, `super_admin`)
  - backup/rollback 가능 경로 문서 확인
- 배포 직후 확인
  - `/health`
  - 일반 로그인
  - 관리자 로그인
  - 관리자 통계 API 1회
  - 관리자 액션 로그 API 1회
  - curated summary API 1회

### 18-3. staging 과 prod의 운영 차이
- staging은 기능 검증 중심
- prod는 보안/권한/복구 가능성 검증이 더 중요
- staging에서 통과한 항목이라도 prod에서는 실제 도메인, OAuth, 프록시, HTTPS 조건을 다시 확인해야 한다

## 20. 관리자 액션 로그 조회 가이드

### 19-1. 무엇을 보는 API인가
- `GET /api/admin/action-logs`
  - 최근 관리자 액션 목록 조회
  - 주요 필터: `limit`, `action_type`, `actor_id`, `page_id`
- `GET /api/admin/action-logs/observability`
  - 운영 관측 지표 조회
  - 주요 파라미터: `window_days`

### 19-2. 조회 예시
```bash
curl -X GET "https://api.example.com/api/admin/action-logs?limit=20&action_type=page_published&page_id=about_page" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

예상 응답 예시:
```json
{
  "items": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "admin_id": "11111111-1111-1111-1111-111111111111",
      "admin_nickname": "admin",
      "action_type": "page_published",
      "target_type": "page",
      "target_id": "22222222-2222-2222-2222-222222222222",
      "reason": "release",
      "created_at": "2026-03-04T00:00:00Z"
    }
  ],
  "next_cursor": null
}
```

### 19-3. 관측 지표 예시
```bash
curl -X GET "https://api.example.com/api/admin/action-logs/observability?window_days=30" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

예상 응답 예시:
```json
{
  "window_days": 30,
  "daily_publish_counts": [
    { "day": "2026-03-04", "publish_count": 2 }
  ],
  "summary": {
    "published": 2,
    "rolled_back": 1,
    "draft_saved": 4,
    "conflicts": 1,
    "rollback_ratio": 0.5,
    "conflict_rate": 0.2
  },
  "publish_failure_distribution": [
    { "reason": "validation_failed", "count": 1 }
  ]
}
```

### 19-4. 해석 포인트
- `action_type`
  - 어떤 운영 행위가 일어났는지 본다
  - 예: `page_published`, `page_rolled_back`, `page_draft_saved`
- `page_id` 필터
  - 특정 페이지 운영 이력만 좁혀 볼 때 유용하다
- `actor_id` 필터
  - 특정 관리자 계정의 작업만 추적할 때 사용한다
- `reason`
  - 설정에 따라 마스킹될 수 있다
  - `admin_log_mask_reasons=true` 상태라면 UI/API에서 reason이 일부 가려질 수 있다

### 19-5. 운영 활용법
- publish 실패가 반복되면 observability의 `publish_failure_distribution` 먼저 확인
- rollback 비율이 높으면 content workflow 또는 validation 정책 문제를 의심
- 특정 장애 시점에는 action-log와 observability를 함께 봐야 원인 파악이 빠르다

### 19-6. 자주 보는 action_type 사전
- `policy_updated`
  - 운영 정책이 변경된 경우
  - page editor 활성화/비활성화, rollout stage, masking 정책 등과 같이 보면 좋다
- `page_draft_saved`
  - 관리자 draft 저장 성공
  - 배포 전 편집 이력이 실제로 쌓이는지 확인할 때 본다
- `page_conflict_detected`
  - 같은 페이지를 여러 관리자나 세션이 동시에 수정하면서 버전 충돌이 난 경우
  - 409 응답과 함께 보면 원인 파악이 빠르다
- `page_published`
  - draft가 실제 publish 반영된 경우
  - 배포 시점 추적의 기준 이벤트다
- `page_rolled_back`
  - 이전 버전으로 rollback 한 경우
  - publish 직후 장애 대응 이력이 맞는지 확인할 때 중요하다
- `page_migration_restored`
  - migration backup 기반으로 복구가 실행된 경우
  - rollback 대신 backup restore를 쓴 상황 추적에 유용하다
- `oauth_settings_updated`
  - Google OAuth runtime 설정이 관리자 화면/API에서 변경된 경우
  - OAuth 장애가 설정 변경 직후 발생했는지 확인할 때 먼저 본다

## 21. SQL / DB 점검 예시

### 20-1. 원칙
- 운영 DB에서는 읽기 전용 조회를 먼저 사용한다
- 쓰기 SQL은 앱 경로와 충돌할 수 있으므로 직접 실행보다 API/복구 경로를 우선한다
- `server/db.py`의 startup 보정 로직(`init_db()`)이 있으므로 단순 테이블 상태만 보고 판단하지 않는다

### 20-2. 접속 예시
```bash
psql "$DATABASE_URL"
```

### 20-3. 자주 보는 조회 예시

관리자 액션 로그 최근 20건:
```sql
SELECT action_type, target_type, target_id, reason, created_at
FROM admin_action_logs
ORDER BY created_at DESC
LIMIT 20;
```

특정 페이지 publish/rollback 이력:
```sql
SELECT action_type, reason, created_at
FROM admin_action_logs
WHERE target_type = 'page'
  AND action_type IN ('page_published', 'page_rolled_back')
ORDER BY created_at DESC
LIMIT 50;
```

curated 클릭 최근 20건:
```sql
SELECT source_content_id, target_content_id, reason, clicked_at
FROM curated_related_clicks
ORDER BY clicked_at DESC
LIMIT 20;
```

reason 분포 확인:
```sql
SELECT reason, COUNT(*) AS count
FROM curated_related_clicks
GROUP BY reason
ORDER BY count DESC;
```

### 20-4. 운영 해석 포인트
- `admin_action_logs`
  - 운영 액션의 사실 기록
  - API보다 더 직접적으로 흐름을 볼 수 있다
- `curated_related_clicks`
  - 추천 클릭 저장 상태를 직접 확인할 수 있다
  - reason 정규화 이슈를 볼 때 특히 유용하다

### 20-5. DB 점검 시 주의
- 수동 수정 전에 반드시 API 기반 복구 경로가 있는지 확인
- page migration 관련 이슈는 `migration/backups`, `migration/restore`, `rollback` 경로가 먼저다
- DB를 직접 바꾸면 admin_action_logs가 남지 않을 수 있으므로 운영 추적성이 깨질 수 있다

## 22. page migration / restore 실제 운영 시나리오

### 21-1. 이런 상황에서 사용
- migration execute 이후 About 페이지 렌더링이 깨졌을 때
- 잘못된 블록 구조가 반영되었을 때
- publish 이후 rollback보다 backup restore가 더 정확한 복구 경로일 때

### 21-2. 권장 복구 순서
1. 추가 변경 중지
   - 같은 페이지에 대한 draft 저장/publish를 잠시 멈춘다
2. 액션 로그와 관측 확인
   - `GET /api/admin/action-logs?limit=20&action_type=page_published&page_id=about_page`
   - 필요 시 `GET /api/admin/action-logs/observability?window_days=30`
3. backup 목록 확인
   - `GET /api/admin/pages/{page_id}/migration/backups`
4. restore 대상 선택
   - `backupKey`, `capturedAt`, `reason`, `dryRun` 여부를 확인한다
5. 가능하면 dry-run부터 검토
   - restore API가 dry-run 경로를 지원하는 경우 실제 적용 전 검증한다
6. restore 실행 또는 rollback 결정
   - migration 산출물 문제면 backup restore 우선
   - 단순 publish 버전 회귀면 rollback도 검토
7. 복구 후 검증
   - draft/published 화면 확인
   - 관련 action-log 확인 (`page_migration_restored` 또는 `page_rolled_back`)
   - 필요 시 페이지 API와 프론트 실제 렌더링 확인

### 21-3. backup 목록 조회 예시
```bash
curl -X GET "https://api.example.com/api/admin/pages/about_page/migration/backups" \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>"
```

운영 포인트:
- 목록에서 가장 최근 것만 보지 말고, 장애 직전 정상 상태의 backupKey를 고른다
- `reason`과 `capturedAt`을 같이 봐야 사람 실수를 줄일 수 있다

### 21-4. restore 실행 전 체크
- super_admin 권한인지 확인
- 현재 페이지에 추가 편집이 들어오지 않는지 확인
- conflict 가능성이 있으면 최신 draft/version 상태를 먼저 본다
- 복구 후 어떤 화면까지 검증할지 미리 정한다

### 21-5. rollback vs restore 선택 기준
- `rollback`
  - publish 버전 단위로 되돌릴 때 적합
  - 기존 버전 체인 기준 복구
- `migration restore`
  - migration backup 기준으로 정확히 되돌릴 때 적합
  - 특정 migration 실행의 부작용 복구에 유리

## 23. OAuth 장애 FAQ

### 22-1. 증상: Google 로그인 버튼을 눌렀는데 바로 실패한다
우선 확인:
- `GET /api/admin/integrations/oauth/health`
- `google_oauth_enabled`가 true인지
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`가 실제 환경에 있는지
- `google_redirect_uri`, `google_frontend_redirect_uri`가 비어 있지 않은지

### 22-2. 증상: callback 이후 redirect mismatch 또는 설정 오류처럼 보인다
우선 확인:
- staging/prod callback URL이 Google Console에 정확히 등록됐는지
- 실제 운영 도메인과 `google_redirect_uri`가 일치하는지
- Cloudflare 프록시/도메인 전환 뒤 URI가 바뀌지 않았는지

### 22-3. 증상: 로그인은 되었는데 프론트에서 상태 처리가 이상하다
우선 확인:
- callback URL에 `oauth_token`이 아니라 `oauth_code` 또는 `oauth_status` 흐름인지
- active 사용자는 `oauth_code` 교환 흐름을 타는지
- pending 사용자는 `oauth_status=pending` 식으로 분기되는지

### 22-4. 증상: 같은 OAuth 응답을 다시 쓰면 실패한다
설명:
- 현재 흐름은 1회성 state/code 소비를 전제로 한다
- replay 방지를 위해 동일 state 또는 동일 oauth_code는 재사용 실패가 정상일 수 있다

### 22-5. 증상: 관리자 화면에서는 OAuth가 켜져 있는데 실제 로그인은 안 된다
우선 확인:
- `GET /api/admin/integrations/oauth`
- `GET /api/admin/integrations/oauth/health`
- runtime 설정이 켜져 있어도, 서버 환경 변수의 client id/secret이 없으면 실제 시작은 실패할 수 있다

### 22-6. 운영 팁
- OAuth 관련 변경 직후에는 `oauth_settings_updated` action-log를 먼저 본다
- staging/prod 둘 다 callback URL을 따로 등록해둔다
- 도메인/프록시 변경 후에는 health endpoint와 실제 로그인 플로우를 반드시 둘 다 확인한다

## 24. 관리자 일일 / 주간 점검 루틴

### 23-1. 일일 점검 루틴
- 오전 시작 점검
  - `/health` 확인
  - 관리자 로그인 가능 여부 확인
  - `GET /api/admin/stats` 확인
  - `GET /api/admin/action-logs?limit=20` 확인
- 운영 중 점검
  - `GET /api/admin/action-logs/observability?window_days=30` 확인
  - 이상 action_type 급증 여부 확인
  - curated 대시보드 수치 이상 여부 확인
- 마감 전 점검
  - 당일 publish/rollback/restore 이력 확인
  - 권한 변경, OAuth 설정 변경 같은 민감 작업 확인
  - 장애/이슈가 있었다면 문서화 대상인지 확인

### 23-2. 주간 점검 루틴
- 계정/권한 점검
  - `admin`, `super_admin` 계정 목록과 역할 확인
  - 불필요한 고권한 계정이 없는지 확인
- 정책/보안 점검
  - `ENFORCE_HTTPS`, `ALLOWED_ORIGINS`, OAuth redirect 설정 검토
  - Cloudflare/WAF/rate-limit 정책 변경 여부 확인
- 운영 품질 점검
  - publish 대비 rollback 비율 확인
  - `page_conflict_detected` 빈도 확인
  - curated 클릭 집계가 정상 누적되는지 확인
- 문서 점검
  - 최근 운영 변경이 `docs/admin_menual.md`와 `docs/IMPLEMENTATION_LEARNING_LOG.md`에 반영되었는지 확인

### 23-3. 이상 징후로 보는 기준
- `page_rolled_back`가 갑자기 늘면 최근 publish 품질 문제 가능성
- `page_conflict_detected`가 늘면 동시 편집 충돌 가능성
- `oauth_settings_updated` 직후 로그인 장애가 나면 OAuth 설정 변경 영향 가능성
- curated summary가 갑자기 0 또는 급감이면 저장/집계/API 응답 이상 가능성

## 25. 역할별 운영 체크리스트

### 24-1. 사용자 관리 체크리스트

#### admin
- 사용자 상태/제한/정지 흐름 확인
- 신고/이상 계정 대응 시 reason 포함 여부 확인
- 자기 자신 또는 다른 관리자 계정에 대한 위험 작업이 아닌지 확인
- 작업 후 action-log 확인

#### super_admin
- role 변경 전 대상 계정 확인
- 삭제 스케줄/즉시 삭제 같은 강한 작업 전 재확인
- 권한 변경 후 로그인/접근 영향 범위 확인
- 필요 시 관련 운영 문서와 정책도 함께 갱신

### 24-2. 페이지 운영 체크리스트

#### admin
- draft 조회 가능 여부 확인
- rollout stage가 현재 작업 허용 상태인지 확인
- 저장 전/후 conflict 가능성 확인
- publish 권한이 필요한 작업인지 구분

#### super_admin
- publish 전 diff/preview/validation 결과 확인
- rollback 또는 restore 필요 시 backup/버전 상태 확인
- publish 후 action-log와 실제 화면 렌더링 확인
- 장애 시 `page_rolled_back` 또는 `page_migration_restored` 추적

### 24-3. curated 운영 체크리스트

#### admin
- `GET /api/admin/curated` 응답 확인
- summary API에서 top pair / top reason / source filter 이상 여부 확인
- reason_code와 reason_label이 기대대로 보이는지 확인
- 이상 징후 발견 시 최근 클릭 저장 흐름 점검

#### super_admin
- curated 수집 실행 전 일일 한도/외부 토큰 상태 확인
- 운영상 영향이 큰 curated 변경은 action-log와 함께 추적
- 데이터 이상 시 API 응답과 DB 조회를 함께 비교

### 24-4. 공통 원칙
- admin은 일상 운영과 점검 중심
- super_admin은 publish, rollback, restore, role 변경, 강한 삭제/복구 작업 중심
- 민감 작업 전에는 항상 reason, 대상, 영향 범위를 먼저 확인
- 민감 작업 후에는 action-log와 실제 서비스 화면을 같이 확인

---

마지막 메모:
- 이 문서는 살아있는 운영 메뉴얼이다.
- 백엔드 개발이 끝날 때까지 기능 추가나 구조 변경이 생기면 계속 갱신한다.
