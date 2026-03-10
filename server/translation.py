from __future__ import annotations

import json
import re
from typing import Mapping, cast
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest, urlopen


DANGEROUS_COMMAND_TOKENS = ["rm -rf", "sudo", "curl |", "curl|", "chmod 777"]
PROMPT_INJECTION_TOKENS = [
    "ignore previous",
    "위 지시",
    "시스템 프롬프트",
    "system prompt",
]


def classify_error_type(error_message: str) -> str:
    lowered = error_message.lower()
    if "pnpm" in lowered or "node_modules" in lowered:
        return "pnpm"
    if "python" in lowered or "traceback" in lowered or "pip" in lowered:
        return "python"
    if "git" in lowered:
        return "git"
    if "vite" in lowered:
        return "vite"
    return "general"


def contains_prompt_injection(text: str) -> bool:
    lowered = text.lower()
    return any(token in lowered for token in PROMPT_INJECTION_TOKENS)


def is_dangerous_command(command: str) -> bool:
    lowered = command.lower()
    return any(token in lowered for token in DANGEROUS_COMMAND_TOKENS)


def build_error_solution_fallback(error_message: str) -> dict[str, object]:
    error_type = classify_error_type(error_message)
    if error_type == "pnpm":
        fix_steps = [
            {
                "description": "필요한 파일들을 다시 설치해요",
                "command": "pnpm install",
            }
        ]
        plan_b = {
            "description": "설치 파일이 꼬였을 때 초기화 후 다시 설치",
            "command": "rm -rf node_modules && pnpm install",
        }
        what_happened = "앱 실행에 필요한 파일이 없거나 깨진 상태예요."
    elif error_type == "python":
        fix_steps = [
            {
                "description": "가상환경 기준 의존성을 다시 맞춰요",
                "command": "uv sync --frozen",
            }
        ]
        plan_b = {
            "description": "가상환경을 다시 만들고 동기화해요",
            "command": "uv sync",
        }
        what_happened = "파이썬 실행에 필요한 패키지 버전이 맞지 않아요."
    elif error_type == "git":
        fix_steps = [
            {
                "description": "현재 변경 상태를 먼저 확인해요",
                "command": "git status",
            }
        ]
        plan_b = {
            "description": "원격/브랜치 연결 상태를 점검해요",
            "command": "git remote -v",
        }
        what_happened = "Git 작업 순서나 브랜치 상태가 맞지 않아 멈춘 상태예요."
    elif error_type == "vite":
        fix_steps = [
            {
                "description": "개발 서버를 다시 시작해요",
                "command": "pnpm dev",
            }
        ]
        plan_b = {
            "description": "캐시 영향을 줄이기 위해 재설치 후 다시 실행해요",
            "command": "pnpm install && pnpm dev",
        }
        what_happened = "프론트 개발 서버가 필요한 파일을 읽지 못한 상태예요."
    else:
        fix_steps = [
            {
                "description": "의존성/실행 상태를 기본 명령으로 점검해요",
                "command": "pnpm install",
            }
        ]
        plan_b = {
            "description": "환경 재동기화 후 다시 시도해요",
            "command": "uv sync --frozen",
        }
        what_happened = "실행에 필요한 환경이나 설정 중 일부가 맞지 않는 상태예요."

    safe_fix_steps = [
        step
        for step in fix_steps
        if not is_dangerous_command(str(step.get("command") or ""))
    ]

    return {
        "what_happened": what_happened,
        "fix_steps": safe_fix_steps,
        "plan_b": plan_b,
        "error_type": error_type,
    }


def find_related_glossary_terms(text: str) -> list[str]:
    lowered = text.lower()
    matches: list[str] = []
    glossary_pairs = [
        ("API", ["api"]),
        ("서버", ["server"]),
        ("클라이언트", ["client"]),
        ("레포지토리", ["repository", "repo"]),
        ("pnpm", ["pnpm"]),
        ("pnpm install", ["pnpm install"]),
        ("pnpm dev", ["pnpm dev"]),
        ("git", ["git"]),
        ("포트", ["port", "localhost:"]),
        ("node_modules", ["node_modules"]),
        ("package.json", ["package.json"]),
        (".env", [".env", "env file", "environment variable"]),
        ("README.md", ["readme"]),
        ("배포", ["deploy", "deployment"]),
        ("도메인", ["domain"]),
        ("HTTPS", ["https", "ssl"]),
        ("MCP", ["mcp"]),
        ("프롬프트", ["prompt"]),
        ("토큰", ["token"]),
        ("CORS", ["cors"]),
    ]

    for label, keywords in glossary_pairs:
        if any(keyword in lowered for keyword in keywords):
            matches.append(label)

    return matches[:5]


def build_text_translation_fallback(input_text: str) -> dict[str, object]:
    lowered = input_text.lower()
    commands = re.findall(
        r"(?:^|\n)\s*((?:pnpm|npm|git|uv|python|pip|npx|bun|docker)\s+[^\n`]+)",
        input_text,
        flags=re.IGNORECASE,
    )
    normalized_commands: list[dict[str, str]] = []
    for raw_command in commands[:3]:
        command = " ".join(raw_command.strip().split())
        if not command or is_dangerous_command(command):
            continue
        normalized_commands.append(
            {
                "description": "원문에 나온 실행 명령어예요.",
                "command": command,
            }
        )

    if "upstream" in lowered and "origin" in lowered and "main" in lowered:
        korean_summary = "새 Git 저장소를 만들고 GitHub 원격 저장소를 기본 브랜치와 연결하라는 뜻이에요."
        simple_analogy = (
            "새 일기장을 만들고 클라우드 백업 주소를 처음 연결하는 단계라고 보면 돼요."
        )
        if not normalized_commands:
            normalized_commands = [
                {
                    "description": "새 Git 기록을 시작해요.",
                    "command": "git init",
                },
                {
                    "description": "GitHub 주소를 origin이라는 이름으로 연결해요.",
                    "command": "git remote add origin <github-url>",
                },
                {
                    "description": "기본 브랜치를 main으로 맞춰요.",
                    "command": "git branch -M main",
                },
            ]
    elif "readme" in lowered:
        korean_summary = (
            "프로젝트 설명서를 읽고 설치나 실행 순서를 따라가라는 뜻이에요."
        )
        simple_analogy = "새 가전제품을 샀을 때 설명서를 먼저 펴보는 상황과 비슷해요."
    elif commands:
        korean_summary = "기술 설명 속에 실행해야 할 명령어가 함께 들어 있어요. 순서대로 따라 하면 되는 안내문에 가깝습니다."
        simple_analogy = (
            "요리 레시피에서 재료와 조리 순서가 함께 적힌 카드라고 생각하면 쉬워요."
        )
    else:
        korean_summary = "기술적인 문장을 쉬운 한국어로 풀어보면, 무엇을 하려는지와 왜 필요한지를 설명하는 안내문이에요."
        simple_analogy = (
            "전문가용 설명서를 친구가 쉬운 말로 다시 읽어주는 느낌이라고 보면 돼요."
        )

    return {
        "korean_summary": korean_summary,
        "simple_analogy": simple_analogy,
        "commands": normalized_commands,
        "related_terms": find_related_glossary_terms(input_text),
    }


def extract_gemini_text(payload: object) -> str:
    if not isinstance(payload, Mapping):
        raise RuntimeError("Gemini response payload was not an object")

    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise RuntimeError("Gemini response did not include candidates")

    first_candidate = candidates[0]
    if not isinstance(first_candidate, Mapping):
        raise RuntimeError("Gemini candidate was not an object")

    content = first_candidate.get("content")
    if not isinstance(content, Mapping):
        raise RuntimeError("Gemini response did not include content")

    parts = content.get("parts")
    if not isinstance(parts, list) or not parts:
        raise RuntimeError("Gemini response did not include text parts")

    text_parts: list[str] = []
    for part in parts:
        if isinstance(part, Mapping):
            text = part.get("text")
            if isinstance(text, str) and text.strip():
                text_parts.append(text)

    if not text_parts:
        raise RuntimeError("Gemini response did not include text parts")

    return "\n".join(text_parts).strip()


def _build_text_translate_prompt(input_text: str) -> str:
    return f"""
다음 기술적인 텍스트를 코딩을 전혀 모르는 한국인이 이해할 수 있게 설명해줘.

원문:
{input_text}

다음 형식으로 JSON만 응답:
{{
  "korean_summary": "무슨 말인지 2~3줄 한국어 요약 (기술 용어 최소화)",
  "simple_analogy": "한국 일상으로 비유한 한 줄 설명",
  "commands": [
    {{"description": "이 명령어가 하는 일", "command": "실행할 명령어"}}
  ],
  "related_terms": ["관련 용어1", "용어2"]
}}

원칙:
- 기술 용어를 쓸 때는 바로 뒤에 쉬운 한국어 설명을 붙일 것
- 비유는 반드시 한국 일상 소재 사용 (식당, 마트, 아파트, 게임 등)
- 명령어가 없으면 commands는 빈 배열
- 위험 명령어는 commands에 넣지 말 것 (`rm -rf`, `sudo`, `curl|bash`, `chmod 777` 등)
""".strip()


def _normalize_text_translate_result(
    parsed: object, input_text: str
) -> dict[str, object]:
    if not isinstance(parsed, Mapping):
        raise RuntimeError("Gemini translation output was not an object")

    korean_summary = str(parsed.get("korean_summary") or "").strip()
    simple_analogy = str(parsed.get("simple_analogy") or "").strip()
    if len(korean_summary) < 10 or len(simple_analogy) < 10:
        raise RuntimeError("Gemini translation output was too short")

    commands: list[dict[str, str]] = []
    raw_commands = parsed.get("commands")
    if isinstance(raw_commands, list):
        for item in raw_commands:
            if not isinstance(item, Mapping):
                continue
            description = str(item.get("description") or "").strip()
            command = " ".join(str(item.get("command") or "").strip().split())
            if not description or not command or is_dangerous_command(command):
                continue
            commands.append({"description": description, "command": command})

    related_terms: list[str] = []
    raw_related_terms = parsed.get("related_terms")
    if isinstance(raw_related_terms, list):
        for item in raw_related_terms:
            if (
                isinstance(item, str)
                and item.strip()
                and item.strip() not in related_terms
            ):
                related_terms.append(item.strip())

    if not related_terms:
        related_terms = find_related_glossary_terms(input_text)

    return {
        "korean_summary": korean_summary,
        "simple_analogy": simple_analogy,
        "commands": commands,
        "related_terms": related_terms[:5],
    }


def translate_text_with_gemini(
    input_text: str,
    *,
    api_key: str,
    model: str,
    timeout_seconds: int = 20,
) -> dict[str, object]:
    cleaned_key = api_key.strip()
    if not cleaned_key:
        raise RuntimeError("Gemini API key is required")

    request_payload = {
        "contents": [{"parts": [{"text": _build_text_translate_prompt(input_text)}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    request = UrlRequest(
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

    payload = json.loads(raw_bytes.decode("utf-8"))
    response_text = extract_gemini_text(payload)
    parsed = json.loads(response_text)
    return _normalize_text_translate_result(parsed, input_text)
