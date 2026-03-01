import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectCoverPlaceholder } from "@/components/ProjectCoverPlaceholder"
import { api, type Project, type Comment } from "@/lib/api"
import { useAuth } from "@/lib/use-auth"
type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'challenges' | 'about'

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
  projectId?: string
  onEditProject?: (projectId: string) => void
}


// 샘플 데이터 (API 실패 시 사용)
const sampleProject: Project = {
  id: "1",
  title: "AI Music Generator",
  summary: "AI를 활용하여 음악을 생성하는 도구입니다.",
  description: `이 프로젝트는 AI를 활용하여 사용자가 간단한 프롬프트만으로 나만의 음악을 생성할 수 있게 해줍니다.

## 주요 기능
- 텍스트 기반 음악 생성
- 다양한 장르 지원
- 실시간 미리보기
- 결과물 다운로드

## 사용 기술
- React + TypeScript
- Python (FastAPI)
- OpenAI API
- WaveNet`,
  thumbnail_url: undefined,
  demo_url: "https://example.com",
  repo_url: "https://github.com/example",
  platform: "Web",
  tags: ["AI", "Music", "Web"],
  author_id: "1",
  author_nickname: "devkim",
  like_count: 128,
  comment_count: 32,
  created_at: "2026-02-25T10:00:00Z",
  updated_at: "2026-02-25T10:00:00Z",
}

export function ProjectDetailScreen({ onNavigate, projectId, onEditProject }: ScreenProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [commentText, setCommentText] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const targetProjectId = projectId ?? "1"
  const { user } = useAuth()

  useEffect(() => {
    const fetchData = async () => {
      const hasProjectCache = api.hasProjectDetailCache(targetProjectId)
      const hasCommentsCache = api.hasCommentsCache(targetProjectId)
      if (!(hasProjectCache && hasCommentsCache)) {
        setLoading(true)
      }

      const applyProject = (projectData: Project) => {
        setProject(projectData)
        setLikeCount(projectData.like_count)
      }

      const applyComments = (commentsData: { items: Comment[] }) => {
        setComments(commentsData.items || [])
      }

      try {
        const [projectData, commentsData] = await Promise.all([
          api.getProject(targetProjectId, { onRevalidate: applyProject }),
          api.getComments(targetProjectId, "latest", { onRevalidate: applyComments }),
        ])
        applyProject(projectData)
        applyComments(commentsData)
      } catch (error) {
        // 실패 시 샘플 데이터 사용
        console.error("API failed, using sample data:", error)
        setProject(sampleProject)
        setLikeCount(sampleProject.like_count)
        setComments([
          { id: "1", project_id: targetProjectId, author_id: "5", author_nickname: "coder01", content: "정말 amazing해요! 어떻게 만드셨나요?", like_count: 12, status: "visible", created_at: "2026-02-21T10:00:00Z" },
          { id: "2", project_id: targetProjectId, author_id: "6", author_nickname: "musicfan", content: "음악 생성이 이렇게 쉽게 될 줄이야...", like_count: 8, status: "visible", created_at: "2026-02-21T11:00:00Z" },
          { id: "3", project_id: targetProjectId, author_id: "7", author_nickname: "aidev", content: "코드 공개해주실 수 있나요?", like_count: 5, status: "visible", created_at: "2026-02-21T12:00:00Z" },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [targetProjectId])

  const handleLike = async () => {
    try {
      if (liked) {
        const result = await api.unlikeProject(targetProjectId)
        setLikeCount(result.like_count)
      } else {
        const result = await api.likeProject(targetProjectId)
        setLikeCount(result.like_count)
      }
      setLiked(!liked)
    } catch (error) {
      console.error("Like failed:", error)
    }
  }

  const handleCommentSubmit = async () => {
    const content = commentText.trim()
    if (!content || isSubmittingComment) return

    if (!user) {
      alert("댓글 작성은 로그인 후 이용할 수 있습니다.")
      onNavigate?.("login")
      return
    }

    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      project_id: targetProjectId,
      author_id: user.id,
      author_nickname: user.nickname,
      content,
      like_count: 0,
      status: "visible",
      created_at: new Date().toISOString(),
    }

    setComments((prev) => [optimisticComment, ...prev])
    setCommentText("")
    setIsSubmittingComment(true)

    try {
      await api.createComment(targetProjectId, content)
      const commentsData = await api.getComments(targetProjectId, "latest", { force: true })
      setComments(commentsData.items || [])
    } catch (error) {
      console.error("Comment failed:", error)
      setComments((prev) => prev.filter((comment) => comment.id !== optimisticComment.id))
      setCommentText(content)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  useEffect(() => {
    if (!shareCopied) return
    const timer = window.setTimeout(() => {
      setShareCopied(false)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [shareCopied])

  if (loading || !project) {
    return (
      <div className="min-h-screen bg-[#0B1020] flex items-center justify-center">
        <p className="text-[#B8C3E6]">로딩 중...</p>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const canEditProject = !!user && (user.role === "admin" || user.id === project.author_id)

  const shareUrl = `${window.location.origin}${window.location.pathname}?project=${targetProjectId}`

  const copyShareUrl = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl)
      return
    }
    const textarea = document.createElement("textarea")
    textarea.value = shareUrl
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    document.execCommand("copy")
    document.body.removeChild(textarea)
  }

  const handleShare = async (
    channel: "native" | "copy" | "x" | "facebook" | "linkedin" | "threads" | "instagram" | "kakao"
  ) => {
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedTitle = encodeURIComponent(project.title)
    const encodedSummary = encodeURIComponent(project.summary)

    try {
      if (channel === "native") {
        if (navigator.share) {
          await navigator.share({ title: project.title, text: project.summary, url: shareUrl })
          setShareMenuOpen(false)
          return
        }
        await copyShareUrl()
        setShareCopied(true)
        return
      }

      if (channel === "copy") {
        await copyShareUrl()
        setShareCopied(true)
        return
      }

      if (channel === "instagram") {
        await copyShareUrl()
        setShareCopied(true)
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer")
        return
      }

      if (channel === "kakao") {
        if (navigator.share) {
          await navigator.share({ title: project.title, text: `${project.title}\n${shareUrl}`, url: shareUrl })
          setShareMenuOpen(false)
          return
        }
        await copyShareUrl()
        setShareCopied(true)
        window.open("https://story.kakao.com/share", "_blank", "noopener,noreferrer")
        return
      }

      const shareMap = {
        x: `https://x.com/intent/tweet?text=${encodedTitle}%20-%20${encodedSummary}&url=${encodedUrl}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        threads: `https://www.threads.net/intent/post?text=${encodedTitle}%20-%20${encodedSummary}%20${encodedUrl}`,
      }
      window.open(shareMap[channel], "_blank", "noopener,noreferrer,width=620,height=700")
    } catch (error) {
      console.error("Share failed:", error)
      alert("공유에 실패했습니다.")
    }
  }

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
        {/* Project Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="font-display text-4xl font-bold text-[#F4F7FF] mb-2">{project.title}</h1>
              <div className="flex items-center gap-4 text-[#B8C3E6]">
                <span>by <strong className="text-[#F4F7FF]">{project.author_nickname}</strong></span>
                <span>•</span>
                <span>{formatDate(project.created_at)}</span>
                <Badge variant="secondary" className="bg-[#111936] text-[#B8C3E6]">{project.platform}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {canEditProject ? (
                <Button
                  variant="outline"
                  className="border-[#23D5AB] text-[#23D5AB] hover:bg-[#23D5AB]/10"
                  onClick={() => onEditProject?.(targetProjectId)}
                >
                  수정
                </Button>
              ) : null}
              <Button 
                variant="outline" 
                onClick={handleLike}
                className={`border-[#111936] ${liked ? "bg-[#FF5D8F] text-white" : "text-[#B8C3E6] hover:bg-[#161F42] hover:text-[#F4F7FF]"}`}
              >
                ❤️ {likeCount}
              </Button>
              <Button variant="outline" className="border-[#111936] text-[#B8C3E6] hover:bg-[#161F42] hover:text-[#F4F7FF]">
                💬 {comments.length}
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  className="border-[#111936] text-[#B8C3E6] hover:bg-[#161F42] hover:text-[#F4F7FF]"
                  onClick={() => setShareMenuOpen((prev) => !prev)}
                >
                  공유
                </Button>
                {shareMenuOpen ? (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[#111936] bg-[#111936] p-2 shadow-lg z-20">
                    <button
                      onClick={() => void handleShare("native")}
                      className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]"
                    >
                      기기 공유
                    </button>
                    <button
                      onClick={() => void handleShare("copy")}
                      className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]"
                    >
                      {shareCopied ? "링크 복사됨" : "링크 복사"}
                    </button>
                    <button
                      onClick={() => void handleShare("x")}
                      className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]"
                    >
                      X 공유
                    </button>
                    <button
                      onClick={() => void handleShare("threads")}
                      className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]"
                    >
                      Threads 공유
                    </button>
                    <button
                      onClick={() => void handleShare("facebook")}
                      className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]"
                    >
                      Facebook 공유
                    </button>
                    <button
                      onClick={() => void handleShare("linkedin")}
                      className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]"
                    >
                      LinkedIn 공유
                    </button>
                    <button
                      onClick={() => void handleShare("instagram")}
                      className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]"
                    >
                      Instagram 공유
                    </button>
                    <button
                      onClick={() => void handleShare("kakao")}
                      className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]"
                    >
                      KakaoTalk 공유
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="bg-[#161F42] text-[#B8C3E6]">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Media Area */}
        <div className="aspect-video bg-gradient-to-br from-[#161F42] to-[#0B1020] rounded-xl mb-8 flex items-center justify-center">
          {project.thumbnail_url ? (
            <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover rounded-xl" />
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
              size="detail"
              className="rounded-xl"
            />
          )}
        </div>

        {/* External Links */}
        <div className="flex gap-4 mb-8">
          {project.demo_url && (
            <Button 
              className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020]"
              onClick={() => window.open(project.demo_url, "_blank")}
            >
              🎮 Demo 보기
            </Button>
          )}
          {project.repo_url && (
            <Button 
              variant="outline" 
              className="border-[#111936] text-[#B8C3E6] hover:bg-[#161F42] hover:text-[#F4F7FF]"
              onClick={() => window.open(project.repo_url, "_blank")}
            >
              📂 GitHub
            </Button>
          )}
        </div>

        {/* Description Tabs */}
        <Tabs defaultValue="description" className="mb-8">
          <TabsList className="bg-[#161F42] border-0">
            <TabsTrigger value="description" className="data-[state=active]:bg-[#23D5AB] data-[state=active]:text-[#0B1020]">작품 설명</TabsTrigger>
            <TabsTrigger value="tech" className="data-[state=active]:bg-[#23D5AB] data-[state=active]:text-[#0B1020]">사용 기술</TabsTrigger>
            <TabsTrigger value="review" className="data-[state=active]:bg-[#23D5AB] data-[state=active]:text-[#0B1020]">후기</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-4">
            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-6">
                <p className="text-[#F4F7FF] whitespace-pre-line">{project.description}</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tech" className="mt-4">
            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-6">
                <p className="text-[#F4F7FF]">{project.description}</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="review" className="mt-4">
            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-6">
                <p className="text-[#B8C3E6]">아직 후기가 없습니다.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Comment Section */}
        <section>
          <h3 className="font-display text-xl font-semibold text-[#F4F7FF] mb-4">
            댓글 {comments.length}
          </h3>
          
          {/* Comment Input */}
          <div className="mb-6">
            <p className="text-sm text-[#B8C3E6] mb-2">좋 있었던 포인트 한 가지를 남겨보세요</p>
            <p className="text-xs text-[#B8C3E6] mb-3">존중 기반 피드백만 허용</p>
            <textarea 
              className="w-full bg-[#161F42] border border-[#111936] rounded-lg p-4 text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:outline-none focus:ring-2 focus:ring-[#23D5AB]"
              rows={4}
              placeholder={user ? "댓글을 입력하세요..." : "로그인 후 댓글을 작성할 수 있습니다."}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={!user}
            />
            {!user ? (
              <p className="text-xs text-[#FFB547] mt-2">댓글 작성은 로그인 후 가능합니다.</p>
            ) : null}
            <Button 
              className="mt-2 bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020]"
              onClick={handleCommentSubmit}
              disabled={isSubmittingComment || !user}
            >
              {isSubmittingComment ? "작성 중..." : user ? "댓글 작성" : "로그인 필요"}
            </Button>
          </div>

          {/* Comment List */}
          <div className="space-y-4">
            {comments.map(comment => (
              <Card key={comment.id} className="bg-[#161F42] border-0">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <strong className="text-[#F4F7FF]">{comment.author_nickname}</strong>
                      <span className="text-[#B8C3E6] text-sm ml-2">{formatDate(comment.created_at)}</span>
                    </div>
                    <button className="text-[#B8C3E6] hover:text-[#FF6B6B] text-sm">
                      신고
                    </button>
                  </div>
                  <p className="text-[#F4F7FF]">{comment.content}</p>
                  <button className="text-[#B8C3E6] text-sm mt-2 hover:text-[#23D5AB]">
                    ❤️ {comment.like_count}
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
