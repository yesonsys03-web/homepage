import { useEffect, useMemo, useState, type CSSProperties } from "react"

import { ProjectCoverPlaceholder } from "@/components/ProjectCoverPlaceholder"
import { ProjectMeta } from "@/components/ProjectMeta"
import { TopNav, type NavScreen } from "@/components/TopNav"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { api, type CuratedContent } from "@/lib/api"

interface ScreenProps {
  onNavigate?: (screen: NavScreen) => void
  onOpenCurated?: (contentId: number) => void
}

function StickerBadge({ type }: { type: "new" | "hot" | "weird" | "wip" }) {
  const colors = {
    new: "bg-[#23D5AB] text-[#0B1020]",
    hot: "bg-[#FF5D8F] text-white",
    weird: "bg-[#FFB547] text-[#0B1020]",
    wip: "bg-[#B8C3E6] text-[#0B1020]",
  }
  const labels = { new: "NEW", hot: "HOT", weird: "WEIRD", wip: "WIP" }
  return (
    <span className={`absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold rounded ${colors[type]} rotate-3`}>
      {labels[type]}
    </span>
  )
}

function CuratedCard({
  item,
  index,
  onOpenCurated,
}: {
  item: CuratedContent
  index: number
  onOpenCurated?: (contentId: number) => void
}) {
  return (
    <Card
      className="group relative bg-[#161F42] border-0 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:rotate-1 hover:shadow-xl hover:shadow-[#23D5AB]/10 cursor-pointer"
      style={{
        transform: `rotate(${(index % 3 - 1) * 1.5}deg)`,
      }}
      onClick={() => onOpenCurated?.(item.id)}
    >
      {item.is_korean_dev && <StickerBadge type="new" />}
      {item.is_maintenance_stopped && (
        <span className="absolute top-2 left-2 z-10 rounded px-2 py-0.5 text-[10px] font-semibold bg-[#2A1320] text-[#FF6B6B] border border-[#FF6B6B]/40">
          유지보수 중단
        </span>
      )}
      <div className="aspect-video bg-gradient-to-br from-[#111936] to-[#0B1020] flex items-center justify-center overflow-hidden">
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none" }}
          />
        ) : (
          <ProjectCoverPlaceholder
            seedKey={String(item.id)}
            title={item.title}
            summary={item.summary_beginner}
            platform={item.category}
            tags={item.tags}
            likeCount={item.stars}
            size="card"
          />
        )}
      </div>
      <CardContent className="p-4">
        <ProjectMeta
          title={item.title}
          summary={item.summary_beginner || "요약 준비 중"}
          tags={item.tags}
          author={item.repo_owner}
          likes={item.stars}
          comments={item.quality_score ?? 0}
        />
      </CardContent>
    </Card>
  )
}

export function CuratedScreen({ onNavigate, onOpenCurated }: ScreenProps) {
  const [items, setItems] = useState<CuratedContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [koreanOnly, setKoreanOnly] = useState(false)
  const [sort, setSort] = useState<"latest" | "quality">("latest")

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const fetchCurated = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.getCuratedContent({
          category: category === "all" ? undefined : category,
          search: debouncedQuery.trim() || undefined,
          is_korean_dev: koreanOnly ? true : undefined,
          sort,
          limit: 60,
          offset: 0,
        })
        setItems(response.items || [])
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "큐레이션 목록을 불러오지 못했습니다."
        setError(message)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    void fetchCurated()
  }, [category, koreanOnly, debouncedQuery, sort])

  const categories = useMemo(() => {
    const values = new Set<string>()
    for (const item of items) {
      const value = item.category.trim()
      if (value) {
        values.add(value)
      }
    }
    return ["all", ...Array.from(values).sort((a, b) => a.localeCompare(b))]
  }, [items])

  const openDetail = (contentId: number) => {
    if (onOpenCurated) {
      onOpenCurated(contentId)
      return
    }
    window.location.href = `/curated/${contentId}`
  }

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <TopNav active="curated" onNavigate={onNavigate} titleSuffix="Curated" />

      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <header className="mb-6 rounded-2xl border border-[#111936] bg-[#161F42] p-6">
          <h2 className="font-display text-3xl font-bold text-[#F4F7FF]">✨ Curated</h2>
          <p className="mt-2 text-[#B8C3E6]">초보자에게 실질적으로 도움이 되는 레포만 골라 빠르게 탐색하세요.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="레포/설명 검색 (예: starter, vite, mcp)"
              className="border-[#3B4A78] bg-[#0B1020] text-[#F4F7FF] placeholder:text-[#8A96BE]"
            />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value === "quality" ? "quality" : "latest")}
              className="rounded-xl border border-[#3B4A78] bg-[#0B1020] px-3 py-2 text-sm text-[#F4F7FF]"
            >
              <option value="latest">최신순</option>
              <option value="quality">품질순</option>
            </select>
            <label className="flex items-center gap-2 rounded-xl border border-[#3B4A78] bg-[#0B1020] px-3 py-2 text-sm text-[#B8C3E6]">
              <input
                type="checkbox"
                checked={koreanOnly}
                onChange={(event) => setKoreanOnly(event.target.checked)}
              />
              한국 개발자
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  category === item
                    ? "bg-[#23D5AB] text-[#0B1020]"
                    : "bg-[#111936] text-[#B8C3E6] hover:bg-[#1B2854]"
                }`}
              >
                {item === "all" ? "전체" : item}
              </button>
            ))}
          </div>
        </header>

        {error ? <p className="mb-4 rounded-xl border border-[#FF6B6B]/40 bg-[#2A1320] px-4 py-3 text-sm text-[#FFB7B7]">{error}</p> : null}

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={`curated-skeleton-${index}`} className="rounded-xl bg-[#161F42] border border-[#111936] overflow-hidden animate-pulse">
                  <div className="aspect-video bg-[#111936]" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-[#111936] rounded w-2/3" />
                    <div className="h-3 bg-[#111936] rounded w-full" />
                    <div className="h-3 bg-[#111936] rounded w-5/6" />
                  </div>
                </div>
              ))
            : items.map((item, index) => (
                <div key={item.id} className="reveal-up" style={{ "--reveal-delay": `${Math.min(index, 8) * 45}ms` } as CSSProperties}>
                  <CuratedCard item={item} index={index} onOpenCurated={openDetail} />
                </div>
              ))}
        </section>

        {!loading && items.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-[#111936] bg-[#161F42] px-4 py-8 text-center text-[#8A96BE]">
            조건에 맞는 큐레이션 결과가 없어요. 검색어/필터를 바꿔서 다시 시도해보세요.
          </p>
        ) : null}
      </main>
    </div>
  )
}
