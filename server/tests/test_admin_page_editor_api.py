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
        "get_page_document_version",
        lambda _page_id, _version: {
            "document_json": {
                "blocks": [
                    {
                        "id": "hero",
                        "type": "hero",
                        "content": {
                            "headline": "About",
                            "highlight": "Hi",
                            "description": "Desc",
                            "contactEmail": "hello@example.com",
                        },
                    },
                    {"id": "values", "content": {"items": []}},
                    {"id": "team", "content": {"items": []}},
                    {"id": "faq", "content": {"items": []}},
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
