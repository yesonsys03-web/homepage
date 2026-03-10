import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import type { LaunchpadTip } from "@/lib/api-types"
import { LaunchpadTipCard } from "./LaunchpadTipCard"

const TOOL_FILTERS = [
  { label: "전체", value: "" },
  { label: "Claude Code", value: "claude-code" },
  { label: "Gemini CLI", value: "gemini-cli" },
  { label: "Codex CLI", value: "codex-cli" },
  { label: "OpenCode", value: "opencode" },
  { label: "공통", value: "common" },
]

const TOPIC_FILTERS = [
  { label: "전체", value: "" },
  { label: "셋업", value: "setup" },
  { label: "프롬프팅", value: "prompt" },
  { label: "워크플로우", value: "workflow" },
  { label: "에러해결", value: "error" },
  { label: "팁", value: "tip" },
]

const SORT_OPTIONS = [
  { label: "최신순", value: "date" as const },
  { label: "이름순", value: "name" as const },
]

export function LaunchpadTipList() {
  const [tips, setTips] = useState<LaunchpadTip[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [toolFilter, setToolFilter] = useState("")
  const [topicFilter, setTopicFilter] = useState("")
  const [sort, setSort] = useState<"date" | "name">("date")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const timer = window.setTimeout(() => {
      void api
        .getLaunchpadTips({ tool_tag: toolFilter || undefined, topic_tag: topicFilter || undefined, search: search || undefined, sort, limit: 24 })
        .then((res) => {
          if (!cancelled) {
            setTips(res.items)
            setTotal(res.total)
          }
        })
        .catch(() => {
          if (!cancelled) setError("팁 목록을 불러오지 못했어요.")
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, toolFilter, topicFilter, sort])

  return (
    <div className="space-y-5">
      {/* Search */}
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 키워드 검색..."
        className="border-[#1B2854] bg-[#111936] text-[#F4F7FF] placeholder:text-[#8A96BE]"
      />

      {/* Tool filter */}
      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-[#8A96BE]">도구</p>
        <div className="flex flex-wrap gap-2">
          {TOOL_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setToolFilter(f.value)}
              className={`rounded-lg border px-3 py-1 text-sm transition-colors
                ${toolFilter === f.value
                  ? "border-[#23D5AB] bg-[#23D5AB]/15 text-[#23D5AB]"
                  : "border-[#1B2854] bg-[#111936] text-[#B8C3E6] hover:border-[#23D5AB]/40"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Topic filter */}
      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-[#8A96BE]">주제</p>
        <div className="flex flex-wrap gap-2">
          {TOPIC_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setTopicFilter(f.value)}
              className={`rounded-lg border px-3 py-1 text-sm transition-colors
                ${topicFilter === f.value
                  ? "border-[#23D5AB] bg-[#23D5AB]/15 text-[#23D5AB]"
                  : "border-[#1B2854] bg-[#111936] text-[#B8C3E6] hover:border-[#23D5AB]/40"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-[#8A96BE]">정렬:</p>
        {SORT_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setSort(o.value)}
            className={`rounded-lg border px-3 py-1 text-sm transition-colors
              ${sort === o.value
                ? "border-[#23D5AB] text-[#23D5AB]"
                : "border-transparent text-[#8A96BE] hover:text-[#B8C3E6]"}`}
          >
            {o.label}
          </button>
        ))}
        {total > 0 && <p className="ml-auto text-xs text-[#8A96BE]">{total}개</p>}
      </div>

      {/* Results */}
      {loading ? (
        <p className="py-8 text-center text-sm text-[#8A96BE]">로딩 중...</p>
      ) : error ? (
        <p className="py-8 text-center text-sm text-[#FF6B6B]">{error}</p>
      ) : tips.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg font-bold text-[#F4F7FF]">아직 팁이 없어요</p>
          <p className="mt-2 text-sm text-[#B8C3E6]">곧 좋은 팁들이 올라올 예정이에요!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tips.map((tip) => (
            <LaunchpadTipCard key={tip.id} tip={tip} />
          ))}
        </div>
      )}
    </div>
  )
}
