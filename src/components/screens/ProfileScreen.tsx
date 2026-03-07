import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { TopNav } from "@/components/TopNav"
import { ProjectMeta } from "@/components/ProjectMeta"
import { api, type ProfileComment as ApiProfileComment } from "@/lib/api"
import { isAdminRole } from "@/lib/roles"
import { useAuth } from "@/lib/use-auth"
type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'playground' | 'glossary' | 'curated' | 'challenges' | 'about'

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

interface ProfileComment {
  id: string
  projectTitle: string
  content: string
  likes: number
  createdAt: string
}

const PROFILE_NICKNAME_MIN_LEN = 2
const PROFILE_NICKNAME_MAX_LEN = 24
const PROFILE_BIO_MAX_LEN = 300

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function ProfileScreen({ onNavigate }: ScreenProps) {
  const { user, updateUser } = useAuth()
  const [myProjects, setMyProjects] = useState<Project[]>([])
  const [myComments, setMyComments] = useState<ProfileComment[]>([])
  const [likedProjects, setLikedProjects] = useState<Project[]>([])
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarLoadError, setAvatarLoadError] = useState(false)
  const [draftAvatarLoadError, setDraftAvatarLoadError] = useState(false)
  const [profileDraft, setProfileDraft] = useState({
    nickname: "",
    bio: "",
    avatar_url: "",
  })
  const trimmedNickname = profileDraft.nickname.trim()
  const trimmedAvatarUrl = profileDraft.avatar_url.trim()
  const nicknameTooShort = trimmedNickname.length > 0 && trimmedNickname.length < PROFILE_NICKNAME_MIN_LEN
  const nicknameTooLong = trimmedNickname.length > PROFILE_NICKNAME_MAX_LEN
  const invalidAvatarUrl = trimmedAvatarUrl.length > 0 && !isValidHttpUrl(trimmedAvatarUrl)
  const bioTooLong = profileDraft.bio.length > PROFILE_BIO_MAX_LEN

  useEffect(() => {
    setProfileDraft({
      nickname: user?.nickname || "",
      bio: user?.bio || "",
      avatar_url: user?.avatar_url || "",
    })
    setAvatarLoadError(false)
    setDraftAvatarLoadError(false)
  }, [user])

  useEffect(() => {
    const mapProject = (item: {
      id: string
      title: string
      summary: string
      thumbnail_url?: string
      like_count: number
      comment_count: number
      created_at: string
    }): Project => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      thumbnail: item.thumbnail_url || "/placeholder.jpg",
      likes: item.like_count,
      comments: item.comment_count,
      createdAt: item.created_at,
    })

    const fetchProfileData = async () => {
      try {
        const [projectsData, commentsData, likedProjectsData] = await Promise.all([
          api.getMyProjects(),
          api.getMyComments(100),
          api.getMyLikedProjects(100),
        ])

        const projectItems = Array.isArray(projectsData.items) ? projectsData.items : []
        setMyProjects(projectItems.map(mapProject))

        const commentItems = Array.isArray(commentsData.items) ? commentsData.items : []
        setMyComments(
          commentItems.map((item: ApiProfileComment) => ({
            id: item.id,
            projectTitle: item.project_title,
            content: item.content,
            likes: item.like_count,
            createdAt: new Date(item.created_at).toLocaleString("ko-KR"),
          })),
        )

        const likedItems = Array.isArray(likedProjectsData.items) ? likedProjectsData.items : []
        setLikedProjects(likedItems.map(mapProject))
      } catch (error) {
        console.error("Failed to fetch profile data:", error)
        setMyProjects([])
        setMyComments([])
        setLikedProjects([])
      }
    }

    void fetchProfileData()
  }, [])

  const handleSaveProfile = async () => {
    if (!trimmedNickname) {
      alert("닉네임은 비어 있을 수 없습니다.")
      return
    }
    if (nicknameTooShort) {
      alert(`닉네임은 ${PROFILE_NICKNAME_MIN_LEN}자 이상이어야 합니다.`)
      return
    }
    if (nicknameTooLong) {
      alert(`닉네임은 ${PROFILE_NICKNAME_MAX_LEN}자를 초과할 수 없습니다.`)
      return
    }
    if (invalidAvatarUrl) {
      alert("아바타 URL은 http/https 형식이어야 합니다.")
      return
    }
    if (bioTooLong) {
      alert(`소개는 ${PROFILE_BIO_MAX_LEN}자를 초과할 수 없습니다.`)
      return
    }

    setProfileSaving(true)
    try {
      const updated = await api.updateMe({
        nickname: trimmedNickname,
        bio: profileDraft.bio.trim() || null,
        avatar_url: trimmedAvatarUrl || null,
      })
      updateUser(updated)
      setIsEditingProfile(false)
      alert("프로필이 수정되었습니다.")
    } catch (error) {
      console.error("Failed to update profile:", error)
      alert(error instanceof Error ? error.message : "프로필 수정에 실패했습니다.")
    } finally {
      setProfileSaving(false)
    }
  }

  const cancelProfileEdit = () => {
    setProfileDraft({
      nickname: user?.nickname || "",
      bio: user?.bio || "",
      avatar_url: user?.avatar_url || "",
    })
    setIsEditingProfile(false)
  }

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <TopNav active="home" onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex items-start gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#23D5AB] to-[#FF5D8F] flex items-center justify-center text-3xl font-bold text-[#0B1020] overflow-hidden">
            {user?.avatar_url && !avatarLoadError ? (
              <img
                src={user.avatar_url}
                alt={user.nickname}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={() => setAvatarLoadError(true)}
              />
            ) : (
              user?.nickname?.slice(0, 1).toUpperCase() || "U"
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold text-[#F4F7FF] mb-1">{user?.nickname || "사용자"}</h1>
            <p className="text-[#B8C3E6] mb-3">{user?.email || ""}</p>
            {user?.bio ? <p className="text-[#B8C3E6] mb-3">{user.bio}</p> : null}
            <div className="flex gap-4 text-sm text-[#B8C3E6]">
              <span><strong className="text-[#F4F7FF]">{myProjects.length}</strong> 작품</span>
              <span><strong className="text-[#F4F7FF]">{myComments.length}</strong> 댓글</span>
              <span><strong className="text-[#F4F7FF]">{likedProjects.reduce((acc, cur) => acc + cur.likes, 0)}</strong> 좋아요</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-[#111936] text-[#B8C3E6] hover:bg-[#161F42] hover:text-[#F4F7FF]"
            onClick={() => setIsEditingProfile(true)}
          >
            프로필 편집
          </Button>
        </div>

        {isEditingProfile ? (
          <Card className="bg-[#161F42] border-[#111936] mb-8">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-display text-xl font-semibold text-[#F4F7FF]">프로필 수정</h2>
              <div>
                <label className="block text-[#F4F7FF] text-sm mb-2">닉네임</label>
                <Input
                  value={profileDraft.nickname}
                  onChange={(e) => setProfileDraft((prev) => ({ ...prev, nickname: e.target.value }))}
                  maxLength={PROFILE_NICKNAME_MAX_LEN}
                  className="bg-[#111936] border-[#0B1020] text-[#F4F7FF]"
                />
                <p className={`text-xs mt-2 ${nicknameTooShort || nicknameTooLong ? "text-[#FF6B6B]" : "text-[#B8C3E6]"}`}>
                  {profileDraft.nickname.length}/{PROFILE_NICKNAME_MAX_LEN} · {PROFILE_NICKNAME_MIN_LEN}~{PROFILE_NICKNAME_MAX_LEN}자
                </p>
              </div>
              <div>
                <label className="block text-[#F4F7FF] text-sm mb-2">아바타 URL</label>
                <Input
                  value={profileDraft.avatar_url}
                  onChange={(e) => {
                    setDraftAvatarLoadError(false)
                    setProfileDraft((prev) => ({ ...prev, avatar_url: e.target.value }))
                  }}
                  placeholder="https://..."
                  className="bg-[#111936] border-[#0B1020] text-[#F4F7FF]"
                />
                <p className={`text-xs mt-2 ${invalidAvatarUrl ? "text-[#FF6B6B]" : "text-[#B8C3E6]"}`}>
                  {invalidAvatarUrl ? "http/https URL 형식이 필요합니다." : "http/https 링크를 입력하세요."}
                </p>
                {trimmedAvatarUrl && !invalidAvatarUrl ? (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#0B1020] border border-[#0B1020] overflow-hidden flex items-center justify-center text-[#B8C3E6] text-sm">
                      {!draftAvatarLoadError ? (
                        <img
                          src={trimmedAvatarUrl}
                          alt="avatar preview"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                          onError={() => setDraftAvatarLoadError(true)}
                        />
                      ) : (
                        "미리보기 실패"
                      )}
                    </div>
                    {draftAvatarLoadError ? (
                      <p className="text-xs text-[#FF6B6B]">이미지를 불러올 수 없습니다. URL을 다시 확인해 주세요.</p>
                    ) : (
                      <p className="text-xs text-[#B8C3E6]">아바타 미리보기</p>
                    )}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="block text-[#F4F7FF] text-sm mb-2">소개</label>
                <textarea
                  value={profileDraft.bio}
                  onChange={(e) => setProfileDraft((prev) => ({ ...prev, bio: e.target.value }))}
                  maxLength={PROFILE_BIO_MAX_LEN}
                  className="w-full bg-[#111936] border border-[#0B1020] rounded-md p-3 text-[#F4F7FF] min-h-[96px]"
                  placeholder="나를 한 줄로 소개해보세요"
                />
                <p className={`text-xs mt-2 ${bioTooLong ? "text-[#FF6B6B]" : "text-[#B8C3E6]"}`}>
                  {profileDraft.bio.length}/{PROFILE_BIO_MAX_LEN}
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                  onClick={cancelProfileEdit}
                  disabled={profileSaving}
                >
                  취소
                </Button>
                <Button
                  className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020]"
                  onClick={handleSaveProfile}
                  disabled={profileSaving || nicknameTooShort || nicknameTooLong || invalidAvatarUrl || bioTooLong}
                >
                  {profileSaving ? "저장 중..." : "저장"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

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
            {isAdminRole(user?.role) && (
              <TabsTrigger value="admin" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-[#0B1020]">⚠️ 관리자</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="projects">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myProjects.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} />
              ))}
            </div>
            {myProjects.length === 0 ? <p className="text-[#B8C3E6] text-sm">등록한 작품이 없습니다.</p> : null}
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
            {myComments.length === 0 ? <p className="text-[#B8C3E6] text-sm">작성한 댓글이 없습니다.</p> : null}
          </TabsContent>

          <TabsContent value="liked">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {likedProjects.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} />
              ))}
            </div>
            {likedProjects.length === 0 ? <p className="text-[#B8C3E6] text-sm">좋아요한 작품이 없습니다.</p> : null}
          </TabsContent>

          {isAdminRole(user?.role) && (
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
        <ProjectMeta
          title={project.title}
          summary={project.summary}
          tags={[]}
          author=""
          likes={project.likes}
          comments={project.comments}
          createdAt={project.createdAt}
        />
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
