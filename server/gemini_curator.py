from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
import json
import re
from typing import cast
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class CurationEvaluation:
    relevance_score: int
    beginner_value: int
    category: str
    tags: list[str]
    reason: str


@dataclass(frozen=True)
class ThreeLevelSummary:
    beginner: str
    mid: str
    expert: str


@dataclass(frozen=True)
class QualityInputs:
    stars: int
    is_korean_dev: bool
    has_readme: bool
    relevance_score: int
    beginner_value: int


@dataclass(frozen=True)
class GeminiCurationResult:
    evaluation: CurationEvaluation
    summary: ThreeLevelSummary
    model: str


def calc_quality_score(payload: QualityInputs) -> int:
    score = 0.0
    score += min(payload.stars / 10.0, 20.0)
    score += payload.relevance_score * 3.0
    score += payload.beginner_value * 3.0
    if payload.is_korean_dev:
        score += 10.0
    if payload.has_readme:
        score += 10.0
    return min(int(score), 100)


def should_auto_reject(quality_score: int, relevance_score: int) -> bool:
    return quality_score < 30 or relevance_score < 4


def is_summary_quality_valid(summary: ThreeLevelSummary, min_length: int = 50) -> bool:
    texts = [summary.beginner.strip(), summary.mid.strip(), summary.expert.strip()]
    if any(len(text) < min_length for text in texts):
        return False

    unique_texts = {text for text in texts}
    return len(unique_texts) == 3


def fallback_summary_template(repo_name: str) -> ThreeLevelSummary:
    beginner = (
        f"{repo_name}는 바이브코딩 입문자가 바로 써볼 수 있는 도구/예제를 소개합니다. "
        "어드민 검수 후 더 쉬운 설명으로 업데이트됩니다."
    )
    mid = (
        f"{repo_name}는 개발 학습 중인 사용자가 흐름을 빠르게 파악할 수 있도록 정리된 저장소입니다. "
        "핵심 사용 방법은 검수 후 보강됩니다."
    )
    expert = (
        f"{repo_name}는 실무 관점에서 참고 가능한 구현 아이디어를 담고 있습니다. "
        "세부 아키텍처 요약은 검수 후 업데이트됩니다."
    )
    return ThreeLevelSummary(beginner=beginner, mid=mid, expert=expert)


def heuristic_curation_evaluation(repo: Mapping[str, object]) -> CurationEvaluation:
    text_parts = [
        str(repo.get("name") or ""),
        str(repo.get("title") or ""),
        str(repo.get("description") or ""),
        str(repo.get("readme_excerpt") or ""),
        str(repo.get("source_url") or ""),
        str(repo.get("language") or ""),
    ]
    haystack = " ".join(part.strip().lower() for part in text_parts if part).strip()

    vibe_keywords = [
        "vibe",
        "cursor",
        "claude",
        "copilot",
        "gemini",
        "openai",
        "llm",
        "ai",
        "agent",
        "mcp",
        "prompt",
        "windsurf",
        "bolt",
    ]
    beginner_keywords = [
        "starter",
        "template",
        "boilerplate",
        "example",
        "tutorial",
        "guide",
        "quickstart",
        "playground",
        "demo",
        "kit",
    ]

    relevance_hits = sum(1 for keyword in vibe_keywords if keyword in haystack)
    beginner_hits = sum(1 for keyword in beginner_keywords if keyword in haystack)

    relevance_score = min(10, max(3, 3 + relevance_hits * 2)) if haystack else 3
    beginner_value = min(
        10, max(2, 2 + beginner_hits * 2 + (1 if "readme" in haystack else 0))
    )
    category = classify_repository_category(haystack)
    tags = derive_repository_tags(repo, haystack)
    reason = build_repository_reason(relevance_hits, beginner_hits, category)

    return CurationEvaluation(
        relevance_score=relevance_score,
        beginner_value=beginner_value,
        category=category,
        tags=tags,
        reason=reason,
    )


def summarize_repository_without_llm(repo: Mapping[str, object]) -> ThreeLevelSummary:
    title = str(repo.get("title") or repo.get("name") or "이 저장소")
    description = str(repo.get("description") or "").strip()
    readme_excerpt = _trim_text(str(repo.get("readme_excerpt") or ""), limit=220)
    language = str(repo.get("language") or "").strip()
    category = str(repo.get("category") or "tool").strip() or "tool"

    beginner_focus = (
        description
        or readme_excerpt
        or f"{title}는 바로 따라해볼 수 있는 바이브코딩 자료예요."
    )
    beginner = (
        f"{title}는 {beginner_focus} "
        "설치하거나 열어보고, AI에게 무엇을 시키면 되는지 감을 잡기 좋은 출발점이에요."
    )
    mid = (
        f"{title}는 {category} 성격의 저장소로, {language or '주요 스택'} 기반 흐름을 빠르게 익히기 좋습니다. "
        f"{description or readme_excerpt or '구조를 살펴보며 실제 사용 패턴을 학습하기에 적합합니다.'}"
    )
    expert = (
        f"{title}는 {language or '범용'} 생태계에서 참고할 만한 {category} 구현입니다. "
        f"{description or readme_excerpt or '핵심 아이디어와 구조를 실무 관점에서 재해석하기 좋습니다.'}"
    )
    return ThreeLevelSummary(beginner=beginner, mid=mid, expert=expert)


def curate_repository_with_gemini(
    repo: Mapping[str, object],
    api_key: str,
    *,
    model: str = "gemini-2.0-flash",
    timeout_seconds: int = 20,
) -> GeminiCurationResult:
    cleaned_key = api_key.strip()
    if not cleaned_key:
        raise RuntimeError("Gemini API key is required")

    prompt = _build_gemini_prompt(repo)
    request_payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    request = Request(
        (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={cleaned_key}"
        ),
        data=json.dumps(request_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            raw_bytes = cast(bytes, response.read())
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(
            f"Gemini API request failed: {exc.code} {detail}".strip()
        ) from exc
    except URLError as exc:
        raise RuntimeError(f"Gemini API request failed: {exc.reason}") from exc

    response_payload: object = json.loads(raw_bytes.decode("utf-8"))
    response_text = _extract_gemini_text(response_payload)
    parsed = _parse_gemini_json(response_text)
    evaluation = _parse_curation_evaluation(parsed)
    summary = _parse_three_level_summary(parsed)
    return GeminiCurationResult(evaluation=evaluation, summary=summary, model=model)


def classify_repository_category(haystack: str) -> str:
    if any(
        keyword in haystack
        for keyword in ("template", "starter", "boilerplate", "scaffold")
    ):
        return "template"
    if any(
        keyword in haystack
        for keyword in ("tutorial", "guide", "learn", "course", "workshop")
    ):
        return "tutorial"
    if any(
        keyword in haystack
        for keyword in ("showcase", "portfolio", "demo app", "case study")
    ):
        return "showcase"
    return "tool"


def derive_repository_tags(repo: Mapping[str, object], haystack: str) -> list[str]:
    tags: list[str] = []
    keyword_tags = {
        "cursor": "Cursor",
        "claude": "Claude",
        "copilot": "Copilot",
        "gemini": "Gemini",
        "mcp": "MCP",
        "prompt": "Prompt",
        "agent": "Agent",
        "template": "Template",
        "tutorial": "Tutorial",
        "starter": "Starter",
    }
    for keyword, tag in keyword_tags.items():
        if keyword in haystack and tag not in tags:
            tags.append(tag)
    language = str(repo.get("language") or "").strip()
    if language and language not in tags:
        tags.append(language)
    category = str(repo.get("category") or "").strip().title()
    if category and category not in tags:
        tags.append(category)
    return tags[:5] or ["GitHub", "VibeCoding"]


def build_repository_reason(
    relevance_hits: int, beginner_hits: int, category: str
) -> str:
    if relevance_hits >= 3:
        return "AI 코딩 워크플로와 직접 연결되는 신호가 강합니다."
    if beginner_hits >= 2:
        return "입문자가 바로 열어보고 따라가기 좋은 구조입니다."
    return f"{category} 성격이 뚜렷해 큐레이션 카드로 분류하기 좋습니다."


def _build_gemini_prompt(repo: Mapping[str, object]) -> str:
    fields = {
        "repo_name": str(repo.get("repo_name") or repo.get("name") or ""),
        "repo_owner": str(repo.get("repo_owner") or repo.get("owner") or ""),
        "title": str(repo.get("title") or repo.get("name") or ""),
        "description": str(repo.get("description") or ""),
        "language": str(repo.get("language") or ""),
        "stars": str(repo.get("stars") or "0"),
        "license": str(repo.get("license") or ""),
        "source_url": str(repo.get("source_url") or ""),
        "readme_excerpt": _trim_text(str(repo.get("readme_excerpt") or ""), limit=3500),
    }
    return (
        "You are curating GitHub repositories for a Korean vibe-coding discovery service. "
        "Score the repository for relevance and beginner usefulness, then summarize it for three skill levels. "
        "Return JSON only with this exact shape: "
        '{"relevance_score": int 1-10, "beginner_value": int 1-10, '
        '"category": "tool|template|tutorial|showcase", "tags": [string], "reason": string, '
        '"summary_beginner": string, "summary_mid": string, "summary_expert": string}. '
        "Write summaries in Korean, keep each summary under 260 characters, and ground everything in the provided repository info only.\n\n"
        f"repo_name: {fields['repo_name']}\n"
        f"repo_owner: {fields['repo_owner']}\n"
        f"title: {fields['title']}\n"
        f"description: {fields['description']}\n"
        f"language: {fields['language']}\n"
        f"stars: {fields['stars']}\n"
        f"license: {fields['license']}\n"
        f"source_url: {fields['source_url']}\n"
        "readme_excerpt:\n"
        f"{fields['readme_excerpt']}"
    )


def _extract_gemini_text(payload: object) -> str:
    payload_object = _as_object_mapping(payload)
    if payload_object is None:
        raise RuntimeError("Gemini response payload was not an object")
    candidates = payload_object.get("candidates")
    if not isinstance(candidates, list):
        raise RuntimeError("Gemini response did not include candidates")
    for candidate in candidates:
        candidate_object = _as_object_mapping(candidate)
        if candidate_object is None:
            continue
        content = _as_object_mapping(candidate_object.get("content"))
        if content is None:
            continue
        parts = content.get("parts")
        if not isinstance(parts, list):
            continue
        texts = [
            part_object.get("text")
            for part in parts
            if (part_object := _as_object_mapping(part)) is not None
        ]
        joined = "\n".join(
            str(text).strip()
            for text in texts
            if isinstance(text, str) and text.strip()
        )
        if joined:
            return joined
    raise RuntimeError("Gemini response did not include text parts")


def _parse_gemini_json(text: str) -> dict[str, object]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(
            r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.DOTALL
        ).strip()
    payload: object = json.loads(cleaned)
    payload_object = _as_object_mapping(payload)
    if payload_object is None:
        raise RuntimeError("Gemini JSON response was not an object")
    return payload_object


def _parse_curation_evaluation(payload: Mapping[str, object]) -> CurationEvaluation:
    category = str(payload.get("category") or "tool").strip().lower() or "tool"
    if category not in {"tool", "template", "tutorial", "showcase"}:
        category = "tool"

    tags_payload = payload.get("tags")
    tags: list[str] = []
    if isinstance(tags_payload, list):
        tags = [str(tag).strip() for tag in tags_payload if str(tag).strip()][:5]
    if not tags:
        tags = ["GitHub", "VibeCoding"]

    reason = _trim_text(
        str(payload.get("reason") or "큐레이션 가치가 확인된 저장소입니다."), limit=180
    )
    return CurationEvaluation(
        relevance_score=_clamp_score(payload.get("relevance_score"), default=5),
        beginner_value=_clamp_score(payload.get("beginner_value"), default=5),
        category=category,
        tags=tags,
        reason=reason,
    )


def _parse_three_level_summary(payload: Mapping[str, object]) -> ThreeLevelSummary:
    summary = ThreeLevelSummary(
        beginner=_trim_text(str(payload.get("summary_beginner") or ""), limit=280),
        mid=_trim_text(str(payload.get("summary_mid") or ""), limit=280),
        expert=_trim_text(str(payload.get("summary_expert") or ""), limit=280),
    )
    if not is_summary_quality_valid(summary, min_length=30):
        raise RuntimeError("Gemini summary output was too short or duplicated")
    return summary


def _clamp_score(value: object, *, default: int) -> int:
    if isinstance(value, bool):
        numeric = int(value)
    elif isinstance(value, int):
        numeric = value
    elif isinstance(value, float):
        numeric = int(value)
    elif isinstance(value, str):
        try:
            numeric = int(value.strip())
        except ValueError:
            numeric = default
    else:
        numeric = default
    return max(1, min(numeric, 10))


def _trim_text(value: str, *, limit: int) -> str:
    normalized = re.sub(r"\s+", " ", value).strip()
    if len(normalized) <= limit:
        return normalized
    return normalized[: limit - 1].rstrip() + "..."


def _as_object_mapping(value: object) -> dict[str, object] | None:
    if not isinstance(value, dict):
        return None
    return {str(key): item for key, item in value.items()}
