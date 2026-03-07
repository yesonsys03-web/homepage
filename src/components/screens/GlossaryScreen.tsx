import { useMemo, useState } from "react"

import { TopNav } from "@/components/TopNav"
import { Toast } from "@/components/Toast"
import { glossaryTerms, type GlossaryCategory } from "@/data/glossary"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

type Screen =
  | "home"
  | "detail"
  | "submit"
  | "profile"
  | "admin"
  | "login"
  | "register"
  | "explore"
  | "challenges"
  | "about"
  | "playground"
  | "glossary"
  | "curated"

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
}

const categories: Array<"전체" | GlossaryCategory> = [
  "전체",
  "기본개념",
  "터미널",
  "파일구조",
  "배포",
  "AI도구",
  "에러",
]

export function GlossaryScreen({ onNavigate }: ScreenProps) {
  const [query, setQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<"전체" | GlossaryCategory>("전체")
  const [activeTermId, setActiveTermId] = useState<string | null>(null)
  const [requestedTerm, setRequestedTerm] = useState("")
  const [contextNote, setContextNote] = useState("")
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastTone, setToastTone] = useState<"info" | "success" | "error">("info")

  const requestedTermTrimmed = requestedTerm.trim()
  const canSubmitRequest = requestedTermTrimmed.length >= 2 && requestedTermTrimmed.length <= 80

  const filteredTerms = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return glossaryTerms.filter((term) => {
      const categoryMatched = selectedCategory === "전체" || term.category === selectedCategory
      if (!categoryMatched) {
        return false
      }

      if (!normalized) {
        return true
      }

      return (
        term.term.toLowerCase().includes(normalized)
        || term.one_liner.toLowerCase().includes(normalized)
        || term.analogy.toLowerCase().includes(normalized)
        || term.related.some((relatedTerm) => relatedTerm.toLowerCase().includes(normalized))
      )
    })
  }, [query, selectedCategory])

  const handleRelatedTermClick = (relatedTerm: string) => {
    const matched = glossaryTerms.find((term) => term.term.toLowerCase() === relatedTerm.toLowerCase())

    if (matched) {
      setSelectedCategory("전체")
      setQuery(matched.term)
      setActiveTermId(matched.id)
      setToastTone("info")
      setToastMessage(`${matched.term} 용어로 이동했어요.`)
      return
    }

    setQuery(relatedTerm)
    setSelectedCategory("전체")
    setActiveTermId(null)
    setToastTone("info")
    setToastMessage(`${relatedTerm} 관련 용어를 검색했어요.`)
  }

  const handleRequestTerm = async () => {
    if (!canSubmitRequest || isSubmittingRequest) {
      return
    }

    setIsSubmittingRequest(true)
    setRequestError(null)

    try {
      await api.requestGlossaryTerm(requestedTermTrimmed, contextNote.trim() || undefined)
      setRequestedTerm("")
      setContextNote("")
      setToastTone("success")
      setToastMessage("용어 신청이 접수됐어요. 검토 후 사전에 반영할게요.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "용어 신청에 실패했습니다."
      setRequestError(message)
      setToastTone("error")
      setToastMessage(message)
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <TopNav active="glossary" onNavigate={onNavigate} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <header className="mb-6 rounded-2xl border border-[#111936] bg-[#161F42] p-6">
          <h2 className="font-display text-3xl font-bold text-[#F4F7FF]">📚 바이브 용어사전</h2>
          <p className="mt-2 text-[#B8C3E6]">정의보다 비유로, 코알못도 바로 이해할 수 있게 정리했어요.</p>

          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="용어 검색 (예: API, pnpm, CORS)"
            className="mt-4 border-[#3B4A78] bg-[#0B1020] text-[#F4F7FF] placeholder:text-[#8A96BE]"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  selectedCategory === category
                    ? "bg-[#23D5AB] text-[#0B1020]"
                    : "bg-[#111936] text-[#B8C3E6] hover:bg-[#1B2854]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {filteredTerms.map((term) => (
            <Card
              key={term.id}
              className={`border bg-[#161F42] ${
                activeTermId === term.id ? "border-[#23D5AB]" : "border-[#111936]"
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-[#F4F7FF]">
                  <span className="flex items-center gap-2">
                    <span>{term.emoji}</span>
                    <span>{term.term}</span>
                  </span>
                  <Badge className="bg-[#111936] text-[#B8C3E6]">{term.category}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-[#B8C3E6]">
                <p className="text-[#F4F7FF]">{term.one_liner}</p>
                <p>{term.analogy}</p>
                <p className="text-[#8A96BE]">{term.when_appears}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {term.related.map((relatedTerm) => (
                    <button
                      key={`${term.id}-${relatedTerm}`}
                      type="button"
                      onClick={() => handleRelatedTermClick(relatedTerm)}
                      className="rounded-full bg-[#111936] px-2 py-1 text-xs transition-colors hover:bg-[#1B2854]"
                    >
                      #{relatedTerm}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-[#111936] bg-[#161F42] p-6">
          <h3 className="font-display text-2xl font-bold text-[#F4F7FF]">➕ 없는 용어 신청하기</h3>
          <p className="mt-2 text-[#B8C3E6]">원하는 용어가 없으면 요청을 남겨주세요. 다음 업데이트 후보에 반영합니다.</p>

          <div className="mt-4 grid gap-3">
            <Input
              value={requestedTerm}
              onChange={(event) => setRequestedTerm(event.target.value.slice(0, 80))}
              placeholder="추가하고 싶은 용어 (2~80자)"
              className="border-[#3B4A78] bg-[#0B1020] text-[#F4F7FF] placeholder:text-[#8A96BE]"
            />
            <textarea
              value={contextNote}
              onChange={(event) => setContextNote(event.target.value.slice(0, 300))}
              placeholder="왜 필요한지, 어떤 상황에서 헷갈렸는지 적어주세요 (선택)"
              className="min-h-24 rounded-xl border border-[#3B4A78] bg-[#0B1020] px-4 py-3 text-sm text-[#F4F7FF] placeholder:text-[#8A96BE] focus:border-[#23D5AB] focus:outline-none"
            />

            <div className="flex items-center justify-between text-xs text-[#8A96BE]">
              <span>용어 길이: {requestedTermTrimmed.length}/80</span>
              <span>메모 길이: {contextNote.trim().length}/300</span>
            </div>

            {requestError ? <p className="text-sm text-[#FF6B6B]">{requestError}</p> : null}

            <Button
              onClick={handleRequestTerm}
              disabled={!canSubmitRequest || isSubmittingRequest}
              className="w-fit bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
            >
              {isSubmittingRequest ? "신청 중..." : "이 용어 신청하기"}
            </Button>
          </div>
        </section>
      </main>
      {toastMessage ? <Toast message={toastMessage} tone={toastTone} /> : null}
    </div>
  )
}
