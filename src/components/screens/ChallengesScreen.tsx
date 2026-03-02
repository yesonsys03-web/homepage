import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TopNav } from "@/components/TopNav"

type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'challenges' | 'about'

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
}

const challenges = [
  {
    id: "1",
    title: "AI 챌린지",
    description: "AI를 활용한 혁신적인 서비스를 만들어보세요",
    participants: 45,
    deadline: "2026-03-15",
    prize: "₩500,000",
    status: "active",
    tags: ["AI", "OpenAI", "Claude"],
  },
  {
    id: "2",
    title: "3D 웹 게임",
    description: "Three.js 또는 React Three Fiber로 브라우저 게임을 만들어보세요",
    participants: 32,
    deadline: "2026-03-20",
    prize: "₩300,000",
    status: "active",
    tags: ["Three.js", "React", "Game"],
  },
  {
    id: "3",
    title: "최소 기능 제품 (MVP)",
    description: "2주 내에 작동하는 MVP를 만들어보세요",
    participants: 67,
    deadline: "2026-03-01",
    prize: "₩200,000",
    status: "ending",
    tags: ["MVP", "Startup", "Product"],
  },
  {
    id: "4",
    title: "오프라인 먼저",
    description: "온라인 서비스 없이 오프라인에서만 작동하는 앱",
    participants: 18,
    deadline: "2026-03-25",
    prize: "₩150,000",
    status: "active",
    tags: ["Offline", "Creative", "PWA"],
  },
]

export function ChallengesScreen({ onNavigate }: ScreenProps) {
  return (
    <div className="min-h-screen bg-[#0B1020]">
      <TopNav active="challenges" onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl font-bold text-[#F4F7FF] mb-4">
            🏆 Challenges
          </h2>
          <p className="text-[#B8C3E6] text-lg max-w-2xl mx-auto">
            주어진 테마에 맞춰 프로젝트를 만들고, 상금을 수상하세요!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.map((challenge) => (
            <Card 
              key={challenge.id} 
              className={`bg-[#161F42] border-[#111936] overflow-hidden hover:border-[#FF5D8F]/50 transition-colors ${
                challenge.status === "ending" ? "ring-2 ring-[#FF5D8F]/50" : ""
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-2">
                    {challenge.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-[#0B1020] text-[#B8C3E6] text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {challenge.status === "ending" && (
                    <Badge className="bg-[#FF5D8F] text-white">마감 임박</Badge>
                  )}
                </div>
                
                <h3 className="font-display text-xl font-bold text-[#F4F7FF] mb-2">
                  {challenge.title}
                </h3>
                <p className="text-[#B8C3E6] mb-4">{challenge.description}</p>
                
                <div className="flex items-center justify-between text-sm text-[#B8C3E6] mb-4">
                  <span>👥 {challenge.participants}명 참여</span>
                  <span>📅 ~{challenge.deadline}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-[#23D5AB] font-bold">{challenge.prize}</span>
                  <Button className="bg-[#FF5D8F] hover:bg-[#FF5D8F]/90 text-white">
                    참가하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center p-8 bg-[#161F42] rounded-xl border border-[#111936]">
          <h3 className="font-display text-2xl font-bold text-[#F4F7FF] mb-4">
            💡 나도 챌린지를내고 싶어!
          </h3>
          <p className="text-[#B8C3E6] mb-6">
            eigene 챌린지를 개최하고 싶으시면 언제든 문의하세요
          </p>
          <Button className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] font-semibold">
            문의하기
          </Button>
        </div>
      </main>
    </div>
  )
}
