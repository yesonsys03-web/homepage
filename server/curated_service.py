from __future__ import annotations

import re
from datetime import datetime, timezone
from types import ModuleType
from typing import Mapping, Protocol, Sequence, cast


class CurationEvaluationLike(Protocol):
    category: str
    relevance_score: int
    beginner_value: int
    tags: list[str]
    reason: str


class ThreeLevelSummaryLike(Protocol):
    beginner: str
    mid: str
    expert: str


def perform_curated_collection_run(
    main_module: ModuleType,
    *,
    allow_sample_fallback: bool = True,
) -> dict[str, object]:
    config = main_module.GitHubCollectorConfig(
        search_topics=main_module.GITHUB_SEARCH_TOPICS,
        min_stars=main_module.GITHUB_MIN_STARS,
        daily_collect_limit=main_module.DAILY_COLLECT_LIMIT,
    )
    _ = main_module.build_search_query(config)

    existing = main_module.list_admin_curated_content(status=None, limit=500, offset=0)
    today = datetime.now(timezone.utc).date()
    collected_today = sum(
        1
        for row in existing
        if str(row.get("collected_at") or "").startswith(str(today))
    )

    if main_module.reached_daily_collect_limit(collected_today, config):
        return {
            "created": 0,
            "message": "오늘 수집 한도에 도달했습니다",
            "daily_limit": config.daily_collect_limit,
            "collected_today": collected_today,
        }

    candidates, collection_message = _load_curated_collection_candidates(
        main_module,
        config,
        allow_sample_fallback=allow_sample_fallback,
    )
    if not candidates:
        return {
            "created": 0,
            "daily_limit": config.daily_collect_limit,
            "collected_today": collected_today,
            **({"message": collection_message} if collection_message else {}),
        }
    moderation_settings = main_module.get_curated_runtime_settings()
    quality_review_threshold = cast(
        int,
        moderation_settings.get(
            "curated_review_quality_threshold",
            main_module.DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD,
        ),
    )

    created_count = 0
    processed_candidates: list[dict[str, object]] = []
    for repo in candidates:
        if main_module.reached_daily_collect_limit(
            collected_today + created_count, config
        ):
            break

        summary = main_module.ThreeLevelSummary(
            beginner=str(repo.get("summary_beginner") or "").strip(),
            mid=str(repo.get("summary_mid") or "").strip(),
            expert=str(repo.get("summary_expert") or "").strip(),
        )
        if (
            not summary.beginner.strip()
            or not summary.mid.strip()
            or not summary.expert.strip()
        ):
            summary = main_module.summarize_repository_without_llm(repo)
        if (
            not summary.beginner.strip()
            or not summary.mid.strip()
            or not summary.expert.strip()
        ):
            summary = main_module.fallback_summary_template(
                str(repo.get("title") or "GitHub Repo")
            )
        quality_score = main_module.calc_quality_score(
            main_module.QualityInputs(
                stars=main_module.safe_int(repo.get("stars"), 0),
                is_korean_dev=bool(repo.get("is_korean_dev") or False),
                has_readme=bool(repo.get("has_readme") or False),
                relevance_score=main_module.safe_int(repo.get("relevance_score"), 0),
                beginner_value=main_module.safe_int(repo.get("beginner_value"), 0),
            )
        )
        status = determine_curated_collection_status(
            main_module,
            repo,
            quality_score,
            quality_threshold=quality_review_threshold,
            existing_items=existing,
            processed_items=processed_candidates,
        )
        review_metadata = build_curated_review_metadata(
            main_module,
            repo,
            quality_score,
            quality_threshold=quality_review_threshold,
            existing_items=existing,
            processed_items=processed_candidates,
        )

        payload = {
            **repo,
            "summary_beginner": summary.beginner,
            "summary_mid": summary.mid,
            "summary_expert": summary.expert,
            "quality_score": quality_score,
            "status": status,
            "reject_reason": (
                "auto_cutoff"
                if status == main_module.CURATED_STATUS_AUTO_REJECTED
                else None
            ),
            "review_metadata": (
                review_metadata
                if status in main_module.CURATED_REVIEW_QUEUE_STATUSES
                else {}
            ),
            "github_pushed_at": repo.get("github_pushed_at")
            or datetime.now(timezone.utc),
        }
        saved = main_module.create_or_update_curated_content(payload)
        processed_candidates.append(payload)
        if saved and bool(saved.get("inserted", False)):
            created_count += 1

    return {
        "created": created_count,
        "daily_limit": config.daily_collect_limit,
        "collected_today": collected_today + created_count,
        **({"message": collection_message} if collection_message else {}),
    }


def _load_curated_collection_candidates(
    main_module: ModuleType,
    config: object,
    *,
    allow_sample_fallback: bool,
) -> tuple[list[dict[str, object]], str | None]:
    if not main_module.GITHUB_TOKEN:
        if not allow_sample_fallback:
            return [], "GITHUB_TOKEN이 없어 자동 수집을 건너뛰었습니다"
        return (
            _build_sample_curated_candidates(main_module),
            "GITHUB_TOKEN이 없어 개발용 샘플 후보로 대체했습니다",
        )

    search_results = main_module.search_github_repositories(
        config,
        main_module.GITHUB_TOKEN,
        per_page=20,
    )
    if not search_results:
        return [], "GitHub 검색 결과가 없어 새 후보를 만들지 못했습니다"

    candidates: list[dict[str, object]] = []
    for repo in search_results:
        readme_excerpt = ""
        if repo["has_readme"]:
            readme_excerpt = main_module.fetch_github_readme_excerpt(
                repo["owner"],
                repo["name"],
                main_module.GITHUB_TOKEN,
                max_chars=main_module.GITHUB_README_EXCERPT_MAX_CHARS,
            )
        repo_title = _humanize_repo_title(repo["name"])
        license_explanation = main_module.generate_license_explanation(
            repo["license"],
            repo["owner"],
            repo["name"],
            repo_title,
            main_module.GITHUB_TOKEN,
        )
        candidate_seed = {
            "source_type": "github",
            "source_url": repo["source_url"],
            "canonical_url": repo["canonical_url"],
            "repo_name": repo["name"],
            "repo_owner": repo["owner"],
            "title": repo_title,
            "language": repo["language"],
            "is_korean_dev": repo["is_korean_dev"],
            "stars": repo["stars"],
            "license": repo["license"],
            "license_explanation": license_explanation,
            "has_readme": repo["has_readme"],
            "github_pushed_at": repo["github_pushed_at"],
            "description": repo["description"],
            "readme_excerpt": readme_excerpt,
        }
        evaluation, summary = _build_curated_candidate_intelligence(
            main_module,
            candidate_seed,
        )
        candidates.append(
            {
                **candidate_seed,
                "category": evaluation.category,
                "relevance_score": evaluation.relevance_score,
                "beginner_value": evaluation.beginner_value,
                "tags": evaluation.tags,
                "reason": evaluation.reason,
                "summary_beginner": summary.beginner,
                "summary_mid": summary.mid,
                "summary_expert": summary.expert,
            }
        )
    return candidates, None


def _build_sample_curated_candidates(
    main_module: ModuleType,
) -> list[dict[str, object]]:
    return [
        {
            "source_type": "github",
            "source_url": "https://github.com/example/claude-mcp-starter",
            "canonical_url": main_module.normalize_github_repo_url(
                "https://github.com/example/claude-mcp-starter.git"
            ),
            "repo_name": "claude-mcp-starter",
            "repo_owner": "example",
            "title": "Claude MCP Starter",
            "category": "tool",
            "language": "TypeScript",
            "is_korean_dev": True,
            "stars": 420,
            "license": "MIT",
            "relevance_score": 8,
            "beginner_value": 8,
            "tags": ["MCP", "Claude", "Starter"],
            "has_readme": True,
            "description": "Claude와 MCP 기반 바이브코딩 흐름을 바로 시작할 수 있는 스타터 키트입니다.",
        },
        {
            "source_type": "github",
            "source_url": "https://github.com/example/vibe-template-kit",
            "canonical_url": main_module.normalize_github_repo_url(
                "https://github.com/example/vibe-template-kit"
            ),
            "repo_name": "vibe-template-kit",
            "repo_owner": "example",
            "title": "Vibe Template Kit",
            "category": "template",
            "language": "JavaScript",
            "is_korean_dev": False,
            "stars": 190,
            "license": "Apache-2.0",
            "relevance_score": 7,
            "beginner_value": 7,
            "tags": ["Template", "VibeCoding"],
            "has_readme": True,
            "description": "반복 설정 없이 바로 실행하고 수정해볼 수 있는 템플릿 모음입니다.",
        },
    ]


def _humanize_repo_title(repo_name: str) -> str:
    words = [part for part in re.split(r"[-_]+", repo_name.strip()) if part]
    if not words:
        return repo_name
    return " ".join(
        word.upper() if word.isupper() else word.capitalize() for word in words
    )


def _build_curated_candidate_intelligence(
    main_module: ModuleType,
    candidate: Mapping[str, object],
) -> tuple[CurationEvaluationLike, ThreeLevelSummaryLike]:
    heuristic_evaluation = cast(
        CurationEvaluationLike,
        main_module.heuristic_curation_evaluation(candidate),
    )
    heuristic_summary = cast(
        ThreeLevelSummaryLike,
        main_module.summarize_repository_without_llm(
            {**candidate, "category": heuristic_evaluation.category}
        ),
    )
    if not main_module.GEMINI_API_KEY:
        return heuristic_evaluation, heuristic_summary

    try:
        gemini_result = main_module.curate_repository_with_gemini(
            {**candidate, "category": heuristic_evaluation.category},
            main_module.GEMINI_API_KEY,
            model=main_module.GEMINI_MODEL,
        )
    except RuntimeError:
        return heuristic_evaluation, heuristic_summary

    summary = cast(ThreeLevelSummaryLike, gemini_result.summary)
    if (
        not summary.beginner.strip()
        or not summary.mid.strip()
        or not summary.expert.strip()
    ):
        summary = heuristic_summary
    return cast(CurationEvaluationLike, gemini_result.evaluation), summary


def determine_curated_collection_status(
    main_module: ModuleType,
    repo: Mapping[str, object],
    quality_score: int,
    *,
    quality_threshold: int | None = None,
    existing_items: Sequence[Mapping[str, object]] | None = None,
    processed_items: Sequence[Mapping[str, object]] | None = None,
) -> str:
    effective_quality_threshold = (
        quality_threshold
        if quality_threshold is not None
        else main_module.DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD
    )
    relevance_score = main_module.safe_int(repo.get("relevance_score"), 0)
    if main_module.should_auto_reject(quality_score, relevance_score):
        return main_module.CURATED_STATUS_AUTO_REJECTED

    if is_curated_duplicate_candidate(
        main_module,
        repo,
        existing_items=existing_items,
        processed_items=processed_items,
    ):
        return main_module.CURATED_STATUS_REVIEW_DUPLICATE

    license_value = str(repo.get("license") or "").strip().lower()
    if not license_value or license_value in {"unknown", "noassertion", "other"}:
        return main_module.CURATED_STATUS_REVIEW_LICENSE

    if quality_score < effective_quality_threshold:
        return main_module.CURATED_STATUS_REVIEW_QUALITY

    return main_module.CURATED_STATUS_PENDING


def is_curated_duplicate_candidate(
    main_module: ModuleType,
    repo: Mapping[str, object],
    *,
    existing_items: Sequence[Mapping[str, object]] | None = None,
    processed_items: Sequence[Mapping[str, object]] | None = None,
) -> bool:
    return bool(
        build_curated_duplicate_review_metadata(
            main_module,
            repo,
            existing_items=existing_items,
            processed_items=processed_items,
        )
    )


def build_curated_review_metadata(
    main_module: ModuleType,
    repo: Mapping[str, object],
    quality_score: int,
    *,
    quality_threshold: int | None = None,
    existing_items: Sequence[Mapping[str, object]] | None = None,
    processed_items: Sequence[Mapping[str, object]] | None = None,
) -> dict[str, object]:
    effective_quality_threshold = (
        quality_threshold
        if quality_threshold is not None
        else main_module.DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD
    )
    duplicate_metadata = build_curated_duplicate_review_metadata(
        main_module,
        repo,
        existing_items=existing_items,
        processed_items=processed_items,
    )
    if duplicate_metadata:
        return duplicate_metadata

    license_value = str(repo.get("license") or "").strip()
    normalized_license = license_value.lower()
    if not normalized_license:
        return {
            "reason_codes": ["license_missing"],
            "license_value": license_value,
        }
    if normalized_license in {"unknown", "noassertion", "other"}:
        return {
            "reason_codes": ["license_unrecognized"],
            "license_value": license_value,
        }

    if quality_score < effective_quality_threshold:
        return {
            "reason_codes": ["quality_below_threshold"],
            "quality_score_value": quality_score,
            "quality_threshold": effective_quality_threshold,
        }

    return {}


def build_curated_duplicate_review_metadata(
    main_module: ModuleType,
    repo: Mapping[str, object],
    *,
    existing_items: Sequence[Mapping[str, object]] | None = None,
    processed_items: Sequence[Mapping[str, object]] | None = None,
) -> dict[str, object]:
    candidate_canonical = main_module.normalize_github_repo_url(
        str(repo.get("canonical_url") or "").strip()
    )
    candidate_repo_name = str(repo.get("repo_name") or "").strip().lower()
    candidate_repo_owner = str(repo.get("repo_owner") or "").strip().lower()
    candidate_title = _normalize_curated_title(str(repo.get("title") or ""))

    comparison_pool = list(existing_items or []) + list(processed_items or [])
    review_metadata: dict[str, object] = {"reason_codes": []}
    matched_existing_ids: list[int] = []
    matched_processed_titles: list[str] = []
    for item in comparison_pool:
        item_id = main_module.safe_int(item.get("id"), 0)
        repo_id = main_module.safe_int(repo.get("id"), 0)
        if repo_id > 0 and item_id == repo_id:
            continue

        matched = False

        existing_canonical = main_module.normalize_github_repo_url(
            str(item.get("canonical_url") or "").strip()
        )
        if (
            candidate_canonical
            and existing_canonical
            and candidate_canonical == existing_canonical
        ):
            review_metadata["canonical_url_match"] = True
            cast(list[str], review_metadata["reason_codes"]).append(
                "canonical_url_match"
            )
            matched = True

        existing_repo_name = str(item.get("repo_name") or "").strip().lower()
        existing_repo_owner = str(item.get("repo_owner") or "").strip().lower()
        if (
            candidate_repo_name
            and candidate_repo_owner
            and candidate_repo_name == existing_repo_name
            and candidate_repo_owner == existing_repo_owner
        ):
            review_metadata["owner_repo_match"] = True
            cast(list[str], review_metadata["reason_codes"]).append("owner_repo_match")
            matched = True

        existing_title = _normalize_curated_title(str(item.get("title") or ""))
        if candidate_title and existing_title and candidate_title == existing_title:
            review_metadata["title_match"] = True
            cast(list[str], review_metadata["reason_codes"]).append("title_match")
            matched = True

        if matched:
            if item_id > 0:
                matched_existing_ids.append(item_id)
            else:
                processed_title = str(item.get("title") or "").strip()
                if processed_title:
                    matched_processed_titles.append(processed_title)

    if matched_existing_ids:
        review_metadata["matched_existing_ids"] = sorted(set(matched_existing_ids))
    if matched_processed_titles:
        review_metadata["matched_processed_titles"] = sorted(
            set(matched_processed_titles)
        )

    reason_codes = sorted(
        set(cast(list[str], review_metadata.get("reason_codes") or []))
    )
    if reason_codes:
        review_metadata["reason_codes"] = reason_codes
    else:
        review_metadata.pop("reason_codes", None)

    return review_metadata


def _normalize_curated_title(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", " ", value.strip().lower())
    return " ".join(part for part in normalized.split() if part)


def bind_curated_service(main_module: ModuleType) -> None:
    setattr(
        main_module,
        "perform_curated_collection_run",
        lambda *, allow_sample_fallback=True: perform_curated_collection_run(
            main_module,
            allow_sample_fallback=allow_sample_fallback,
        ),
    )
    setattr(
        main_module,
        "determine_curated_collection_status",
        lambda repo, quality_score, **kwargs: determine_curated_collection_status(
            main_module,
            repo,
            quality_score,
            **kwargs,
        ),
    )
    setattr(
        main_module,
        "build_curated_review_metadata",
        lambda repo, quality_score, **kwargs: build_curated_review_metadata(
            main_module,
            repo,
            quality_score,
            **kwargs,
        ),
    )
    setattr(
        main_module,
        "build_curated_duplicate_review_metadata",
        lambda repo, **kwargs: build_curated_duplicate_review_metadata(
            main_module,
            repo,
            **kwargs,
        ),
    )
    setattr(
        main_module,
        "is_curated_duplicate_candidate",
        lambda repo, **kwargs: is_curated_duplicate_candidate(
            main_module,
            repo,
            **kwargs,
        ),
    )
