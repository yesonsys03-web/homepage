"""Admin email notification service — SMTP-based, optional (gracefully skips if unconfigured)."""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def _get_smtp_config() -> dict[str, str | int] | None:
    """Return SMTP config from env vars, or None if not configured."""
    host = os.getenv("SMTP_HOST", "").strip()
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    admin_email = os.getenv("ADMIN_EMAIL", "").strip()

    if not (host and user and password and admin_email):
        return None

    return {
        "host": host,
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": user,
        "password": password,
        "admin_email": admin_email,
        "from_name": os.getenv("SMTP_FROM_NAME", "VibeCoder Admin"),
    }


def send_curated_collection_summary(
    created: int,
    collected_today: int,
    daily_limit: int,
    pending_count: int,
    site_url: str = "https://vibecoder.com",
) -> bool:
    """Send daily curated collection summary to admin. Returns True if sent, False otherwise."""
    config = _get_smtp_config()
    if not config:
        return False

    subject = f"[VibeCoder] 오늘의 큐레이션 수집 완료 — 신규 {created}개"

    admin_url = f"{site_url}/admin/curated"

    if created == 0:
        body_summary = "오늘은 새로 수집된 레포지토리가 없습니다."
    else:
        body_summary = f"오늘 <strong>{created}개</strong>의 레포지토리가 새로 수집되었습니다."

    html = f"""
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; background:#0B1020; color:#B8C3E6; padding:24px; max-width:600px; margin:auto;">
  <h2 style="color:#23D5AB;">📦 오늘의 VibeCoder 큐레이션 수집 리포트</h2>

  <table style="border-collapse:collapse; width:100%; margin-bottom:20px;">
    <tr style="border-bottom:1px solid #1B2854;">
      <td style="padding:8px 12px; color:#8A96BE;">오늘 수집</td>
      <td style="padding:8px 12px; color:#F4F7FF; font-weight:bold;">{collected_today} / {daily_limit} 건</td>
    </tr>
    <tr style="border-bottom:1px solid #1B2854;">
      <td style="padding:8px 12px; color:#8A96BE;">신규 등록</td>
      <td style="padding:8px 12px; color:#23D5AB; font-weight:bold;">{created} 건</td>
    </tr>
    <tr>
      <td style="padding:8px 12px; color:#8A96BE;">승인 대기</td>
      <td style="padding:8px 12px; color:#FFB547; font-weight:bold;">{pending_count} 건</td>
    </tr>
  </table>

  <p>{body_summary}</p>

  {"<p>승인 대기 중인 항목이 있습니다. 아래 버튼을 클릭해 검토해주세요.</p>" if pending_count > 0 else ""}

  <a href="{admin_url}"
     style="display:inline-block; background:#23D5AB; color:#0B1020; padding:12px 24px;
            text-decoration:none; border-radius:8px; font-weight:bold; margin-top:12px;">
    어드민에서 확인하기 →
  </a>

  <p style="margin-top:24px; font-size:12px; color:#8A96BE;">
    이 메일은 VibeCoder 서버에서 자동 발송됩니다.
  </p>
</body>
</html>
""".strip()

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{config['from_name']} <{config['user']}>"
        msg["To"] = str(config["admin_email"])
        msg.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(str(config["host"]), int(config["port"]), timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(str(config["user"]), str(config["password"]))
            smtp.sendmail(str(config["user"]), str(config["admin_email"]), msg.as_string())

        return True
    except Exception as e:
        print(f"[email-service] Failed to send collection summary: {e}")
        return False
