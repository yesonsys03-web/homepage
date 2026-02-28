import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/use-auth"
type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'challenges' | 'about'

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
}


interface Project {
  id: string
  title: string
  summary: string
  thumbnail: string
  likes: number
  comments: number
  createdAt: string
}

const myComments = [
  { id: "1", projectTitle: "AI Music Generator", content: "정말 amazing해요!", likes: 5, createdAt: "1시간 전" },
  { id: "2", projectTitle: "React Dashboard", content: "디자인이很漂亮", likes: 3, createdAt: "3시간 전" },
]

const likedProjects = [
  { id: "4", title: "Three.js Game", summary: "3D 브라우저 게임", thumbnail: "/placeholder.jpg", likes: 156, comments: 42, createdAt: "2026-02-18" },
  { id: "5", title: "Chat App", summary: "실시간 채팅 앱", thumbnail: "/placeholder.jpg", likes: 92, comments: 28, createdAt: "2026-02-12" },
]

export function ProfileScreen({ onNavigate }: ScreenProps) {
  const { user } = useAuth()
  const [myProjects, setMyProjects] = useState<Project[]>([])

  useEffect(() => {
    const fetchMyProjects = async () => {
      try {
        const data = await api.getMyProjects()
        const items = Array.isArray(data.items) ? data.items : []
        const mapped: Project[] = items.map((item: {
          id: string
          title: string
          summary: string
          thumbnail_url?: string
          like_count: number
          comment_count: number
          created_at: string
        }) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          thumbnail: item.thumbnail_url || "/placeholder.jpg",
          likes: item.like_count,
          comments: item.comment_count,
          createdAt: item.created_at,
        }))
        setMyProjects(mapped)
      } catch (error) {
        console.error("Failed to fetch my projects:", error)
        setMyProjects([])
      }
    }

    fetchMyProjects()
  }, [])

  return (
    <div className="min-h-screen bg-[#0B1020]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-[#0B1020]/95 backdrop-blur-sm border-b border-[#111936]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">VibeCoder</h1>
          <nav className="flex gap-6">
            <button onClick={() => onNavigate?.('home')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Home</button>
            <button onClick={() => onNavigate?.('explore')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Explore</button>
            <button onClick={() => onNavigate?.('challenges')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Challenges</button>
            <button onClick={() => onNavigate?.('about')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">About</button>
          </nav>
          <Button 
            className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] font-semibold"
            onClick={() => onNavigate?.('submit')}
          >
            작품 올리기
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex items-start gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#23D5AB] to-[#FF5D8F] flex items-center justify-center text-3xl font-bold text-[#0B1020]">
            {user?.nickname?.slice(0, 1).toUpperCase() || "U"}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold text-[#F4F7FF] mb-1">{user?.nickname || "사용자"}</h1>
            <p className="text-[#B8C3E6] mb-3">{user?.email || ""}</p>
            <div className="flex gap-4 text-sm text-[#B8C3E6]">
              <span><strong className="text-[#F4F7FF]">{myProjects.length}</strong> 작품</span>
              <span><strong className="text-[#F4F7FF]">12</strong> 댓글</span>
              <span><strong className="text-[#F4F7FF]">{myProjects.reduce((acc, cur) => acc + cur.likes, 0)}</strong> 좋아요</span>
            </div>
          </div>
          <Button variant="outline" className="border-[#111936] text-[#B8C3E6] hover:bg-[#161F42] hover:text-[#F4F7FF]">
            프로필 편집
          </Button>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-[#161F42] border-0">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-[#23D5AB]">150</div>
              <div className="text-sm text-[#B8C3E6]">활동 점수</div>
            </CardContent>
          </Card>
          <Card className="bg-[#161F42] border-0">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-[#FFB547]">🥉</div>
              <div className="text-sm text-[#B8C3E6]">브론즈 창작자</div>
            </CardContent>
          </Card>
          <Card className="bg-[#161F42] border-0">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-[#FF5D8F]">2</div>
              <div className="text-sm text-[#B8C3E6]">주간 연속 활동</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="projects">
          <TabsList className="bg-[#161F42] border-0 mb-6">
            <TabsTrigger value="projects" className="data-[state=active]:bg-[#23D5AB] data-[state=active]:text-[#0B1020]">작품</TabsTrigger>
            <TabsTrigger value="comments" className="data-[state=active]:bg-[#23D5AB] data-[state=active]:text-[#0B1020]">댓글</TabsTrigger>
            <TabsTrigger value="liked" className="data-[state=active]:bg-[#23D5AB] data-[state=active]:text-[#0B1020]">좋아요</TabsTrigger>
            {user?.role === "admin" && (
              <TabsTrigger value="admin" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-[#0B1020]">⚠️ 관리자</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="projects">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myProjects.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="comments">
            <div className="space-y-4">
              {myComments.map(comment => (
                <Card key={comment.id} className="bg-[#161F42] border-0">
                  <CardContent className="p-4">
                    <div className="text-sm text-[#B8C3E6] mb-1">{comment.projectTitle}에 남긴 댓글</div>
                    <p className="text-[#F4F7FF]">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-[#B8C3E6]">
                      <span>❤️ {comment.likes}</span>
                      <span>{comment.createdAt}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="liked">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {likedProjects.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} />
              ))}
            </div>
          </TabsContent>

          {user?.role === "admin" && (
            <TabsContent value="admin">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <Card 
      className="group relative bg-[#161F42] border-0 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:rotate-1"
      style={{ 
        transform: `rotate(${(index % 3 - 1) * 1}deg)`,
      }}
    >
      <div className="aspect-video bg-gradient-to-br from-[#111936] to-[#0B1020] flex items-center justify-center">
        <span className="text-[#B8C3E6] text-sm">Thumbnail</span>
      </div>
      <CardContent className="p-4">
        <h3 className="font-display text-lg font-semibold text-[#F4F7FF] mb-1 truncate">{project.title}</h3>
        <p className="text-sm text-[#B8C3E6] mb-3 line-clamp-2">{project.summary}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#B8C3E6]">{project.createdAt}</span>
          <div className="flex gap-3 text-[#B8C3E6]">
            <span>❤️ {project.likes}</span>
            <span>💬 {project.comments}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AdminPanel() {
  const reports = [
    { id: "1", type: "댓글", content: "不当한 内容", status: "open", reporter: "user1", createdAt: "1시간 전" },
    { id: "2", type: "작품", content: "스팸 작품", status: "reviewing", reporter: "user2", createdAt: "3시간 전" },
    { id: "3", type: "댓글", content: "광고", status: "resolved", reporter: "user3", createdAt: "1일 전" },
  ]

  return (
    <div className="space-y-6">
      <h3 className="font-display text-xl font-semibold text-[#F4F7FF]">신고 관리</h3>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-[#161F42] border-0">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#FF6B6B]">5</div>
            <div className="text-sm text-[#B8C3E6]">미처리 신고</div>
          </CardContent>
        </Card>
        <Card className="bg-[#161F42] border-0">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#FFB547]">2</div>
            <div className="text-sm text-[#B8C3E6]">검토 중</div>
          </CardContent>
        </Card>
        <Card className="bg-[#161F42] border-0">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#23D5AB]">12</div>
            <div className="text-sm text-[#B8C3E6]">이번 주 처리</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {reports.map(report => (
          <Card key={report.id} className="bg-[#161F42] border-0">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <Badge variant={report.status === "open" ? "destructive" : report.status === "reviewing" ? "secondary" : "default"}>
                    {report.status === "open" ? "미처리" : report.status === "reviewing" ? "검토중" : "처리완료"}
                  </Badge>
                  <span className="ml-2 text-[#B8C3E6] text-sm">{report.type}</span>
                </div>
                <span className="text-[#B8C3E6] text-sm">{report.createdAt}</span>
              </div>
              <p className="text-[#F4F7FF] mb-2">{report.content}</p>
              <p className="text-[#B8C3E6] text-sm">신고자: {report.reporter}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white">
                  숨기기
                </Button>
                <Button size="sm" variant="outline" className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]">
                  복구
                </Button>
                <Button size="sm" variant="outline" className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]">
                  제한
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
