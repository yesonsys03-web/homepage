import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'challenges' | 'about'

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
}

interface Project {
  id: string
  title: string
  summary: string
  thumbnail_url: string | null
  demo_url: string | null
  repo_url: string | null
  platform: string
  tags: string[]
  author_nickname: string
  like_count: number
  comment_count: number
  created_at: string
}

// 샘플 데이터
const trendingProjects: Project[] = [
  {
    id: "1",
    title: "AI Music Generator",
    summary: "AI로 나만의 음악을 생성하세요",
    thumbnail_url: null,
    demo_url: "https://example.com",
    repo_url: "https://github.com",
    platform: "Web",
    tags: ["AI", "Music"],
    author_nickname: "devkim",
    like_count: 128,
    comment_count: 32,
    created_at: "2026-02-20",
  },
  {
    id: "2",
    title: "Three.js Game",
    summary: "브라우저 3D 게임",
    thumbnail_url: null,
    demo_url: "https://example.com",
    repo_url: "https://github.com",
    platform: "Game",
    tags: ["Three.js", "3D"],
    author_nickname: "gamedev",
    like_count: 156,
    comment_count: 42,
    created_at: "2026-02-18",
  },
]

const categories = [
  { id: "all", label: "전체", count: 234 },
  { id: "web", label: "Web", count: 89 },
  { id: "game", label: "Game", count: 56 },
  { id: "tool", label: "Tool", count: 45 },
  { id: "ai", label: "AI", count: 44 },
  { id: "mobile", label: "Mobile", count: 23 },
]

export function ExploreScreen({ onNavigate }: ScreenProps) {
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
            <Button variant="outline" className="border-[#23D5AB] text-[#23D5AB] hover:bg-[#23D5AB]/10">
              🔥 Hot
            </Button>
            <Button variant="outline" className="border-[#B8C3E6] text-[#B8C3E6] hover:bg-[#B8C3E6]/10">
              🆕 New
            </Button>
            <Button variant="outline" className="border-[#B8C3E6] text-[#B8C3E6] hover:bg-[#B8C3E6]/10">
              🏆 Top
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                cat.id === "all"
                  ? "bg-[#23D5AB] text-[#0B1020]"
                  : "bg-[#161F42] text-[#B8C3E6] hover:bg-[#1f2a52]"
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingProjects.map((project) => (
            <Card key={project.id} className="bg-[#161F42] border-[#111936] overflow-hidden hover:border-[#23D5AB]/50 transition-colors cursor-pointer">
              <div className="aspect-video bg-gradient-to-br from-[#161F42] to-[#0B1020] flex items-center justify-center">
                {project.thumbnail_url ? (
                  <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <span className="text-[#23D5AB] text-xs font-bold">{project.platform.toUpperCase()}</span>
                    <h4 className="text-[#F4F7FF] font-display font-bold mt-2 line-clamp-2">{project.title}</h4>
                  </div>
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
          ))}
        </div>
      </main>
    </div>
  )
}
