import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectCoverPlaceholder } from "@/components/ProjectCoverPlaceholder"
import { TopNav } from "@/components/TopNav"
import { CommentComposer } from "@/components/CommentComposer"
import { CommentList } from "@/components/CommentList"
import { ReportModal } from "@/components/ReportModal"
import { Toast } from "@/components/Toast"
import { api, type Project, type Comment } from "@/lib/api"
import { isAdminRole } from "@/lib/roles"
import { useAuth } from "@/lib/use-auth"
type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'challenges' | 'about'

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
  projectId?: string
  onEditProject?: (projectId: string) => void
}

export function ProjectDetailScreen({ onNavigate, projectId, onEditProject }: ScreenProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [commentText, setCommentText] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [reportCommentId, setReportCommentId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastTone, setToastTone] = useState<"info" | "success" | "error">("info")
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const targetProjectId = projectId ?? null
  const { user } = useAuth()

  useEffect(() => {
    if (!targetProjectId) {
      setProject(null)
      setComments([])
      setLoading(false)
      setLoadError("프로젝트 ID가 없습니다. 목록에서 프로젝트를 다시 선택해 주세요.")
      return
    }

    const resolvedProjectId: string = targetProjectId

    const fetchData = async () => {
      setLoadError(null)
      const hasProjectCache = api.hasProjectDetailCache(resolvedProjectId)
      const hasCommentsCache = api.hasCommentsCache(resolvedProjectId)
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
          api.getProject(resolvedProjectId, { onRevalidate: applyProject }),
          api.getComments(resolvedProjectId, "latest", { onRevalidate: applyComments }),
        ])
        applyProject(projectData)
        applyComments(commentsData)
      } catch (error) {
        console.error("Failed to load project detail:", error)
        setProject(null)
        setComments([])
        setLoadError("프로젝트 정보를 불러오지 못했습니다.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [targetProjectId])

  const handleLike = async () => {
    if (!project) return

    try {
      if (liked) {
        const result = await api.unlikeProject(project.id)
        setLikeCount(result.like_count)
      } else {
        const result = await api.likeProject(project.id)
        setLikeCount(result.like_count)
      }
      setLiked(!liked)
    } catch (error) {
      console.error("Like failed:", error)
    }
  }

  const handleCommentSubmit = async () => {
    if (!project) return

    const content = commentText.trim()
    if (!content || isSubmittingComment) return

    const softBlockedWords = ["병신", "멍청", "쓰레기", "죽어", "혐오"]
    const hasSoftBlockedWord = softBlockedWords.some((word) => content.includes(word))
    if (hasSoftBlockedWord) {
      const proceed = window.confirm("공격적으로 보일 수 있는 표현이 포함되어 있어요. 이대로 제출할까요?")
      if (!proceed) return
    }

    if (!user) {
      alert("댓글 작성은 로그인 후 이용할 수 있습니다.")
      onNavigate?.("login")
      return
    }

    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      project_id: project.id,
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
      await api.createComment(project.id, content)
      const commentsData = await api.getComments(project.id, "latest", { force: true })
      setComments(commentsData.items || [])
    } catch (error) {
      console.error("Comment failed:", error)
      setComments((prev) => prev.filter((comment) => comment.id !== optimisticComment.id))
      setCommentText(content)
      setToastTone("error")
      setToastMessage("댓글 등록에 실패했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleReportComment = async (commentId: string, reason: string) => {
    await api.reportComment(commentId, {
      target_type: "comment",
      target_id: commentId,
      reason,
    })
    setToastTone("success")
    setToastMessage("신고가 접수되었습니다.")
  }

  useEffect(() => {
    if (!shareCopied) return
    const timer = window.setTimeout(() => {
      setShareCopied(false)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [shareCopied])

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1020] px-4 py-10">
        <div className="max-w-7xl mx-auto animate-pulse space-y-4">
          <div className="h-10 w-1/2 bg-[#111936] rounded" />
          <div className="h-4 w-1/3 bg-[#111936] rounded" />
          <div className="aspect-video bg-[#111936] rounded-xl" />
          <div className="h-24 bg-[#111936] rounded-xl" />
          <div className="h-24 bg-[#111936] rounded-xl" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0B1020] px-4 py-10">
        <div className="mx-auto max-w-xl rounded-xl border border-[#111936] bg-[#161F42] p-6 text-center">
          <h2 className="text-xl font-semibold text-[#F4F7FF]">프로젝트를 찾을 수 없습니다</h2>
          <p className="mt-2 text-sm text-[#B8C3E6]">{loadError ?? "요청한 프로젝트를 불러올 수 없습니다."}</p>
          <Button
            type="button"
            className="mt-4 bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
            onClick={() => onNavigate?.("home")}
          >
            홈으로 이동
          </Button>
        </div>
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

  const canEditProject = !!user && (isAdminRole(user.role) || user.id === project.author_id)

  const shareUrl = `${window.location.origin}${window.location.pathname}?project=${project.id}`

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
      <TopNav active="home" onNavigate={onNavigate} />

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
                  onClick={() => onEditProject?.(project.id)}
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
            <img src={project.thumbnail_url} alt={project.title} loading="lazy" decoding="async" className="w-full h-full object-cover rounded-xl" />
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
          
          <CommentComposer
            value={commentText}
            onChange={setCommentText}
            onSubmit={() => void handleCommentSubmit()}
            disabled={!user}
            isSubmitting={isSubmittingComment}
          />

          <CommentList
            comments={comments}
            onReport={(commentId) => setReportCommentId(commentId)}
            formatDate={formatDate}
          />
        </section>
      </main>

      <ReportModal
        open={!!reportCommentId}
        onClose={() => setReportCommentId(null)}
        onSubmit={async (reason) => {
          if (!reportCommentId) return
          await handleReportComment(reportCommentId, reason)
        }}
      />

      {toastMessage ? <Toast message={toastMessage} tone={toastTone} /> : null}
    </div>
  )
}
