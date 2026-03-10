import type { LaunchpadTip } from "@/lib/api-types"

const PLATFORM_ICON: Record<string, string> = {
  x: "𝕏",
  threads: "🧵",
  youtube: "▶️",
  other: "🔗",
}

const TOOL_LABEL: Record<string, string> = {
  "claude-code": "Claude Code",
  "gemini-cli": "Gemini CLI",
  "codex-cli": "Codex CLI",
  opencode: "OpenCode",
  common: "공통",
}

const TOPIC_LABEL: Record<string, string> = {
  setup: "셋업",
  prompt: "프롬프팅",
  workflow: "워크플로우",
  error: "에러해결",
  tip: "팁",
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function LaunchpadTipCard({ tip }: { tip: LaunchpadTip }) {
  const platformIcon = PLATFORM_ICON[tip.platform] ?? "🔗"

  return (
    <a
      href={tip.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-[#111936] bg-[#0D1530] p-4 transition-all hover:border-[#23D5AB]/40"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[#8A96BE]">
          {platformIcon} {tip.author_handle ? `@${tip.author_handle}` : tip.platform}
        </span>
        {!tip.is_link_valid && (
          <span className="rounded bg-[#FF6B6B]/20 px-2 py-0.5 text-xs text-[#FF6B6B]">🔴 만료</span>
        )}
        <span className="text-xs text-[#8A96BE] group-hover:text-[#23D5AB]">원글 →</span>
      </div>

      {tip.og_image_url && (
        <img
          src={tip.og_image_url}
          alt={tip.og_title}
          className="mt-3 h-36 w-full rounded-lg object-cover"
          loading="lazy"
        />
      )}

      <p className="mt-3 text-sm font-semibold text-[#F4F7FF] line-clamp-2">{tip.og_title}</p>
      <p className="mt-2 text-sm text-[#B8C3E6] line-clamp-3">{tip.description_kr}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tip.tool_tags.map((tag) => (
          <span key={tag} className="rounded-full bg-[#23D5AB]/10 px-2 py-0.5 text-xs text-[#23D5AB]">
            🏷 {TOOL_LABEL[tag] ?? tag}
          </span>
        ))}
        {tip.topic_tags.map((tag) => (
          <span key={tag} className="rounded-full bg-[#1B2854] px-2 py-0.5 text-xs text-[#B8C3E6]">
            {TOPIC_LABEL[tag] ?? tag}
          </span>
        ))}
      </div>

      <p className="mt-2 text-xs text-[#8A96BE]">📅 {formatDate(tip.created_at)}</p>
    </a>
  )
}
