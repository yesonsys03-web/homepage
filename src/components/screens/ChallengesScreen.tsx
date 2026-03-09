import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TodayGlossaryChallengeCard } from "@/components/TodayGlossaryChallengeCard"
import { TopNav, type NavScreen } from "@/components/TopNav"
import { type GlossaryTerm } from "@/data/glossary"
import { parseLocalDateKey } from "@/lib/daily"
import { setGlossaryFocusTerm } from "@/lib/glossary-navigation"
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "@/lib/safe-storage"
import { useLocalDateKey } from "@/lib/use-local-date-key"

interface ScreenProps {
  onNavigate?: (screen: NavScreen) => void
}

export function getDailyChallengeProgressBaseline(
  progress: DailyChallengeProgress,
  dateKey: string,
): DailyChallengeProgress {
  if (progress.dateKey === dateKey) {
    return progress
  }

  return {
    dateKey,
    completed: false,
    askedForHelp: false,
    streak: progress.streak,
  }
}

type DailyChallengeProgress = {
  dateKey: string
  completed: boolean
  askedForHelp: boolean
  streak: number
}

type DailyChallengeMission = {
  id: string
  level: "beginner" | "mid" | "expert"
  title: string
  description: string
  hint: string
  tools: string[]
  timeEstimate: string
  actionLabel: string
  reason: string
  participants: number
  completionRate: number
}

const DAILY_CHALLENGE_PROGRESS_KEY = "vibecoder_daily_challenge_progress"

const dailyChallengeMissions: DailyChallengeMission[] = [
  {
    id: "beginner-button-tone",
    level: "beginner",
    title: "버튼 하나를 내 취향 색으로 바꿔보세요",
    description: "지금 만든 프로젝트에서 제일 눈에 띄는 버튼 하나만 골라 색이나 문구를 바꿔보세요.",
    hint: 'AI에게 "이 버튼 색을 더 따뜻한 민트톤으로 바꿔줘"처럼 아주 작게 부탁하면 시작하기 쉽습니다.',
    tools: ["Cursor", "Claude"],
    timeEstimate: "10~20분",
    actionLabel: "색 바꾸고 완료했어요",
    reason: "작은 성공 하나가 다음 수정도 쉽게 만듭니다.",
    participants: 187,
    completionRate: 64,
  },
  {
    id: "mid-share-link",
    level: "mid",
    title: "공유 가능한 링크 하나를 붙여보세요",
    description: "데모 링크나 깃허브 링크 중 하나만 프로젝트에 연결해도 다른 사람이 훨씬 쉽게 응원할 수 있어요.",
    hint: '링크가 없다면 먼저 README 첫 줄에 "무엇을 만든 건지" 한 줄을 써도 좋습니다.',
    tools: ["GitHub", "Vite"],
    timeEstimate: "15~25분",
    actionLabel: "링크 붙이고 완료했어요",
    reason: "보여줄 수 있어야 다음 피드백과 응원이 따라옵니다.",
    participants: 96,
    completionRate: 49,
  },
  {
    id: "expert-polish-copy",
    level: "expert",
    title: "첫 화면 문장 하나를 더 쉽게 바꿔보세요",
    description: "전문 용어 한 줄을 초보자도 이해할 문장으로 고쳐보는 챌린지입니다.",
    hint: '"기능 설명"보다 "이걸 누르면 뭐가 되는지"로 바꿔 쓰면 훨씬 읽기 쉬워집니다.',
    tools: ["Claude", "Windsurf"],
    timeEstimate: "20~30분",
    actionLabel: "카피 다듬고 완료했어요",
    reason: "바이브코딩에서 완성도는 기술보다 설명에서 더 크게 느껴집니다.",
    participants: 53,
    completionRate: 38,
  },
]

const miniMissions = [
  {
    id: "mini-1",
    title: "README 첫 줄 쓰기",
    description: "내 프로젝트가 무엇인지 한 문장으로 적어두기",
  },
  {
    id: "mini-2",
    title: "스크린샷 한 장 저장",
    description: "완성 전이어도 지금 상태를 남겨두기",
  },
  {
    id: "mini-3",
    title: "친구에게 링크 보내기",
    description: "혼자만 보지 말고 누군가에게 보여주기",
  },
]

function readDailyChallengeProgress(dateKey: string): DailyChallengeProgress {
  try {
    const raw = safeLocalStorageGetItem(DAILY_CHALLENGE_PROGRESS_KEY)
    if (!raw) {
      return { dateKey, completed: false, askedForHelp: false, streak: 0 }
    }
    const parsed = JSON.parse(raw) as Partial<DailyChallengeProgress>
    if (parsed.dateKey !== dateKey) {
      return {
        dateKey,
        completed: false,
        askedForHelp: false,
        streak: typeof parsed.streak === "number" && Number.isFinite(parsed.streak) ? parsed.streak : 0,
      }
    }
    return {
      dateKey,
      completed: Boolean(parsed.completed),
      askedForHelp: Boolean(parsed.askedForHelp),
      streak: typeof parsed.streak === "number" && Number.isFinite(parsed.streak) ? parsed.streak : 0,
    }
  } catch {
    return { dateKey, completed: false, askedForHelp: false, streak: 0 }
  }
}

function pickDailyMission(date: Date = new Date()): DailyChallengeMission {
  const index = (date.getDate() - 1) % dailyChallengeMissions.length
  return dailyChallengeMissions[index]
}

function writeDailyChallengeProgress(progress: DailyChallengeProgress) {
  safeLocalStorageSetItem(DAILY_CHALLENGE_PROGRESS_KEY, JSON.stringify(progress))
}

export function ChallengesScreen({ onNavigate }: ScreenProps) {
  const dateKey = useLocalDateKey()
  const [progress, setProgress] = useState<DailyChallengeProgress>({
    dateKey,
    completed: false,
    askedForHelp: false,
    streak: 0,
  })

  const dailyMission = useMemo(() => pickDailyMission(parseLocalDateKey(dateKey)), [dateKey])

  useEffect(() => {
    setProgress(readDailyChallengeProgress(dateKey))
  }, [dateKey])

  const currentProgress = getDailyChallengeProgressBaseline(progress, dateKey)

  const handleSelectGlossaryTerm = (term: GlossaryTerm) => {
    setGlossaryFocusTerm(term.term)
    onNavigate?.("glossary")
  }

  const handleComplete = () => {
    const persistedProgress = getDailyChallengeProgressBaseline(
      readDailyChallengeProgress(dateKey),
      dateKey,
    )
    const nextProgress: DailyChallengeProgress = {
      dateKey,
      completed: true,
      askedForHelp: persistedProgress.askedForHelp,
      streak: persistedProgress.completed ? persistedProgress.streak : persistedProgress.streak + 1,
    }
    setProgress(nextProgress)
    writeDailyChallengeProgress(nextProgress)
  }

  const handleAskHelp = () => {
    const persistedProgress = getDailyChallengeProgressBaseline(
      readDailyChallengeProgress(dateKey),
      dateKey,
    )
    const nextProgress: DailyChallengeProgress = {
      dateKey,
      completed: persistedProgress.completed,
      askedForHelp: true,
      streak: persistedProgress.streak,
    }
    setProgress(nextProgress)
    writeDailyChallengeProgress(nextProgress)
  }

  const streakBadge = currentProgress.streak >= 7 ? "🔥🔥" : currentProgress.streak >= 3 ? "🔥" : "✨"

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <TopNav active="challenges" onNavigate={onNavigate} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="rounded-3xl border border-[#111936] bg-[radial-gradient(circle_at_top_left,_rgba(255,93,143,0.18),_transparent_38%),linear-gradient(180deg,#161F42_0%,#0F1734_100%)] p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#FFB547]">VIBE_02 Daily Loop MVP</p>
              <h2 className="mt-3 font-display text-4xl font-bold text-[#F4F7FF] md:text-5xl">오늘의 바이브 챌린지</h2>
              <p className="mt-3 text-base leading-7 text-[#B8C3E6]">
                어려운 기능을 끝내는 날이 아니어도 괜찮아요. 오늘은 30분 안에 끝낼 수 있는 작은 수정 하나로
                바이브를 이어가면 됩니다.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-[#B8C3E6] sm:grid-cols-3">
              <div className="rounded-2xl border border-[#2A3A6A] bg-[#111936]/80 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#8A96BE]">오늘 난이도</p>
                <p className="mt-2 font-semibold text-[#F4F7FF]">{dailyMission.level === "beginner" ? "입문자" : dailyMission.level === "mid" ? "중급" : "집중 모드"}</p>
              </div>
              <div className="rounded-2xl border border-[#2A3A6A] bg-[#111936]/80 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#8A96BE]">누적 완료</p>
                <p className="mt-2 font-semibold text-[#F4F7FF]">{streakBadge} {currentProgress.streak}일</p>
              </div>
              <div className="rounded-2xl border border-[#2A3A6A] bg-[#111936]/80 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#8A96BE]">오늘 분위기</p>
                <p className="mt-2 font-semibold text-[#F4F7FF]">{currentProgress.completed ? "완료했어요" : "지금 시작 가능"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden border-[#111936] bg-[#161F42]">
            <CardContent className="space-y-6 p-6 md:p-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFB547]">daily mission</p>
                  <h3 className="mt-2 font-display text-3xl font-bold text-[#F4F7FF]">{dailyMission.title}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#B8C3E6]">{dailyMission.description}</p>
                </div>
                <Badge className="bg-[#FF5D8F] text-white">{dailyMission.timeEstimate}</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[#111936] bg-[#0B1020]/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8A96BE]">힌트</p>
                  <p className="mt-2 text-sm leading-6 text-[#D8E0FF]">{dailyMission.hint}</p>
                </div>
                <div className="rounded-2xl border border-[#111936] bg-[#0B1020]/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8A96BE]">추천 도구</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dailyMission.tools.map((tool) => (
                      <Badge key={tool} className="bg-[#111936] text-[#B8C3E6]">{tool}</Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#111936] bg-[#0B1020]/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8A96BE]">왜 이걸 하냐면</p>
                  <p className="mt-2 text-sm leading-6 text-[#D8E0FF]">{dailyMission.reason}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#111936] bg-[#0B1020]/70 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-[#B8C3E6]">
                    <p>오늘 {dailyMission.participants}명이 같은 챌린지를 보고 있어요.</p>
                    <p className="mt-1">완료율은 {dailyMission.completionRate}%예요. 완벽하게 끝내는 것보다 오늘 끊기지 않는 게 중요합니다.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={handleAskHelp}
                      className="border-[#3B4A78] text-[#B8C3E6] hover:bg-[#111936]"
                    >
                      {currentProgress.askedForHelp ? "질문 준비 완료" : "질문있어요"}
                    </Button>
                    <Button
                      onClick={handleComplete}
                      className="bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
                    >
                      {currentProgress.completed ? "오늘 챌린지 완료" : dailyMission.actionLabel}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <TodayGlossaryChallengeCard onSelectTerm={handleSelectGlossaryTerm} />

            <Card className="border-[#111936] bg-[#161F42]">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8A96BE]">mini prompts</p>
                  <h3 className="mt-2 font-display text-2xl font-bold text-[#F4F7FF]">막히면 이 셋 중 하나만 해도 충분해요</h3>
                </div>
                <div className="space-y-3">
                  {miniMissions.map((mission, index) => (
                    <div key={mission.id} className="rounded-2xl border border-[#111936] bg-[#0B1020]/60 px-4 py-3">
                      <p className="text-sm font-semibold text-[#F4F7FF]">{index + 1}. {mission.title}</p>
                      <p className="mt-1 text-sm text-[#B8C3E6]">{mission.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}
