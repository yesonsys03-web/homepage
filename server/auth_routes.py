from __future__ import annotations

from datetime import timedelta
from types import ModuleType
from typing import Protocol, cast

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel


class OAuthCodeExchangePayload(Protocol):
    oauth_code: str


class RegisterPayload(Protocol):
    email: str
    nickname: str
    password: str


class LoginPayload(Protocol):
    email: str
    password: str


class ProfileUpdatePayload(Protocol):
    def model_dump(self, *, exclude_none: bool = False) -> dict[str, object]: ...


class ReadableResponse(Protocol):
    def __enter__(self) -> "ReadableResponse": ...
    def __exit__(self, exc_type: object, exc: object, tb: object) -> bool: ...
    def read(self) -> bytes: ...


def _safe_google_nickname(
    main_module: ModuleType,
    profile_payload: dict[str, object],
) -> str:
    base_nickname = main_module.build_google_nickname(profile_payload)
    try:
        return main_module.ensure_unique_nickname(base_nickname)
    except Exception:
        return base_nickname


def _cleanup_oauth_state_tokens_safe(main_module: ModuleType) -> None:
    try:
        main_module.cleanup_oauth_state_tokens()
    except Exception:
        pass


def register_auth_routes(
    app: FastAPI,
    main_module: ModuleType,
    oauth_code_exchange_request_model: type[BaseModel],
    register_request_model: type[BaseModel],
    login_request_model: type[BaseModel],
    profile_update_request_model: type[BaseModel],
) -> None:
    @app.get("/api/auth/google/start")
    def google_auth_start():
        oauth_settings = main_module.ensure_google_oauth_available()
        state = main_module.create_access_token(
            data={
                "type": "google_oauth_state",
                "nonce": main_module.secrets.token_hex(12),
            },
            expires_delta=timedelta(seconds=main_module.GOOGLE_OAUTH_STATE_TTL_SECONDS),
        )
        try:
            main_module.create_oauth_state_token(
                state=state,
                ttl_seconds=main_module.GOOGLE_OAUTH_STATE_TTL_SECONDS,
            )
        except Exception:
            pass
        _cleanup_oauth_state_tokens_safe(main_module)
        params = {
            "client_id": main_module.GOOGLE_CLIENT_ID,
            "redirect_uri": oauth_settings["google_redirect_uri"],
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "prompt": "select_account",
            "access_type": "offline",
        }
        auth_url = (
            "https://accounts.google.com/o/oauth2/v2/auth?"
            + main_module.urlencode(params)
        )
        return {"auth_url": auth_url}

    @app.get("/api/auth/google/callback")
    def google_auth_callback(code: str, state: str):
        oauth_settings = main_module.ensure_google_oauth_available()
        decoded_state = main_module.decode_token(state)
        if not decoded_state or decoded_state.get("type") != "google_oauth_state":
            raise HTTPException(
                status_code=400, detail="유효하지 않은 OAuth state입니다"
            )
        if not main_module.consume_oauth_state_token(state):
            raise HTTPException(
                status_code=400, detail="만료되었거나 이미 사용된 OAuth state입니다"
            )
        _cleanup_oauth_state_tokens_safe(main_module)

        token_request_body = main_module.urlencode(
            {
                "code": code,
                "client_id": main_module.GOOGLE_CLIENT_ID,
                "client_secret": main_module.GOOGLE_CLIENT_SECRET,
                "redirect_uri": oauth_settings["google_redirect_uri"],
                "grant_type": "authorization_code",
            }
        ).encode("utf-8")

        token_payload: dict[str, object] = {}
        try:
            token_request = main_module.UrlRequest(
                "https://oauth2.googleapis.com/token",
                data=token_request_body,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                method="POST",
            )
            with cast(
                ReadableResponse, main_module.urlopen(token_request, timeout=10)
            ) as response:
                token_json = cast(
                    object, main_module.json.loads(response.read().decode("utf-8"))
                )
                if not isinstance(token_json, dict):
                    raise HTTPException(
                        status_code=502, detail="Google 토큰 응답이 유효하지 않습니다"
                    )
                token_payload = cast(dict[str, object], token_json)
        except Exception as error:
            raise HTTPException(
                status_code=502, detail="Google 토큰 교환에 실패했습니다"
            ) from error

        raw_id_token = token_payload.get("id_token")
        if not isinstance(raw_id_token, str) or not raw_id_token:
            raise HTTPException(
                status_code=400, detail="Google id_token이 누락되었습니다"
            )

        profile_payload: dict[str, object] = {}
        try:
            profile_request = main_module.UrlRequest(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={main_module.quote(raw_id_token)}",
                method="GET",
            )
            with cast(
                ReadableResponse, main_module.urlopen(profile_request, timeout=10)
            ) as response:
                profile_json = cast(
                    object, main_module.json.loads(response.read().decode("utf-8"))
                )
                if not isinstance(profile_json, dict):
                    raise HTTPException(
                        status_code=502, detail="Google 프로필 응답이 유효하지 않습니다"
                    )
                profile_payload = cast(dict[str, object], profile_json)
        except Exception as error:
            raise HTTPException(
                status_code=502, detail="Google 프로필 검증에 실패했습니다"
            ) from error

        raw_email = profile_payload.get("email")
        email = raw_email.strip().lower() if isinstance(raw_email, str) else ""
        raw_sub = profile_payload.get("sub")
        provider_user_id = raw_sub.strip() if isinstance(raw_sub, str) else ""
        email_verified = profile_payload.get("email_verified") in ("true", True)
        if not email or not provider_user_id:
            raise HTTPException(
                status_code=400, detail="Google 계정 정보가 올바르지 않습니다"
            )

        existing_google_user = main_module.get_user_by_provider(
            "google", provider_user_id
        )
        nickname_for_upsert = (
            existing_google_user["nickname"]
            if existing_google_user
            else _safe_google_nickname(main_module, profile_payload)
        )
        user = main_module.create_or_update_google_user(
            email=email,
            nickname=nickname_for_upsert,
            provider_user_id=provider_user_id,
            email_verified=email_verified,
        )
        if not user:
            raise HTTPException(
                status_code=500, detail="Google 로그인 계정 생성에 실패했습니다"
            )
        user = main_module.ensure_bootstrap_super_admin(user)

        frontend_base = str(oauth_settings["google_frontend_redirect_uri"]).rstrip("/")
        user_status = user.get("status") or "active"
        if user_status != "active":
            return RedirectResponse(
                url=f"{frontend_base}/?oauth_status={user_status}", status_code=302
            )

        exchange_code = main_module.create_access_token(
            data={
                "type": "google_oauth_code",
                "sub": str(user["id"]),
                "email": str(user["email"]),
                "nonce": main_module.secrets.token_hex(10),
            },
            expires_delta=timedelta(seconds=120),
        )
        try:
            main_module.create_oauth_state_token(exchange_code, ttl_seconds=120)
        except Exception:
            pass
        _cleanup_oauth_state_tokens_safe(main_module)
        return RedirectResponse(
            url=f"{frontend_base}/?oauth_code={main_module.quote(exchange_code)}",
            status_code=302,
        )

    @app.post("/api/auth/google/exchange")
    def exchange_google_oauth_code(payload: dict[str, object]):
        validated = cast(
            OAuthCodeExchangePayload,
            oauth_code_exchange_request_model.model_validate(payload),
        )
        oauth_code = validated.oauth_code.strip()
        if not oauth_code:
            raise HTTPException(status_code=400, detail="oauth_code가 필요합니다")
        if not main_module.consume_oauth_state_token(oauth_code):
            raise HTTPException(
                status_code=400, detail="만료되었거나 이미 사용된 OAuth 코드입니다"
            )
        _cleanup_oauth_state_tokens_safe(main_module)

        decoded = main_module.decode_token(oauth_code)
        if not decoded or decoded.get("type") != "google_oauth_code":
            raise HTTPException(
                status_code=400, detail="유효하지 않은 OAuth 코드입니다"
            )
        user_id = decoded.get("sub")
        if not isinstance(user_id, str) or not user_id:
            raise HTTPException(
                status_code=400, detail="OAuth 코드 사용자 정보가 올바르지 않습니다"
            )

        user = main_module.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
        user = main_module.ensure_bootstrap_super_admin(cast(dict[str, object], user))
        status_raw = user.get("status")
        user_status = (
            status_raw if isinstance(status_raw, str) and status_raw else "active"
        )
        if user_status != "active":
            raise HTTPException(
                status_code=403,
                detail=main_module.get_blocked_user_message(user_status),
            )
        token_version = user.get("token_version")
        token_version_value = token_version if isinstance(token_version, int) else 0
        access_token = main_module.create_access_token(
            data={
                "sub": str(user["id"]),
                "email": str(user["email"]),
                "sv": token_version_value,
            }
        )
        return main_module.TokenResponse(
            access_token=access_token, user=main_module.build_user_context(user)
        )

    @app.post("/api/auth/register")
    def register(payload: dict[str, object], request: Request):
        validated = cast(
            RegisterPayload, register_request_model.model_validate(payload)
        )
        client_ip = main_module._extract_client_ip(request)
        main_module.enforce_rate_limit(
            "register_ip",
            client_ip,
            limit=main_module.REGISTER_IP_LIMIT_PER_HOUR,
            window_seconds=60.0 * 60.0,
            detail="회원가입 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요",
        )
        existing = main_module.get_user_by_email(validated.email)
        if existing:
            raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다")
        password_hash = main_module.get_password_hash(validated.password)
        user = main_module.create_user(
            validated.email, validated.nickname, password_hash, status="pending"
        )
        if not user:
            raise HTTPException(status_code=500, detail="회원가입 처리에 실패했습니다")
        user = main_module.ensure_bootstrap_super_admin(user)
        token_version = user.get("token_version")
        token_version_value = token_version if isinstance(token_version, int) else 0
        access_token = main_module.create_access_token(
            data={
                "sub": str(user["id"]),
                "email": user["email"],
                "sv": token_version_value,
            }
        )
        return main_module.TokenResponse(
            access_token=access_token, user=main_module.build_user_context(user)
        )

    @app.post("/api/auth/login")
    def login(payload: dict[str, object], request: Request):
        validated = cast(LoginPayload, login_request_model.model_validate(payload))
        client_ip = main_module._extract_client_ip(request)
        normalized_email = validated.email.strip().lower()
        main_module.enforce_rate_limit(
            "login_ip",
            client_ip,
            limit=main_module.LOGIN_IP_LIMIT_PER_MINUTE,
            window_seconds=60.0,
            detail="로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요",
        )
        main_module.enforce_rate_limit(
            "login_account",
            normalized_email,
            limit=main_module.LOGIN_ACCOUNT_LIMIT_PER_HOUR,
            window_seconds=60.0 * 60.0,
            detail="해당 계정의 로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요",
        )
        user = main_module.get_user_by_email(validated.email)
        if not user:
            raise HTTPException(
                status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다"
            )
        user = main_module.ensure_bootstrap_super_admin(user)
        password_hash_raw = user.get("password_hash")
        password_hash = (
            password_hash_raw if isinstance(password_hash_raw, str) else None
        )
        if not password_hash and (user.get("provider") == "google"):
            raise HTTPException(
                status_code=400,
                detail="Google로 가입한 계정입니다. 비밀번호 대신 Google 로그인 버튼을 사용해 주세요",
            )
        if not password_hash or not main_module.verify_password(
            validated.password, password_hash
        ):
            raise HTTPException(
                status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다"
            )
        status_raw = user.get("status")
        user_status = (
            status_raw if isinstance(status_raw, str) and status_raw else "active"
        )
        if user_status != "active":
            raise HTTPException(
                status_code=403,
                detail=main_module.get_blocked_user_message(user_status),
            )
        token_version = user.get("token_version")
        token_version_value = token_version if isinstance(token_version, int) else 0
        access_token = main_module.create_access_token(
            data={
                "sub": str(user["id"]),
                "email": user["email"],
                "sv": token_version_value,
            }
        )
        return main_module.TokenResponse(
            access_token=access_token, user=main_module.build_user_context(user)
        )

    @app.get("/api/me")
    async def get_me(current_user: object = Depends(main_module.get_current_user)):
        return current_user

    @app.patch("/api/me")
    async def update_me(
        payload: dict[str, object],
        current_user: object = Depends(main_module.get_current_user),
    ):
        validated = cast(
            ProfileUpdatePayload, profile_update_request_model.model_validate(payload)
        )
        current_user = cast(dict[str, object], current_user)
        updates = validated.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="변경할 프로필 필드가 없습니다")

        if "nickname" in updates:
            nickname = str(updates.get("nickname") or "").strip()
            if not nickname:
                raise HTTPException(
                    status_code=400, detail="닉네임은 비어 있을 수 없습니다"
                )
            if len(nickname) < main_module.PROFILE_NICKNAME_MIN_LEN:
                raise HTTPException(
                    status_code=400,
                    detail=f"닉네임은 {main_module.PROFILE_NICKNAME_MIN_LEN}자 이상이어야 합니다",
                )
            if len(nickname) > main_module.PROFILE_NICKNAME_MAX_LEN:
                raise HTTPException(
                    status_code=400,
                    detail=f"닉네임은 {main_module.PROFILE_NICKNAME_MAX_LEN}자를 초과할 수 없습니다",
                )
            existing = main_module.get_user_by_nickname(nickname)
            if existing and str(existing["id"]) != str(current_user["id"]):
                raise HTTPException(
                    status_code=400, detail="이미 사용 중인 닉네임입니다"
                )
            updates["nickname"] = nickname

        if "bio" in updates:
            bio = str(updates.get("bio") or "").strip()
            if len(bio) > main_module.PROFILE_BIO_MAX_LEN:
                raise HTTPException(
                    status_code=400,
                    detail=f"소개는 {main_module.PROFILE_BIO_MAX_LEN}자를 초과할 수 없습니다",
                )
            updates["bio"] = bio or None

        if "avatar_url" in updates:
            avatar_url = str(updates.get("avatar_url") or "").strip()
            if avatar_url:
                parsed = main_module.urlparse(avatar_url)
                if parsed.scheme not in ("http", "https") or not parsed.netloc:
                    raise HTTPException(
                        status_code=400,
                        detail="아바타 URL은 http/https 형식이어야 합니다",
                    )
                updates["avatar_url"] = avatar_url
            else:
                updates["avatar_url"] = None

        updated_user = main_module.update_user_profile(str(current_user["id"]), updates)
        if not updated_user:
            raise HTTPException(status_code=500, detail="프로필 수정에 실패했습니다")
        return {
            "id": str(updated_user["id"]),
            "email": updated_user["email"],
            "nickname": updated_user["nickname"],
            "role": updated_user["role"],
            "status": updated_user.get("status", "active"),
            "avatar_url": updated_user.get("avatar_url"),
            "bio": updated_user.get("bio"),
        }

    @app.get("/api/me/projects")
    def get_my_projects(current_user: object = Depends(main_module.get_current_user)):
        current_user = cast(dict[str, object], current_user)
        projects = main_module.get_user_projects(str(current_user["id"]))
        for project in projects:
            project["id"] = str(project["id"])
            project["author_id"] = str(project["author_id"])
        return {"items": projects, "next_cursor": None}

    @app.get("/api/me/comments")
    def get_my_comments(
        limit: int = 50,
        current_user: object = Depends(main_module.get_current_user),
    ):
        current_user = cast(dict[str, object], current_user)
        comments = main_module.get_user_comments(str(current_user["id"]), limit)
        for comment in comments:
            comment["id"] = str(comment["id"])
            comment["project_id"] = str(comment["project_id"])
            comment["author_id"] = str(comment["author_id"])
            if comment.get("parent_id"):
                comment["parent_id"] = str(comment["parent_id"])
        return {"items": comments, "next_cursor": None}

    @app.get("/api/me/liked-projects")
    def get_my_liked_projects(
        limit: int = 50,
        current_user: object = Depends(main_module.get_current_user),
    ):
        current_user = cast(dict[str, object], current_user)
        projects = main_module.get_user_liked_projects(str(current_user["id"]), limit)
        for project in projects:
            project["id"] = str(project["id"])
            project["author_id"] = str(project["author_id"])
        return {"items": projects, "next_cursor": None}
