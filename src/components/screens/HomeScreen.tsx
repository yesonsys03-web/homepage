import { useEffect, useState, type CSSProperties } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ProjectCoverPlaceholder } from "@/components/ProjectCoverPlaceholder"
import { LogoSplitHeading } from "@/components/LogoSplitHeading"
import { TopNav } from "@/components/TopNav"
import { HeroBanner } from "@/components/HeroBanner"
import { FilterChips } from "@/components/FilterChips"
import { ProjectMeta } from "@/components/ProjectMeta"
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
            seedKey={project.id}
            title={project.title}
            summary={project.summary}
            description={project.description}
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
  )
}

const filterChipItems = [
  { id: "전체", label: "전체" },
  { id: "Web", label: "Web" },
  { id: "App", label: "App" },
  { id: "AI", label: "AI" },
  { id: "Tool", label: "Tool" },
  { id: "Game", label: "Game" },
  { id: "和学习", label: "和学习" },
]

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
      <TopNav active="home" onNavigate={onNavigate} />

      <HeroBanner
        title={
          <LogoSplitHeading
            as="h2"
            className="w-full font-display text-5xl md:text-6xl font-bold text-[#F4F7FF] mb-6 text-left"
            line1="완성도보다 바이브."
            line2="실험도 작품이다."
            line2ClassName="text-[#23D5AB]"
          />
        }
        description={
          <>
            바이브코더들의 놀이터에서 당신의 작품을 공유하고,<br />
            서로의 바이브를 피드백하세요.
          </>
        }
        cta={
          <Button
            size="lg"
            onClick={() => onNavigate?.("explore")}
            className="reveal-up bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] text-lg px-8 py-6 duration-100"
            style={{ "--reveal-delay": "220ms" } as CSSProperties}
          >
            지금 시작하기
          </Button>
        }
        background={
          <>
            <picture className="absolute inset-0">
              <source media="(max-width: 767px)" srcSet={heroMobileImage} />
              <source media="(max-width: 1279px)" srcSet={heroTabletImage} />
              <img src={heroMasterImage} alt="" aria-hidden="true" className="h-full w-full object-cover opacity-70" />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B1020]/39 via-[#0B1020]/35 to-[#111936]/28" />
            <div className="hero-orb absolute -left-24 top-6 h-64 w-64 rounded-full bg-[#23D5AB]/20 blur-3xl" />
            <div className="hero-orb absolute -right-20 bottom-4 h-56 w-56 rounded-full bg-[#FF5D8F]/20 blur-3xl" style={{ animationDelay: "-2s" }} />
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
          </>
        }
      />

      <section className="py-8 px-4 border-y border-[#111936]">
        <div className="max-w-7xl mx-auto">
          <h3 className="font-display text-lg font-semibold text-[#F4F7FF] mb-4 flex items-center gap-2">
            <span className="text-[#FF5D8F]">🔥</span> Trending This Week
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {projects.filter(p => p.isHot).slice(0, 6).map((project, index) => (
              <div key={project.id} className="reveal-up flex-shrink-0 w-48" style={{ "--reveal-delay": `${Math.min(index, 5) * 70}ms` } as CSSProperties}>
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
            <FilterChips items={filterChipItems} value={filter} onChange={setFilter} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={`home-skeleton-${idx}`} className="rounded-xl bg-[#161F42] border border-[#111936] overflow-hidden animate-pulse">
                  <div className="aspect-video bg-[#111936]" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-[#111936] rounded w-2/3" />
                    <div className="h-3 bg-[#111936] rounded w-full" />
                    <div className="h-3 bg-[#111936] rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <div key={project.id} className="reveal-up" style={{ "--reveal-delay": `${Math.min(index, 8) * 45}ms` } as CSSProperties}>
                  <ProjectCard project={project} index={index} onOpenProject={onOpenProject} />
                </div>
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
