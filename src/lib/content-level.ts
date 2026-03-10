export type ContentLevel = "beginner" | "mid" | "expert"

const CONTENT_LEVEL_KEY = "content_level"

const LEVEL_LABELS: Record<ContentLevel, string> = {
  beginner: "🌱 입문자",
  mid: "💻 개발자",
  expert: "🔧 전문가",
}

export function readContentLevel(): ContentLevel {
  try {
    const raw = window.localStorage.getItem(CONTENT_LEVEL_KEY)
    if (raw === "beginner" || raw === "mid" || raw === "expert") {
      return raw
    }
  } catch {
    // ignore
  }
  return "beginner"
}

export function writeContentLevel(level: ContentLevel): void {
  try {
    window.localStorage.setItem(CONTENT_LEVEL_KEY, level)
  } catch {
    // ignore
  }
}

export function getLevelLabel(level: ContentLevel): string {
  return LEVEL_LABELS[level]
}

export function getSummaryForLevel(
  level: ContentLevel,
  content: { summary_beginner: string; summary_mid: string; summary_expert: string },
): string {
  if (level === "mid") return content.summary_mid || content.summary_beginner
  if (level === "expert") return content.summary_expert || content.summary_mid || content.summary_beginner
  return content.summary_beginner
}
