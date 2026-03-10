"""Launchpad utilities: OG parsing, platform detection, Gemini classification, link check."""

import os
import json
import urllib.request
import urllib.error
from html.parser import HTMLParser


# ---------------------------------------------------------------------------
# Platform detection
# ---------------------------------------------------------------------------

def detect_platform(url: str) -> str:
    """Detect platform from URL: x, threads, youtube, other."""
    low = url.lower()
    if "twitter.com" in low or "x.com" in low:
        return "x"
    if "threads.net" in low:
        return "threads"
    if "youtube.com" in low or "youtu.be" in low:
        return "youtube"
    return "other"


# ---------------------------------------------------------------------------
# OG tag parsing
# ---------------------------------------------------------------------------

class _OGParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.og: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "meta":
            return
        attr_map = dict(attrs)
        prop = attr_map.get("property") or attr_map.get("name") or ""
        content = attr_map.get("content") or ""
        if prop.startswith("og:") and content:
            self.og[prop[3:]] = content


def fetch_og_tags(url: str) -> dict[str, str]:
    """Fetch URL and parse OG meta tags. Returns dict with keys: title, description, image."""
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; VibeCoder/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            charset = resp.headers.get_content_charset() or "utf-8"
            html = resp.read(200_000).decode(charset, errors="replace")
    except Exception:
        return {}

    parser = _OGParser()
    parser.feed(html)
    return parser.og


# ---------------------------------------------------------------------------
# Gemini tip classification
# ---------------------------------------------------------------------------

_CLASSIFY_PROMPT = """
다음은 AI 코딩 도구 관련 팁 글의 OG 정보야.
이 글을 읽을 한국인 바이브코더를 위해 한국어로 요약하고 태그를 분류해줘.

제목: {og_title}
설명: {og_description}

도구 태그 후보: claude-code, gemini-cli, codex-cli, opencode, common
주제 태그 후보: setup, prompt, workflow, error, tip

JSON만 응답:
{{
  "description_kr": "2~3줄 한국어 요약 (기술 용어 최소화, 코알못 기준)",
  "tool_tags": ["..."],
  "topic_tags": ["..."]
}}
"""


def classify_launchpad_tip(og_title: str, og_description: str, api_key: str) -> dict:
    """Call Gemini to classify a launchpad tip. Returns dict with description_kr, tool_tags, topic_tags."""
    try:
        import google.generativeai as genai  # type: ignore[import-untyped]
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = _CLASSIFY_PROMPT.format(og_title=og_title, og_description=og_description[:500])
        resp = model.generate_content(prompt)
        text = resp.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception:
        return {
            "description_kr": og_title,
            "tool_tags": ["common"],
            "topic_tags": ["tip"],
        }


# ---------------------------------------------------------------------------
# Gemini error clinic
# ---------------------------------------------------------------------------

_ERROR_CLINIC_PROMPT = """
사용자가 AI 코딩 도구 설치 중 에러가 발생했어.
코딩을 전혀 모르는 사람도 이해할 수 있게 진단하고 해결책을 알려줘.

도구: {tool}
OS: {os}
버전: {version}
에러 로그:
{error_text}

JSON만 응답:
{{
  "diagnosis": "에러 원인 2줄 이내 (기술 용어 금지)",
  "solution": "해결 방법 3~4줄 (단계별 안내)",
  "commands": ["실행할 명령어1", "명령어2"]
}}
"""


def analyze_error_with_gemini(
    error_text: str,
    tool: str,
    os_name: str,
    tool_version: str | None,
    api_key: str,
) -> dict:
    """Analyze an installation error with Gemini. Returns dict with diagnosis, solution, commands."""
    try:
        import google.generativeai as genai  # type: ignore[import-untyped]
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = _ERROR_CLINIC_PROMPT.format(
            tool=tool,
            os=os_name,
            version=tool_version or "미지정",
            error_text=error_text[:1500],
        )
        resp = model.generate_content(prompt)
        text = resp.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception:
        return {
            "diagnosis": "에러를 분석하지 못했어요. 아래 기본 해결책을 시도해보세요.",
            "solution": "1. 터미널을 닫고 다시 여세요.\n2. 설치 명령어를 다시 실행해보세요.\n3. 그래도 안 되면 에러 응급실을 이용해주세요.",
            "commands": [],
        }


# ---------------------------------------------------------------------------
# Link validity check
# ---------------------------------------------------------------------------

def check_link_valid(url: str) -> bool:
    """Check if a URL is still valid (HEAD request, timeout=5s)."""
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status < 400
    except Exception:
        return False
