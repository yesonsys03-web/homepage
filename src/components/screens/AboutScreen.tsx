import { Button } from "@/components/ui/button"

type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'challenges' | 'about'

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
}

const teamMembers = [
  { name: "devkim", role: "Founder & Lead Dev", description: "AI와 웹 개발을 좋아합니다" },
  { name: "codemaster", role: "Backend Engineer", description: "Rust와 Python을 좋아합니다" },
  { name: "designer_y", role: "UI/UX Designer", description: "사용자 경험을 중요시합니다" },
]

const faqs = [
  {
    question: "VibeCoder는무엇인가요?",
    answer: "개발자들이 자신의 프로젝트를 공유하고, 서로의 작품에 대한 피드백을 받을 수 있는 커뮤니티입니다.",
  },
  {
    question: "프로젝트를 어떻게 올리나요?",
    answer: "로그인 후 '작품 올리기' 버튼을 클릭하여 프로젝트 정보를 입력하면 됩니다.",
  },
  {
    question: "챌린지에 참여하려면 어떻게 해야 하나요?",
    answer: "챌린지 페이지에서 마음에드는 챌린지를 선택하고 '참가하기' 버튼을 클릭하면 됩니다.",
  },
  {
    question: "무료로 사용할 수 있나요?",
    answer: "네, 기본 기능은 모두 무료입니다. 추후 유료 기능이 추가될 예정입니다.",
  },
]

export function AboutScreen({ onNavigate }: ScreenProps) {
  return (
    <div className="min-h-screen bg-[#0B1020]">
      <header className="sticky top-0 z-50 bg-[#0B1020]/95 backdrop-blur-sm border-b border-[#111936]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">VibeCoder</h1>
          <nav className="flex gap-6">
            <button onClick={() => onNavigate?.('home')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Home</button>
            <button onClick={() => onNavigate?.('explore')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Explore</button>
            <button onClick={() => onNavigate?.('challenges')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Challenges</button>
            <button onClick={() => onNavigate?.('about')} className="text-[#23D5AB] font-medium">About</button>
          </nav>
          <Button onClick={() => onNavigate?.('submit')} className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] font-semibold">
            작품 올리기
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center py-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-[#F4F7FF] mb-6">
            완성도보다 바이브.<br />
            <span className="text-[#23D5AB]">실험도 작품이다.</span>
          </h2>
          <p className="text-[#B8C3E6] text-lg max-w-2xl mx-auto mb-8">
            VibeCoder는 개발자들이 자유롭게 실험하고, 공유하고, 피드백을 받는 공간입니다.
            완벽한 코드보다 재미있는 시도가 더 가치 있다고 믿습니다.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => onNavigate?.('explore')} className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] font-semibold text-lg px-8">
              시작하기
            </Button>
          </div>
        </section>

        {/* Values */}
        <section className="py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#161F42] p-6 rounded-xl border border-[#111936]">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="font-display text-xl font-bold text-[#F4F7FF] mb-2">창작의 자유</h3>
            <p className="text-[#B8C3E6]">
              완벽함보다 uniqueness를更重要시합니다. 당신만의 독특한 바이브를 보여주세요.
            </p>
          </div>
          <div className="bg-[#161F42] p-6 rounded-xl border border-[#111936]">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="font-display text-xl font-bold text-[#F4F7FF] mb-2">피드백 문화</h3>
            <p className="text-[#B8C3E6]">
             constructive한 피드백으로 서로 성장합니다.批评보다 건전한 논의를 추구합니다.
            </p>
          </div>
          <div className="bg-[#161F42] p-6 rounded-xl border border-[#111936]">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="font-display text-xl font-bold text-[#F4F7FF] mb-2">실험정신</h3>
            <p className="text-[#B8C3E6]">
             失敗는 성공의 어머니. 새로운 시도를 두려워하지 말고 실험하세요!
            </p>
          </div>
        </section>

        {/* Team */}
        <section className="py-12">
          <h2 className="font-display text-3xl font-bold text-[#F4F7FF] text-center mb-8">
            👥 Team
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {teamMembers.map((member) => (
              <div key={member.name} className="bg-[#161F42] p-6 rounded-xl border border-[#111936] text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#23D5AB] to-[#FF5D8F] flex items-center justify-center text-2xl font-bold text-[#0B1020]">
                  {member.name[0].toUpperCase()}
                </div>
                <h3 className="font-display font-bold text-[#F4F7FF] mb-1">{member.name}</h3>
                <p className="text-[#23D5AB] text-sm mb-2">{member.role}</p>
                <p className="text-[#B8C3E6] text-sm">{member.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12">
          <h2 className="font-display text-3xl font-bold text-[#F4F7FF] text-center mb-8">
            ❓ FAQ
          </h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-[#161F42] p-6 rounded-xl border border-[#111936]">
                <h3 className="font-display font-bold text-[#F4F7FF] mb-2">{faq.question}</h3>
                <p className="text-[#B8C3E6]">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="py-12 text-center">
          <h2 className="font-display text-3xl font-bold text-[#F4F7FF] mb-4">
            📮 Contact Us
          </h2>
          <p className="text-[#B8C3E6] mb-6">
            버그 신고, 기능 제안,商業合作 등은 아래 이메일로 문의하세요
          </p>
          <a 
            href="mailto:hello@vibecoder.dev" 
            className="text-[#23D5AB] text-lg hover:underline"
          >
            hello@vibecoder.dev
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#111936] py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-[#B8C3E6]">
          <p>© 2026 VibeCoder. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
