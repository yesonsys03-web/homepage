import { useEffect, useMemo, useState } from "react"

import { TopNav } from "@/components/TopNav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { api, type CuratedContent } from "@/lib/api"

type Screen =
  | "home"
  | "detail"
  | "submit"
  | "profile"
  | "admin"
  | "login"
  | "register"
  | "explore"
  | "playground"
  | "glossary"
  | "curated"
  | "challenges"
  | "about"

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
  onOpenCurated?: (contentId: number) => void
}

export function CuratedScreen({ onNavigate, onOpenCurated }: ScreenProps) {
  const [items, setItems] = useState<CuratedContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [koreanOnly, setKoreanOnly] = useState(false)
  const [sort, setSort] = useState<"latest" | "quality">("latest")

  useEffect(() => {
    const fetchCurated = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.getCuratedContent({
          category: category === "all" ? undefined : category,
          search: query.trim() || undefined,
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
  }, [category, koreanOnly, query, sort])

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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={`curated-skeleton-${index}`} className="h-56 animate-pulse rounded-2xl border border-[#111936] bg-[#161F42]" />
              ))
            : items.map((item) => (
                <Card key={item.id} className="border-[#111936] bg-[#161F42]">
                  <CardHeader>
                    <CardTitle className="line-clamp-2 text-base text-[#F4F7FF]">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-[#B8C3E6]">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-[#111936] text-[#B8C3E6]">{item.category || "미분류"}</Badge>
                      <Badge className="bg-[#111936] text-[#B8C3E6]">{item.language || "Unknown"}</Badge>
                      <Badge className="bg-[#111936] text-[#B8C3E6]">⭐ {item.stars}</Badge>
                    </div>
                    <p className="line-clamp-3">{item.summary_beginner || "초보자 요약이 아직 준비되지 않았습니다."}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#8A96BE]">{item.repo_owner}/{item.repo_name}</span>
                      <Button
                        size="sm"
                        className="bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
                        onClick={() => openDetail(item.id)}
                      >
                        상세보기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
