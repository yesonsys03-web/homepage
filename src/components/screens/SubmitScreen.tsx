import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ProjectCoverPlaceholder } from "@/components/ProjectCoverPlaceholder"
import { TopNav } from "@/components/TopNav"
import { api, type Project } from "@/lib/api"
import { isAdminRole } from "@/lib/roles"
import { buildShowcasePrefillTags, consumeShowcaseSubmitContext, hasShowcaseTag } from "@/lib/showcase"
import { useAuth } from "@/lib/use-auth"

type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'showcase' | 'playground' | 'glossary' | 'curated' | 'challenges' | 'about'

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
  editingProjectId?: string
}

const platforms = ["Web", "App", "AI", "Tool", "Game", "기타"]
const tagOptions = ["React", "Python", "AI", "Web", "Mobile", "Game", "Tool", "API", "Database", "DevOps"]

export function SubmitScreen({ onNavigate, editingProjectId }: ScreenProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    description: "",
    platform: "Web",
    thumbnail_url: "",
    demo_url: "",
    repo_url: "",
    tags: [] as string[],
  })
  const [submitting, setSubmitting] = useState(false)
  const [loadingProject, setLoadingProject] = useState(false)
  const [thumbnailPreview, setThumbnailPreview] = useState("")
  const [showcasePrefillActive, setShowcasePrefillActive] = useState(false)
  const isShowcaseDraft = hasShowcaseTag(formData.tags)

  const applyProjectToForm = (project: Project) => {
    const normalizedPlatform = project.platform ? `${project.platform}` : "web"
    const upperPlatform = normalizedPlatform.toUpperCase()
    const displayPlatform = platforms.includes(upperPlatform)
      ? upperPlatform
      : normalizedPlatform.charAt(0).toUpperCase() + normalizedPlatform.slice(1)
    setFormData({
      title: project.title || "",
      summary: project.summary || "",
      description: project.description || "",
      platform: displayPlatform,
      thumbnail_url: project.thumbnail_url || "",
      demo_url: project.demo_url || "",
      repo_url: project.repo_url || "",
      tags: project.tags || [],
    })
    setThumbnailPreview(project.thumbnail_url || "")
  }

  useEffect(() => {
    if (editingProjectId) {
      setShowcasePrefillActive(false)
      return
    }

    if (!consumeShowcaseSubmitContext()) {
      setShowcasePrefillActive(false)
      return
    }

    const result = buildShowcasePrefillTags(formData.tags)
    if (result.applied && result.tags !== formData.tags) {
      setFormData((current) => ({
        ...current,
        tags: result.tags,
      }))
    }
    setShowcasePrefillActive(result.applied)
  }, [editingProjectId])

  useEffect(() => {
    if (!editingProjectId) {
      return
    }

    let cancelled = false
    const loadProjectForEdit = async () => {
      setLoadingProject(true)
      try {
        const project = await api.getProject(editingProjectId, { force: true })
        if (cancelled) return
        if (!user || (!isAdminRole(user.role) && user.id !== project.author_id)) {
          alert("수정 권한이 없습니다.")
          onNavigate?.("detail")
          return
        }
        applyProjectToForm(project)
      } catch (error) {
        console.error("Failed to load project for edit:", error)
        if (!cancelled) {
          alert("수정할 작품을 불러오지 못했습니다.")
          onNavigate?.("detail")
        }
      } finally {
        if (!cancelled) {
          setLoadingProject(false)
        }
      }
    }

    void loadProjectForEdit()
    return () => {
      cancelled = true
    }
  }, [editingProjectId, onNavigate, user])

  const handleSubmit = async () => {
    if (!formData.title || !formData.summary) {
      alert("제목과 한 줄 소개는 필수입니다!")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        title: formData.title,
        summary: formData.summary,
        description: formData.description || undefined,
        platform: formData.platform.toLowerCase(),
        thumbnail_url: formData.thumbnail_url || undefined,
        demo_url: formData.demo_url || undefined,
        repo_url: formData.repo_url || undefined,
        tags: formData.tags,
      }

      if (editingProjectId) {
        await api.updateProject(editingProjectId, payload)
        alert("작품이 수정되었습니다!")
        onNavigate?.("detail")
      } else {
        await api.createProject(payload)
        alert("작품이 등록되었습니다!")
        setFormData({
          title: "",
          summary: "",
          description: "",
          platform: "Web",
          thumbnail_url: "",
          demo_url: "",
          repo_url: "",
          tags: [],
        })
        setThumbnailPreview("")
      }
    } catch (error) {
      console.error("Failed to submit project:", error)
      alert(editingProjectId ? "작품 수정에 실패했습니다." : "작품 등록에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  const addTag = (tag: string) => {
    if (formData.tags.length >= 5) return
    if (!formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] })
    }
  }

  const removeTag = (tag: string) => {
    const newTags = formData.tags.filter(t => t !== tag)
    setFormData({ ...formData, tags: newTags })
  }

  const handleThumbnailChange = (url: string) => {
    setFormData({ ...formData, thumbnail_url: url })
    setThumbnailPreview(url)
  }

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <TopNav active="home" onNavigate={onNavigate} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-[#F4F7FF] mb-2">{editingProjectId ? "작품 수정" : "작품 등록"}</h1>
        <p className="text-[#B8C3E6] mb-8">{editingProjectId ? "기존 작품 정보를 수정합니다." : "당신의 작품을 바이브코더 커뮤니티와 공유하세요!"}</p>

        {showcasePrefillActive ? (
          <div className="mb-6 rounded-xl border border-[#23D5AB]/30 bg-[#161F42] px-4 py-3 text-sm text-[#B8C3E6]">
            자랑 게시판에서 바로 들어왔어요. <span className="font-semibold text-[#F4F7FF]">#showcase</span> 태그를 미리 넣어뒀고, 미리보기 반응도 박수 톤으로 보여드립니다.
          </div>
        ) : null}

        {loadingProject ? (
          <div className="text-[#B8C3E6] mb-6">수정할 작품 정보를 불러오는 중...</div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[#F4F7FF] font-medium mb-2">
                제목 <span className="text-[#FF6B6B]">*</span>
              </label>
              <Input 
                placeholder="작품의 이름을 입력하세요"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#161F42] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:ring-[#23D5AB]"
              />
            </div>

            <div>
              <label className="block text-[#F4F7FF] font-medium mb-2">
                한 줄 소개 <span className="text-[#FF6B6B]">*</span>
              </label>
              <Input 
                placeholder="작품을 한 줄로 소개해주세요"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="bg-[#161F42] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:ring-[#23D5AB]"
              />
            </div>

            <div>
              <label className="block text-[#F4F7FF] font-medium mb-2">
                상세 설명 <span className="text-[#B8C3E6]">(선택)</span>
              </label>
              <textarea 
                className="w-full bg-[#161F42] border border-[#111936] rounded-lg p-4 text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:outline-none focus:ring-2 focus:ring-[#23D5AB] min-h-[150px]"
                placeholder="작품의 상세한 설명, 사용 방법, 개발 과정 등을 입력해주세요"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[#F4F7FF] font-medium mb-2">플랫폼</label>
              <div className="flex flex-wrap gap-2">
                {platforms.map(platform => (
                  <button
                    key={platform}
                    onClick={() => setFormData({ ...formData, platform })}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      formData.platform === platform
                        ? "bg-[#23D5AB] text-[#0B1020]"
                        : "bg-[#161F42] text-[#B8C3E6] hover:bg-[#111936] hover:text-[#F4F7FF]"
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[#F4F7FF] font-medium mb-2">썸네일 이미지 URL</label>
              <div className="border-2 border-dashed border-[#111936] rounded-lg p-4">
                <Input 
                  placeholder="https://... (이미지 URL)"
                  value={formData.thumbnail_url}
                  onChange={(e) => handleThumbnailChange(e.target.value)}
                  className="bg-[#111936] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50"
                />
                {thumbnailPreview && (
                  <div className="mt-3">
                    <img 
                      src={thumbnailPreview} 
                      alt="Thumbnail preview" 
                      loading="lazy"
                      decoding="async"
                      className="w-full aspect-video object-cover rounded-lg"
                      onError={() => setThumbnailPreview("")}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#F4F7FF] font-medium mb-2">데모 링크</label>
                <Input 
                  placeholder="https://..."
                  value={formData.demo_url}
                  onChange={(e) => setFormData({ ...formData, demo_url: e.target.value })}
                  className="bg-[#161F42] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:ring-[#23D5AB]"
                />
              </div>
              <div>
                <label className="block text-[#F4F7FF] font-medium mb-2">GitHub 링크</label>
                <Input 
                  placeholder="https://github.com/..."
                  value={formData.repo_url}
                  onChange={(e) => setFormData({ ...formData, repo_url: e.target.value })}
                  className="bg-[#161F42] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:ring-[#23D5AB]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#F4F7FF] font-medium mb-2">태그 <span className="text-[#B8C3E6]">(최대 5개)</span></label>
              <div className="flex flex-wrap gap-2 mb-3">
                {tagOptions.map(tag => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    disabled={formData.tags.length >= 5}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-[#161F42] text-[#B8C3E6] hover:bg-[#111936] hover:text-[#F4F7FF] transition-all disabled:opacity-50"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="bg-[#23D5AB] text-[#0B1020] cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                onClick={handleSubmit}
                disabled={submitting || loadingProject}
                className="flex-1 bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] text-lg py-6"
              >
                {submitting ? (editingProjectId ? "수정 중..." : "등록 중...") : (editingProjectId ? "수정하기" : "등록하기")}
              </Button>
              <Button variant="outline" className="border-[#111936] text-[#B8C3E6] hover:bg-[#161F42] hover:text-[#F4F7FF] text-lg py-6">
                취소
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-display text-lg font-semibold text-[#F4F7FF] mb-4">미리보기</h3>
            <Card className="bg-[#161F42] border-0 sticky top-24">
              <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold rounded bg-[#23D5AB] text-[#0B1020] rotate-3 z-10">NEW</span>
              <div className="aspect-video bg-gradient-to-br from-[#111936] to-[#0B1020] flex items-center justify-center rounded-t-xl overflow-hidden">
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Preview" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <ProjectCoverPlaceholder
                    title={formData.title || "작품 제목"}
                    summary={formData.summary || "작품을 한 줄로 소개하는 내용"}
                    description={formData.description || undefined}
                    platform={formData.platform}
                    tags={formData.tags}
                    likeCount={0}
                    isNew
                    size="card"
                  />
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-display text-lg font-semibold text-[#F4F7FF] mb-1">
                  {formData.title || "작품 제목"}
                </h3>
                <p className="text-sm text-[#B8C3E6] mb-3">
                  {formData.summary || "작품을 한 줄로 소개하는 내용"}
                </p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {formData.tags.length > 0 ? formData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-[#111936] text-[#B8C3E6] text-xs">{tag}</Badge>
                  )) : (
                    <>
                      <Badge variant="secondary" className="bg-[#111936] text-[#B8C3E6] text-xs">Tag</Badge>
                      <Badge variant="secondary" className="bg-[#111936] text-[#B8C3E6] text-xs">Tag</Badge>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#B8C3E6]">by 작성자</span>
                  <div className="flex gap-3 text-[#B8C3E6]">
                    <span>{isShowcaseDraft ? "👏 0" : "❤️ 0"}</span>
                    <span>💬 0</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
