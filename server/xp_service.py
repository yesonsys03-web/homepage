"""바이브 레벨 / XP 시스템 서비스

XP 이벤트 유형 및 지급량:
  error_translate_solved  +10   에러 응급실 해결됐어요
  showcase_first_post     +50   자랑 게시판 첫 게시물
  challenge_complete      +20   오늘의 챌린지 완료
  challenge_streak_7      +100  챌린지 7일 연속 보너스
  curated_bookmark        +5    GitHub 카드 북마크
  comment_create          +5    댓글 달기
  clap_given              +2    박수 보내기
  glossary_quiz_correct   +10   용어 퀴즈 정답
  glossary_read           +5    오늘의 용어 읽기

레벨 체계:
  Lv.1  🌱 씨앗      0~99
  Lv.2  🌿 새싹      100~299
  Lv.3  🌳 나무      300~599
  Lv.4  🗺️ 탐험가   600~999
  Lv.5  🔨 건축가    1000~1999
  Lv.6  🚀 런처      2000~3999
  Lv.7  ⚡ 바이브 마스터  4000+
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import psycopg2.extensions

# XP 이벤트 정의: event_type → xp_delta
XP_EVENT_MAP: dict[str, int] = {
    "error_translate_solved": 10,
    "showcase_first_post": 50,
    "challenge_complete": 20,
    "challenge_streak_7": 100,
    "curated_bookmark": 5,
    "comment_create": 5,
    "clap_given": 2,
    "glossary_quiz_correct": 10,
    "glossary_read": 5,
}

# 레벨 경계 (XP → level)
XP_LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 2000, 4000]

# 뱃지 정의: badge_code → (조건 설명, 체크 함수 이름)
BADGE_DEFINITIONS: dict[str, str] = {
    "first_step": "첫 로그인",
    "first_deploy": "배포 성공 (showcase 첫 게시물)",
    "error_overcome": "에러 응급실 5회 해결",
    "recipe_master": "레시피북 10개 즐겨찾기",
    "fire_streak": "챌린지 7일 연속",
    "thirty_day": "챌린지 30일 완료",
    "team_player": "댓글 10개 달기",
    "idea_bank": "게시물 5개 올리기",
    "popular_star": "게시물 박수 100개",
    "korean_supporter": "국내 개발자 레포 10개 북마크",
}


def calc_level(total_xp: int) -> int:
    """XP → 레벨 (1~7)"""
    level = 1
    for threshold in XP_LEVEL_THRESHOLDS:
        if total_xp >= threshold:
            level += 1
        else:
            break
    return min(level - 1, 7)


def get_xp_summary(cur: "psycopg2.extensions.cursor", user_id: str) -> dict:
    """사용자 XP/레벨 요약 반환"""
    cur.execute(
        "SELECT total_xp, level FROM user_xp WHERE user_id = %s",
        (user_id,),
    )
    row = cur.fetchone()
    if row is None:
        return {"total_xp": 0, "level": 1, "xp_to_next": XP_LEVEL_THRESHOLDS[1]}
    total_xp: int = row[0]
    level: int = row[1]
    next_threshold = XP_LEVEL_THRESHOLDS[level] if level < len(XP_LEVEL_THRESHOLDS) else None
    xp_to_next = (next_threshold - total_xp) if next_threshold is not None else None
    return {"total_xp": total_xp, "level": level, "xp_to_next": xp_to_next}


def award_xp(
    cur: "psycopg2.extensions.cursor",
    user_id: str,
    event_type: str,
    ref_id: str | None = None,
) -> dict:
    """XP를 지급하고 결과 반환. 이미 지급된 이벤트는 무시 (idempotent).

    Returns:
        {"awarded": bool, "xp_delta": int, "total_xp": int, "level": int,
         "level_up": bool, "new_badges": list[str]}
    """
    if event_type not in XP_EVENT_MAP:
        return {"awarded": False, "xp_delta": 0, "total_xp": 0, "level": 1, "level_up": False, "new_badges": []}

    xp_delta = XP_EVENT_MAP[event_type]
    safe_ref_id = ref_id or event_type  # ref_id가 없으면 event_type을 키로

    # 중복 방지: INSERT IGNORE
    cur.execute(
        """
        INSERT INTO xp_events (user_id, event_type, ref_id, xp_delta)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (user_id, event_type, ref_id) DO NOTHING
        """,
        (user_id, event_type, safe_ref_id, xp_delta),
    )
    if cur.rowcount == 0:
        # 이미 지급됨
        summary = get_xp_summary(cur, user_id)
        return {
            "awarded": False,
            "xp_delta": 0,
            "total_xp": summary["total_xp"],
            "level": summary["level"],
            "level_up": False,
            "new_badges": [],
        }

    # user_xp 업데이트 (upsert)
    cur.execute(
        """
        SELECT total_xp, level FROM user_xp WHERE user_id = %s
        """,
        (user_id,),
    )
    row = cur.fetchone()
    old_level = row[1] if row else 1
    new_total_xp = (row[0] if row else 0) + xp_delta
    new_level = calc_level(new_total_xp)

    cur.execute(
        """
        INSERT INTO user_xp (user_id, total_xp, level, updated_at)
        VALUES (%s, %s, %s, NOW())
        ON CONFLICT (user_id) DO UPDATE
            SET total_xp = EXCLUDED.total_xp,
                level = EXCLUDED.level,
                updated_at = NOW()
        """,
        (user_id, new_total_xp, new_level),
    )

    # 뱃지 체크
    new_badges = _check_and_award_badges(cur, user_id, event_type)

    return {
        "awarded": True,
        "xp_delta": xp_delta,
        "total_xp": new_total_xp,
        "level": new_level,
        "level_up": new_level > old_level,
        "new_badges": new_badges,
    }


def get_user_badges(cur: "psycopg2.extensions.cursor", user_id: str) -> list[dict]:
    cur.execute(
        """
        SELECT badge_code, awarded_at
        FROM user_badges
        WHERE user_id = %s
        ORDER BY awarded_at DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    return [
        {"badge_code": r[0], "description": BADGE_DEFINITIONS.get(r[0], ""), "awarded_at": str(r[1])}
        for r in rows
    ]


def _check_and_award_badges(
    cur: "psycopg2.extensions.cursor",
    user_id: str,
    trigger_event: str,
) -> list[str]:
    """조건 충족 시 뱃지 자동 지급. 이미 보유한 뱃지는 스킵."""
    new_badges: list[str] = []

    def _award(badge_code: str) -> None:
        cur.execute(
            """
            INSERT INTO user_badges (user_id, badge_code)
            VALUES (%s, %s)
            ON CONFLICT (user_id, badge_code) DO NOTHING
            """,
            (user_id, badge_code),
        )
        if cur.rowcount > 0:
            new_badges.append(badge_code)

    # first_step: 첫 XP 이벤트 → 항상 체크
    cur.execute("SELECT COUNT(*) FROM xp_events WHERE user_id = %s", (user_id,))
    event_count = (cur.fetchone() or [0])[0]
    if event_count >= 1:
        _award("first_step")

    # error_overcome: 에러 응급실 5회 해결
    if trigger_event == "error_translate_solved":
        cur.execute(
            "SELECT COUNT(*) FROM xp_events WHERE user_id = %s AND event_type = 'error_translate_solved'",
            (user_id,),
        )
        solved_count = (cur.fetchone() or [0])[0]
        if solved_count >= 5:
            _award("error_overcome")

    # fire_streak: 챌린지 7일 연속
    if trigger_event == "challenge_streak_7":
        _award("fire_streak")

    # first_deploy: showcase 첫 게시물 (showcase_first_post)
    if trigger_event == "showcase_first_post":
        _award("first_deploy")

    # team_player: 댓글 10개
    if trigger_event == "comment_create":
        cur.execute(
            "SELECT COUNT(*) FROM xp_events WHERE user_id = %s AND event_type = 'comment_create'",
            (user_id,),
        )
        comment_count = (cur.fetchone() or [0])[0]
        if comment_count >= 10:
            _award("team_player")

    # idea_bank: 게시물 5개
    if trigger_event == "showcase_first_post":
        cur.execute(
            "SELECT COUNT(*) FROM xp_events WHERE user_id = %s AND event_type LIKE 'showcase_%'",
            (user_id,),
        )
        post_count = (cur.fetchone() or [0])[0]
        if post_count >= 5:
            _award("idea_bank")

    return new_badges
