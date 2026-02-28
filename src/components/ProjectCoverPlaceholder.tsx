import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

interface ProjectCoverPlaceholderProps {
  title: string
  summary?: string
  description?: string
  seedKey?: string
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

const HUE_SHIFT_BY_MOOD: Record<CoverMood, number> = {
  hot: 18,
  new: 145,
  ai: 202,
  game: 38,
  tool: 228,
  wip: 278,
  play: 322,
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildCoverBackground(seed: number, mood: CoverMood): string {
  const rand = seededRandom(seed)
  const hueBase = Math.floor(rand() * 360)
  const moodBias = HUE_SHIFT_BY_MOOD[mood]
  const a = (hueBase + moodBias + Math.floor(rand() * 80) - 40 + 360) % 360
  const b = (hueBase + 100 + Math.floor(rand() * 120) - 60 + 360) % 360
  const c = (hueBase + 220 + Math.floor(rand() * 120) - 60 + 360) % 360
  const x1 = 10 + Math.floor(rand() * 24)
  const y1 = 8 + Math.floor(rand() * 20)
  const x2 = 70 + Math.floor(rand() * 22)
  const y2 = 72 + Math.floor(rand() * 20)
  const x3 = 36 + Math.floor(rand() * 28)
  const y3 = 96 + Math.floor(rand() * 24)
  const s1 = 82 + Math.floor(rand() * 16)
  const s2 = 80 + Math.floor(rand() * 18)
  const s3 = 78 + Math.floor(rand() * 20)
  const l1 = 64 + Math.floor(rand() * 22)
  const l2 = 60 + Math.floor(rand() * 24)
  const l3 = 62 + Math.floor(rand() * 22)
  return [
    `radial-gradient(circle at ${x1}% ${y1}%, hsla(${a}, ${s1}%, ${l1}%, 0.62), transparent 48%)`,
    `radial-gradient(circle at ${x2}% ${y2}%, hsla(${b}, ${s2}%, ${l2}%, 0.54), transparent 49%)`,
    `radial-gradient(circle at ${x3}% ${y3}%, hsla(${c}, ${s3}%, ${l3}%, 0.38), transparent 56%)`,
    `conic-gradient(from ${96 + Math.floor(rand() * 120)}deg at 50% 50%, hsla(${(a + 28) % 360}, 90%, 66%, 0.24), hsla(${(b + 42) % 360}, 88%, 64%, 0.26), hsla(${(c + 32) % 360}, 86%, 62%, 0.22), hsla(${(a + 28) % 360}, 90%, 66%, 0.24))`,
    `linear-gradient(135deg, hsl(${(a + 188) % 360}, 68%, ${42 + Math.floor(rand() * 8)}%) 0%, hsl(${(b + 178) % 360}, 66%, ${40 + Math.floor(rand() * 9)}%) 54%, hsl(${(c + 170) % 360}, 64%, ${36 + Math.floor(rand() * 10)}%) 100%)`,
  ].join(",")
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

function createSeed(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0)
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
  description,
  seedKey,
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
  const seed = createSeed(`${seedKey ?? ""}|${title}|${summary ?? ""}|${description ?? ""}|${platform}|${createdAt ?? ""}|${normalizedTags.join("|")}`)
  const mood = resolveMood({
    isHot,
    isNew,
    likeCount,
    tags: normalizedTags,
    platform,
    createdAt,
  })
  const sticker = resolveSticker(mood)
  const resolvedLocale = detectLocale(locale)
  const stickerLabel = localizeStickerLabel(sticker.label, resolvedLocale)
  const isDetail = size === "detail"
  const titleSizeClass = isDetail ? "text-4xl md:text-5xl line-clamp-3" : "text-2xl md:text-[1.65rem] line-clamp-2"
  const summarySizeClass = isDetail ? "text-base line-clamp-2" : "text-sm line-clamp-2"
  const descriptionSizeClass = isDetail ? "text-sm line-clamp-3" : "text-xs line-clamp-2"
  const rand = seededRandom(seed ^ 0x9e3779b9)
  const particleHueBase = Math.floor(rand() * 360)
  const trimmedSummary = summary?.trim()
  const trimmedDescription = description?.trim()
  const hasSummary = Boolean(trimmedSummary)
  const hasDescription = Boolean(trimmedDescription)

  const coverStyle: CSSProperties = {
    backgroundImage: buildCoverBackground(seed, mood),
    ["--cover-orb-a-duration" as string]: `${7 + (seed % 5)}s`,
    ["--cover-orb-b-duration" as string]: `${9 + (seed % 4)}s`,
    ["--cover-sheen-duration" as string]: `${5 + (seed % 4)}s`,
    ["--cover-title-entry-delay" as string]: `${60 + (seed % 140)}ms`,
    ["--cover-glitch-duration" as string]: `${1200 + (seed % 700)}ms`,
    ["--cover-particle-1-duration" as string]: `${2200 + (seed % 900)}ms`,
    ["--cover-particle-2-duration" as string]: `${2500 + (seed % 1000)}ms`,
    ["--cover-particle-3-duration" as string]: `${2800 + (seed % 1100)}ms`,
    ["--cover-particle-1-delay" as string]: `${seed % 600}ms`,
    ["--cover-particle-2-delay" as string]: `${200 + (seed % 700)}ms`,
    ["--cover-particle-3-delay" as string]: `${400 + (seed % 800)}ms`,
    ["--cover-copy-duration" as string]: `${24 + Math.floor(rand() * 9)}s`,
    ["--cover-copy-delay" as string]: `-${(rand() * 30).toFixed(2)}s`,
  }

  const orbAStyle: CSSProperties = {
    left: `${-16 + Math.floor(rand() * 18)}%`,
    top: `${-22 + Math.floor(rand() * 22)}%`,
    width: `${120 + Math.floor(rand() * 90)}px`,
    height: `${120 + Math.floor(rand() * 90)}px`,
    backgroundColor: `hsla(${(particleHueBase + 28) % 360}, 92%, 70%, 0.28)`,
    animationDuration: `${6 + rand() * 5}s`,
    animationDelay: `${-(rand() * 3).toFixed(2)}s`,
  }

  const orbBStyle: CSSProperties = {
    right: `${-14 + Math.floor(rand() * 18)}%`,
    bottom: `${-20 + Math.floor(rand() * 24)}%`,
    width: `${110 + Math.floor(rand() * 88)}px`,
    height: `${110 + Math.floor(rand() * 88)}px`,
    backgroundColor: `hsla(${(particleHueBase + 188) % 360}, 90%, 72%, 0.24)`,
    animationDuration: `${7 + rand() * 5}s`,
    animationDelay: `${-(rand() * 3).toFixed(2)}s`,
  }

  const sheenStyle: CSSProperties = {
    width: `${22 + Math.floor(rand() * 20)}%`,
    opacity: 0.72 + rand() * 0.32,
    transform: `rotate(${Math.floor(rand() * 16) - 8}deg)`,
    animationDuration: `${4.4 + rand() * 3.2}s`,
    animationDelay: `${-(rand() * 2.4).toFixed(2)}s`,
  }

  const particle1Style: CSSProperties = {
    left: `${8 + Math.floor(rand() * 22)}%`,
    bottom: `${12 + Math.floor(rand() * 18)}%`,
    width: `${6 + Math.floor(rand() * 7)}px`,
    height: `${6 + Math.floor(rand() * 7)}px`,
    color: `hsla(${(particleHueBase + 12) % 360}, 95%, 72%, 0.96)`,
    animationDuration: `${2.1 + rand() * 1.9}s`,
    animationDelay: `${rand().toFixed(2)}s`,
  }

  const particle2Style: CSSProperties = {
    right: `${10 + Math.floor(rand() * 24)}%`,
    bottom: `${10 + Math.floor(rand() * 20)}%`,
    width: `${6 + Math.floor(rand() * 7)}px`,
    height: `${6 + Math.floor(rand() * 7)}px`,
    color: `hsla(${(particleHueBase + 140) % 360}, 95%, 72%, 0.94)`,
    animationDuration: `${2.2 + rand() * 2.2}s`,
    animationDelay: `${(0.18 + rand()).toFixed(2)}s`,
  }

  const particle3Style: CSSProperties = {
    left: `${38 + Math.floor(rand() * 22)}%`,
    bottom: `${8 + Math.floor(rand() * 16)}%`,
    width: `${5 + Math.floor(rand() * 7)}px`,
    height: `${5 + Math.floor(rand() * 7)}px`,
    color: `hsla(${(particleHueBase + 268) % 360}, 95%, 74%, 0.92)`,
    animationDuration: `${2.4 + rand() * 2.4}s`,
    animationDelay: `${(0.32 + rand()).toFixed(2)}s`,
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden p-5", className)} style={coverStyle}>
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,transparent_39%,rgba(184,195,230,0.08)_39%,rgba(184,195,230,0.08)_42%,transparent_42%,transparent_100%)]" />
      <div className="cover-orb-a absolute rounded-full blur-3xl" style={orbAStyle} />
      <div className="cover-orb-b absolute rounded-full blur-3xl" style={orbBStyle} />
      <div className="cover-sheen absolute inset-y-0 -left-1/3 bg-[linear-gradient(90deg,transparent,rgba(244,247,255,0.18),transparent)]" style={sheenStyle} />
      <span className="cover-particle cover-particle-1" style={particle1Style} />
      <span className="cover-particle cover-particle-2" style={particle2Style} />
      <span className="cover-particle cover-particle-3" style={particle3Style} />
      <div className={cn("absolute top-3 right-3 rounded-full border bg-[#111936]/80 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em]", sticker.className)}>
        {stickerLabel}
      </div>

      <div className="relative h-full flex flex-col justify-between">
        <span className="text-[#23D5AB] text-[11px] tracking-[0.18em] font-semibold uppercase">
          {platform}
        </span>

        <div>
          {hasSummary || hasDescription ? (
            <div className={cn("cover-copy-stack mt-1", hasDescription ? "cover-copy-stack-three" : "cover-copy-stack-two")}>
              <p className={cn("cover-copy-panel cover-copy-title font-display leading-[1.05] text-[#F4F7FF] font-bold", titleSizeClass)}>{title}</p>
              {hasSummary ? (
                <p className={cn("cover-copy-panel cover-copy-summary text-[#B8C3E6]/95", summarySizeClass)}>{trimmedSummary}</p>
              ) : null}
              {hasDescription ? (
                <p className={cn("cover-copy-panel cover-copy-description text-[#D7E2FF]/85", descriptionSizeClass)}>{trimmedDescription}</p>
              ) : null}
            </div>
          ) : (
            <p className={cn("cover-title-motion font-display leading-[1.05] text-[#F4F7FF] font-bold", titleSizeClass)}>{title}</p>
          )}
        </div>
      </div>
    </div>
  )
}
