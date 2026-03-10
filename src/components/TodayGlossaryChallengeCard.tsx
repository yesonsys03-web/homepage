import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { glossaryCategoryTone, pickDailyGlossaryTerms, type GlossaryTerm } from "@/data/glossary"
import { parseLocalDateKey } from "@/lib/daily"
import { api } from "@/lib/api"
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "@/lib/safe-storage"
import { useLocalDateKey } from "@/lib/use-local-date-key"

const DAILY_GLOSSARY_PROGRESS_KEY = "vibecoder_daily_glossary_progress"
const DAILY_GLOSSARY_XP_KEY = "vibecoder_daily_glossary_xp"

type DailyGlossaryProgress = {
  dateKey: string
  understood: boolean
  quizSolved: boolean
  selectedAnswerId?: string
}

type TodayGlossaryChallengeCardProps = {
  onSelectTerm?: (term: GlossaryTerm) => void
}

export function getDailyGlossaryProgressBaseline(
  progress: DailyGlossaryProgress,
  dateKey: string,
): DailyGlossaryProgress {
  if (progress.dateKey === dateKey) {
    return progress
  }

  return {
    dateKey,
    understood: false,
    quizSolved: false,
  }
}

function readDailyProgress(dateKey: string): DailyGlossaryProgress {
  try {
    const raw = safeLocalStorageGetItem(DAILY_GLOSSARY_PROGRESS_KEY)
    if (!raw) return { dateKey, understood: false, quizSolved: false }
    const parsed = JSON.parse(raw) as Partial<DailyGlossaryProgress>
    if (parsed.dateKey !== dateKey) {
      return { dateKey, understood: false, quizSolved: false }
    }
    return {
      dateKey,
      understood: Boolean(parsed.understood),
      quizSolved: Boolean(parsed.quizSolved),
      selectedAnswerId: typeof parsed.selectedAnswerId === "string" ? parsed.selectedAnswerId : undefined,
    }
  } catch {
    return { dateKey, understood: false, quizSolved: false }
  }
}

function readDailyXp() {
  try {
    const raw = safeLocalStorageGetItem(DAILY_GLOSSARY_XP_KEY)
    const parsed = Number(raw || "0")
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  } catch {
    return 0
  }
}

function writeDailyGlossaryProgress(progress: DailyGlossaryProgress) {
  safeLocalStorageSetItem(DAILY_GLOSSARY_PROGRESS_KEY, JSON.stringify(progress))
}

function writeDailyGlossaryXp(xp: number) {
  safeLocalStorageSetItem(DAILY_GLOSSARY_XP_KEY, String(xp))
}

function buildQuizOptions(term: GlossaryTerm) {
  const distractors = pickDailyGlossaryTerms(new Date(term.id.length * 86400000), 4)
    .filter((item) => item.id !== term.id)
    .slice(0, 3)

  return [term, ...distractors]
    .sort((left, right) => left.id.localeCompare(right.id))
    .slice(0, 4)
}

export function TodayGlossaryChallengeCard({ onSelectTerm }: TodayGlossaryChallengeCardProps) {
  const dateKey = useLocalDateKey()
  const [progress, setProgress] = useState<DailyGlossaryProgress>({ dateKey, understood: false, quizSolved: false })
  const [earnedXp, setEarnedXp] = useState(0)

  const todayTerm = useMemo(() => pickDailyGlossaryTerms(parseLocalDateKey(dateKey), 1)[0], [dateKey])
  const quizOptions = useMemo(() => (todayTerm ? buildQuizOptions(todayTerm) : []), [todayTerm])

  useEffect(() => {
    setProgress(readDailyProgress(dateKey))
    setEarnedXp(readDailyXp())
  }, [dateKey])

  if (!todayTerm) return null

  const currentProgress = getDailyGlossaryProgressBaseline(progress, dateKey)

  const handleUnderstand = () => {
    const persistedProgress = getDailyGlossaryProgressBaseline(readDailyProgress(dateKey), dateKey)
    const currentXp = readDailyXp()
    const nextProgress: DailyGlossaryProgress = {
      dateKey,
      understood: true,
      quizSolved: persistedProgress.quizSolved,
      selectedAnswerId: persistedProgress.selectedAnswerId,
    }
    setProgress(nextProgress)
    writeDailyGlossaryProgress(nextProgress)

    if (!persistedProgress.understood) {
      const nextXp = currentXp + 5
      setEarnedXp(nextXp)
      writeDailyGlossaryXp(nextXp)
      api.awardXp("glossary_read", `${todayTerm.id}_${dateKey}`).catch(() => undefined)
    }
  }

  const handleQuizAnswer = (answer: GlossaryTerm) => {
    const persistedProgress = getDailyGlossaryProgressBaseline(readDailyProgress(dateKey), dateKey)
    const currentXp = readDailyXp()
    const isCorrect = answer.id === todayTerm.id
    const nextProgress: DailyGlossaryProgress = {
      dateKey,
      understood: persistedProgress.understood,
      selectedAnswerId: answer.id,
      quizSolved: isCorrect || persistedProgress.quizSolved,
    }
    setProgress(nextProgress)
    writeDailyGlossaryProgress(nextProgress)

    if (isCorrect && !persistedProgress.quizSolved) {
      const nextXp = currentXp + 10
      setEarnedXp(nextXp)
      writeDailyGlossaryXp(nextXp)
      api.awardXp("glossary_quiz_correct", `${todayTerm.id}_${dateKey}`).catch(() => undefined)
    }
  }

  const selectedWrongAnswer = currentProgress.selectedAnswerId && currentProgress.selectedAnswerId !== todayTerm.id && !currentProgress.quizSolved

  return (
    <Card className={`border bg-gradient-to-br ${glossaryCategoryTone(todayTerm.category)} overflow-hidden py-0`}>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8A96BE]">daily glossary</p>
            <h3 className="mt-2 font-display text-2xl font-bold text-[#F4F7FF]">🃏 오늘의 용어 카드</h3>
            <p className="mt-1 text-sm text-[#B8C3E6]">오늘 읽고 기억하면 막힐 때 더 빨리 떠오르는 용어예요.</p>
          </div>
          <Badge className="bg-[#111936] text-[#B8C3E6]">누적 XP {earnedXp}</Badge>
        </div>

        <div className="rounded-2xl border border-[#111936] bg-[#0B1020]/70 p-5">
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none">{todayTerm.emoji}</span>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8A96BE]">{todayTerm.category}</p>
              <h4 className="font-display text-2xl font-bold text-[#F4F7FF]">{todayTerm.term}</h4>
            </div>
          </div>
          <p className="mt-4 text-base font-semibold text-[#F4F7FF]">{todayTerm.one_liner}</p>
          <p className="mt-3 text-sm leading-6 text-[#D8E0FF]">{todayTerm.analogy}</p>
          <p className="mt-3 text-sm text-[#8A96BE]">💡 {todayTerm.when_appears}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleUnderstand}
              className="bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
            >
              {currentProgress.understood ? "오늘 이해 완료 +5 XP" : "이해했어요 +5 XP"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onSelectTerm?.(todayTerm)}
              className="border-[#3B4A78] text-[#B8C3E6] hover:bg-[#111936]"
            >
              사전에서 자세히 보기
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#111936] bg-[#0B1020]/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8A96BE]">mini quiz</p>
              <h4 className="mt-2 font-display text-xl font-bold text-[#F4F7FF]">🧠 오늘의 용어 퀴즈</h4>
            </div>
            <Badge className="bg-[#111936] text-[#B8C3E6]">정답 시 +10 XP</Badge>
          </div>

          <p className="mt-4 text-sm text-[#D8E0FF]">`{todayTerm.term}`는 무엇에 비유할 수 있을까요?</p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {quizOptions.map((option) => {
              const isCorrect = option.id === todayTerm.id
               const isSelected = currentProgress.selectedAnswerId === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleQuizAnswer(option)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    isSelected && isCorrect
                      ? "border-[#23D5AB] bg-[#23D5AB]/15 text-[#F4F7FF]"
                      : isSelected
                        ? "border-[#FF6B6B] bg-[#FF6B6B]/10 text-[#F4F7FF]"
                        : "border-[#1B2854] bg-[#111936] text-[#B8C3E6] hover:bg-[#18234A]"
                  }`}
                >
                  {option.analogy}
                </button>
              )
            })}
          </div>

          {currentProgress.quizSolved ? (
            <p className="mt-4 text-sm text-[#23D5AB]">정답! 오늘 퀴즈 XP를 획득했어요.</p>
          ) : selectedWrongAnswer ? (
            <p className="mt-4 text-sm text-[#FFB547]">아쉽지만 아직 아니에요. 다시 골라보세요.</p>
          ) : (
            <p className="mt-4 text-sm text-[#8A96BE]">오늘의 챌린지 옆에서 가볍게 풀어보는 용어 퀴즈예요.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
