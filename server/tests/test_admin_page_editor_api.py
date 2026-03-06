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
    monkeypatch.setattr(main, "enforce_page_editor_rollout_access", lambda _user: None)

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


def test_get_admin_page_draft_returns_forbidden_when_rollout_disabled(
    monkeypatch: Any,
) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()

    monkeypatch.setattr(
        main,
        "get_effective_moderation_settings",
        lambda: {
            "page_editor_enabled": False,
            "page_editor_rollout_stage": "open",
            "page_editor_pilot_admin_ids": [],
        },
    )

    response = client.get("/api/admin/pages/about_page/draft")

    assert response.status_code == 403
    detail = response.json()["detail"]
    assert detail["code"] == "page_editor_disabled"

    main.app.dependency_overrides.clear()


def test_get_admin_page_draft_returns_forbidden_for_non_super_admin_in_qa_stage(
    monkeypatch: Any,
) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context(
        role="admin"
    )

    monkeypatch.setattr(
        main,
        "get_effective_moderation_settings",
        lambda: {
            "page_editor_enabled": True,
            "page_editor_rollout_stage": "qa",
            "page_editor_pilot_admin_ids": [],
        },
    )

    response = client.get("/api/admin/pages/about_page/draft")

    assert response.status_code == 403
    detail = response.json()["detail"]
    assert detail["code"] == "page_editor_stage_qa_only"

    main.app.dependency_overrides.clear()


def test_update_admin_page_draft_returns_conflict(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()
    monkeypatch.setattr(main, "enforce_page_editor_rollout_access", lambda _user: None)
    monkeypatch.setattr(main, "write_admin_action_log", lambda **_: None)

    monkeypatch.setattr(
        main,
        "save_page_document_draft",
        lambda **_: {
            "conflict": True,
            "current_version": 2,
            "current_updated_by": "admin-2",
            "current_updated_at": "2026-03-05T00:00:00Z",
        },
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
    assert detail["current_updated_by"] == "admin-2"
    assert detail["current_updated_at"] == "2026-03-05T00:00:00Z"
    assert detail["retryable"] is True

    main.app.dependency_overrides.clear()


def test_publish_admin_page_success(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_super_admin] = lambda: _admin_context(
        role="super_admin"
    )
    monkeypatch.setattr(main, "enforce_page_editor_rollout_access", lambda _user: None)

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


def test_extract_about_content_omits_hidden_faq_block() -> None:
    document = {
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
                "id": "faq",
                "type": "faq",
                "order": 3,
                "visible": False,
                "content": {
                    "items": [
                        {
                            "question": "Should be hidden?",
                            "answer": "Yes",
                        }
                    ]
                },
            },
        ]
    }

    extracted = main.extract_about_content_from_page_document(document)

    assert extracted["faqs"] == []


def test_extract_about_content_omits_all_hidden_blocks() -> None:
    document = {
        "blocks": [
            {
                "id": "hero",
                "type": "hero",
                "order": 0,
                "visible": False,
                "content": {
                    "headline": "Hidden hero",
                    "highlight": "Hidden",
                    "description": "Hidden desc",
                    "contactEmail": "hidden@example.com",
                },
            },
            {
                "id": "values",
                "type": "feature_list",
                "order": 1,
                "visible": False,
                "content": {
                    "items": [
                        {
                            "emoji": "🎨",
                            "title": "Hidden value",
                            "description": "Hidden value description",
                        }
                    ]
                },
            },
            {
                "id": "team",
                "type": "feature_list",
                "order": 2,
                "visible": False,
                "content": {
                    "items": [
                        {
                            "name": "hidden-member",
                            "role": "Hidden role",
                            "description": "Hidden team description",
                        }
                    ]
                },
            },
            {
                "id": "faq",
                "type": "faq",
                "order": 3,
                "visible": False,
                "content": {
                    "items": [
                        {
                            "question": "Hidden question",
                            "answer": "Hidden answer",
                        }
                    ]
                },
            },
        ]
    }

    extracted = main.extract_about_content_from_page_document(document)

    assert extracted["hero_title"] == ""
    assert extracted["hero_highlight"] == ""
    assert extracted["hero_description"] == ""
    assert extracted["contact_email"] == ""
    assert extracted["values"] == []
    assert extracted["team_members"] == []
    assert extracted["faqs"] == []


def test_create_admin_page_publish_schedule_success(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_super_admin] = lambda: _admin_context(
        role="super_admin"
    )
    monkeypatch.setattr(main, "enforce_page_editor_rollout_access", lambda _user: None)
    monkeypatch.setattr(
        main,
        "get_page_document_draft",
        lambda _page_id: {"draft_version": 2, "published_version": 1},
    )
    monkeypatch.setattr(
        main,
        "get_page_document_version",
        lambda _page_id, _version: {"document_json": {"pageId": "about_page"}},
    )
    monkeypatch.setattr(
        main,
        "collect_page_document_issues",
        lambda _doc: {"blocking": [], "warnings": []},
    )
    monkeypatch.setattr(
        main,
        "create_page_publish_schedule",
        lambda **_: {
            "schedule_id": "ps_123",
            "page_id": "about_page",
            "draft_version": 2,
            "publish_at": "2099-01-01 10:00:00",
            "timezone": "Asia/Seoul",
            "status": "scheduled",
            "reason": "campaign",
            "attempt_count": 0,
            "max_attempts": 3,
            "last_error": "",
            "next_retry_at": None,
            "created_by": "11111111-1111-1111-1111-111111111111",
            "created_at": "2099-01-01T00:00:00Z",
            "updated_at": "2099-01-01T00:00:00Z",
            "cancelled_at": None,
            "published_version": 0,
            "published_at": None,
        },
    )
    monkeypatch.setattr(main, "write_admin_action_log", lambda **_: None)

    response = client.post(
        "/api/admin/pages/about_page/publish-schedules",
        json={
            "publishAt": "2099-01-01T10:00:00Z",
            "timezone": "Asia/Seoul",
            "reason": "campaign",
            "draftVersion": 2,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["scheduled"] is True
    assert body["schedule"]["scheduleId"] == "ps_123"
    assert body["schedule"]["draftVersion"] == 2

    main.app.dependency_overrides.clear()


def test_cancel_admin_page_publish_schedule_success(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_super_admin] = lambda: _admin_context(
        role="super_admin"
    )
    monkeypatch.setattr(main, "enforce_page_editor_rollout_access", lambda _user: None)
    monkeypatch.setattr(
        main,
        "cancel_page_publish_schedule",
        lambda **_: {
            "schedule_id": "ps_123",
            "page_id": "about_page",
            "draft_version": 2,
            "publish_at": "2099-01-01 10:00:00",
            "timezone": "Asia/Seoul",
            "status": "cancelled",
            "reason": "cancel",
            "attempt_count": 0,
            "max_attempts": 3,
            "last_error": "",
            "next_retry_at": None,
            "created_by": "11111111-1111-1111-1111-111111111111",
            "created_at": "2099-01-01T00:00:00Z",
            "updated_at": "2099-01-01T00:01:00Z",
            "cancelled_at": "2099-01-01T00:01:00Z",
            "published_version": 0,
            "published_at": None,
        },
    )
    monkeypatch.setattr(main, "write_admin_action_log", lambda **_: None)

    response = client.post(
        "/api/admin/pages/about_page/publish-schedules/ps_123/cancel",
        json={"reason": "cancel"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["cancelled"] is True
    assert body["schedule"]["status"] == "cancelled"

    main.app.dependency_overrides.clear()


def test_process_admin_page_publish_schedules_marks_failure(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_super_admin] = lambda: _admin_context(
        role="super_admin"
    )
    monkeypatch.setattr(main, "enforce_page_editor_rollout_access", lambda _user: None)
    monkeypatch.setattr(
        main,
        "list_due_page_publish_schedules",
        lambda **_: [{"schedule_id": "ps_1", "draft_version": 2}],
    )
    monkeypatch.setattr(
        main,
        "get_page_document_draft",
        lambda _page_id: {"draft_version": 3},
    )

    failed_ids: list[str] = []
    monkeypatch.setattr(
        main,
        "mark_page_publish_schedule_failed",
        lambda **kwargs: failed_ids.append(str(kwargs.get("schedule_id", ""))),
    )
    monkeypatch.setattr(main, "write_admin_action_log", lambda **_: None)

    response = client.post(
        "/api/admin/pages/about_page/publish-schedules/process",
        json={"limit": 20, "reason": "process"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["failed"] == 1
    assert body["processed"] == 1
    assert "ps_1" in failed_ids

    main.app.dependency_overrides.clear()


def test_update_admin_page_draft_returns_validation_error_for_invalid_url(
    monkeypatch: Any,
) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()
    monkeypatch.setattr(main, "enforce_page_editor_rollout_access", lambda _user: None)

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


def test_update_admin_page_draft_returns_validation_error_for_invalid_gallery_src(
    monkeypatch: Any,
) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()
    monkeypatch.setattr(main, "enforce_page_editor_rollout_access", lambda _user: None)

    payload = {
        "baseVersion": 1,
        "reason": "save gallery",
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
                    "id": "gallery-1",
                    "type": "gallery",
                    "order": 0,
                    "visible": True,
                    "content": {
                        "layout": "grid",
                        "items": [
                            {
                                "src": "not-a-url",
                                "alt": "bad",
                                "caption": "bad",
                            }
                        ],
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
    assert any("content.items[0].src" in err["field"] for err in detail["field_errors"])

    main.app.dependency_overrides.clear()


def test_publish_admin_page_returns_conflict_when_not_latest_draft(
    monkeypatch: Any,
) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_super_admin] = lambda: _admin_context(
        role="super_admin"
    )
    monkeypatch.setattr(main, "enforce_page_editor_rollout_access", lambda _user: None)
    monkeypatch.setattr(main, "write_admin_action_log", lambda **_: None)

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
    monkeypatch.setattr(main, "enforce_page_editor_rollout_access", lambda _user: None)

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
    monkeypatch.setattr(main, "enforce_page_editor_rollout_access", lambda _user: None)

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
    monkeypatch.setattr(main, "enforce_page_editor_rollout_access", lambda _user: None)

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


def test_create_page_editor_perf_event_records_sample_and_log(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()

    recorded: list[tuple[str, float]] = []
    logged: dict[str, Any] = {}

    monkeypatch.setattr(
        main,
        "_record_page_editor_perf",
        lambda scenario, duration_ms, source=None: recorded.append(
            (scenario, duration_ms)
        ),
    )
    monkeypatch.setattr(
        main,
        "write_admin_action_log",
        lambda **kwargs: logged.update(kwargs),
    )

    response = client.post(
        "/api/admin/perf/page-editor/events",
        json={
            "pageId": "about_page",
            "scenario": "draft_save_roundtrip",
            "durationMs": 612.4,
            "source": "manual",
        },
    )

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert recorded == [("draft_save_roundtrip", 612.4)]
    assert logged["action_type"] == "page_perf_draft_save_roundtrip"
    assert logged["target_type"] == "page"
    assert logged["target_id"] == main.page_action_target_id("about_page")
    assert "duration_ms=612.40" in str(logged["reason"])

    main.app.dependency_overrides.clear()


def test_get_page_editor_perf_snapshot(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()

    monkeypatch.setattr(
        main,
        "_page_editor_perf_snapshot",
        lambda: {
            "window_size": 500,
            "sample_count": 3,
            "metrics": {
                "editor_initial_load": {
                    "sample_count": 1,
                    "p75_ms": 2200.0,
                    "p95_ms": 2200.0,
                    "slo_p75_ms": 2500.0,
                    "within_slo": True,
                },
                "preview_switch": {
                    "sample_count": 1,
                    "p75_ms": 410.0,
                    "p95_ms": 410.0,
                    "slo_p75_ms": 500.0,
                    "within_slo": True,
                },
                "draft_save_roundtrip": {
                    "sample_count": 1,
                    "p75_ms": 780.0,
                    "p95_ms": 780.0,
                    "slo_p75_ms": 800.0,
                    "within_slo": True,
                },
            },
        },
    )

    response = client.get("/api/admin/perf/page-editor")

    assert response.status_code == 200
    body = response.json()
    assert body["sample_count"] == 3
    assert body["metrics"]["preview_switch"]["p75_ms"] == 410.0

    main.app.dependency_overrides.clear()


def test_get_admin_page_migration_preview(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_super_admin] = lambda: _admin_context(
        role="super_admin"
    )

    monkeypatch.setattr(
        main,
        "build_page_migration_preview",
        lambda page_id: {
            "pageId": page_id,
            "sourceType": "site_content",
            "sourceKey": "about_content",
            "document": {"pageId": page_id, "blocks": []},
            "validation": {
                "blocking": [],
                "warnings": [],
                "blockingCount": 0,
                "warningCount": 0,
            },
        },
    )

    response = client.get("/api/admin/pages/about_page/migration/preview")

    assert response.status_code == 200
    body = response.json()
    assert body["pageId"] == "about_page"
    assert body["validation"]["blockingCount"] == 0

    main.app.dependency_overrides.clear()


def test_get_admin_page_migration_backups(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_super_admin] = lambda: _admin_context(
        role="super_admin"
    )

    monkeypatch.setattr(
        main,
        "list_page_migration_backups",
        lambda page_id, limit=20: {
            "pageId": page_id,
            "count": 2,
            "items": [
                {
                    "backupKey": "about_page_migration_backup_111",
                    "capturedAt": "2026-03-04T12:00:00Z",
                    "reason": "migration run",
                    "dryRun": False,
                    "sourceKey": "about_content",
                    "updatedAt": "2026-03-04T12:00:01Z",
                },
                {
                    "backupKey": "about_page_migration_backup_110",
                    "capturedAt": "2026-03-04T11:00:00Z",
                    "reason": "dry run",
                    "dryRun": True,
                    "sourceKey": "about_content",
                    "updatedAt": "2026-03-04T11:00:01Z",
                },
            ],
        },
    )

    response = client.get("/api/admin/pages/about_page/migration/backups?limit=5")

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 2
    assert body["items"][0]["backupKey"].startswith("about_page_migration_backup_")

    main.app.dependency_overrides.clear()


def test_execute_admin_page_migration_dry_run(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_super_admin] = lambda: _admin_context(
        role="super_admin"
    )

    monkeypatch.setattr(
        main,
        "execute_page_migration",
        lambda page_id, actor_id, reason, dry_run: {
            "pageId": page_id,
            "dryRun": dry_run,
            "applied": False,
            "backupKey": "about_content_migration_backup_123",
            "validation": {
                "blocking": [],
                "warnings": [],
                "blockingCount": 0,
                "warningCount": 0,
            },
        },
    )

    response = client.post(
        "/api/admin/pages/about_page/migration/execute",
        json={"reason": "dry run", "dryRun": True},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["dryRun"] is True
    assert body["applied"] is False
    assert body["backupKey"].startswith("about_content_migration_backup_")

    main.app.dependency_overrides.clear()


def test_restore_admin_page_migration_dry_run(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_super_admin] = lambda: _admin_context(
        role="super_admin"
    )

    monkeypatch.setattr(
        main,
        "restore_page_migration_backup",
        lambda page_id, backup_key, actor_id, reason, dry_run: {
            "pageId": page_id,
            "dryRun": dry_run,
            "restored": False,
            "backupKey": backup_key,
            "validation": {
                "blocking": [],
                "warnings": [],
                "blockingCount": 0,
                "warningCount": 0,
            },
        },
    )

    response = client.post(
        "/api/admin/pages/about_page/migration/restore",
        json={
            "backupKey": "about_page_migration_backup_1772629489",
            "reason": "restore dry run",
            "dryRun": True,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["dryRun"] is True
    assert body["restored"] is False
    assert body["backupKey"] == "about_page_migration_backup_1772629489"

    main.app.dependency_overrides.clear()
