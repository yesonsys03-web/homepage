import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"

const platforms = ["Web", "App", "AI", "Tool", "Game", "기타"]
const tagOptions = ["React", "Python", "AI", "Web", "Mobile", "Game", "Tool", "API", "Database", "DevOps"]

export function SubmitScreen() {
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
  const [thumbnailPreview, setThumbnailPreview] = useState("")

  const handleSubmit = async () => {
    if (!formData.title || !formData.summary) {
      alert("제목과 한 줄 소개는 필수입니다!")
      return
    }

    setSubmitting(true)
    try {
      await api.createProject({
        title: formData.title,
        summary: formData.summary,
        description: formData.description || undefined,
        platform: formData.platform.toLowerCase(),
        thumbnail_url: formData.thumbnail_url || undefined,
        demo_url: formData.demo_url || undefined,
        repo_url: formData.repo_url || undefined,
        tags: formData.tags,
      })
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
    } catch (error) {
      console.error("Failed to create project:", error)
      alert("작품 등록에 실패했습니다.")
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
      <header className="sticky top-0 z-50 bg-[#0B1020]/95 backdrop-blur-sm border-b border-[#111936]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">VibeCoder</h1>
          <nav className="flex gap-6">
            <a href="#" className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Home</a>
            <a href="#" className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Explore</a>
            <a href="#" className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Challenges</a>
            <a href="#" className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">About</a>
          </nav>
          <Button className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] font-semibold">
            작품 올리기
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-[#F4F7FF] mb-2">작품 등록</h1>
        <p className="text-[#B8C3E6] mb-8">당신의 작품을 바이브코더 커뮤니티와 공유하세요!</p>

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
                disabled={submitting}
                className="flex-1 bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] text-lg py-6"
              >
                {submitting ? "등록 중..." : "등록하기"}
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
                  <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#161F42] to-[#0B1020]">
                    <span className="text-[#23D5AB] text-xs font-bold mb-1">{formData.platform.toUpperCase()}</span>
                    <h4 className="text-[#F4F7FF] font-display font-bold text-sm leading-tight line-clamp-3">
                      {formData.title || "작품 제목"}
                    </h4>
                  </div>
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
                    <span>❤️ 0</span>
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
