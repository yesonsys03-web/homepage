import { useState, useRef } from "react"
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
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 이미지 파일만 허용
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다")
      return
    }

    // 파일 크기 체크 (5MB 이하)
    if (file.size > 5 * 1024 * 1024) {
      alert("5MB 이하의 이미지만 업로드 가능합니다")
      return
    }

    // Base64로 변환하여 미리보기
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setThumbnailPreview(result)
      setFormData({ ...formData, thumbnail_url: result })
    }
    reader.readAsDataURL(file)
  }

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

  const clearThumbnail = () => {
    setFormData({ ...formData, thumbnail_url: "" })
    setThumbnailPreview("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
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

            {/* 썸네일 이미지 - 파일 업로드 + URL 입력 */}
            <div>
              <label className="block text-[#F4F7FF] font-medium mb-2">썸네일 이미지</label>
              
              {/* 파일 선택 버튼 */}
              <div className="mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <label
                  htmlFor="thumbnail-upload"
                  className="inline-flex items-center px-4 py-2 bg-[#161F42] text-[#B8C3E6] rounded-lg cursor-pointer hover:bg-[#111936] transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  파일 선택
                </label>
                <span className="ml-3 text-[#B8C3E6] text-sm">(5MB 이하, JPG/PNG)</span>
              </div>

              {/* 또는 URL 입력 */}
              <div className="border-2 border-dashed border-[#111936] rounded-lg p-4">
                <p className="text-[#B8C3E6] text-sm mb-2">또는 이미지 URL을 입력하세요</p>
                <Input 
                  placeholder="https://..."
                  value={formData.thumbnail_url.startsWith("data:") ? "" : formData.thumbnail_url}
                  onChange={(e) => {
                    setFormData({ ...formData, thumbnail_url: e.target.value })
                    setThumbnailPreview(e.target.value)
                  }}
                  className="bg-[#111936] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50"
                />
              </div>

              {/* 미리보기 */}
              {(thumbnailPreview || formData.thumbnail_url) && (
                <div className="mt-3 relative inline-block">
                  <img 
                    src={thumbnailPreview || formData.thumbnail_url} 
                    alt="Thumbnail preview" 
                    className="w-40 h-28 object-cover rounded-lg border border-[#111936]"
                  />
                  <button
                    onClick={clearThumbnail}
                    className="absolute -top-2 -right-2 bg-[#FF6B6B] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-[#FF5252]"
                  >
                    ×
                  </button>
                </div>
              )}
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
                {(thumbnailPreview || formData.thumbnail_url) ? (
                  <img src={thumbnailPreview || formData.thumbnail_url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#B8C3E6] text-sm">Thumbnail</span>
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
