from __future__ import annotations

import os

PROFILE_NICKNAME_MIN_LEN = 2
PROFILE_NICKNAME_MAX_LEN = 24
PROFILE_BIO_MAX_LEN = 300
GOOGLE_OAUTH_STATE_TTL_SECONDS = 600
DEFAULT_ADMIN_LOG_RETENTION_DAYS = 365
DEFAULT_ADMIN_LOG_VIEW_WINDOW_DAYS = 30
DEFAULT_PAGE_EDITOR_ROLLOUT_STAGE = "qa"
DEFAULT_PAGE_EDITOR_PUBLISH_FAIL_RATE_THRESHOLD = 0.2
DEFAULT_PAGE_EDITOR_ROLLBACK_RATIO_THRESHOLD = 0.3
DEFAULT_PAGE_EDITOR_CONFLICT_RATE_THRESHOLD = 0.25
ADMIN_LOG_CLEANUP_INTERVAL_SECONDS = 6 * 60 * 60
SYSTEM_ADMIN_USER_ID = "11111111-1111-1111-1111-111111111111"
ADMIN_ALLOWED_ROLES = {"admin", "super_admin"}
SUPER_ADMIN_BOOTSTRAP_EMAIL = "topyeson@gmail.com"

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback"
)
GOOGLE_FRONTEND_REDIRECT_URI = os.getenv(
    "GOOGLE_FRONTEND_REDIRECT_URI", "http://localhost:5173"
)
ENFORCE_HTTPS = os.getenv("ENFORCE_HTTPS", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/")

LOGIN_IP_LIMIT_PER_MINUTE = 10
LOGIN_ACCOUNT_LIMIT_PER_HOUR = 20
REGISTER_IP_LIMIT_PER_HOUR = 5
ERROR_TRANSLATE_IP_LIMIT_PER_MINUTE = int(
    os.getenv("ERROR_TRANSLATE_IP_LIMIT_PER_MINUTE", "20")
)
TEXT_TRANSLATE_IP_LIMIT_PER_MINUTE = int(
    os.getenv("TEXT_TRANSLATE_IP_LIMIT_PER_MINUTE", "20")
)
GLOSSARY_TERM_REQUEST_IP_LIMIT_PER_HOUR = int(
    os.getenv("GLOSSARY_TERM_REQUEST_IP_LIMIT_PER_HOUR", "10")
)
DAILY_COLLECT_LIMIT = int(os.getenv("DAILY_COLLECT_LIMIT", "5"))
GITHUB_SEARCH_TOPICS = [
    topic.strip()
    for topic in os.getenv(
        "GITHUB_SEARCH_TOPICS", "vibe-coding,cursor-ai,claude-mcp"
    ).split(",")
    if topic.strip()
]
GITHUB_MIN_STARS = int(os.getenv("GITHUB_MIN_STARS", "30"))
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = (
    os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip() or "gemini-2.0-flash"
)
GITHUB_README_EXCERPT_MAX_CHARS = int(
    os.getenv("GITHUB_README_EXCERPT_MAX_CHARS", "4000")
)

BASELINE_BLOCKED_KEYWORD_CATEGORIES: dict[str, list[str]] = {
    "비하/혐오": [
        "성별비하",
        "지역비하",
        "장애비하",
        "인종비하",
        "종교비하",
        "정치비하",
        "혐오",
    ],
    "욕설/변형욕설": [
        "ㅅㅂ",
        "ㄲㅈ",
        "ㅆㄹㄱ",
        "패드립",
    ],
    "범죄/유해정보": [
        "불법토토",
        "도박",
        "환전",
        "마약",
        "필로폰",
        "대마",
        "성매매",
        "계좌대여",
        "작업대출",
        "고수익보장",
        "보이스피싱",
    ],
}

DEFAULT_HOME_FILTER_TABS: list[dict[str, str]] = [
    {"id": "all", "label": "전체"},
    {"id": "web", "label": "Web"},
    {"id": "app", "label": "App"},
    {"id": "ai", "label": "AI"},
    {"id": "tool", "label": "Tool"},
    {"id": "game", "label": "Game"},
    {"id": "和学习", "label": "和学习"},
]

DEFAULT_EXPLORE_FILTER_TABS: list[dict[str, str]] = [
    {"id": "all", "label": "전체"},
    {"id": "web", "label": "Web"},
    {"id": "game", "label": "Game"},
    {"id": "tool", "label": "Tool"},
    {"id": "ai", "label": "AI"},
    {"id": "mobile", "label": "Mobile"},
]

ABOUT_CONTENT_KEY = "about_page"
ABOUT_CONTENT_TARGET_ID = "00000000-0000-0000-0000-000000000003"
ABOUT_CONTENT_DEFAULT = {
    "hero_title": "완성도보다 바이브.",
    "hero_highlight": "실험도 작품이다.",
    "hero_description": "VibeCoder는 개발자들이 자유롭게 실험하고, 공유하고, 피드백을 받는 공간입니다. 완벽한 코드보다 재미있는 시도가 더 가치 있다고 믿습니다.",
    "contact_email": "hello@vibecoder.dev",
    "values": [
        {
            "emoji": "🎨",
            "title": "창작의 자유",
            "description": "완벽함보다 uniqueness를 중요시합니다. 당신만의 독특한 바이브를 보여주세요.",
        },
        {
            "emoji": "🤝",
            "title": "피드백 문화",
            "description": "constructive한 피드백으로 서로 성장합니다. 비난보다 건전한 논의를 추구합니다.",
        },
        {
            "emoji": "🚀",
            "title": "실험정신",
            "description": "실패를 두려워하지 말고 새로운 시도를 마음껏 해보세요.",
        },
    ],
    "team_members": [
        {
            "name": "devkim",
            "role": "Founder & Lead Dev",
            "description": "AI와 웹 개발을 좋아합니다",
        },
        {
            "name": "codemaster",
            "role": "Backend Engineer",
            "description": "Rust와 Python을 좋아합니다",
        },
        {
            "name": "designer_y",
            "role": "UI/UX Designer",
            "description": "사용자 경험을 중요시합니다",
        },
    ],
    "faqs": [
        {
            "question": "VibeCoder는 무엇인가요?",
            "answer": "개발자들이 자신의 프로젝트를 공유하고, 서로의 작품에 대한 피드백을 받을 수 있는 커뮤니티입니다.",
        },
        {
            "question": "프로젝트를 어떻게 올리나요?",
            "answer": "로그인 후 '작품 올리기' 버튼을 클릭하여 프로젝트 정보를 입력하면 됩니다.",
        },
        {
            "question": "챌린지에 참여하려면 어떻게 해야 하나요?",
            "answer": "챌린지 페이지에서 마음에 드는 챌린지를 선택하고 '참가하기' 버튼을 클릭하면 됩니다.",
        },
        {
            "question": "무료로 사용할 수 있나요?",
            "answer": "네, 기본 기능은 모두 무료입니다. 추후 유료 기능이 추가될 예정입니다.",
        },
    ],
}


def parse_allowed_origins(raw: str) -> list[str]:
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["http://localhost:5173", "http://127.0.0.1:5173"]


ALLOWED_ORIGINS = parse_allowed_origins(
    os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
)
