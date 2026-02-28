import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProjectCoverPlaceholder } from "@/components/ProjectCoverPlaceholder"
import { api, type Project } from "@/lib/api"

type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'challenges' | 'about'

const HOT_PROJECT_THRESHOLD = 30

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
  onOpenProject?: (projectId: string) => void
}

const categories = [
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

  useEffect(() => {
    const fetchProjects = async () => {
      const params: { sort?: string; platform?: string } = { sort }
      if (category !== "all") {
        params.platform = category
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
      <header className="sticky top-0 z-50 bg-[#0B1020]/95 backdrop-blur-sm border-b border-[#111936]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">VibeCoder</h1>
          <nav className="flex gap-6">
            <button onClick={() => onNavigate?.('home')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Home</button>
            <button onClick={() => onNavigate?.('explore')} className="text-[#23D5AB] font-medium">Explore</button>
            <button onClick={() => onNavigate?.('challenges')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Challenges</button>
            <button onClick={() => onNavigate?.('about')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">About</button>
          </nav>
          <Button onClick={() => onNavigate?.('submit')} className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] font-semibold">
            작품 올리기
          </Button>
        </div>
      </header>

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
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                cat.id === category
                  ? "bg-[#23D5AB] text-[#0B1020]"
                  : "bg-[#161F42] text-[#B8C3E6] hover:bg-[#1f2a52]"
              }`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="text-[#B8C3E6]">로딩 중...</div>
          ) : (
            projects.map((project) => (
            <Card key={project.id} onClick={() => onOpenProject?.(project.id)} className="bg-[#161F42] border-[#111936] overflow-hidden hover:border-[#23D5AB]/50 transition-colors cursor-pointer">
              <div className="aspect-video bg-gradient-to-br from-[#161F42] to-[#0B1020] flex items-center justify-center">
                {project.thumbnail_url ? (
                  <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
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
                <div className="flex gap-2 mb-2">
                  {project.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-[#0B1020] text-[#B8C3E6] text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <h3 className="font-display font-bold text-[#F4F7FF] mb-1">{project.title}</h3>
                <p className="text-[#B8C3E6] text-sm mb-3 line-clamp-2">{project.summary}</p>
                <div className="flex items-center justify-between text-sm text-[#B8C3E6]">
                  <span>by {project.author_nickname}</span>
                  <div className="flex gap-3">
                    <span>❤️ {project.like_count}</span>
                    <span>💬 {project.comment_count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </div>
      </main>
    </div>
  )
}
