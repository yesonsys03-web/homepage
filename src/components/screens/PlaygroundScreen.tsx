import { useMemo, useState } from "react"

import { TopNav } from "@/components/TopNav"
import { Toast } from "@/components/Toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { api, type ErrorTranslateResponse } from "@/lib/api"

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

type Recipe = {
  id: string
  category: string
  title: string
  command: string
  description: string
}

const recipes: Recipe[] = [
  {
    id: "dev-server",
    category: "서버",
    title: "개발 서버 켜기",
    command: "pnpm dev",
    description: "로컬에서 앱 화면을 바로 확인할 때 쓰는 기본 명령어예요.",
  },
  {
    id: "install",
    category: "설치",
    title: "패키지 설치",
    command: "pnpm install",
    description: "프로젝트 실행에 필요한 파일들을 한 번에 설치해요.",
  },
  {
    id: "hard-reset",
    category: "복구",
    title: "설치 꼬였을 때 재설치",
    command: "rm -rf node_modules && pnpm install",
    description: "기본 방법이 실패했을 때 쓰는 플랜B예요.",
  },
]

function isPotentiallyUnsafeCommand(command: string): boolean {
  const lowered = command.toLowerCase()
  return (
    lowered.includes("rm -rf")
    || lowered.includes("sudo")
    || lowered.includes("curl |")
    || lowered.includes("chmod 777")
  )
}

export function PlaygroundScreen({ onNavigate }: ScreenProps) {
  const [errorMessage, setErrorMessage] = useState("")
  const [query, setQuery] = useState("")
  const [showPlanB, setShowPlanB] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)
  const [translateResult, setTranslateResult] = useState<ErrorTranslateResponse | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastTone, setToastTone] = useState<"info" | "success" | "error">("info")

  const trimmedError = errorMessage.trim()
  const canTranslate = trimmedError.length > 0 && trimmedError.length <= 2000

  const filteredRecipes = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return recipes
    }
    return recipes.filter((recipe) => (
      recipe.title.toLowerCase().includes(normalized)
      || recipe.command.toLowerCase().includes(normalized)
      || recipe.description.toLowerCase().includes(normalized)
      || recipe.category.toLowerCase().includes(normalized)
    ))
  }, [query])

  const handleTranslate = async () => {
    if (!canTranslate || isTranslating) {
      return
    }
    setIsTranslating(true)
    setTranslateError(null)

    try {
      const translated = await api.errorTranslate(trimmedError)
      setTranslateResult(translated)
      setToastTone("success")
      setToastMessage(translated.source === "cache" ? "저장된 해결책을 불러왔어요." : "해결 가이드를 생성했어요.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "에러 번역에 실패했습니다."
      setTranslateError(message)
      setToastTone("error")
      setToastMessage(message)
    } finally {
      setIsTranslating(false)
    }
  }

  const handleFeedback = async (solved: boolean) => {
    if (!translateResult?.error_hash) {
      return
    }
    try {
      await api.sendErrorTranslateFeedback(translateResult.error_hash, solved)
      setToastTone("success")
      setToastMessage(solved ? "해결 피드백이 저장됐어요." : "실패 피드백이 저장됐어요.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "피드백 저장에 실패했습니다."
      setToastTone("error")
      setToastMessage(message)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <TopNav active="playground" onNavigate={onNavigate} />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8">
        <section className="rounded-2xl border border-[#111936] bg-[#161F42] p-6">
          <h2 className="font-display text-3xl font-bold text-[#F4F7FF]">🚑 에러 응급실</h2>
          <p className="mt-2 text-[#B8C3E6]">막힌 에러를 한국어로 풀어보고 다음 행동을 바로 확인하세요.</p>

          <div className="mt-6 grid gap-4">
            <textarea
              value={errorMessage}
              onChange={(event) => setErrorMessage(event.target.value.slice(0, 2000))}
              placeholder="터미널 에러 메시지를 붙여넣으세요 (최대 2,000자)"
              className="min-h-40 w-full rounded-xl border border-[#111936] bg-[#0B1020] px-4 py-3 text-sm text-[#F4F7FF] placeholder:text-[#8A96BE] focus:border-[#23D5AB] focus:outline-none"
            />

            <div className="flex items-center justify-between text-xs text-[#8A96BE]">
              <span>입력 길이: {trimmedError.length}/2000</span>
              <span>위험 명령어는 기본 단계에서 숨김 처리됩니다.</span>
            </div>

            <div className="flex gap-3">
              <Button
                disabled={!canTranslate}
                onClick={handleTranslate}
                className="bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
              >
                {isTranslating ? "번역 중..." : "번역하기"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPlanB((value) => !value)}
                className="border-[#3B4A78] text-[#B8C3E6] hover:bg-[#111936]"
              >
                {showPlanB ? "플랜B 숨기기" : "플랜B 보기"}
              </Button>
            </div>

            <Card className="border-[#111936] bg-[#0B1020]">
              <CardHeader>
                <CardTitle className="text-[#F4F7FF]">
                  {translateResult ? "번역 결과" : "샘플 응답 (MVP)"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#B8C3E6]">
                {translateError ? (
                  <p className="text-[#FF6B6B]">{translateError}</p>
                ) : null}

                {translateResult ? (
                  <>
                    <p>
                      <strong className="text-[#F4F7FF]">무슨 일이냐면:</strong>{" "}
                      {translateResult.what_happened}
                    </p>
                    {translateResult.fix_steps.map((step, index) => (
                      <p key={`${step.command}-${index}`}>
                        <strong className="text-[#F4F7FF]">해결 {index + 1}:</strong>{" "}
                        {step.description} <code>{step.command}</code>
                      </p>
                    ))}

                    {showPlanB ? (
                      <p>
                        <strong className="text-[#F4F7FF]">그래도 안 되면:</strong>{" "}
                        {translateResult.plan_b.description} <code>{translateResult.plan_b.command}</code>
                      </p>
                    ) : (
                      <p className="text-[#8A96BE]">플랜B는 기본 숨김 상태입니다.</p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
                        onClick={() => void handleFeedback(true)}
                      >
                        해결됐어요
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#3B4A78] text-[#B8C3E6] hover:bg-[#111936]"
                        onClick={() => void handleFeedback(false)}
                      >
                        아직 안 돼요
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p><strong className="text-[#F4F7FF]">무슨 일이냐면:</strong> 필요한 파일이 아직 설치되지 않았어요.</p>
                    <p><strong className="text-[#F4F7FF]">이렇게 해보세요:</strong> <code>pnpm install</code></p>
                    {showPlanB ? (
                      <p>
                        <strong className="text-[#F4F7FF]">그래도 안 되면:</strong>{" "}
                        <code>rm -rf node_modules && pnpm install</code>
                      </p>
                    ) : (
                      <p className="text-[#8A96BE]">플랜B는 기본 숨김 상태입니다.</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-2xl border border-[#111936] bg-[#161F42] p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-display text-2xl font-bold text-[#F4F7FF]">📖 명령어 레시피북</h3>
              <p className="mt-1 text-[#B8C3E6]">상황별 명령어를 빠르게 찾고 복사할 수 있어요.</p>
            </div>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="명령어 검색 (예: install, dev)"
              className="w-full border-[#3B4A78] bg-[#0B1020] text-[#F4F7FF] placeholder:text-[#8A96BE] sm:max-w-xs"
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {filteredRecipes.map((recipe) => {
              const isUnsafe = isPotentiallyUnsafeCommand(recipe.command)
              return (
                <Card key={recipe.id} className="border-[#111936] bg-[#0B1020]">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base text-[#F4F7FF]">
                      <span>{recipe.title}</span>
                      <span className="rounded-full bg-[#111936] px-2 py-1 text-xs text-[#B8C3E6]">{recipe.category}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-[#B8C3E6]">
                    <code className="block rounded-lg bg-[#111936] px-3 py-2 text-[#23D5AB]">{recipe.command}</code>
                    <p>{recipe.description}</p>
                    {isUnsafe ? (
                      <p className="text-[#FFB547]">주의: 위험 명령어이므로 기본 단계가 아닌 복구 단계에서만 사용하세요.</p>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      </main>
      {toastMessage ? <Toast message={toastMessage} tone={toastTone} /> : null}
    </div>
  )
}
