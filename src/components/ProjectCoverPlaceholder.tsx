import { cn } from "@/lib/utils"

interface ProjectCoverPlaceholderProps {
  title: string
  summary?: string
  platform?: string
  tags?: string[]
  likeCount?: number
  createdAt?: string
  isNew?: boolean
  isHot?: boolean
  locale?: "ko" | "en"
  className?: string
  size?: "card" | "detail"
}

type CoverMood = "hot" | "new" | "ai" | "game" | "tool" | "wip" | "play"

const HOT_STICKER_THRESHOLD = 30

const THEME_BY_MOOD: Record<CoverMood, string> = {
  hot: "bg-[radial-gradient(circle_at_20%_15%,rgba(255,93,143,0.28),transparent_42%),radial-gradient(circle_at_82%_84%,rgba(255,181,71,0.2),transparent_40%),linear-gradient(135deg,#111936_0%,#0B1020_100%)]",
  new: "bg-[radial-gradient(circle_at_20%_15%,rgba(35,213,171,0.28),transparent_40%),radial-gradient(circle_at_85%_85%,rgba(184,195,230,0.18),transparent_42%),linear-gradient(135deg,#111936_0%,#0B1020_100%)]",
  ai: "bg-[radial-gradient(circle_at_20%_15%,rgba(35,213,171,0.24),transparent_40%),radial-gradient(circle_at_85%_85%,rgba(255,93,143,0.16),transparent_42%),linear-gradient(135deg,#111936_0%,#0B1020_100%)]",
  game: "bg-[radial-gradient(circle_at_18%_14%,rgba(255,181,71,0.22),transparent_40%),radial-gradient(circle_at_82%_85%,rgba(255,93,143,0.18),transparent_40%),linear-gradient(135deg,#111936_0%,#0B1020_100%)]",
  tool: "bg-[radial-gradient(circle_at_22%_18%,rgba(184,195,230,0.26),transparent_45%),radial-gradient(circle_at_86%_86%,rgba(35,213,171,0.16),transparent_42%),linear-gradient(135deg,#161F42_0%,#0B1020_100%)]",
  wip: "bg-[radial-gradient(circle_at_16%_14%,rgba(255,181,71,0.22),transparent_38%),radial-gradient(circle_at_88%_84%,rgba(184,195,230,0.16),transparent_40%),linear-gradient(135deg,#111936_0%,#0B1020_100%)]",
  play: "bg-[radial-gradient(circle_at_16%_14%,rgba(255,93,143,0.2),transparent_38%),radial-gradient(circle_at_88%_84%,rgba(35,213,171,0.16),transparent_40%),linear-gradient(135deg,#111936_0%,#0B1020_100%)]",
}

const TAG_KEYWORDS = {
  hot: ["hot", "trending", "viral", "featured", "인기", "추천"],
  new: ["new", "launch", "fresh", "release", "신규", "출시"],
  ai: ["ai", "ml", "llm", "gpt", "genai", "인공지능"],
  game: ["game", "gaming", "three", "3d", "unity", "unreal", "gamedev", "게임"],
  tool: ["tool", "utility", "productivity", "cli", "dashboard", "automation", "툴"],
  wip: ["wip", "beta", "alpha", "draft", "prototype", "hackathon", "study", "실험", "개발중"],
}

function normalizeTags(tags: string[]): string[] {
  return tags.map((tag) => tag.trim().toLowerCase())
}

function hasAnyTag(tags: string[], keywords: string[]): boolean {
  return keywords.some((keyword) => tags.some((tag) => tag.includes(keyword)))
}

function isRecentProject(createdAt?: string): boolean {
  if (!createdAt) return false
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return false
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  return Date.now() - created.getTime() <= sevenDays
}

function resolveMood(params: {
  isHot?: boolean
  isNew?: boolean
  likeCount?: number
  tags: string[]
  platform: string
  createdAt?: string
}): CoverMood {
  const { isHot, isNew, likeCount = 0, tags, platform, createdAt } = params
  const platformLower = platform.toLowerCase()

  if (isHot || likeCount >= HOT_STICKER_THRESHOLD || hasAnyTag(tags, TAG_KEYWORDS.hot)) return "hot"
  if (isNew || isRecentProject(createdAt) || hasAnyTag(tags, TAG_KEYWORDS.new)) return "new"
  if (hasAnyTag(tags, TAG_KEYWORDS.wip)) return "wip"
  if (platformLower.includes("ai") || hasAnyTag(tags, TAG_KEYWORDS.ai)) return "ai"
  if (platformLower.includes("game") || hasAnyTag(tags, TAG_KEYWORDS.game)) return "game"
  if (platformLower.includes("tool") || hasAnyTag(tags, TAG_KEYWORDS.tool)) return "tool"
  return "play"
}

function resolveSticker(mood: CoverMood): { label: string; className: string } {
  switch (mood) {
    case "hot":
      return { label: "HOT", className: "border-[#FF5D8F]/60 text-[#FF5D8F]" }
    case "new":
      return { label: "NEW", className: "border-[#23D5AB]/50 text-[#23D5AB]" }
    case "ai":
      return { label: "AI LAB", className: "border-[#23D5AB]/45 text-[#23D5AB]" }
    case "game":
      return { label: "PLAY", className: "border-[#FFB547]/60 text-[#FFB547]" }
    case "tool":
      return { label: "BUILD", className: "border-[#B8C3E6]/50 text-[#B8C3E6]" }
    case "wip":
      return { label: "WIP", className: "border-[#FFB547]/60 text-[#FFB547]" }
    default:
      return { label: "PLAY", className: "border-[#23D5AB]/45 text-[#23D5AB]" }
  }
}

function detectLocale(explicitLocale?: "ko" | "en"): "ko" | "en" {
  if (explicitLocale) return explicitLocale
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("ko")) {
    return "ko"
  }
  return "en"
}

function localizeStickerLabel(label: string, locale: "ko" | "en"): string {
  if (locale === "en") return label

  switch (label) {
    case "HOT":
      return "인기"
    case "NEW":
      return "신규"
    case "AI LAB":
      return "AI 실험실"
    case "PLAY":
      return "플레이"
    case "BUILD":
      return "빌드"
    case "WIP":
      return "제작중"
    default:
      return label
  }
}

export function ProjectCoverPlaceholder({
  title,
  summary,
  platform = "web",
  tags = [],
  likeCount,
  createdAt,
  isNew,
  isHot,
  locale,
  className,
  size = "card",
}: ProjectCoverPlaceholderProps) {
  const normalizedTags = normalizeTags(tags)
  const mood = resolveMood({
    isHot,
    isNew,
    likeCount,
    tags: normalizedTags,
    platform,
    createdAt,
  })
  const theme = THEME_BY_MOOD[mood]
  const sticker = resolveSticker(mood)
  const resolvedLocale = detectLocale(locale)
  const stickerLabel = localizeStickerLabel(sticker.label, resolvedLocale)
  const isDetail = size === "detail"

  return (
    <div className={cn("relative w-full h-full overflow-hidden p-5", theme, className)}>
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,transparent_39%,rgba(184,195,230,0.08)_39%,rgba(184,195,230,0.08)_42%,transparent_42%,transparent_100%)]" />
      <div className={cn("absolute top-3 right-3 rounded-full border bg-[#111936]/80 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em]", sticker.className)}>
        {stickerLabel}
      </div>

      <div className="relative h-full flex flex-col justify-between">
        <span className="text-[#23D5AB] text-[11px] tracking-[0.18em] font-semibold uppercase">
          {platform}
        </span>

        <div>
          <p
            className={cn(
              "font-display leading-[1.05] text-[#F4F7FF] font-bold",
              isDetail ? "text-4xl md:text-5xl line-clamp-3" : "text-2xl md:text-[1.65rem] line-clamp-2"
            )}
          >
            {title}
          </p>
          {!!summary && (
            <p className={cn("mt-2 text-[#B8C3E6]/90", isDetail ? "text-base line-clamp-2" : "text-xs line-clamp-1")}>
              {summary}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
