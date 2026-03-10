from __future__ import annotations

import hashlib
import sys
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main


def test_translate_endpoint_returns_fallback_and_persists_cache(
    monkeypatch: Any,
) -> None:
    client = TestClient(main.app)
    saved_payload: dict[str, Any] = {}

    monkeypatch.setattr(main, "get_text_translation", lambda _hash: None)

    def capture_translation(**kwargs: Any) -> dict[str, Any]:
        saved_payload.update(kwargs)
        return kwargs

    monkeypatch.setattr(main, "upsert_text_translation", capture_translation)

    response = client.post(
        "/api/translate",
        json={
            "input_text": "Initialize a new git repository and set upstream to origin main branch"
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "fallback"
    assert body["korean_summary"]
    assert isinstance(body["related_terms"], list)
    assert body["related_terms"]
    assert body["commands"][0]["command"] == "git init"
    assert saved_payload["input_excerpt"].startswith("Initialize a new git repository")
    assert saved_payload["translation"]["simple_analogy"]


def test_translate_endpoint_returns_cached_translation(monkeypatch: Any) -> None:
    client = TestClient(main.app)
    input_text = "Use pnpm install before pnpm dev"
    input_hash = hashlib.sha256(input_text.encode("utf-8")).hexdigest()

    monkeypatch.setattr(
        main,
        "get_text_translation",
        lambda _hash: {
            "translation": {
                "korean_summary": "먼저 필요한 파일을 설치한 뒤 실행하라는 뜻이에요.",
                "simple_analogy": "장을 본 뒤 가게 문을 여는 순서예요.",
                "commands": [],
                "related_terms": ["pnpm", "pnpm dev"],
            }
        },
    )

    response = client.post("/api/translate", json={"input_text": input_text})

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "cache"
    assert body["input_hash"] == input_hash
    assert body["related_terms"] == ["pnpm", "pnpm dev"]


def test_translate_endpoint_uses_gemini_when_api_key_exists(monkeypatch: Any) -> None:
    client = TestClient(main.app)

    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(main, "get_text_translation", lambda _hash: None)
    monkeypatch.setattr(
        main,
        "translate_text_with_gemini",
        lambda input_text, **_: {
            "korean_summary": f"{input_text} 뜻을 쉽게 풀어쓴 결과예요.",
            "simple_analogy": "마트 설명서를 친구가 쉬운 말로 바꿔주는 느낌이에요.",
            "commands": [],
            "related_terms": ["git"],
        },
    )
    monkeypatch.setattr(main, "upsert_text_translation", lambda **kwargs: kwargs)

    response = client.post("/api/translate", json={"input_text": "Explain git remote"})

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "gemini"
    assert body["related_terms"] == ["git"]


def test_translate_endpoint_falls_back_when_gemini_fails(monkeypatch: Any) -> None:
    client = TestClient(main.app)

    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(main, "get_text_translation", lambda _hash: None)

    def raise_gemini_error(input_text: str, **_: Any) -> dict[str, object]:
        raise RuntimeError(f"Gemini failed for: {input_text}")

    monkeypatch.setattr(main, "translate_text_with_gemini", raise_gemini_error)
    monkeypatch.setattr(main, "upsert_text_translation", lambda **kwargs: kwargs)

    response = client.post(
        "/api/translate", json={"input_text": "Initialize a new git repository"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "fallback"
    assert body["korean_summary"]
    assert isinstance(body["related_terms"], list)


def test_translate_endpoint_rejects_long_input() -> None:
    client = TestClient(main.app)

    response = client.post("/api/translate", json={"input_text": "a" * 2001})

    assert response.status_code == 400
    assert response.json()["detail"] == "번역 텍스트는 2000자 이하로 입력해 주세요"
