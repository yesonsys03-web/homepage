import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

const platforms = ["Web", "App", "AI", "Tool", "Game", "기타"]
const tags = ["React", "Python", "AI", "Web", "Mobile", "Game", "Tool", "API", "Database", "DevOps"]

export function SubmitScreen() {
  return (
    <div className="min-h-screen bg-[#0B1020]">
      {/* Top Navigation */}
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
          {/* Form */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-[#F4F7FF] font-medium mb-2">
                제목 <span className="text-[#FF6B6B]">*</span>
              </label>
              <Input 
                placeholder="작품의 이름을 입력하세요"
                className="bg-[#161F42] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:ring-[#23D5AB]"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-[#F4F7FF] font-medium mb-2">
                한 줄 소개 <span className="text-[#FF6B6B]">*</span>
              </label>
              <Input 
                placeholder="작품을 한 줄로 소개해주세요"
                className="bg-[#161F42] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:ring-[#23D5AB]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[#F4F7FF] font-medium mb-2">
                상세 설명 <span className="text-[#B8C3E6]">(선택)</span>
              </label>
              <textarea 
                className="w-full bg-[#161F42] border border-[#111936] rounded-lg p-4 text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:outline-none focus:ring-2 focus:ring-[#23D5AB] min-h-[150px]"
                placeholder="작品的 상세한 설명, 사용 방법, 개발 과정 등을 입력해주세요"
              />
            </div>

            {/* Platform */}
            <div>
              <label className="block text-[#F4F7FF] font-medium mb-2">
                플랫폼
              </label>
              <div className="flex flex-wrap gap-2">
                {platforms.map(platform => (
                  <button
                    key={platform}
                    className="px-4 py-2 rounded-full text-sm font-medium bg-[#161F42] text-[#B8C3E6] hover:bg-[#111936] hover:text-[#F4F7FF] transition-all"
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-[#F4F7FF] font-medium mb-2">
                썸네일
              </label>
              <div className="border-2 border-dashed border-[#111936] rounded-lg p-8 text-center hover:border-[#23D5AB] transition-colors cursor-pointer">
                <p className="text-[#B8C3E6]">이미지를 드래그하거나 클릭하여 업로드</p>
                <p className="text-[#B8C3E6]/50 text-sm mt-1">또는 이미지 URL을 입력</p>
                <Input 
                  placeholder="https://..."
                  className="mt-3 bg-[#111936] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50"
                />
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#F4F7FF] font-medium mb-2">
                  데모 링크
                </label>
                <Input 
                  placeholder="https://..."
                  className="bg-[#161F42] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:ring-[#23D5AB]"
                />
              </div>
              <div>
                <label className="block text-[#F4F7FF] font-medium mb-2">
                  GitHub 링크
                </label>
                <Input 
                  placeholder="https://github.com/..."
                  className="bg-[#161F42] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:ring-[#23D5AB]"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[#F4F7FF] font-medium mb-2">
                태그 <span className="text-[#B8C3E6]">(최대 5개)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map(tag => (
                  <button
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-[#161F42] text-[#B8C3E6] hover:bg-[#111936] hover:text-[#F4F7FF] transition-all"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
              <Input 
                placeholder="태그를 입력하고 Enter를 누르세요"
                className="bg-[#161F42] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:ring-[#23D5AB]"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button className="flex-1 bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] text-lg py-6">
                등록하기
              </Button>
              <Button variant="outline" className="border-[#111936] text-[#B8C3E6] hover:bg-[#161F42] hover:text-[#F4F7FF] text-lg py-6">
                취소
              </Button>
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <h3 className="font-display text-lg font-semibold text-[#F4F7FF] mb-4">미리보기</h3>
            <Card className="bg-[#161F42] border-0 sticky top-24">
              <StickerBadge type="new" />
              <div className="aspect-video bg-gradient-to-br from-[#111936] to-[#0B1020] flex items-center justify-center rounded-t-xl">
                <span className="text-[#B8C3E6] text-sm">Thumbnail</span>
              </div>
              <CardContent className="p-4">
                <h3 className="font-display text-lg font-semibold text-[#F4F7FF] mb-1">
                  작품 제목
                </h3>
                <p className="text-sm text-[#B8C3E6] mb-3">
                  작품을 한 줄로 소개하는 내용
                </p>
                <div className="flex flex-wrap gap-1 mb-3">
                  <Badge variant="secondary" className="bg-[#111936] text-[#B8C3E6] text-xs">Tag</Badge>
                  <Badge variant="secondary" className="bg-[#111936] text-[#B8C3E6] text-xs">Tag</Badge>
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

function StickerBadge({ type }: { type: "new" | "hot" | "weird" | "wip" }) {
  const colors = {
    new: "bg-[#23D5AB] text-[#0B1020]",
    hot: "bg-[#FF5D8F] text-white",
    weird: "bg-[#FFB547] text-[#0B1020]",
    wip: "bg-[#B8C3E6] text-[#0B1020]",
  }
  const labels = { new: "NEW", hot: "HOT", weird: "WEIRD", wip: "WIP" }
  
  return (
    <span className={`absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold rounded ${colors[type]} rotate-3 z-10`}>
      {labels[type]}
    </span>
  )
}
