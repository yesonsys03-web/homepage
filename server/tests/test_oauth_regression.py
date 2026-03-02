from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main
from auth import decode_token


class _FakeResponse:
    def __init__(self, payload: dict[str, Any]):
        self._payload = payload

    def read(self) -> bytes:
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> bool:
        return False


def _mock_google_urlopen(
    token_payload: dict[str, Any], profile_payload: dict[str, Any]
):
    def _urlopen(request: Any, timeout: int = 10) -> _FakeResponse:
        _ = timeout
        request_url = getattr(request, "full_url", str(request))
        if "oauth2.googleapis.com/tokeninfo" in request_url:
            return _FakeResponse(profile_payload)
        if "oauth2.googleapis.com/token" in request_url:
            return _FakeResponse(token_payload)
        raise AssertionError(f"Unexpected URL opened in test: {request_url}")

    return _urlopen


def _enable_google_oauth(monkeypatch: Any) -> None:
    monkeypatch.setattr(main, "GOOGLE_CLIENT_ID", "google-client-id")
    monkeypatch.setattr(main, "GOOGLE_CLIENT_SECRET", "google-client-secret")
    monkeypatch.setattr(
        main,
        "get_effective_oauth_settings",
        lambda: {
            "google_oauth_enabled": True,
            "google_redirect_uri": "http://localhost:8000/api/auth/google/callback",
            "google_frontend_redirect_uri": "http://localhost:5173",
        },
    )


def test_google_start_returns_auth_url_with_state(monkeypatch: Any) -> None:
    _enable_google_oauth(monkeypatch)
    client = TestClient(main.app)

    response = client.get("/api/auth/google/start")

    assert response.status_code == 200
    auth_url = response.json()["auth_url"]
    parsed = urlparse(auth_url)
    query = parse_qs(parsed.query)

    assert parsed.netloc == "accounts.google.com"
    assert query["client_id"] == ["google-client-id"]
    assert query["redirect_uri"] == ["http://localhost:8000/api/auth/google/callback"]
    state = query["state"][0]
    decoded_state = decode_token(state)
    assert decoded_state is not None
    assert decoded_state["type"] == "google_oauth_state"


def test_google_callback_rejects_invalid_state(monkeypatch: Any) -> None:
    _enable_google_oauth(monkeypatch)
    client = TestClient(main.app)

    response = client.get(
        "/api/auth/google/callback",
        params={"code": "oauth-code", "state": "not-a-valid-token"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "유효하지 않은 OAuth state입니다"


def test_google_callback_redirects_with_oauth_status_for_pending_user(
    monkeypatch: Any,
) -> None:
    _enable_google_oauth(monkeypatch)
    monkeypatch.setattr(main, "consume_oauth_state_token", lambda _: True)
    monkeypatch.setattr(main, "cleanup_oauth_state_tokens", lambda: None)
    monkeypatch.setattr(main, "decode_token", lambda _: {"type": "google_oauth_state"})
    monkeypatch.setattr(
        main,
        "urlopen",
        _mock_google_urlopen(
            token_payload={"id_token": "fake-id-token"},
            profile_payload={
                "email": "pending@example.com",
                "sub": "google-user-id",
                "email_verified": True,
                "name": "Pending User",
            },
        ),
    )
    monkeypatch.setattr(main, "get_user_by_provider", lambda *_: None)
    monkeypatch.setattr(
        main,
        "create_or_update_google_user",
        lambda **_: {
            "id": "pending-user-id",
            "email": "pending@example.com",
            "nickname": "pending-user",
            "role": "user",
            "status": "pending",
        },
    )

    client = TestClient(main.app)
    response = client.get(
        "/api/auth/google/callback",
        params={"code": "oauth-code", "state": "valid-state-token"},
        follow_redirects=False,
    )

    assert response.status_code == 302
    location = response.headers["location"]
    assert "oauth_status=pending" in location
    assert "oauth_token=" not in location


def test_google_callback_redirects_with_oauth_token_for_active_user(
    monkeypatch: Any,
) -> None:
    _enable_google_oauth(monkeypatch)
    monkeypatch.setattr(main, "consume_oauth_state_token", lambda _: True)
    monkeypatch.setattr(main, "cleanup_oauth_state_tokens", lambda: None)
    monkeypatch.setattr(main, "decode_token", lambda _: {"type": "google_oauth_state"})
    monkeypatch.setattr(
        main,
        "urlopen",
        _mock_google_urlopen(
            token_payload={"id_token": "fake-id-token"},
            profile_payload={
                "email": "active@example.com",
                "sub": "google-user-id",
                "email_verified": True,
                "name": "Active User",
            },
        ),
    )
    monkeypatch.setattr(main, "get_user_by_provider", lambda *_: None)
    monkeypatch.setattr(
        main,
        "create_or_update_google_user",
        lambda **_: {
            "id": "active-user-id",
            "email": "active@example.com",
            "nickname": "active-user",
            "role": "user",
            "status": "active",
        },
    )

    client = TestClient(main.app)
    response = client.get(
        "/api/auth/google/callback",
        params={"code": "oauth-code", "state": "valid-state-token"},
        follow_redirects=False,
    )

    assert response.status_code == 302
    location = response.headers["location"]
    parsed = urlparse(location)
    query = parse_qs(parsed.query)
    oauth_token = unquote(query["oauth_token"][0])
    decoded = decode_token(oauth_token)

    assert parsed.path == "/"
    assert decoded is not None
    assert decoded["sub"] == "active-user-id"


def test_google_callback_rejects_replayed_state(monkeypatch: Any) -> None:
    _enable_google_oauth(monkeypatch)
    consume_results = iter([True, False])
    monkeypatch.setattr(
        main, "consume_oauth_state_token", lambda _: next(consume_results)
    )
    monkeypatch.setattr(main, "cleanup_oauth_state_tokens", lambda: None)
    monkeypatch.setattr(main, "decode_token", lambda _: {"type": "google_oauth_state"})
    monkeypatch.setattr(
        main,
        "urlopen",
        _mock_google_urlopen(
            token_payload={"id_token": "fake-id-token"},
            profile_payload={
                "email": "active@example.com",
                "sub": "google-user-id",
                "email_verified": True,
                "name": "Active User",
            },
        ),
    )
    monkeypatch.setattr(main, "get_user_by_provider", lambda *_: None)
    monkeypatch.setattr(
        main,
        "create_or_update_google_user",
        lambda **_: {
            "id": "active-user-id",
            "email": "active@example.com",
            "nickname": "active-user",
            "role": "user",
            "status": "active",
        },
    )

    client = TestClient(main.app)
    first = client.get(
        "/api/auth/google/callback",
        params={"code": "oauth-code", "state": "replay-state-token"},
        follow_redirects=False,
    )
    second = client.get(
        "/api/auth/google/callback",
        params={"code": "oauth-code", "state": "replay-state-token"},
        follow_redirects=False,
    )

    assert first.status_code == 302
    assert second.status_code == 400
    assert second.json()["detail"] == "만료되었거나 이미 사용된 OAuth state입니다"
