from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import json
from typing import TypedDict, cast
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen


JsonObject = dict[str, object]
JsonArray = list[object]


class GitHubRepoCandidate(TypedDict):
    name: str
    owner: str
    source_url: str
    canonical_url: str
    description: str
    stars: int
    language: str
    license: str
    github_pushed_at: str
    has_readme: bool
    is_korean_dev: bool


@dataclass(frozen=True)
class GitHubCollectorConfig:
    search_topics: list[str]
    min_stars: int
    daily_collect_limit: int


class GitHubUserProfile(TypedDict, total=False):
    login: str
    location: str | None


def normalize_github_repo_url(url: str) -> str:
    parsed = urlparse(url.strip())
    host = parsed.netloc.lower()
    path = parsed.path.rstrip("/")

    if host.endswith("github.com"):
        host = "github.com"

    if path.endswith(".git"):
        path = path[:-4]

    return f"https://{host}{path}"


def is_recent_repo(last_pushed_at: datetime, now: datetime | None = None) -> bool:
    current = now or datetime.now(UTC)
    return last_pushed_at >= (current - timedelta(days=90))


def reached_daily_collect_limit(
    today_collected_count: int, config: GitHubCollectorConfig
) -> bool:
    return today_collected_count >= config.daily_collect_limit


def build_search_query(config: GitHubCollectorConfig) -> str:
    topic_query = " ".join(f"topic:{topic}" for topic in config.search_topics)
    return f"{topic_query} stars:>={config.min_stars}"


def search_github_repositories(
    config: GitHubCollectorConfig,
    github_token: str,
    per_page: int = 20,
    now: datetime | None = None,
) -> list[GitHubRepoCandidate]:
    current = now or datetime.now(UTC)
    pushed_cutoff = (current - timedelta(days=90)).date().isoformat()
    safe_per_page = max(1, min(per_page, 100))
    collected: dict[str, GitHubRepoCandidate] = {}
    korean_cache: dict[str, bool] = {}

    for topic in config.search_topics:
        query = f"topic:{topic} stars:>={config.min_stars} pushed:>={pushed_cutoff}"
        payload = _github_get_json(
            f"https://api.github.com/search/repositories?q={quote(query)}&sort=updated&order=desc&per_page={safe_per_page}",
            github_token,
        )
        items = payload.get("items") if isinstance(payload, dict) else None
        if not isinstance(items, list):
            continue

        for item in items:
            item_payload = _as_json_object(item)
            if item_payload is None:
                continue

            owner_payload = _as_json_object(item_payload.get("owner"))
            owner_login = ""
            if owner_payload is not None:
                login_value = owner_payload.get("login")
                owner_login = str(login_value or "").strip()
            source_url = str(item_payload.get("html_url") or "").strip()
            canonical_url = normalize_github_repo_url(source_url)
            if not owner_login or not source_url or canonical_url in collected:
                continue

            pushed_at = _parse_github_datetime(item_payload.get("pushed_at"))
            if pushed_at is None or not is_recent_repo(pushed_at, current):
                continue

            if owner_login not in korean_cache:
                korean_cache[owner_login] = is_korean_github_user(
                    fetch_github_user_profile(owner_login, github_token)
                )
            collected[canonical_url] = {
                "name": str(item_payload.get("name") or "").strip(),
                "owner": owner_login,
                "source_url": source_url,
                "canonical_url": canonical_url,
                "description": str(item_payload.get("description") or "").strip(),
                "stars": _safe_int(item_payload.get("stargazers_count"), 0),
                "language": str(item_payload.get("language") or "").strip(),
                "license": _extract_license(item_payload),
                "github_pushed_at": pushed_at.isoformat(),
                "has_readme": bool(item_payload.get("default_branch")),
                "is_korean_dev": korean_cache[owner_login],
            }

    return list(collected.values())


def fetch_github_user_profile(owner: str, github_token: str) -> GitHubUserProfile:
    payload = _github_get_json(f"https://api.github.com/users/{owner}", github_token)
    if not isinstance(payload, dict):
        return {"login": owner, "location": None}
    login_value = payload.get("login")
    location = payload.get("location")
    return {
        "login": str(login_value or owner),
        "location": location if isinstance(location, str) else None,
    }


def fetch_github_readme_excerpt(
    owner: str,
    repo_name: str,
    github_token: str,
    *,
    max_chars: int = 4000,
) -> str:
    if not owner.strip() or not repo_name.strip() or max_chars <= 0:
        return ""

    url = (
        "https://api.github.com/repos/"
        f"{quote(owner.strip())}/{quote(repo_name.strip())}/readme"
    )
    try:
        content = _github_get_text(
            url,
            github_token,
            accept_header="application/vnd.github.raw+json",
        )
    except RuntimeError:
        return ""

    normalized = "\n".join(line.rstrip() for line in content.splitlines()).strip()
    if not normalized:
        return ""
    if len(normalized) <= max_chars:
        return normalized
    return normalized[: max_chars - 1].rstrip() + "..."


def fetch_github_license_file(
    owner: str,
    repo_name: str,
    github_token: str,
    *,
    max_chars: int = 2000,
) -> str:
    if not owner.strip() or not repo_name.strip():
        return ""

    url = (
        "https://api.github.com/repos/"
        f"{quote(owner.strip())}/{quote(repo_name.strip())}/license"
    )
    try:
        content = _github_get_text(
            url,
            github_token,
            accept_header="application/vnd.github.raw+json",
        )
    except RuntimeError:
        return ""

    normalized = content.strip()
    if not normalized:
        return ""
    if len(normalized) <= max_chars:
        return normalized
    return normalized[:max_chars].rstrip() + "..."


def is_korean_github_user(profile: GitHubUserProfile) -> bool:
    location = str(profile.get("location") or "").lower()
    if not location:
        return False
    return any(
        keyword in location
        for keyword in ("korea", "seoul", "한국", "서울", "대한민국")
    )


def _github_get_json(url: str, github_token: str) -> dict[str, object] | list[object]:
    request = Request(url, headers=_build_github_headers(github_token))
    try:
        with urlopen(request, timeout=10) as response:
            raw_bytes = cast(bytes, response.read())
            payload = json.loads(raw_bytes.decode("utf-8"))
            json_object = _as_json_object(payload)
            if json_object is not None:
                return json_object
            if isinstance(payload, list):
                return payload
            raise RuntimeError("GitHub API response was not valid JSON")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(
            f"GitHub API request failed: {exc.code} {detail}".strip()
        ) from exc
    except URLError as exc:
        raise RuntimeError(f"GitHub API request failed: {exc.reason}") from exc


def _github_get_text(
    url: str,
    github_token: str,
    *,
    accept_header: str = "application/vnd.github.raw+json",
) -> str:
    request = Request(
        url,
        headers=_build_github_headers(github_token, accept_header=accept_header),
    )
    try:
        with urlopen(request, timeout=10) as response:
            raw_bytes = cast(bytes, response.read())
            return raw_bytes.decode("utf-8", errors="ignore")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(
            f"GitHub API request failed: {exc.code} {detail}".strip()
        ) from exc
    except URLError as exc:
        raise RuntimeError(f"GitHub API request failed: {exc.reason}") from exc


def _parse_github_datetime(value: object) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)
    except ValueError:
        return None


def _extract_license(item: dict[str, object]) -> str:
    license_payload = item.get("license")
    if not isinstance(license_payload, dict):
        return ""
    return str(
        license_payload.get("spdx_id") or license_payload.get("key") or ""
    ).strip()


def _safe_int(value: object, default: int = 0) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        try:
            return int(value)
        except ValueError:
            return default
    return default


def _as_json_object(value: object) -> JsonObject | None:
    if not isinstance(value, dict):
        return None
    return {str(key): item for key, item in value.items()}


def _build_github_headers(
    github_token: str, *, accept_header: str = "application/vnd.github+json"
) -> dict[str, str]:
    headers = {
        "Accept": accept_header,
        "User-Agent": "vibecoder-playground-curated-collector",
    }
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"
    return headers
