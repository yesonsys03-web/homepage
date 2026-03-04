from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main


def _admin_context(
    user_id: str = "11111111-1111-1111-1111-111111111111", role: str = "admin"
) -> main.UserContext:
    return {
        "id": user_id,
        "email": "admin@example.com",
        "nickname": "admin",
        "role": role,
        "status": "active",
        "avatar_url": None,
        "bio": None,
    }


def test_get_admin_page_draft_fallback_from_about(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()

    monkeypatch.setattr(main, "get_page_document_draft", lambda _page_id: None)
    monkeypatch.setattr(
        main,
        "get_about_content_payload",
        lambda: {
            "hero_title": "About",
            "hero_highlight": "Highlight",
            "hero_description": "Desc",
            "contact_email": "hello@example.com",
            "values": [],
            "team_members": [],
            "faqs": [],
        },
    )

    response = client.get("/api/admin/pages/about_page/draft")

    assert response.status_code == 200
    body = response.json()
    assert body["pageId"] == "about_page"
    assert body["baseVersion"] == 0
    assert body["document"]["status"] == "draft"

    main.app.dependency_overrides.clear()


def test_update_admin_page_draft_returns_conflict(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()

    monkeypatch.setattr(
        main,
        "save_page_document_draft",
        lambda **_: {"conflict": True, "current_version": 2},
    )

    payload = {
        "baseVersion": 1,
        "reason": "save",
        "document": {
            "pageId": "about_page",
            "status": "draft",
            "version": 1,
            "title": "About",
            "seo": {
                "metaTitle": "About",
                "metaDescription": "Desc",
                "ogImage": None,
            },
            "blocks": [],
            "updatedBy": "11111111-1111-1111-1111-111111111111",
            "updatedAt": "2026-03-04T00:00:00Z",
        },
    }

    response = client.put("/api/admin/pages/about_page/draft", json=payload)

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "page_version_conflict"
    assert detail["current_version"] == 2

    main.app.dependency_overrides.clear()


def test_publish_admin_page_success(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_super_admin] = lambda: _admin_context(
        role="super_admin"
    )

    monkeypatch.setattr(
        main,
        "publish_page_document",
        lambda **_: {"source_version": 2, "published_version": 3},
    )
    monkeypatch.setattr(
        main,
        "get_page_document_draft",
        lambda _page_id: {"draft_version": 2, "published_version": 1},
    )
    monkeypatch.setattr(
        main,
        "get_page_document_version",
        lambda _page_id, _version: {
            "document_json": {
                "blocks": [
                    {
                        "id": "hero",
                        "type": "hero",
                        "order": 0,
                        "visible": True,
                        "content": {
                            "headline": "About",
                            "highlight": "Hi",
                            "description": "Desc",
                            "contactEmail": "hello@example.com",
                        },
                    },
                    {
                        "id": "values",
                        "type": "feature_list",
                        "order": 1,
                        "visible": True,
                        "content": {"items": []},
                    },
                    {
                        "id": "team",
                        "type": "feature_list",
                        "order": 2,
                        "visible": True,
                        "content": {"items": []},
                    },
                    {
                        "id": "faq",
                        "type": "faq",
                        "order": 3,
                        "visible": True,
                        "content": {"items": []},
                    },
                ]
            }
        },
    )
    monkeypatch.setattr(
        main, "upsert_site_content", lambda *_args, **_kwargs: {"ok": True}
    )
    monkeypatch.setattr(main, "write_admin_action_log", lambda **_: None)

    response = client.post(
        "/api/admin/pages/about_page/publish",
        json={"reason": "release"},
    )

    assert response.status_code == 200
    assert response.json()["publishedVersion"] == 3

    main.app.dependency_overrides.clear()


def test_update_admin_page_draft_returns_validation_error_for_invalid_url(
    monkeypatch: Any,
) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()

    payload = {
        "baseVersion": 1,
        "reason": "save",
        "source": "manual",
        "document": {
            "pageId": "about_page",
            "status": "draft",
            "version": 1,
            "title": "About",
            "seo": {
                "metaTitle": "About",
                "metaDescription": "Desc",
                "ogImage": None,
            },
            "blocks": [
                {
                    "id": "cta-1",
                    "type": "cta",
                    "order": 0,
                    "visible": True,
                    "content": {
                        "label": "Go",
                        "href": "not-a-url",
                        "style": "primary",
                    },
                }
            ],
            "updatedBy": "11111111-1111-1111-1111-111111111111",
            "updatedAt": "2026-03-04T00:00:00Z",
        },
    }

    response = client.put("/api/admin/pages/about_page/draft", json=payload)

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "page_validation_failed"
    assert any(err["field"].endswith("href") for err in detail["field_errors"])

    main.app.dependency_overrides.clear()


def test_publish_admin_page_returns_conflict_when_not_latest_draft(
    monkeypatch: Any,
) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_super_admin] = lambda: _admin_context(
        role="super_admin"
    )

    monkeypatch.setattr(
        main,
        "get_page_document_draft",
        lambda _page_id: {"draft_version": 5, "published_version": 4},
    )

    response = client.post(
        "/api/admin/pages/about_page/publish",
        json={"reason": "release", "draftVersion": 4},
    )

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "page_publish_conflict"
    assert detail["current_version"] == 5

    main.app.dependency_overrides.clear()


def test_compare_admin_page_versions_returns_diff_summary(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()

    def fake_get_page_document_version(_page_id: str, version: int) -> dict[str, Any]:
        if version == 1:
            return {
                "document_json": {
                    "blocks": [
                        {
                            "id": "hero-1",
                            "type": "hero",
                            "order": 0,
                            "visible": True,
                            "content": {
                                "headline": "A",
                                "highlight": "H",
                                "description": "D",
                                "contactEmail": "a@test.dev",
                            },
                        },
                        {
                            "id": "cta-1",
                            "type": "cta",
                            "order": 1,
                            "visible": True,
                            "content": {
                                "label": "Go",
                                "href": "https://a.test",
                                "style": "primary",
                            },
                        },
                    ]
                }
            }
        return {
            "document_json": {
                "blocks": [
                    {
                        "id": "hero-1",
                        "type": "hero",
                        "order": 1,
                        "visible": True,
                        "content": {
                            "headline": "B",
                            "highlight": "H",
                            "description": "D",
                            "contactEmail": "a@test.dev",
                        },
                    },
                    {
                        "id": "rich-1",
                        "type": "rich_text",
                        "order": 0,
                        "visible": True,
                        "content": {
                            "body": "body",
                        },
                    },
                ]
            }
        }

    monkeypatch.setattr(
        main, "get_page_document_version", fake_get_page_document_version
    )

    response = client.get(
        "/api/admin/pages/about_page/versions-compare?from_version=1&to_version=2"
    )

    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["added"] == 1
    assert body["summary"]["removed"] == 1
    assert body["summary"]["reordered"] == 1
    assert body["summary"]["field_changed"] == 1

    main.app.dependency_overrides.clear()


def test_update_admin_page_draft_conflict_writes_conflict_log(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()

    logged_action_types: list[str] = []
    monkeypatch.setattr(
        main,
        "save_page_document_draft",
        lambda **_: {"conflict": True, "current_version": 9},
    )
    monkeypatch.setattr(
        main,
        "write_admin_action_log",
        lambda **kwargs: logged_action_types.append(str(kwargs.get("action_type", ""))),
    )

    payload = {
        "baseVersion": 1,
        "reason": "save",
        "source": "manual",
        "document": {
            "pageId": "about_page",
            "status": "draft",
            "version": 1,
            "title": "About",
            "seo": {
                "metaTitle": "About",
                "metaDescription": "Desc",
                "ogImage": None,
            },
            "blocks": [
                {
                    "id": "hero-1",
                    "type": "hero",
                    "order": 0,
                    "visible": True,
                    "content": {
                        "headline": "A",
                        "highlight": "H",
                        "description": "D",
                        "contactEmail": "hello@example.com",
                    },
                }
            ],
            "updatedBy": "11111111-1111-1111-1111-111111111111",
            "updatedAt": "2026-03-04T00:00:00Z",
        },
    }

    response = client.put("/api/admin/pages/about_page/draft", json=payload)

    assert response.status_code == 409
    assert "page_conflict_detected" in logged_action_types

    main.app.dependency_overrides.clear()


def test_publish_admin_page_validation_failure_writes_failed_log(
    monkeypatch: Any,
) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_super_admin] = lambda: _admin_context(
        role="super_admin"
    )

    logged_action_types: list[str] = []
    monkeypatch.setattr(
        main,
        "get_page_document_draft",
        lambda _page_id: {"draft_version": 2, "published_version": 1},
    )
    monkeypatch.setattr(
        main,
        "get_page_document_version",
        lambda _page_id, _version: {
            "document_json": {
                "blocks": [
                    {
                        "id": "cta-1",
                        "type": "cta",
                        "order": 0,
                        "visible": True,
                        "content": {
                            "label": "Go",
                            "href": "not-a-url",
                            "style": "primary",
                        },
                    }
                ]
            }
        },
    )
    monkeypatch.setattr(
        main,
        "write_admin_action_log",
        lambda **kwargs: logged_action_types.append(str(kwargs.get("action_type", ""))),
    )

    response = client.post(
        "/api/admin/pages/about_page/publish",
        json={"reason": "release", "draftVersion": 2},
    )

    assert response.status_code == 422
    assert "page_publish_failed" in logged_action_types

    main.app.dependency_overrides.clear()


def test_list_admin_action_logs_with_page_filter(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()

    captured: dict[str, Any] = {}
    monkeypatch.setattr(
        main,
        "get_effective_moderation_settings",
        lambda: {
            "admin_log_view_window_days": 30,
            "admin_log_mask_reasons": False,
        },
    )

    def fake_get_admin_action_logs(**kwargs: Any) -> list[dict[str, Any]]:
        captured.update(kwargs)
        return [
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "admin_id": "11111111-1111-1111-1111-111111111111",
                "admin_nickname": "admin",
                "action_type": "page_published",
                "target_type": "page",
                "target_id": "22222222-2222-2222-2222-222222222222",
                "reason": "release",
                "created_at": "2026-03-04T00:00:00Z",
            }
        ]

    monkeypatch.setattr(main, "get_admin_action_logs", fake_get_admin_action_logs)

    response = client.get(
        "/api/admin/action-logs?limit=20&action_type=page_published&page_id=about_page"
    )

    assert response.status_code == 200
    assert captured["limit"] == 20
    assert captured["action_type"] == "page_published"
    assert captured["target_type"] == "page"
    assert captured["target_id"] == main.page_action_target_id("about_page")

    main.app.dependency_overrides.clear()


def test_get_admin_action_logs_observability(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()

    monkeypatch.setattr(
        main,
        "get_admin_action_observability",
        lambda view_window_days: {
            "window_days": view_window_days,
            "daily_publish_counts": [{"day": "2026-03-04", "publish_count": 2}],
            "summary": {
                "published": 2,
                "rolled_back": 1,
                "draft_saved": 4,
                "conflicts": 1,
                "rollback_ratio": 0.5,
                "conflict_rate": 0.2,
            },
            "publish_failure_distribution": [
                {"reason": "validation_failed", "count": 1}
            ],
        },
    )

    response = client.get("/api/admin/action-logs/observability?window_days=30")

    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["published"] == 2
    assert body["publish_failure_distribution"][0]["reason"] == "validation_failed"

    main.app.dependency_overrides.clear()
