import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ProjectCoverPlaceholder } from "@/components/ProjectCoverPlaceholder"
import { TopNav } from "@/components/TopNav"
import { FilterChips } from "@/components/FilterChips"
import { ProjectMeta } from "@/components/ProjectMeta"
import { Button } from "@/components/ui/button"
import { api, type FilterTab, type Project } from "@/lib/api"

type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'showcase' | 'playground' | 'glossary' | 'curated' | 'challenges' | 'about'

const HOT_PROJECT_THRESHOLD = 30

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
  onOpenProject?: (projectId: string) => void
}

const EXPLORE_FILTER_TABS_FALLBACK: FilterTab[] = [
  { id: "all", label: "전체" },
  { id: "web", label: "Web" },
  { id: "game", label: "Game" },
  { id: "tool", label: "Tool" },
  { id: "ai", label: "AI" },
  { id: "mobile", label: "Mobile" },
]

export function ExploreScreen({ onNavigate, onOpenProject }: ScreenProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<"popular" | "latest">("popular")
  const [category, setCategory] = useState("all")
  const [categories, setCategories] = useState<FilterTab[]>(
    EXPLORE_FILTER_TABS_FALLBACK,
  )

  useEffect(() => {
    const applyTabs = (tabs: FilterTab[]) => {
      if (Array.isArray(tabs) && tabs.length > 0) {
        setCategories(tabs)
      }
    }

    void api.getFilterTabs({
      onRevalidate: (data) => applyTabs(data.explore_filter_tabs || EXPLORE_FILTER_TABS_FALLBACK),
    })
      .then((data) => {
        applyTabs(data.explore_filter_tabs || EXPLORE_FILTER_TABS_FALLBACK)
      })
      .catch((error) => {
        console.error("Failed to fetch explore filter tabs:", error)
        setCategories(EXPLORE_FILTER_TABS_FALLBACK)
      })
  }, [])

  useEffect(() => {
    if (!categories.some((item) => item.id === category)) {
      setCategory(categories[0]?.id || "all")
    }
  }, [categories, category])

  useEffect(() => {
    const fetchProjects = async () => {
      const params: { sort?: string; tag?: string } = { sort }
      if (category !== "all") {
        params.tag = category
      }

      const hasCache = api.hasProjectsCache(params)
      if (!hasCache) {
        setLoading(true)
      }

      const applyProjects = (data: { items: Project[] }) => {
        setProjects(data.items || [])
      }

      try {
        const data = await api.getProjects(params, { onRevalidate: applyProjects })
        applyProjects(data)
      } catch (error) {
        console.error("Failed to fetch explore projects:", error)
        setProjects([])
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [sort, category])

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <TopNav active="explore" onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-3xl font-bold text-[#F4F7FF]">Explore</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className={sort === "popular" ? "border-[#23D5AB] text-[#23D5AB] hover:bg-[#23D5AB]/10" : "border-[#B8C3E6] text-[#B8C3E6] hover:bg-[#B8C3E6]/10"}
              onClick={() => setSort("popular")}
            >
              🔥 Hot
            </Button>
            <Button
              variant="outline"
              className={sort === "latest" ? "border-[#23D5AB] text-[#23D5AB] hover:bg-[#23D5AB]/10" : "border-[#B8C3E6] text-[#B8C3E6] hover:bg-[#B8C3E6]/10"}
              onClick={() => setSort("latest")}
            >
              🆕 New
            </Button>
          </div>
        </div>

        {/* Categories */}
        <FilterChips items={categories} value={category} onChange={setCategory} className="flex gap-3 mb-8 overflow-x-auto pb-2" />

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={`explore-skeleton-${idx}`} className="rounded-xl bg-[#161F42] border border-[#111936] overflow-hidden animate-pulse">
                <div className="aspect-video bg-[#111936]" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-[#111936] rounded w-2/3" />
                  <div className="h-3 bg-[#111936] rounded w-full" />
                  <div className="h-3 bg-[#111936] rounded w-5/6" />
                </div>
              </div>
            ))
          ) : (
            projects.map((project) => (
            <Card key={project.id} onClick={() => onOpenProject?.(project.id)} className="bg-[#161F42] border-[#111936] overflow-hidden hover:border-[#23D5AB]/50 transition-colors cursor-pointer">
              <div className="aspect-video bg-gradient-to-br from-[#161F42] to-[#0B1020] flex items-center justify-center">
                {project.thumbnail_url ? (
                  <img src={project.thumbnail_url} alt={project.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <ProjectCoverPlaceholder
                    seedKey={project.id}
                    title={project.title}
                    summary={project.summary}
                    description={project.description}
                    platform={project.platform}
                    tags={project.tags}
                    likeCount={project.like_count}
                    createdAt={project.created_at}
                    isHot={project.like_count >= HOT_PROJECT_THRESHOLD}
                    size="card"
                  />
                )}
              </div>
              <CardContent className="p-4">
                <ProjectMeta
                  title={project.title}
                  summary={project.summary}
                  tags={project.tags}
                  author={project.author_nickname}
                  likes={project.like_count}
                  comments={project.comment_count}
                />
              </CardContent>
            </Card>
          ))
          )}
        </div>
      </main>
    </div>
  )
}
