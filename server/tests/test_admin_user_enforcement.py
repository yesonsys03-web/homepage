from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from typing import Any

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main
from auth import create_access_token


def _admin_context(user_id: str = "admin-1", role: str = "admin") -> main.UserContext:
    return {
        "id": user_id,
        "email": "admin@example.com",
        "nickname": "admin",
        "role": role,
        "status": "active",
        "avatar_url": None,
        "bio": None,
    }


@pytest.fixture
def client() -> TestClient:
    test_client = TestClient(main.app)
    yield test_client
    main.app.dependency_overrides.clear()


def test_schedule_delete_rejects_self_target(client: TestClient) -> None:
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context(
        "self-admin"
    )

    response = client.post(
        "/api/admin/users/self-admin/delete-schedule",
        json={"days": 30, "reason": "security"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "본인 계정에는 적용할 수 없습니다"


def test_schedule_and_cancel_delete_flow(client: TestClient, monkeypatch: Any) -> None:
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context(
        "admin-1"
    )
    monkeypatch.setattr(
        main,
        "get_user_by_id",
        lambda _user_id: {
            "id": "target-1",
            "role": "user",
        },
    )
    monkeypatch.setattr(main, "write_admin_action_log", lambda **_: None)
    monkeypatch.setattr(
        main,
        "schedule_user_deletion",
        lambda **_: {
            "id": "target-1",
            "status": "pending_delete",
            "suspended_by": "admin-1",
        },
    )
    monkeypatch.setattr(
        main,
        "cancel_user_deletion",
        lambda **_: {
            "id": "target-1",
            "status": "active",
        },
    )

    schedule_res = client.post(
        "/api/admin/users/target-1/delete-schedule",
        json={"days": 15, "reason": "abuse"},
    )
    cancel_res = client.delete("/api/admin/users/target-1/delete-schedule")

    assert schedule_res.status_code == 200
    assert schedule_res.json()["status"] == "pending_delete"
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "active"


def test_require_super_admin_guard() -> None:
    with pytest.raises(HTTPException) as exc:
        asyncio.run(main.require_super_admin(_admin_context(role="admin")))
    assert exc.value.status_code == 403


def test_require_admin_allows_super_admin() -> None:
    context = asyncio.run(main.require_admin(_admin_context(role="super_admin")))
    assert context["role"] == "super_admin"


def test_update_user_role_requires_super_admin(client: TestClient) -> None:
    main.app.dependency_overrides[main.require_super_admin] = lambda: (
        _ for _ in ()
    ).throw(HTTPException(status_code=403, detail="슈퍼 관리자 권한이 필요합니다"))

    response = client.patch(
        "/api/admin/users/target-1/role",
        json={"role": "admin"},
    )

    assert response.status_code == 403


def test_update_user_role_flow(client: TestClient, monkeypatch: Any) -> None:
    main.app.dependency_overrides[main.require_super_admin] = lambda: _admin_context(
        "super-1", role="super_admin"
    )
    monkeypatch.setattr(
        main,
        "get_user_by_id",
        lambda _user_id: {
            "id": "target-1",
            "role": "user",
            "email": "target@example.com",
        },
    )
    monkeypatch.setattr(
        main,
        "set_user_role",
        lambda user_id, role: {"id": user_id, "role": role, "status": "active"},
    )
    monkeypatch.setattr(main, "write_admin_action_log", lambda **_: None)

    response = client.patch(
        "/api/admin/users/target-1/role",
        json={"role": "admin"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "admin"


def test_revoked_token_version_blocks_me_endpoint(
    client: TestClient, monkeypatch: Any
) -> None:
    token = create_access_token(
        {
            "sub": "user-1",
            "email": "user@example.com",
            "sv": 1,
        }
    )
    monkeypatch.setattr(
        main,
        "get_user_by_id",
        lambda _user_id: {
            "id": "user-1",
            "email": "user@example.com",
            "nickname": "user",
            "role": "user",
            "status": "active",
            "token_version": 2,
            "avatar_url": None,
            "bio": None,
        },
    )

    response = client.get(
        "/api/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "세션이 만료되었습니다. 다시 로그인해 주세요"


def test_login_blocks_suspended_user(client: TestClient, monkeypatch: Any) -> None:
    monkeypatch.setattr(
        main,
        "get_user_by_email",
        lambda _email: {
            "id": "user-1",
            "email": "user@example.com",
            "nickname": "user",
            "role": "user",
            "status": "suspended",
            "password_hash": "hashed",
            "provider": "local",
        },
    )
    monkeypatch.setattr(main, "verify_password", lambda _p, _h: True)

    response = client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": "secret"},
    )

    assert response.status_code == 403
    assert (
        response.json()["detail"]
        == "보안 정책으로 계정이 정지되었습니다. 관리자에게 문의해 주세요"
    )


def test_unsuspend_admin_target_requires_super_admin(
    client: TestClient, monkeypatch: Any
) -> None:
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context(
        "admin-1", role="admin"
    )
    monkeypatch.setattr(
        main,
        "get_user_by_id",
        lambda _user_id: {
            "id": "target-admin",
            "role": "admin",
        },
    )

    response = client.delete("/api/admin/users/target-admin/suspend")

    assert response.status_code == 403
    assert response.json()["detail"] == "관리자 계정에는 적용할 수 없습니다"


def test_unsuspend_admin_target_allowed_for_super_admin(
    client: TestClient, monkeypatch: Any
) -> None:
    main.app.dependency_overrides[main.require_admin] = lambda: _admin_context(
        "super-1", role="super_admin"
    )
    monkeypatch.setattr(
        main,
        "get_user_by_id",
        lambda _user_id: {
            "id": "target-admin",
            "role": "admin",
        },
    )
    monkeypatch.setattr(
        main,
        "unsuspend_user",
        lambda user_id: {
            "id": user_id,
            "status": "active",
            "role": "admin",
        },
    )
    monkeypatch.setattr(main, "write_admin_action_log", lambda **_: None)

    response = client.delete("/api/admin/users/target-admin/suspend")

    assert response.status_code == 200
    assert response.json()["status"] == "active"
    assert response.json()["role"] == "admin"


def test_due_deletion_cleanup_logs_deleted_users(monkeypatch: Any) -> None:
    captured: list[dict[str, Any]] = []
    monkeypatch.setattr(
        main,
        "purge_due_user_deletions",
        lambda limit=200: [
            {
                "id": "target-1",
            }
        ],
    )
    monkeypatch.setattr(
        main,
        "write_admin_action_log",
        lambda **kwargs: captured.append(kwargs),
    )

    count = main.perform_due_user_deletion_cleanup()

    assert count == 1
    assert captured[0]["action_type"] == "user_deleted"
    assert captured[0]["target_id"] == "target-1"
