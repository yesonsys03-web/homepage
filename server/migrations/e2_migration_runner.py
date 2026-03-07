from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import execute_page_migration  # noqa: E402


def run_e2_migration(
    page_id: str,
    actor_id: str,
    reason: str,
    dry_run: bool,
) -> dict[str, object]:
    return execute_page_migration(
        page_id=page_id,
        actor_id=actor_id,
        reason=reason,
        dry_run=dry_run,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="E-2 migration runner")
    parser.add_argument("--page-id", default="about_page")
    parser.add_argument(
        "--actor-id",
        default="11111111-1111-1111-1111-111111111111",
        help="admin user id for migration logs",
    )
    parser.add_argument("--reason", default="e2 migration run")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    result = run_e2_migration(
        page_id=args.page_id,
        actor_id=args.actor_id,
        reason=args.reason,
        dry_run=args.dry_run,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
