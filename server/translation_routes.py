from __future__ import annotations

from types import ModuleType
from typing import Protocol, cast

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel


class ErrorTranslatePayload(Protocol):
    error_message: str


class ErrorTranslateFeedbackPayload(Protocol):
    error_hash: str
    solved: bool


class TextTranslatePayload(Protocol):
    input_text: str


class GlossaryTermRequestPayload(Protocol):
    requested_term: str
    context_note: str | None


def register_translation_routes(
    app: FastAPI,
    main_module: ModuleType,
    error_translate_request_model: type[BaseModel],
    error_translate_feedback_request_model: type[BaseModel],
    text_translate_request_model: type[BaseModel],
    glossary_term_request_create_model: type[BaseModel],
) -> None:
    @app.post("/api/error-translate")
    def error_translate_endpoint(payload: dict[str, object], request: Request):
        validated = cast(
            ErrorTranslatePayload,
            error_translate_request_model.model_validate(payload),
        )
        client_ip = main_module._extract_client_ip(request)
        main_module.enforce_rate_limit(
            "error_translate_ip",
            client_ip,
            limit=main_module.ERROR_TRANSLATE_IP_LIMIT_PER_MINUTE,
            window_seconds=60.0,
            detail="요청이 너무 많습니다. 잠시 후 다시 시도해 주세요",
        )

        message = validated.error_message.strip()
        if not message:
            raise HTTPException(status_code=400, detail="에러 메시지를 입력해 주세요")
        if len(message) > 2000:
            raise HTTPException(
                status_code=400,
                detail="에러 메시지는 2000자 이하로 입력해 주세요",
            )

        normalized = message
        if main_module.contains_prompt_injection(normalized):
            normalized = "[prompt-injection-filtered] " + normalized

        error_hash = main_module.hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        cached = main_module.get_error_solution(error_hash)
        if cached:
            solution = cast(dict[str, object], cached.get("solution") or {})
            solution["error_hash"] = error_hash
            solution["source"] = "cache"
            return solution

        solution = main_module.build_error_solution_fallback(message)
        _ = main_module.upsert_error_solution(
            error_hash=error_hash,
            error_type=str(solution.get("error_type") or "general"),
            error_excerpt=message[:200],
            solution=solution,
        )
        solution["error_hash"] = error_hash
        solution["source"] = "fallback"
        return solution

    @app.post("/api/error-translate/feedback")
    def error_translate_feedback_endpoint(payload: dict[str, object]):
        validated = cast(
            ErrorTranslateFeedbackPayload,
            error_translate_feedback_request_model.model_validate(payload),
        )
        updated = main_module.increment_error_solution_feedback(
            error_hash=validated.error_hash,
            solved=validated.solved,
        )
        if not updated:
            raise HTTPException(
                status_code=404, detail="해당 에러 기록을 찾을 수 없습니다"
            )
        return {"ok": True}

    @app.post("/api/translate")
    def text_translate_endpoint(payload: dict[str, object], request: Request):
        validated = cast(
            TextTranslatePayload,
            text_translate_request_model.model_validate(payload),
        )
        client_ip = main_module._extract_client_ip(request)
        main_module.enforce_rate_limit(
            "text_translate_ip",
            client_ip,
            limit=main_module.TEXT_TRANSLATE_IP_LIMIT_PER_MINUTE,
            window_seconds=60.0,
            detail="요청이 너무 많습니다. 잠시 후 다시 시도해 주세요",
        )

        input_text = validated.input_text.strip()
        if not input_text:
            raise HTTPException(status_code=400, detail="번역할 텍스트를 입력해 주세요")
        if len(input_text) > 2000:
            raise HTTPException(
                status_code=400,
                detail="번역 텍스트는 2000자 이하로 입력해 주세요",
            )

        normalized = input_text
        if main_module.contains_prompt_injection(normalized):
            normalized = "[prompt-injection-filtered] " + normalized

        input_hash = main_module.hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        cached = main_module.get_text_translation(input_hash)
        if cached:
            translation = cast(dict[str, object], cached.get("translation") or {})
            translation["input_hash"] = input_hash
            translation["source"] = "cache"
            return translation

        if main_module.GEMINI_API_KEY:
            try:
                translation = main_module.translate_text_with_gemini(
                    input_text,
                    api_key=main_module.GEMINI_API_KEY,
                    model=main_module.GEMINI_MODEL,
                )
                source = "gemini"
            except RuntimeError:
                translation = main_module.build_text_translation_fallback(input_text)
                source = "fallback"
        else:
            translation = main_module.build_text_translation_fallback(input_text)
            source = "fallback"

        _ = main_module.upsert_text_translation(
            input_hash=input_hash,
            input_excerpt=input_text[:200],
            translation=translation,
        )
        translation["input_hash"] = input_hash
        translation["source"] = source
        return translation

    @app.post("/api/glossary/term-requests")
    def create_glossary_term_request_endpoint(
        payload: dict[str, object],
        request: Request,
    ):
        validated = cast(
            GlossaryTermRequestPayload,
            glossary_term_request_create_model.model_validate(payload),
        )
        client_ip = main_module._extract_client_ip(request)
        main_module.enforce_rate_limit(
            "glossary_term_request_ip",
            client_ip,
            limit=main_module.GLOSSARY_TERM_REQUEST_IP_LIMIT_PER_HOUR,
            window_seconds=60.0 * 60.0,
            detail="용어 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요",
        )

        requested_term = validated.requested_term.strip()
        if len(requested_term) < 2:
            raise HTTPException(status_code=400, detail="용어는 2자 이상 입력해 주세요")
        if len(requested_term) > 80:
            raise HTTPException(
                status_code=400, detail="용어는 80자 이하로 입력해 주세요"
            )

        saved = main_module.create_glossary_term_request(
            requested_term=requested_term,
            context_note=(validated.context_note or "").strip() or None,
            requester_ip=client_ip,
            requester_id=None,
        )
        return {
            "id": main_module.safe_int(saved.get("id"), 0),
            "requested_term": str(saved.get("requested_term") or ""),
            "status": str(saved.get("status") or "pending"),
            "created_at": str(saved.get("created_at") or ""),
        }
