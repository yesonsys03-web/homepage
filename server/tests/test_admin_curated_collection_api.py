from __future__ import annotations

import sys
from pathlib import Path

from httpx import Response
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gemini_curator import GeminiCurationResult
import main


def _admin_context() -> main.UserContext:
    return {
        "id": "admin-1",
        "email": "admin@example.com",
        "nickname": "admin",
        "role": "admin",
        "status": "active",
        "avatar_url": None,
        "bio": None,
    }


def _json_body(response: Response) -> dict[str, object]:
    payload = response.json()
    if not isinstance(payload, dict):
        raise AssertionError("expected JSON object response")
    return payload


def _live_repo_candidate() -> dict[str, object]:
    return {
        "name": "cursor-vibe-kit",
        "owner": "maker",
        "source_url": "https://github.com/maker/cursor-vibe-kit",
        "canonical_url": "https://github.com/maker/cursor-vibe-kit",
        "description": "Starter template for Cursor and Claude vibe coding workflows.",
        "stars": 77,
        "language": "TypeScript",
        "license": "MIT",
        "github_pushed_at": "2026-03-07T00:00:00+00:00",
        "has_readme": True,
        "is_korean_dev": True,
    }


def _sample_curated_repo(*, license_value: str = "MIT") -> dict[str, object]:
    return {
        "title": "Cursor Vibe Kit",
        "repo_name": "cursor-vibe-kit",
        "repo_owner": "maker",
        "source_type": "github",
        "source_url": "https://github.com/maker/cursor-vibe-kit",
        "canonical_url": "https://github.com/maker/cursor-vibe-kit",
        "description": "Starter template for Cursor and Claude vibe coding workflows.",
        "language": "TypeScript",
        "is_korean_dev": True,
        "stars": 77,
        "license": license_value,
        "relevance_score": 6,
        "beginner_value": 6,
        "has_readme": True,
        "summary_beginner": "beginner summary",
        "summary_mid": "mid summary",
        "summary_expert": "expert summary",
        "github_pushed_at": "2026-03-07T00:00:00+00:00",
    }


def test_curated_run_uses_live_candidates_when_token_exists(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    monkeypatch.setattr(
        main, "require_admin_from_request", lambda _request: _admin_context()
    )
    monkeypatch.setattr(main, "GITHUB_TOKEN", "test-token")
    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setattr(main, "list_admin_curated_content", lambda **_: [])
    monkeypatch.setattr(
        main,
        "fetch_github_readme_excerpt",
        lambda *args, **kwargs: "# Cursor Vibe Kit\nStarter guide",
    )
    monkeypatch.setattr(
        main,
        "search_github_repositories",
        lambda config, token, per_page=20: [_live_repo_candidate()],
    )
    monkeypatch.setattr(
        main,
        "curate_repository_with_gemini",
        lambda repo, api_key, model="gemini-2.0-flash": GeminiCurationResult(
            evaluation=main.CurationEvaluation(
                relevance_score=9,
                beginner_value=8,
                category="template",
                tags=["Cursor", "Claude", "Starter"],
                reason="실제 README 문맥까지 포함하면 입문자용 바이브코딩 스타터 가치가 높습니다.",
            ),
            summary=main.ThreeLevelSummary(
                beginner="입문자가 바로 실행해보며 Cursor 워크플로를 익히기 좋은 저장소예요.",
                mid="프로젝트 구조와 프롬프트 흐름을 빠르게 파악하기 좋은 템플릿입니다.",
                expert="팀 템플릿과 MCP/에이전트 조합 방식을 비교 검토하기 좋은 기준점입니다.",
            ),
            model=model,
        ),
    )
    saved_payloads: list[dict[str, object]] = []

    def _save(payload: dict[str, object]) -> dict[str, object]:
        saved_payloads.append(payload)
        return {"id": 1, "inserted": True, **payload}

    monkeypatch.setattr(main, "create_or_update_curated_content", _save)

    response = client.post("/api/admin/curated/run")

    assert response.status_code == 200
    body = _json_body(response)
    assert body["created"] == 1
    assert "message" not in body
    assert saved_payloads[0]["repo_name"] == "cursor-vibe-kit"
    assert saved_payloads[0]["title"] == "Cursor Vibe Kit"
    assert saved_payloads[0]["category"] == "template"
    assert saved_payloads[0]["status"] == "pending"
    relevance_score = saved_payloads[0]["relevance_score"]
    assert isinstance(relevance_score, int)
    assert relevance_score == 9
    assert (
        saved_payloads[0]["summary_beginner"]
        == "입문자가 바로 실행해보며 Cursor 워크플로를 익히기 좋은 저장소예요."
    )
    assert saved_payloads[0]["readme_excerpt"] == "# Cursor Vibe Kit\nStarter guide"


def test_curated_run_falls_back_to_heuristic_when_gemini_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    monkeypatch.setattr(
        main, "require_admin_from_request", lambda _request: _admin_context()
    )
    monkeypatch.setattr(main, "GITHUB_TOKEN", "test-token")
    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setattr(main, "list_admin_curated_content", lambda **_: [])
    monkeypatch.setattr(
        main,
        "fetch_github_readme_excerpt",
        lambda *args, **kwargs: "# README\nclaude mcp starter template",
    )
    monkeypatch.setattr(
        main,
        "search_github_repositories",
        lambda config, token, per_page=20: [_live_repo_candidate()],
    )

    def _raise_gemini_error(
        repo: object, api_key: str, model: str = "gemini-2.0-flash"
    ) -> object:
        _ = (repo, api_key, model)
        raise RuntimeError("gemini unavailable")

    monkeypatch.setattr(main, "curate_repository_with_gemini", _raise_gemini_error)
    saved_payloads: list[dict[str, object]] = []

    def _save(payload: dict[str, object]) -> dict[str, object]:
        saved_payloads.append(payload)
        return {"id": 1, "inserted": True, **payload}

    monkeypatch.setattr(main, "create_or_update_curated_content", _save)

    response = client.post("/api/admin/curated/run")

    assert response.status_code == 200
    body = _json_body(response)
    assert body["created"] == 1
    assert "message" not in body
    assert saved_payloads[0]["summary_beginner"]
    relevance_score = saved_payloads[0]["relevance_score"]
    assert isinstance(relevance_score, int)
    assert relevance_score >= 4
    assert (
        saved_payloads[0]["readme_excerpt"] == "# README\nclaude mcp starter template"
    )


def test_curated_run_falls_back_to_samples_without_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    monkeypatch.setattr(
        main, "require_admin_from_request", lambda _request: _admin_context()
    )
    monkeypatch.setattr(main, "GITHUB_TOKEN", "")
    monkeypatch.setattr(main, "list_admin_curated_content", lambda **_: [])
    saved_payloads: list[dict[str, object]] = []

    def _save(payload: dict[str, object]) -> dict[str, object]:
        saved_payloads.append(payload)
        return {"id": len(saved_payloads), "inserted": True, **payload}

    monkeypatch.setattr(main, "create_or_update_curated_content", _save)

    response = client.post("/api/admin/curated/run")

    assert response.status_code == 200
    body = _json_body(response)
    assert body["created"] == 2
    message = body["message"]
    assert isinstance(message, str)
    assert "개발용 샘플 후보" in message
    assert saved_payloads[0]["repo_name"] == "claude-mcp-starter"


def test_curated_run_counts_only_new_insertions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    monkeypatch.setattr(
        main, "require_admin_from_request", lambda _request: _admin_context()
    )
    monkeypatch.setattr(main, "GITHUB_TOKEN", "")
    monkeypatch.setattr(main, "list_admin_curated_content", lambda **_: [])
    inserted_flags = iter([False, True])

    def _save(payload: dict[str, object]) -> dict[str, object]:
        return {"id": 1, "inserted": next(inserted_flags), **payload}

    monkeypatch.setattr(main, "create_or_update_curated_content", _save)

    response = client.post("/api/admin/curated/run")

    assert response.status_code == 200
    body = _json_body(response)
    assert body["created"] == 1


def test_perform_curated_collection_run_skips_sample_fallback_for_scheduler(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(main, "GITHUB_TOKEN", "")
    monkeypatch.setattr(main, "list_admin_curated_content", lambda **_: [])

    result = main.perform_curated_collection_run(allow_sample_fallback=False)

    assert result["created"] == 0
    message = result["message"]
    assert isinstance(message, str)
    assert "자동 수집" in message


@pytest.mark.anyio
async def test_scheduler_iteration_uses_automatic_mode(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    called_with: list[bool] = []

    def _perform_run(*, allow_sample_fallback: bool = True) -> dict[str, object]:
        called_with.append(allow_sample_fallback)
        return {"created": 0, "collected_today": 0, "daily_limit": 5}

    monkeypatch.setattr(main, "perform_curated_collection_run", _perform_run)

    await main.run_curated_collection_scheduler_iteration()

    assert called_with == [False]


@pytest.mark.anyio
async def test_scheduler_iteration_logs_success_and_skip(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    logged: list[dict[str, object]] = []
    results: list[dict[str, object]] = [
        {"created": 2, "collected_today": 2, "daily_limit": 5, "message": ""},
        {
            "created": 0,
            "collected_today": 2,
            "daily_limit": 5,
            "message": "오늘 수집 한도에 도달했습니다",
        },
    ]
    result_iter = iter(results)

    def _perform_run(*, allow_sample_fallback: bool = True) -> dict[str, object]:
        assert allow_sample_fallback is False
        return next(result_iter)

    def _log_action(
        *, action_type: str, created: int, message: str | None = None
    ) -> None:
        logged.append(
            {"action_type": action_type, "created": created, "message": message}
        )

    monkeypatch.setattr(main, "perform_curated_collection_run", _perform_run)
    monkeypatch.setattr(main, "log_curated_collection_action", _log_action)

    await main.run_curated_collection_scheduler_iteration()
    await main.run_curated_collection_scheduler_iteration()

    assert logged[0]["action_type"] == "curated_collection_succeeded"
    assert logged[0]["created"] == 2
    assert logged[1]["action_type"] == "curated_collection_skipped"


@pytest.mark.anyio
async def test_scheduler_iteration_logs_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    logged: list[dict[str, object]] = []

    def _perform_run(*, allow_sample_fallback: bool = True) -> dict[str, object]:
        _ = allow_sample_fallback
        raise RuntimeError("scheduler boom")

    def _log_action(
        *, action_type: str, created: int, message: str | None = None
    ) -> None:
        logged.append(
            {"action_type": action_type, "created": created, "message": message}
        )

    monkeypatch.setattr(main, "perform_curated_collection_run", _perform_run)
    monkeypatch.setattr(main, "log_curated_collection_action", _log_action)

    await main.run_curated_collection_scheduler_iteration()

    assert logged == [
        {
            "action_type": "curated_collection_failed",
            "created": 0,
            "message": "scheduler boom",
        }
    ]


def test_determine_curated_collection_status_routes_license_review() -> None:
    status = main.determine_curated_collection_status(
        _sample_curated_repo(license_value=""),
        quality_score=58,
    )

    assert status == main.CURATED_STATUS_REVIEW_LICENSE


def test_build_curated_review_metadata_for_missing_license() -> None:
    metadata = main.build_curated_review_metadata(
        _sample_curated_repo(license_value=""),
        quality_score=58,
    )

    assert metadata == {
        "reason_codes": ["license_missing"],
        "license_value": "",
    }


def test_determine_curated_collection_status_routes_quality_review() -> None:
    status = main.determine_curated_collection_status(
        _sample_curated_repo(license_value="MIT"),
        quality_score=40,
    )

    assert status == main.CURATED_STATUS_REVIEW_QUALITY


def test_build_curated_review_metadata_for_quality_review() -> None:
    metadata = main.build_curated_review_metadata(
        _sample_curated_repo(license_value="MIT"),
        quality_score=40,
    )

    assert metadata == {
        "reason_codes": ["quality_below_threshold"],
        "quality_score_value": 40,
        "quality_threshold": 45,
    }


def test_determine_curated_collection_status_respects_custom_quality_threshold() -> (
    None
):
    status = main.determine_curated_collection_status(
        _sample_curated_repo(license_value="MIT"),
        quality_score=52,
        quality_threshold=60,
    )

    assert status == main.CURATED_STATUS_REVIEW_QUALITY


def test_build_curated_review_metadata_uses_custom_quality_threshold() -> None:
    metadata = main.build_curated_review_metadata(
        _sample_curated_repo(license_value="MIT"),
        quality_score=52,
        quality_threshold=60,
    )

    assert metadata == {
        "reason_codes": ["quality_below_threshold"],
        "quality_score_value": 52,
        "quality_threshold": 60,
    }


def test_determine_curated_collection_status_routes_duplicate_review_from_existing() -> (
    None
):
    status = main.determine_curated_collection_status(
        _sample_curated_repo(license_value="MIT"),
        quality_score=58,
        existing_items=[
            {
                "id": 1,
                "canonical_url": "https://github.com/maker/cursor-vibe-kit",
                "repo_name": "cursor-vibe-kit",
                "repo_owner": "maker",
                "title": "Cursor Vibe Kit",
            }
        ],
    )

    assert status == main.CURATED_STATUS_REVIEW_DUPLICATE


def test_build_curated_duplicate_review_metadata_collects_structured_flags() -> None:
    metadata = main.build_curated_duplicate_review_metadata(
        _sample_curated_repo(license_value="MIT"),
        existing_items=[
            {
                "id": 11,
                "canonical_url": "https://github.com/maker/cursor-vibe-kit",
                "repo_name": "cursor-vibe-kit",
                "repo_owner": "maker",
                "title": "Cursor Vibe Kit",
            }
        ],
    )

    assert metadata == {
        "reason_codes": ["canonical_url_match", "owner_repo_match", "title_match"],
        "canonical_url_match": True,
        "owner_repo_match": True,
        "title_match": True,
        "matched_existing_ids": [11],
    }


def test_determine_curated_collection_status_routes_duplicate_review_from_processed_batch() -> (
    None
):
    status = main.determine_curated_collection_status(
        _sample_curated_repo(license_value="MIT"),
        quality_score=58,
        processed_items=[
            {
                "canonical_url": "https://github.com/other/repo",
                "repo_name": "other-repo",
                "repo_owner": "other",
                "title": "Cursor Vibe Kit",
            }
        ],
    )

    assert status == main.CURATED_STATUS_REVIEW_DUPLICATE


def test_build_curated_duplicate_review_metadata_tracks_processed_titles() -> None:
    metadata = main.build_curated_duplicate_review_metadata(
        _sample_curated_repo(license_value="MIT"),
        processed_items=[
            {
                "canonical_url": "https://github.com/other/repo",
                "repo_name": "other-repo",
                "repo_owner": "other",
                "title": "Cursor Vibe Kit",
            }
        ],
    )

    assert metadata == {
        "reason_codes": ["title_match"],
        "title_match": True,
        "matched_processed_titles": ["Cursor Vibe Kit"],
    }
