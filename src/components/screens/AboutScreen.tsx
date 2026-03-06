import { useEffect, useMemo, useState } from "react"
import { Helmet } from "react-helmet-async"

import { Button } from "@/components/ui/button"
import { TopNav } from "@/components/TopNav"
import { HeroBanner } from "@/components/HeroBanner"
import { api, type AboutContent } from "@/lib/api"
import aboutMasterImage from "../../../img/About_master.webp"
import aboutTabletImage from "../../../img/About_tablet.webp"
import aboutMobileImage from "../../../img/About_mobile.webp"

type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'challenges' | 'about'

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
}

const ABOUT_FALLBACK_CONTENT: AboutContent = {
  hero_title: "완성도보다 바이브.",
  hero_highlight: "실험도 작품이다.",
  hero_description:
    "VibeCoder는 개발자들이 자유롭게 실험하고, 공유하고, 피드백을 받는 공간입니다. 완벽한 코드보다 재미있는 시도가 더 가치 있다고 믿습니다.",
  contact_email: "hello@vibecoder.dev",
  values: [
    {
      emoji: "🎨",
      title: "창작의 자유",
      description: "완벽함보다 uniqueness를 중요시합니다. 당신만의 독특한 바이브를 보여주세요.",
    },
    {
      emoji: "🤝",
      title: "피드백 문화",
      description: "constructive한 피드백으로 서로 성장합니다. 비난보다 건전한 논의를 추구합니다.",
    },
    {
      emoji: "🚀",
      title: "실험정신",
      description: "실패를 두려워하지 말고 새로운 시도를 마음껏 해보세요.",
    },
  ],
  team_members: [
    { name: "devkim", role: "Founder & Lead Dev", description: "AI와 웹 개발을 좋아합니다" },
    { name: "codemaster", role: "Backend Engineer", description: "Rust와 Python을 좋아합니다" },
    { name: "designer_y", role: "UI/UX Designer", description: "사용자 경험을 중요시합니다" },
  ],
  faqs: [
    {
      question: "VibeCoder는 무엇인가요?",
      answer: "개발자들이 자신의 프로젝트를 공유하고, 서로의 작품에 대한 피드백을 받을 수 있는 커뮤니티입니다.",
    },
    {
      question: "프로젝트를 어떻게 올리나요?",
      answer: "로그인 후 '작품 올리기' 버튼을 클릭하여 프로젝트 정보를 입력하면 됩니다.",
    },
    {
      question: "챌린지에 참여하려면 어떻게 해야 하나요?",
      answer: "챌린지 페이지에서 마음에 드는 챌린지를 선택하고 '참가하기' 버튼을 클릭하면 됩니다.",
    },
    {
      question: "무료로 사용할 수 있나요?",
      answer: "네, 기본 기능은 모두 무료입니다. 추후 유료 기능이 추가될 예정입니다.",
    },
  ],
}

export function AboutScreen({ onNavigate }: ScreenProps) {
  const [content, setContent] = useState<AboutContent>(ABOUT_FALLBACK_CONTENT)
  const faqJsonLd = useMemo(() => {
    if (content.faqs.length === 0) {
      return null
    }

    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: content.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    })
  }, [content.faqs])

  useEffect(() => {
    const loadAboutContent = async () => {
      try {
        const data = await api.getAboutContent({ force: true })
        setContent(data)
      } catch (error) {
        console.error("Failed to load about content:", error)
      }
    }

    loadAboutContent()
  }, [])

  return (
    <div className="min-h-screen bg-[#0B1020]">
      {faqJsonLd ? (
        <Helmet>
          <script id="about-faq-jsonld" type="application/ld+json">
            {faqJsonLd}
          </script>
        </Helmet>
      ) : null}
      <TopNav active="about" onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <HeroBanner
          className="text-center py-16 rounded-2xl border border-[#111936]"
          title={
            <>
              {content.hero_title}
              <br />
              <span className="text-[#23D5AB]">{content.hero_highlight}</span>
            </>
          }
          description={content.hero_description}
          cta={
            <div className="flex gap-4 justify-center">
              <Button onClick={() => onNavigate?.("explore")} className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] font-semibold text-lg px-8">
                시작하기
              </Button>
            </div>
          }
          background={
            <>
              <picture className="absolute inset-0">
                <source media="(max-width: 767px)" srcSet={aboutMobileImage} />
                <source media="(max-width: 1279px)" srcSet={aboutTabletImage} />
                <img
                  src={aboutMasterImage}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover opacity-65"
                  style={{ filter: "brightness(1.6)" }}
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-b from-[#0B1020]/39 via-[#0B1020]/46 to-[#0B1020]/55" />
            </>
          }
        />

        <section className="py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {content.values.map((value) => (
            <div key={`${value.emoji}-${value.title}`} className="bg-[#161F42] p-6 rounded-xl border border-[#111936]">
              <div className="text-4xl mb-4">{value.emoji}</div>
              <h3 className="font-display text-xl font-bold text-[#F4F7FF] mb-2">{value.title}</h3>
              <p className="text-[#B8C3E6]">{value.description}</p>
            </div>
          ))}
        </section>

        <section className="py-12">
          <h2 className="font-display text-3xl font-bold text-[#F4F7FF] text-center mb-8">
            👥 Team
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.team_members.map((member) => (
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

        {content.faqs.length > 0 ? (
          <section className="py-12">
            <h2 className="font-display text-3xl font-bold text-[#F4F7FF] text-center mb-8">
              ❓ FAQ
            </h2>
            <div className="max-w-2xl mx-auto space-y-4">
              {content.faqs.map((faq) => (
                <div key={faq.question} className="bg-[#161F42] p-6 rounded-xl border border-[#111936]">
                  <h3 className="font-display font-bold text-[#F4F7FF] mb-2">{faq.question}</h3>
                  <p className="text-[#B8C3E6]">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="py-12 text-center">
          <h2 className="font-display text-3xl font-bold text-[#F4F7FF] mb-4">
            📮 Contact Us
          </h2>
          <p className="text-[#B8C3E6] mb-6">
            버그 신고, 기능 제안, 비즈니스 협업 등은 아래 이메일로 문의하세요
          </p>
          <a
            href={`mailto:${content.contact_email}`}
            className="text-[#23D5AB] text-lg hover:underline"
          >
            {content.contact_email}
          </a>
        </section>
      </main>

      <footer className="border-t border-[#111936] py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-[#B8C3E6]">
          <p>© 2026 VibeCoder. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
