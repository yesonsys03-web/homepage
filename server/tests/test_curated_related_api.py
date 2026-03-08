from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main


def _approved_item(content_id: int, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "id": content_id,
        "source_type": "github",
        "source_url": f"https://github.com/example/repo-{content_id}",
        "canonical_url": f"https://github.com/example/repo-{content_id}",
        "repo_name": f"repo-{content_id}",
        "repo_owner": "example",
        "title": f"Repo {content_id}",
        "category": "tool",
        "language": "TypeScript",
        "is_korean_dev": True,
        "stars": 30,
        "license": "MIT",
        "relevance_score": 7,
        "beginner_value": 8,
        "quality_score": 8,
        "summary_beginner": "beginner",
        "summary_mid": "mid",
        "summary_expert": "expert",
        "tags": ["starter", "vite"],
        "status": "approved",
        "reject_reason": "",
        "approved_at": "2026-03-01T00:00:00Z",
        "approved_by": "admin-1",
        "github_pushed_at": "2026-03-06T00:00:00Z",
        "collected_at": "2026-03-06T00:00:00Z",
        "updated_at": "2026-03-06T00:00:00Z",
    }
    payload.update(overrides)
    return payload


def test_curated_related_endpoint_returns_server_reasons(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    base_item = _approved_item(7, title="Starter Repo")
    candidates = [
        _approved_item(
            8, title="Deploy Kit", tags=["starter", "deploy"], stars=60, quality_score=9
        ),
        _approved_item(
            9,
            title="Python Repo",
            language="Python",
            tags=["backend"],
            quality_score=3,
            is_korean_dev=False,
            github_pushed_at="2025-01-01T00:00:00Z",
            collected_at="2025-01-01T00:00:00Z",
        ),
    ]

    monkeypatch.setattr(
        main,
        "get_curated_content_by_id",
        lambda content_id: base_item if content_id == 7 else None,
    )

    def fake_list_curated_content(**kwargs: object) -> list[dict[str, object]]:
        _ = kwargs
        return candidates

    monkeypatch.setattr(main, "list_curated_content", fake_list_curated_content)
    monkeypatch.setattr(
        main, "get_curated_related_click_counts_for_source", lambda *_: {}
    )

    response = client.get("/api/curated/7/related?limit=2")

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "server"
    assert body["items"][0]["item"]["id"] == 8
    assert body["items"][0]["reasons"][0]["code"] == "tag_overlap"
    assert body["items"][0]["reasons"][0]["label"] == "태그 1개 일치"
    assert body["items"][0]["reasons"][3]["code"] == "language_match"
    assert body["items"][0]["reasons"][3]["label"] == "TypeScript 언어 일치"
    assert body["items"][1]["reasons"] == [
        {"code": "category_match", "label": "유사 카테고리"}
    ]


def test_curated_related_endpoint_boosts_recent_clicked_pairs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    base_item = _approved_item(7, title="Starter Repo", tags=["starter", "vite"])
    candidates = [
        _approved_item(
            8,
            title="Strong Match",
            tags=["starter", "deploy"],
            quality_score=9,
            relevance_score=8,
            stars=80,
            github_pushed_at="2026-03-06T00:00:00Z",
        ),
        _approved_item(
            9,
            title="Popular Follow-up",
            tags=["backend"],
            quality_score=7,
            relevance_score=8,
            stars=40,
            github_pushed_at="2026-03-06T00:00:00Z",
        ),
    ]

    monkeypatch.setattr(
        main,
        "get_curated_content_by_id",
        lambda content_id: base_item if content_id == 7 else None,
    )
    monkeypatch.setattr(main, "list_curated_content", lambda **_: candidates)
    monkeypatch.setattr(
        main,
        "get_curated_related_click_counts_for_source",
        lambda source_content_id, days=30: (
            {9: 20} if source_content_id == 7 and days == 30 else {}
        ),
    )

    response = client.get("/api/curated/7/related?limit=2")

    assert response.status_code == 200
    body = response.json()
    assert [item["item"]["id"] for item in body["items"]] == [9, 8]
    assert body["items"][0]["reasons"] == [
        {"code": "recent_update", "label": "최근 업데이트"},
        {"code": "language_match", "label": "TypeScript 언어 일치"},
        {"code": "korean_dev_match", "label": "KR Dev 일치"},
    ]


def test_curated_related_endpoint_skips_click_boost_for_low_relevance_without_tag_overlap(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    base_item = _approved_item(7, title="Starter Repo", tags=["starter", "vite"])
    candidates = [
        _approved_item(
            8,
            title="Strong Match",
            tags=["starter", "deploy"],
            quality_score=9,
            relevance_score=7,
            stars=80,
            github_pushed_at="",
            collected_at="",
        ),
        _approved_item(
            9,
            title="Clicked But Weak",
            tags=["backend"],
            quality_score=4,
            relevance_score=4,
            stars=40,
            is_korean_dev=False,
            github_pushed_at="",
            collected_at="",
        ),
    ]

    monkeypatch.setattr(
        main,
        "get_curated_content_by_id",
        lambda content_id: base_item if content_id == 7 else None,
    )
    monkeypatch.setattr(main, "list_curated_content", lambda **_: candidates)
    monkeypatch.setattr(
        main,
        "get_curated_related_click_counts_for_source",
        lambda source_content_id, days=30: (
            {9: 50} if source_content_id == 7 and days == 30 else {}
        ),
    )
    monkeypatch.setattr(main, "get_moderation_settings", lambda: None)

    response = client.get("/api/curated/7/related?limit=2")

    assert response.status_code == 200
    body = response.json()
    assert [item["item"]["id"] for item in body["items"]] == [8, 9]
    assert body["items"][1]["reasons"] == [
        {"code": "language_match", "label": "TypeScript 언어 일치"}
    ]


def test_curated_related_endpoint_uses_runtime_click_boost_settings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    base_item = _approved_item(7, title="Starter Repo", tags=["starter", "vite"])
    candidates = [
        _approved_item(
            8,
            title="Baseline Strong Match",
            tags=["starter", "deploy"],
            quality_score=9,
            relevance_score=8,
            stars=80,
            github_pushed_at="",
            collected_at="",
        ),
        _approved_item(
            9,
            title="Config Boost Candidate",
            tags=["backend"],
            quality_score=7,
            relevance_score=5,
            stars=40,
            github_pushed_at="",
            collected_at="",
        ),
    ]

    monkeypatch.setattr(
        main,
        "get_curated_content_by_id",
        lambda content_id: base_item if content_id == 7 else None,
    )
    monkeypatch.setattr(main, "list_curated_content", lambda **_: candidates)
    monkeypatch.setattr(
        main,
        "get_curated_related_click_counts_for_source",
        lambda source_content_id, days=30: (
            {9: 20} if source_content_id == 7 and days == 30 else {}
        ),
    )
    monkeypatch.setattr(
        main,
        "get_moderation_settings",
        lambda: {
            "curated_related_click_boost_min_relevance": 5,
            "curated_related_click_boost_multiplier": 80,
            "curated_related_click_boost_cap": 260,
        },
    )

    response = client.get("/api/curated/7/related?limit=2")

    assert response.status_code == 200
    body = response.json()
    assert [item["item"]["id"] for item in body["items"]] == [9, 8]


def test_curated_related_endpoint_falls_back_when_click_count_lookup_fails(
    caplog: pytest.LogCaptureFixture,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    caplog.set_level("WARNING")
    base_item = _approved_item(7, title="Starter Repo")
    candidates = [
        _approved_item(
            8, title="Deploy Kit", tags=["starter", "deploy"], stars=60, quality_score=9
        ),
        _approved_item(
            9,
            title="Python Repo",
            language="Python",
            tags=["backend"],
            quality_score=3,
            is_korean_dev=False,
            github_pushed_at="2025-01-01T00:00:00Z",
            collected_at="2025-01-01T00:00:00Z",
        ),
    ]

    monkeypatch.setattr(
        main,
        "get_curated_content_by_id",
        lambda content_id: base_item if content_id == 7 else None,
    )
    monkeypatch.setattr(main, "list_curated_content", lambda **_: candidates)
    monkeypatch.setattr(main, "get_moderation_settings", lambda: None)
    monkeypatch.setattr(
        main,
        "get_curated_related_click_counts_for_source",
        lambda *_: (_ for _ in ()).throw(RuntimeError("db unavailable")),
    )

    response = client.get("/api/curated/7/related?limit=2")

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "server"
    assert [item["item"]["id"] for item in body["items"]] == [8, 9]
    assert "curated related click-count fallback used" in caplog.text


def test_admin_curated_related_click_summary_requires_admin(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    monkeypatch.setattr(
        main,
        "require_admin_from_request",
        lambda _request: (_ for _ in ()).throw(
            HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
        ),
    )

    response = client.get("/api/admin/curated/related-clicks/summary")

    assert response.status_code == 403
    assert response.json()["detail"] == "관리자 권한이 필요합니다"


def test_admin_curated_related_click_summary_shape(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    monkeypatch.setattr(
        main,
        "require_admin_from_request",
        lambda _request: {
            "id": "admin-1",
            "email": "admin@example.com",
            "nickname": "admin",
            "role": "admin",
            "status": "active",
            "avatar_url": None,
            "bio": None,
        },
    )
    monkeypatch.setattr(
        main,
        "get_curated_related_click_summary",
        lambda days, limit, source_content_id=None: {
            "window_days": days,
            "source_content_id": source_content_id,
            "total_clicks": 12,
            "unique_pairs": 4,
            "top_pairs": [
                {
                    "source_content_id": 7,
                    "source_title": "Starter Repo",
                    "target_content_id": 8,
                    "target_title": "Deploy Kit",
                    "click_count": 5,
                    "last_clicked_at": "2026-03-07T03:00:00+00:00",
                    "top_reason_code": "tag_overlap",
                    "top_reason_label": "태그 일치",
                    "top_reason_count": 3,
                }
            ],
            "top_reasons": [
                {
                    "reason_code": "tag_overlap",
                    "reason_label": "태그 일치",
                    "click_count": 6,
                }
            ],
            "available_sources": [{"content_id": 7, "title": "Starter Repo"}],
        },
    )

    response = client.get("/api/admin/curated/related-clicks/summary?days=14&limit=3")

    assert response.status_code == 200
    body = response.json()
    assert body["window_days"] == 14
    assert body["source_content_id"] is None
    assert body["total_clicks"] == 12
    assert body["top_pairs"][0]["target_title"] == "Deploy Kit"
    assert body["top_reasons"][0]["reason_code"] == "tag_overlap"
    assert body["top_reasons"][0]["reason_label"] == "태그 일치"
    assert body["available_sources"][0]["content_id"] == 7


def test_create_curated_related_click_normalizes_reason_code(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    main._RATE_LIMIT_BUCKETS.clear()
    source_item = _approved_item(7)
    target_item = _approved_item(8)
    captured: dict[str, object] = {}

    def fake_get_curated_content_by_id(content_id: int) -> dict[str, object] | None:
        if content_id == 7:
            return source_item
        if content_id == 8:
            return target_item
        return None

    def fake_create_curated_related_click(
        source_content_id: int,
        target_content_id: int,
        reason_code: str | None,
        reason: str | None,
        client_ip: str | None,
    ) -> dict[str, object]:
        captured["source_content_id"] = source_content_id
        captured["target_content_id"] = target_content_id
        captured["reason_code"] = reason_code
        captured["reason"] = reason
        captured["client_ip"] = client_ip
        return {"id": 12}

    monkeypatch.setattr(
        main, "get_curated_content_by_id", fake_get_curated_content_by_id
    )
    monkeypatch.setattr(
        main, "create_curated_related_click", fake_create_curated_related_click
    )

    response = client.post(
        "/api/curated/related-clicks",
        json={
            "source_content_id": 7,
            "target_content_id": 8,
            "reason": "태그 3개 일치",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "id": 12}
    assert captured["reason_code"] == "tag_overlap"
    assert captured["reason"] == "태그 일치"


def test_create_curated_related_click_prefers_reason_code(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    main._RATE_LIMIT_BUCKETS.clear()
    source_item = _approved_item(7)
    target_item = _approved_item(8)
    captured: dict[str, object] = {}

    def fake_get_curated_content_by_id(content_id: int) -> dict[str, object] | None:
        if content_id == 7:
            return source_item
        if content_id == 8:
            return target_item
        return None

    def fake_create_curated_related_click(
        source_content_id: int,
        target_content_id: int,
        reason_code: str | None,
        reason: str | None,
        client_ip: str | None,
    ) -> dict[str, object]:
        captured["source_content_id"] = source_content_id
        captured["target_content_id"] = target_content_id
        captured["reason_code"] = reason_code
        captured["reason"] = reason
        captured["client_ip"] = client_ip
        return {"id": 14}

    monkeypatch.setattr(
        main, "get_curated_content_by_id", fake_get_curated_content_by_id
    )
    monkeypatch.setattr(
        main, "create_curated_related_click", fake_create_curated_related_click
    )

    response = client.post(
        "/api/curated/related-clicks",
        json={
            "source_content_id": 7,
            "target_content_id": 8,
            "reason_code": "recent_update",
            "reason": "최근 업데이트",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "id": 14}
    assert captured["reason_code"] == "recent_update"
    assert captured["reason"] == "최근 업데이트"


def test_create_curated_related_click_returns_500_when_save_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    main._RATE_LIMIT_BUCKETS.clear()
    source_item = _approved_item(7)
    target_item = _approved_item(8)

    def fake_get_curated_content_by_id(content_id: int) -> dict[str, object] | None:
        if content_id == 7:
            return source_item
        if content_id == 8:
            return target_item
        return None

    monkeypatch.setattr(
        main, "get_curated_content_by_id", fake_get_curated_content_by_id
    )
    monkeypatch.setattr(main, "create_curated_related_click", lambda **_: None)

    response = client.post(
        "/api/curated/related-clicks",
        json={
            "source_content_id": 7,
            "target_content_id": 8,
            "reason": "태그 1개 일치",
        },
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "추천 클릭 기록 저장에 실패했습니다"


def test_create_curated_related_click_dedupes_same_pair_within_window(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    main._RATE_LIMIT_BUCKETS.clear()
    source_item = _approved_item(7)
    target_item = _approved_item(8)
    calls: list[tuple[int, int, str | None, str | None, str | None]] = []

    def fake_get_curated_content_by_id(content_id: int) -> dict[str, object] | None:
        if content_id == 7:
            return source_item
        if content_id == 8:
            return target_item
        return None

    def fake_create_curated_related_click(
        source_content_id: int,
        target_content_id: int,
        reason_code: str | None,
        reason: str | None,
        client_ip: str | None,
    ) -> dict[str, object]:
        calls.append(
            (source_content_id, target_content_id, reason_code, reason, client_ip)
        )
        return {"id": 33}

    monkeypatch.setattr(
        main, "get_curated_content_by_id", fake_get_curated_content_by_id
    )
    monkeypatch.setattr(
        main, "create_curated_related_click", fake_create_curated_related_click
    )

    headers = {"x-forwarded-for": "203.0.113.8"}
    first = client.post(
        "/api/curated/related-clicks",
        json={
            "source_content_id": 7,
            "target_content_id": 8,
            "reason_code": "tag_overlap",
        },
        headers=headers,
    )
    second = client.post(
        "/api/curated/related-clicks",
        json={
            "source_content_id": 7,
            "target_content_id": 8,
            "reason_code": "tag_overlap",
        },
        headers=headers,
    )

    assert first.status_code == 200
    assert first.json() == {"ok": True, "id": 33}
    assert second.status_code == 200
    assert second.json() == {"ok": True, "id": 0}
    assert len(calls) == 1


def test_create_curated_related_click_rate_limits_same_ip_burst(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    main._RATE_LIMIT_BUCKETS.clear()
    source_item = _approved_item(7)

    def fake_get_curated_content_by_id(content_id: int) -> dict[str, object] | None:
        if content_id == 7:
            return source_item
        return _approved_item(content_id)

    monkeypatch.setattr(
        main, "get_curated_content_by_id", fake_get_curated_content_by_id
    )
    monkeypatch.setattr(
        main,
        "create_curated_related_click",
        lambda **_: {"id": 99},
    )

    headers = {"x-forwarded-for": "203.0.113.9"}
    for index in range(main.CURATED_RELATED_CLICK_IP_LIMIT_PER_MINUTE):
        response = client.post(
            "/api/curated/related-clicks",
            json={
                "source_content_id": 7,
                "target_content_id": 100 + index,
                "reason_code": "contextual_match",
            },
            headers=headers,
        )
        assert response.status_code == 200

    blocked = client.post(
        "/api/curated/related-clicks",
        json={
            "source_content_id": 7,
            "target_content_id": 500,
            "reason_code": "contextual_match",
        },
        headers=headers,
    )

    assert blocked.status_code == 429
    assert (
        blocked.json()["detail"] == "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요"
    )
