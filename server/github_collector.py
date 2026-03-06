from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TypedDict
from urllib.parse import urlparse


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
