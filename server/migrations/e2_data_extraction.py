from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import ABOUT_CONTENT_KEY, get_about_content_payload  # noqa: E402


def extract_legacy_source(page_id: str) -> dict[str, object]:
    if page_id != "about_page":
        raise ValueError("unsupported page id for E-2 extraction")

    payload = get_about_content_payload()
    return {
        "page_id": page_id,
        "source_type": "site_content",
        "source_key": ABOUT_CONTENT_KEY,
        "payload": payload,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="E-2 legacy data extraction")
    parser.add_argument("--page-id", default="about_page")
    args = parser.parse_args()

    data = extract_legacy_source(args.page_id)
    print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
