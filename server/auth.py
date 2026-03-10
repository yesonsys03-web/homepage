import os
from datetime import UTC, datetime, timedelta
from typing import cast

from jose import JWTError, jwt
import bcrypt
from dotenv import load_dotenv

_ = load_dotenv(".env")

# JWT 설정
_APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
_SECRET_KEY_FROM_ENV = os.getenv("SECRET_KEY", "").strip()
_DEFAULT_DEV_SECRET_KEY = "dev-secret-key-change-in-production"

if _SECRET_KEY_FROM_ENV:
    SECRET_KEY = _SECRET_KEY_FROM_ENV
else:
    SECRET_KEY = _DEFAULT_DEV_SECRET_KEY

if _APP_ENV in {"production", "staging"} and (
    not _SECRET_KEY_FROM_ENV or SECRET_KEY == _DEFAULT_DEV_SECRET_KEY
):
    raise RuntimeError("SECRET_KEY must be set to a strong value in production/staging")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7일


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def get_password_hash(password: str) -> str:
    """비밀번호 해시화"""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(
    data: dict[str, object], expires_delta: timedelta | None = None
) -> str:
    """JWT 액세스 토큰 생성"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict[str, object] | None:
    """JWT 토큰 디코딩"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return cast(dict[str, object], payload)
    except JWTError:
        return None
