from __future__ import annotations

from dataclasses import dataclass


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
