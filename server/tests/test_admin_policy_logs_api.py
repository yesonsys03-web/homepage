from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main


def _admin_context() -> main.UserContext:
    return {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "admin@example.com",
        "nickname": "admin",
        "role": "admin",
        "status": "active",
        "avatar_url": None,
        "bio": None,
    }


def test_update_admin_policies_writes_structured_threshold_log(
    monkeypatch: Any,
) -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context()

    current_settings: dict[str, object] = {
        "blocked_keywords": ["spam"],
        "auto_hide_report_threshold": 3,
        "home_filter_tabs": [],
        "explore_filter_tabs": [],
        "admin_log_retention_days": 180,
        "admin_log_view_window_days": 14,
        "admin_log_mask_reasons": False,
        "page_editor_enabled": True,
        "page_editor_rollout_stage": "qa",
        "page_editor_pilot_admin_ids": ["admin-1"],
        "page_editor_publish_fail_rate_threshold": 0.2,
        "page_editor_rollback_ratio_threshold": 0.3,
        "page_editor_conflict_rate_threshold": 0.25,
        "curated_review_quality_threshold": 45,
        "curated_related_click_boost_min_relevance": 6,
        "curated_related_click_boost_multiplier": 48,
        "curated_related_click_boost_cap": 180,
    }
    updated_settings: dict[str, object] = {
        **current_settings,
        "blocked_keywords": ["spam", "nsfw"],
        "curated_review_quality_threshold": 52,
        "curated_related_click_boost_min_relevance": 8,
        "curated_related_click_boost_multiplier": 36,
        "curated_related_click_boost_cap": 140,
        "updated_at": "2026-03-07T00:00:00Z",
    }
    captured: dict[str, object] = {}
    settings_holder = {"value": current_settings}

    monkeypatch.setattr(
        main, "get_effective_moderation_settings", lambda: settings_holder["value"]
    )

    def apply_update(**_: object) -> dict[str, object]:
        settings_holder["value"] = updated_settings
        return updated_settings

    monkeypatch.setattr(main, "update_moderation_settings", apply_update)

    def capture_log(**kwargs: object) -> None:
        captured.update(kwargs)

    monkeypatch.setattr(main, "write_admin_action_log", capture_log)

    response = client.patch(
        "/api/admin/policies",
        json={
            "blocked_keywords": ["spam", "nsfw"],
            "auto_hide_report_threshold": 3,
            "curated_review_quality_threshold": 52,
            "curated_related_click_boost_min_relevance": 8,
            "curated_related_click_boost_multiplier": 36,
            "curated_related_click_boost_cap": 140,
        },
    )

    assert response.status_code == 200
    assert response.json()["curated_review_quality_threshold"] == 52
    assert response.json()["curated_related_click_boost_min_relevance"] == 8
    assert response.json()["curated_related_click_boost_multiplier"] == 36
    assert response.json()["curated_related_click_boost_cap"] == 140
    assert captured["action_type"] == "policy_updated"
    assert captured["target_type"] == "moderation_settings"
    assert captured["target_id"] == "00000000-0000-0000-0000-000000000001"
    assert "curated_quality_threshold=52" in str(captured["reason"])
    assert "curated_quality_threshold_previous=45" in str(captured["reason"])

    metadata = captured["metadata"]
    assert isinstance(metadata, dict)
    assert metadata["event"] == "policy_update"
    assert metadata["curated_quality_threshold"] == {
        "previous": 45,
        "next": 52,
    }
    changed_fields = metadata["changed_fields"]
    assert isinstance(changed_fields, dict)
    assert changed_fields["curated_review_quality_threshold"] == {
        "previous": 45,
        "next": 52,
    }
    assert changed_fields["curated_related_click_boost_min_relevance"] == {
        "previous": 6,
        "next": 8,
    }
    assert changed_fields["curated_related_click_boost_multiplier"] == {
        "previous": 48,
        "next": 36,
    }
    assert changed_fields["curated_related_click_boost_cap"] == {
        "previous": 180,
        "next": 140,
    }

    main.app.dependency_overrides.clear()
