from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from types import ModuleType
from typing import Mapping, cast

from fastapi import HTTPException


def get_about_content_payload(main_module: ModuleType) -> dict[str, object]:
    record = main_module.get_site_content(main_module.ABOUT_CONTENT_KEY)
    if record and record.get("content_json"):
        content = cast(dict[str, object], record["content_json"])
        content["updated_at"] = record.get("updated_at")
        return content

    seeded = main_module.upsert_site_content(
        main_module.ABOUT_CONTENT_KEY,
        main_module.ABOUT_CONTENT_DEFAULT,
    )
    if not seeded:
        raise HTTPException(status_code=500, detail="소개 페이지 초기화에 실패했습니다")
    content = cast(dict[str, object], seeded["content_json"])
    content["updated_at"] = seeded.get("updated_at")
    return content


def build_page_document_from_about_content(
    main_module: ModuleType,
    page_id: str,
    about_content: Mapping[str, object],
    version: int,
) -> dict[str, object]:
    updated_at = str(about_content.get("updated_at") or "")
    hero_block = {
        "id": "hero",
        "type": "hero",
        "order": 0,
        "visible": True,
        "content": {
            "headline": str(about_content.get("hero_title", "")),
            "highlight": str(about_content.get("hero_highlight", "")),
            "description": str(about_content.get("hero_description", "")),
            "contactEmail": str(about_content.get("contact_email", "")),
        },
    }
    values_block = {
        "id": "values",
        "type": "feature_list",
        "order": 1,
        "visible": True,
        "content": {
            "items": cast(list[dict[str, object]], about_content.get("values", []))
        },
    }
    team_block = {
        "id": "team",
        "type": "feature_list",
        "order": 2,
        "visible": True,
        "content": {
            "items": cast(
                list[dict[str, object]], about_content.get("team_members", [])
            )
        },
    }
    faq_block = {
        "id": "faq",
        "type": "faq",
        "order": 3,
        "visible": True,
        "content": {
            "items": cast(list[dict[str, object]], about_content.get("faqs", []))
        },
    }
    return {
        "pageId": page_id,
        "status": "draft",
        "version": version,
        "title": "About Page",
        "seo": {
            "metaTitle": str(about_content.get("hero_title", "About")),
            "metaDescription": str(about_content.get("hero_description", "")),
            "ogImage": None,
        },
        "blocks": [hero_block, values_block, team_block, faq_block],
        "updatedBy": "system",
        "updatedAt": updated_at,
    }


def extract_about_content_from_page_document(
    document: Mapping[str, object],
) -> dict[str, object]:
    blocks = cast(list[dict[str, object]], document.get("blocks") or [])
    hero = next(
        (
            block
            for block in blocks
            if block.get("id") == "hero" and block.get("type") == "hero"
        ),
        None,
    )
    values = next((block for block in blocks if block.get("id") == "values"), None)
    team = next((block for block in blocks if block.get("id") == "team"), None)
    faq = next((block for block in blocks if block.get("id") == "faq"), None)

    hero_content = cast(dict[str, object], hero.get("content", {})) if hero else {}
    values_content = (
        cast(dict[str, object], values.get("content", {})) if values else {}
    )
    team_content = cast(dict[str, object], team.get("content", {})) if team else {}
    faq_content = cast(dict[str, object], faq.get("content", {})) if faq else {}
    hero_visible = bool(hero.get("visible", True)) if hero else True
    values_visible = bool(values.get("visible", True)) if values else True
    team_visible = bool(team.get("visible", True)) if team else True
    faq_visible = bool(faq.get("visible", True)) if faq else True

    return {
        "hero_title": str(hero_content.get("headline", "")) if hero_visible else "",
        "hero_highlight": str(hero_content.get("highlight", ""))
        if hero_visible
        else "",
        "hero_description": str(hero_content.get("description", ""))
        if hero_visible
        else "",
        "contact_email": str(hero_content.get("contactEmail", ""))
        if hero_visible
        else "",
        "values": cast(list[dict[str, object]], values_content.get("items", []))
        if values_visible
        else [],
        "team_members": cast(list[dict[str, object]], team_content.get("items", []))
        if team_visible
        else [],
        "faqs": cast(list[dict[str, object]], faq_content.get("items", []))
        if faq_visible
        else [],
    }


def build_page_migration_preview(
    main_module: ModuleType, page_id: str
) -> dict[str, object]:
    if page_id != main_module.ABOUT_CONTENT_KEY:
        raise HTTPException(
            status_code=404, detail="지원하지 않는 마이그레이션 대상 페이지입니다"
        )
    source_payload = get_about_content_payload(main_module)
    transformed_document = build_page_document_from_about_content(
        main_module, page_id, source_payload, 0
    )
    issues = main_module.collect_page_document_issues(transformed_document)
    blocking = issues["blocking"]
    warnings = issues["warnings"]
    return {
        "pageId": page_id,
        "sourceType": "site_content",
        "sourceKey": main_module.ABOUT_CONTENT_KEY,
        "mappingRules": [
            {"from": "hero_*", "to": "hero"},
            {"from": "hero_description", "to": "rich_text"},
            {"from": "hero image", "to": "image"},
            {"from": "contact/link", "to": "cta"},
        ],
        "document": transformed_document,
        "validation": {
            "blocking": blocking,
            "warnings": warnings,
            "blockingCount": len(blocking),
            "warningCount": len(warnings),
        },
    }


def execute_page_migration(
    main_module: ModuleType,
    page_id: str,
    actor_id: str,
    reason: str,
    dry_run: bool,
) -> dict[str, object]:
    preview = build_page_migration_preview(main_module, page_id)
    source_payload = get_about_content_payload(main_module)
    transformed_document = cast(dict[str, object], preview["document"])
    validation = cast(dict[str, object], preview["validation"])
    blocking = cast(list[dict[str, str]], validation.get("blocking") or [])

    backup_key = f"{main_module.ABOUT_CONTENT_KEY}_migration_backup_{int(time.time())}"
    backup_payload: dict[str, object] = {
        "page_id": page_id,
        "source_key": main_module.ABOUT_CONTENT_KEY,
        "reason": reason,
        "dry_run": dry_run,
        "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": main_module.to_json_compatible(source_payload),
        "document": main_module.to_json_compatible(transformed_document),
        "validation": main_module.to_json_compatible(validation),
    }
    backup_result = main_module.upsert_site_content(backup_key, backup_payload)
    if not backup_result:
        raise HTTPException(
            status_code=500, detail="마이그레이션 백업 생성에 실패했습니다"
        )

    main_module.write_admin_action_log(
        admin_id=actor_id,
        action_type="page_migration_backup_created",
        target_type="page",
        target_id=page_action_target_id(main_module, page_id),
        reason=f"backup_key={backup_key}",
    )

    if blocking:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "page_migration_validation_failed",
                "message": "마이그레이션 변환 결과에 차단 이슈가 있습니다",
                "field_errors": blocking,
                "backup_key": backup_key,
            },
        )

    if dry_run:
        main_module.write_admin_action_log(
            admin_id=actor_id,
            action_type="page_migration_dry_run",
            target_type="page",
            target_id=page_action_target_id(main_module, page_id),
            reason=reason,
        )
        return {
            "pageId": page_id,
            "dryRun": True,
            "applied": False,
            "backupKey": backup_key,
            "validation": validation,
        }

    existing_draft = main_module.get_page_document_draft(page_id)
    base_version = int(existing_draft.get("draft_version", 0)) if existing_draft else 0
    save_result = main_module.save_page_document_draft(
        page_id=page_id,
        base_version=base_version,
        document_json=transformed_document,
        actor_id=actor_id,
        reason=f"migration:{reason}",
    )
    if save_result.get("conflict"):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "page_migration_conflict",
                "message": "마이그레이션 저장 중 버전 충돌이 발생했습니다",
                "current_version": save_result.get("current_version"),
                "backup_key": backup_key,
            },
        )

    saved_version = int(save_result.get("saved_version", 0))
    main_module.write_admin_action_log(
        admin_id=actor_id,
        action_type="page_migrated",
        target_type="page",
        target_id=page_action_target_id(main_module, page_id),
        reason=f"{reason}; saved_version={saved_version}; backup_key={backup_key}",
    )
    return {
        "pageId": page_id,
        "dryRun": False,
        "applied": True,
        "savedVersion": saved_version,
        "backupKey": backup_key,
        "validation": validation,
    }


def restore_page_migration_backup(
    main_module: ModuleType,
    page_id: str,
    backup_key: str,
    actor_id: str,
    reason: str,
    dry_run: bool,
) -> dict[str, object]:
    backup = main_module.get_site_content(backup_key)
    if not backup or not backup.get("content_json"):
        raise HTTPException(status_code=404, detail="백업 키를 찾을 수 없습니다")

    payload = cast(dict[str, object], backup["content_json"])
    backup_page_id = str(payload.get("page_id") or "")
    if backup_page_id != page_id:
        raise HTTPException(
            status_code=400, detail="백업 키의 page_id가 요청 경로와 일치하지 않습니다"
        )

    source = cast(dict[str, object], payload.get("source") or {})
    document = cast(dict[str, object], payload.get("document") or {})
    validation = cast(dict[str, object], payload.get("validation") or {})

    if dry_run:
        main_module.write_admin_action_log(
            admin_id=actor_id,
            action_type="page_migration_restore_dry_run",
            target_type="page",
            target_id=page_action_target_id(main_module, page_id),
            reason=f"backup_key={backup_key}; {reason}",
        )
        return {
            "pageId": page_id,
            "dryRun": True,
            "restored": False,
            "backupKey": backup_key,
            "validation": validation,
        }

    if page_id == main_module.ABOUT_CONTENT_KEY:
        _ = main_module.upsert_site_content(main_module.ABOUT_CONTENT_KEY, source)

    draft = main_module.get_page_document_draft(page_id)
    base_version = int(draft.get("draft_version", 0)) if draft else 0
    save_result = main_module.save_page_document_draft(
        page_id=page_id,
        base_version=base_version,
        document_json=document,
        actor_id=actor_id,
        reason=f"migration-restore:{reason}",
    )
    if save_result.get("conflict"):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "page_migration_restore_conflict",
                "message": "복구 저장 중 버전 충돌이 발생했습니다",
                "current_version": save_result.get("current_version"),
            },
        )

    restored_version = int(save_result.get("saved_version", 0))
    main_module.write_admin_action_log(
        admin_id=actor_id,
        action_type="page_migration_restored",
        target_type="page",
        target_id=page_action_target_id(main_module, page_id),
        reason=f"backup_key={backup_key}; restored_version={restored_version}; {reason}",
    )
    return {
        "pageId": page_id,
        "dryRun": False,
        "restored": True,
        "restoredVersion": restored_version,
        "backupKey": backup_key,
        "validation": validation,
    }


def list_page_migration_backups(
    main_module: ModuleType,
    page_id: str,
    limit: int = 20,
) -> dict[str, object]:
    backups = main_module.list_site_contents_by_prefix(
        f"{page_id}_migration_backup_",
        limit=limit,
    )
    items: list[dict[str, object]] = []
    for row in backups:
        payload = cast(dict[str, object], row.get("content_json") or {})
        if str(payload.get("page_id") or "") != page_id:
            continue
        items.append(
            {
                "backupKey": str(row.get("content_key") or ""),
                "capturedAt": str(
                    payload.get("captured_at") or row.get("updated_at") or ""
                ),
                "reason": str(payload.get("reason") or ""),
                "dryRun": bool(payload.get("dry_run", False)),
                "sourceKey": str(
                    payload.get("source_key") or main_module.ABOUT_CONTENT_KEY
                ),
                "updatedAt": str(row.get("updated_at") or ""),
            }
        )
    return {"pageId": page_id, "count": len(items), "items": items}


def page_action_target_id(main_module: ModuleType, page_id: str) -> str:
    if page_id == main_module.ABOUT_CONTENT_KEY:
        return main_module.ABOUT_CONTENT_TARGET_ID
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"vibecoder:page:{page_id}"))


def parse_schedule_publish_at(raw: str) -> datetime:
    normalized = raw.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="publishAt은 필수입니다")
    try:
        parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail="publishAt 형식이 올바르지 않습니다"
        ) from exc
    if parsed.tzinfo is not None:
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def serialize_publish_schedule(record: Mapping[str, object]) -> dict[str, object]:
    def to_int(value: object, default: int = 0) -> int:
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

    return {
        "scheduleId": str(record.get("schedule_id") or ""),
        "pageId": str(record.get("page_id") or ""),
        "draftVersion": to_int(record.get("draft_version"), 0),
        "publishAt": str(record.get("publish_at") or ""),
        "timezone": str(record.get("timezone") or "Asia/Seoul"),
        "status": str(record.get("status") or "scheduled"),
        "reason": str(record.get("reason") or ""),
        "attemptCount": to_int(record.get("attempt_count"), 0),
        "maxAttempts": to_int(record.get("max_attempts"), 3),
        "lastError": str(record.get("last_error") or ""),
        "nextRetryAt": str(record.get("next_retry_at") or ""),
        "createdBy": str(record.get("created_by") or ""),
        "createdAt": str(record.get("created_at") or ""),
        "updatedAt": str(record.get("updated_at") or ""),
        "cancelledAt": str(record.get("cancelled_at") or ""),
        "publishedVersion": to_int(record.get("published_version"), 0),
        "publishedAt": str(record.get("published_at") or ""),
    }
