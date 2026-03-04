from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import (  # noqa: E402
    build_page_document_from_about_content,
    collect_page_document_issues,
)
from migrations.e2_data_extraction import extract_legacy_source  # noqa: E402


def transform_legacy_source(page_id: str) -> dict[str, object]:
    source = extract_legacy_source(page_id)
    payload = source["payload"]
    if not isinstance(payload, dict):
        raise ValueError("invalid legacy payload")

    document = build_page_document_from_about_content(page_id, payload, 0)
    issues = collect_page_document_issues(document)
    return {
        "page_id": page_id,
        "document": document,
        "validation": issues,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="E-2 block transform")
    parser.add_argument("--page-id", default="about_page")
    args = parser.parse_args()

    result = transform_legacy_source(args.page_id)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
