import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProjectCoverPlaceholder } from "@/components/ProjectCoverPlaceholder"
import { api, type Project } from "@/lib/api"
import heroMasterImage from "../../../img/master.webp"
import heroTabletImage from "../../../img/master_tablet.webp"
import heroMobileImage from "../../../img/master_mobile.webp"

type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'challenges' | 'about'

interface HomeScreenProps {
  onNavigate?: (screen: Screen) => void
  onOpenProject?: (projectId: string) => void
}

interface ProjectWithMeta extends Project {
  isNew?: boolean
  isHot?: boolean
}

const HOT_PROJECT_THRESHOLD = 30

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

function ProjectCard({
  project,
  index,
  onOpenProject,
}: {
  project: ProjectWithMeta
  index: number
  onOpenProject?: (projectId: string) => void
}) {
  return (
    <Card 
      className="group relative bg-[#161F42] border-0 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:rotate-1 hover:shadow-xl hover:shadow-[#23D5AB]/10 cursor-pointer"
      style={{ 
        transform: `rotate(${(index % 3 - 1) * 1.5}deg)`,
      }}
      onClick={() => onOpenProject?.(project.id)}
    >
      <StickerBadge type={project.isNew ? "new" : project.isHot ? "hot" : "new"} />
      <div className="aspect-video bg-gradient-to-br from-[#111936] to-[#0B1020] flex items-center justify-center overflow-hidden">
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
        ) : (
          <ProjectCoverPlaceholder
            title={project.title}
            summary={project.summary}
            platform={project.platform}
            tags={project.tags}
            likeCount={project.like_count}
            createdAt={project.created_at}
            isNew={project.isNew}
            isHot={project.isHot}
            size="card"
          />
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-display text-lg font-semibold text-[#F4F7FF] mb-1 truncate">{project.title}</h3>
        <p className="text-sm text-[#B8C3E6] mb-3 line-clamp-2">{project.summary}</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {project.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="bg-[#111936] text-[#B8C3E6] text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#B8C3E6]">by {project.author_nickname}</span>
          <div className="flex gap-3 text-[#B8C3E6]">
            <span>❤️ {project.like_count}</span>
            <span>💬 {project.comment_count}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const filterChips = ["전체", "Web", "App", "AI", "Tool", "Game", "和学习"]

export function HomeScreen({ onNavigate, onOpenProject }: HomeScreenProps) {
  const [projects, setProjects] = useState<ProjectWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<"latest" | "popular">("latest")
  const [filter, setFilter] = useState("전체")

  useEffect(() => {
    const fetchProjects = async () => {
      const params: { sort?: string; platform?: string } = { sort }
      if (filter !== "전체") {
        params.platform = filter
      }

      const hasCache = api.hasProjectsCache(params)
      if (!hasCache) {
        setLoading(true)
      }

      const applyProjects = (data: { items: Project[] }) => {
        const projectsWithMeta: ProjectWithMeta[] = (data.items || []).map((p: Project) => ({
          ...p,
          isNew: new Date(p.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          isHot: p.like_count >= HOT_PROJECT_THRESHOLD,
        }))
        setProjects(projectsWithMeta)
      }

      try {
        const data = await api.getProjects(params, { onRevalidate: applyProjects })
        applyProjects(data)
      } catch (error) {
        console.error("Failed to fetch projects:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [sort, filter])

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <header className="sticky top-0 z-50 bg-[#0B1020]/95 backdrop-blur-sm border-b border-[#111936]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">VibeCoder</h1>
          <nav className="flex gap-6">
            <button onClick={() => onNavigate?.('home')} className="text-[#23D5AB] font-medium">Home</button>
            <button onClick={() => onNavigate?.('explore')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Explore</button>
            <button onClick={() => onNavigate?.('challenges')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Challenges</button>
            <button onClick={() => onNavigate?.('about')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">About</button>
          </nav>
          <Button onClick={() => onNavigate?.('submit')} className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] font-semibold">
            작품 올리기
          </Button>
        </div>
      </header>

      <section className="relative py-20 px-4 overflow-hidden">
        <picture className="absolute inset-0">
          <source media="(max-width: 767px)" srcSet={heroMobileImage} />
          <source media="(max-width: 1279px)" srcSet={heroTabletImage} />
          <img
            src={heroMasterImage}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover opacity-70"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B1020]/39 via-[#0B1020]/35 to-[#111936]/28" />
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center">
          <h2 className="w-full font-display text-5xl md:text-6xl font-bold text-[#F4F7FF] mb-6 text-left">
            완성도보다 바이브.<br />
            <span className="text-[#23D5AB]">실험도 작품이다.</span>
          </h2>
          <Button size="lg" onClick={() => onNavigate?.('explore')} className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] text-lg px-8 py-6">
            지금 시작하기
          </Button>
          <p className="text-xl text-[#B8C3E6] mt-8 max-w-2xl text-center">
            바이브코더들의 놀이터에서 당신의 작품을 공유하고,<br />
            서로의 바이브를 피드백하세요.
          </p>
        </div>
      </section>

      <section className="py-8 px-4 border-y border-[#111936]">
        <div className="max-w-7xl mx-auto">
          <h3 className="font-display text-lg font-semibold text-[#F4F7FF] mb-4 flex items-center gap-2">
            <span className="text-[#FF5D8F]">🔥</span> Trending This Week
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {projects.filter(p => p.isHot).slice(0, 6).map(project => (
              <div key={project.id} className="flex-shrink-0 w-48">
                <div className="aspect-video bg-[#161F42] rounded-lg mb-2" />
                <p className="text-sm text-[#F4F7FF] truncate">{project.title}</p>
                <p className="text-xs text-[#B8C3E6]">❤️ {project.like_count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2 mb-6 flex-wrap">
            {filterChips.map(chip => (
              <button
                key={chip}
                onClick={() => setFilter(chip)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === chip
                    ? "bg-[#23D5AB] text-[#0B1020]" 
                    : "bg-[#161F42] text-[#B8C3E6] hover:bg-[#111936] hover:text-[#F4F7FF]"
                }`}
              >
                {chip}
              </button>
            ))}
            <select 
              value={sort}
              onChange={(e) => setSort(e.target.value as "latest" | "popular")}
              className="ml-auto px-4 py-2 rounded-full text-sm font-medium bg-[#161F42] text-[#B8C3E6] border-0"
            >
              <option value="latest">최신순</option>
              <option value="popular">인기순</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-20 text-[#B8C3E6]">로딩 중...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} onOpenProject={onOpenProject} />
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-[#111936]">
        <div className="max-w-7xl mx-auto text-center text-[#B8C3E6]">
          <p>© 2026 VibeCoder Playground. Made with ❤️ byバイブコダー</p>
        </div>
      </footer>
    </div>
  )
}
