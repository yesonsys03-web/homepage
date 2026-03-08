import { useEffect, useMemo, useState } from "react"

import { TopNav } from "@/components/TopNav"
import { Toast } from "@/components/Toast"
import { GlossaryHighlightedText } from "@/components/GlossaryHighlightedText"
import { GlossaryHoverTerm } from "@/components/GlossaryHoverTerm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type GlossaryTerm } from "@/data/glossary"
import { recipes, recipeCategories, type RecipeCategoryFilter } from "@/data/recipes"
import { Input } from "@/components/ui/input"
import { api, type ErrorTranslateResponse, type TextTranslateResponse } from "@/lib/api"
import { setGlossaryFocusTerm } from "@/lib/glossary-navigation"
import { findGlossaryTerm } from "@/lib/glossary-text"

type Screen =
  | "home"
  | "detail"
  | "submit"
  | "profile"
  | "admin"
  | "login"
  | "register"
  | "explore"
  | "showcase"
  | "challenges"
  | "about"
  | "playground"
  | "glossary"
  | "curated"

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
}

const RECIPE_FAVORITES_KEY = "vibecoder_recipe_favorites"
const TEXT_TRANSLATION_HISTORY_KEY = "vibecoder_text_translation_history"

type TranslatorMode = "error" | "text"

type TranslationHistoryItem = {
  input: string
  summary: string
}

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
  const [translatorMode, setTranslatorMode] = useState<TranslatorMode>("error")
  const [errorMessage, setErrorMessage] = useState("")
  const [translationInput, setTranslationInput] = useState("")
  const [query, setQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategoryFilter>("전체")
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null)
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<string[]>([])
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [showPlanB, setShowPlanB] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)
  const [translateResult, setTranslateResult] = useState<ErrorTranslateResponse | null>(null)
  const [textTranslateResult, setTextTranslateResult] = useState<TextTranslateResponse | null>(null)
  const [translationHistory, setTranslationHistory] = useState<TranslationHistoryItem[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastTone, setToastTone] = useState<"info" | "success" | "error">("info")

  const trimmedError = errorMessage.trim()
  const canTranslate = trimmedError.length > 0 && trimmedError.length <= 2000
  const trimmedTranslationInput = translationInput.trim()
  const canTranslateText = trimmedTranslationInput.length > 0 && trimmedTranslationInput.length <= 2000

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RECIPE_FAVORITES_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        setFavoriteRecipeIds(parsed.filter((value): value is string => typeof value === "string"))
      }
    } catch {
      window.localStorage.removeItem(RECIPE_FAVORITES_KEY)
    }
  }, [])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TEXT_TRANSLATION_HISTORY_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        setTranslationHistory(
          parsed.filter((item): item is TranslationHistoryItem => (
            typeof item === "object"
            && item !== null
            && typeof item.input === "string"
            && typeof item.summary === "string"
          )).slice(0, 5),
        )
      }
    } catch {
      window.localStorage.removeItem(TEXT_TRANSLATION_HISTORY_KEY)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(RECIPE_FAVORITES_KEY, JSON.stringify(favoriteRecipeIds))
  }, [favoriteRecipeIds])

  useEffect(() => {
    window.localStorage.setItem(TEXT_TRANSLATION_HISTORY_KEY, JSON.stringify(translationHistory.slice(0, 5)))
  }, [translationHistory])

  const filteredRecipes = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return recipes.filter((recipe) => (
      (selectedCategory === "전체" || recipe.category === selectedCategory)
      && (!favoritesOnly || favoriteRecipeIds.includes(recipe.id))
      && (
        !normalized
        || recipe.title.toLowerCase().includes(normalized)
        || recipe.command.toLowerCase().includes(normalized)
        || recipe.description.toLowerCase().includes(normalized)
        || recipe.explanation.toLowerCase().includes(normalized)
        || recipe.category.toLowerCase().includes(normalized)
      )
    ))
  }, [favoriteRecipeIds, favoritesOnly, query, selectedCategory])

  const favoriteCount = favoriteRecipeIds.length

  const handleTranslate = async () => {
    if (!canTranslate || isTranslating) {
      return
    }
    setIsTranslating(true)
    setTranslateError(null)

    try {
      const translated = await api.errorTranslate(trimmedError)
      setTranslateResult(translated)
      setTextTranslateResult(null)
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

  const handleTextTranslate = async () => {
    if (!canTranslateText || isTranslating) {
      return
    }
    setIsTranslating(true)
    setTranslateError(null)

    try {
      const translated = await api.textTranslate(trimmedTranslationInput)
      setTextTranslateResult(translated)
      setTranslateResult(null)
      setTranslationHistory((current) => {
        const nextItem = {
          input: trimmedTranslationInput,
          summary: translated.korean_summary,
        }
        return [nextItem, ...current.filter((item) => item.input !== nextItem.input)].slice(0, 5)
      })
      setToastTone("success")
      setToastMessage(translated.source === "cache" ? "저장된 번역을 불러왔어요." : "텍스트를 쉬운 말로 정리했어요.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "텍스트 번역에 실패했습니다."
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

  const handleCopyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command)
      setToastTone("success")
      setToastMessage("명령어를 복사했어요.")
    } catch {
      setToastTone("error")
      setToastMessage("복사에 실패했어요. 직접 선택해서 복사해주세요.")
    }
  }

  const handleFocusGlossaryTerm = (term: string) => {
    setGlossaryFocusTerm(term)
    onNavigate?.("glossary")
  }

  const handleSelectGlossaryTerm = (term: GlossaryTerm) => {
    handleFocusGlossaryTerm(term.term)
  }

  const handleToggleFavorite = (recipeId: string) => {
    setFavoriteRecipeIds((current) => {
      if (current.includes(recipeId)) {
        setToastTone("info")
        setToastMessage("즐겨찾기에서 제거했어요.")
        return current.filter((id) => id !== recipeId)
      }
      setToastTone("success")
      setToastMessage("즐겨찾기에 저장했어요.")
      return [...current, recipeId]
    })
  }

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <TopNav active="playground" onNavigate={onNavigate} />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8">
        <section className="rounded-2xl border border-[#111936] bg-[#161F42] p-6">
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTranslatorMode("error")}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                translatorMode === "error"
                  ? "bg-[#23D5AB] text-[#0B1020]"
                  : "bg-[#111936] text-[#B8C3E6] hover:bg-[#1B2854]"
              }`}
            >
              에러 번역
            </button>
            <button
              type="button"
              onClick={() => setTranslatorMode("text")}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                translatorMode === "text"
                  ? "bg-[#23D5AB] text-[#0B1020]"
                  : "bg-[#111936] text-[#B8C3E6] hover:bg-[#1B2854]"
              }`}
            >
              텍스트 번역
            </button>
          </div>
          <h2 className="font-display text-3xl font-bold text-[#F4F7FF]">🚑 에러 응급실</h2>
          <p className="mt-2 text-[#B8C3E6]">
            {translatorMode === "error"
              ? "막힌 에러를 한국어로 풀어보고 다음 행동을 바로 확인하세요."
              : "영어 README나 기술 설명을 쉬운 한국어와 비유로 바꿔보세요."}
          </p>

          <div className="mt-6 grid gap-4">
            {translatorMode === "error" ? (
              <textarea
                value={errorMessage}
                onChange={(event) => setErrorMessage(event.target.value.slice(0, 2000))}
                placeholder="터미널 에러 메시지를 붙여넣으세요 (최대 2,000자)"
                className="min-h-40 w-full rounded-xl border border-[#111936] bg-[#0B1020] px-4 py-3 text-sm text-[#F4F7FF] placeholder:text-[#8A96BE] focus:border-[#23D5AB] focus:outline-none"
              />
            ) : (
              <textarea
                value={translationInput}
                onChange={(event) => setTranslationInput(event.target.value.slice(0, 2000))}
                placeholder="영어 README, 기술 문장, 명령 설명을 붙여넣으세요 (최대 2,000자)"
                className="min-h-40 w-full rounded-xl border border-[#111936] bg-[#0B1020] px-4 py-3 text-sm text-[#F4F7FF] placeholder:text-[#8A96BE] focus:border-[#23D5AB] focus:outline-none"
              />
            )}

            <div className="flex items-center justify-between text-xs text-[#8A96BE]">
              <span>입력 길이: {(translatorMode === "error" ? trimmedError.length : trimmedTranslationInput.length)}/2000</span>
              <span>{translatorMode === "error" ? "위험 명령어는 기본 단계에서 숨김 처리됩니다." : "최근 5개 번역은 이 브라우저에만 저장됩니다."}</span>
            </div>

            <div className="flex gap-3">
              <Button
                disabled={translatorMode === "error" ? !canTranslate : !canTranslateText}
                onClick={translatorMode === "error" ? handleTranslate : handleTextTranslate}
                className="bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
              >
                {isTranslating ? "번역 중..." : "번역하기"}
              </Button>
              {translatorMode === "error" ? (
                <Button
                  variant="outline"
                  onClick={() => setShowPlanB((value) => !value)}
                  className="border-[#3B4A78] text-[#B8C3E6] hover:bg-[#111936]"
                >
                  {showPlanB ? "플랜B 숨기기" : "플랜B 보기"}
                </Button>
              ) : null}
            </div>

            {translatorMode === "text" && translationHistory.length > 0 ? (
              <div className="rounded-xl border border-[#111936] bg-[#0B1020] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8A96BE]">recent translations</p>
                <div className="mt-3 grid gap-2">
                  {translationHistory.map((item) => (
                    <button
                      key={`${item.input}-${item.summary}`}
                      type="button"
                      onClick={() => setTranslationInput(item.input)}
                      className="rounded-lg border border-[#1B2854] px-3 py-2 text-left transition-colors hover:bg-[#111936]"
                    >
                      <p className="truncate text-sm text-[#F4F7FF]">{item.input}</p>
                      <p className="mt-1 truncate text-xs text-[#8A96BE]">{item.summary}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <Card className="border-[#111936] bg-[#0B1020]">
              <CardHeader>
                <CardTitle className="text-[#F4F7FF]">
                  {translatorMode === "error"
                    ? (translateResult ? "번역 결과" : "샘플 응답 (MVP)")
                    : (textTranslateResult ? "텍스트 번역 결과" : "샘플 응답 (MVP)")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#B8C3E6]">
                {translateError ? (
                  <p className="text-[#FF6B6B]">{translateError}</p>
                ) : null}

                {translatorMode === "error" && translateResult ? (
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
                ) : null}

                {translatorMode === "text" && textTranslateResult ? (
                  <>
                    <p>
                      <strong className="text-[#F4F7FF]">이 말은요:</strong>{" "}
                      <GlossaryHighlightedText text={textTranslateResult.korean_summary} onSelectTerm={handleSelectGlossaryTerm} />
                    </p>
                    <p>
                      <strong className="text-[#F4F7FF]">쉽게 말하면:</strong>{" "}
                      <GlossaryHighlightedText text={textTranslateResult.simple_analogy} onSelectTerm={handleSelectGlossaryTerm} />
                    </p>
                    {textTranslateResult.commands.length > 0 ? (
                      <div className="space-y-2">
                        <strong className="text-[#F4F7FF]">실행 명령어</strong>
                        {textTranslateResult.commands.map((command, index) => (
                          <div key={`${command.command}-${index}`} className="rounded-lg border border-[#1B2854] bg-[#111936] p-3">
                            <GlossaryHighlightedText as="p" text={command.description} onSelectTerm={handleSelectGlossaryTerm} />
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <code className="text-[#23D5AB]">{command.command}</code>
                              <Button
                                size="sm"
                                className="bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
                                onClick={() => void handleCopyCommand(command.command)}
                              >
                                복사
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {textTranslateResult.related_terms.length > 0 ? (
                      <div className="space-y-2">
                        <strong className="text-[#F4F7FF]">연관 용어</strong>
                        <div className="flex flex-wrap gap-2">
                          {textTranslateResult.related_terms.map((term) => {
                            const matchedTerm = findGlossaryTerm(term)

                            if (!matchedTerm) {
                              return (
                                <button
                                  key={term}
                                  type="button"
                                  onClick={() => handleFocusGlossaryTerm(term)}
                                  className="rounded-full bg-[#111936] px-3 py-1 text-xs text-[#B8C3E6] transition-colors hover:bg-[#1B2854]"
                                >
                                  #{term}
                                </button>
                              )
                            }

                            return (
                              <GlossaryHoverTerm key={term} term={matchedTerm} variant="chip" onSelectTerm={handleSelectGlossaryTerm}>
                                #{term}
                              </GlossaryHoverTerm>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {translatorMode === "error" && !translateResult ? (
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
                ) : null}

                {translatorMode === "text" && !textTranslateResult ? (
                  <>
                    <p><strong className="text-[#F4F7FF]">이 말은요:</strong> 영어 README나 기술 설명을 한국어로 다시 풀어주는 영역이에요.</p>
                    <p><strong className="text-[#F4F7FF]">쉽게 말하면:</strong> 개발자 문장을 친구가 쉬운 말로 다시 읽어주는 느낌이에요.</p>
                    <p className="text-[#8A96BE]">명령어가 들어 있으면 복사 가능한 실행 단계도 함께 보여드려요.</p>
                  </>
                ) : null}
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
            <div className="flex w-full flex-col gap-3 sm:max-w-xl sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFavoritesOnly((value) => !value)}
                className={`border-[#3B4A78] ${favoritesOnly ? "bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90" : "text-[#B8C3E6] hover:bg-[#111936]"}`}
              >
                즐겨찾기 {favoriteCount > 0 ? `${favoriteCount}개` : "보기"}
              </Button>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="명령어 검색 (예: install, dev)"
                className="w-full border-[#3B4A78] bg-[#0B1020] text-[#F4F7FF] placeholder:text-[#8A96BE] sm:max-w-xs"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {recipeCategories.map((category) => (
              <button
                key={category}
                type="button"
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

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {filteredRecipes.length === 0 ? (
              <Card className="border-[#111936] bg-[#0B1020] md:col-span-2">
                <CardContent className="pt-6 text-sm text-[#B8C3E6]">
                  지금 조건에 맞는 레시피가 없어요. 다른 검색어를 쓰거나 즐겨찾기 필터를 꺼보세요.
                </CardContent>
              </Card>
            ) : null}
            {filteredRecipes.map((recipe) => {
              const isUnsafe = isPotentiallyUnsafeCommand(recipe.command)
              const isExpanded = expandedRecipeId === recipe.id
              const isFavorite = favoriteRecipeIds.includes(recipe.id)
              return (
                <Card key={recipe.id} className="border-[#111936] bg-[#0B1020]">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base text-[#F4F7FF]">
                      <span>{recipe.title}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={isFavorite ? `${recipe.title} 즐겨찾기 해제` : `${recipe.title} 즐겨찾기 추가`}
                          onClick={() => handleToggleFavorite(recipe.id)}
                          className={`rounded-full px-2 py-1 text-xs transition-colors ${
                            isFavorite ? "bg-[#FFB547] text-[#0B1020]" : "bg-[#111936] text-[#B8C3E6] hover:bg-[#1B2854]"
                          }`}
                        >
                          {isFavorite ? "★ 저장됨" : "☆ 저장"}
                        </button>
                        <span className="rounded-full bg-[#111936] px-2 py-1 text-xs text-[#B8C3E6]">{recipe.category}</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-[#B8C3E6]">
                    <div className="rounded-lg bg-[#111936] p-3">
                      <code className="block text-[#23D5AB]">{recipe.command}</code>
                    </div>
                    <p>{recipe.description}</p>
                    {isUnsafe ? (
                      <p className="text-[#FFB547]">주의: 위험 명령어이므로 기본 단계가 아닌 복구 단계에서만 사용하세요.</p>
                    ) : null}
                    {recipe.warning ? <p className="text-[#FFB547]">주의: {recipe.warning}</p> : null}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => void handleCopyCommand(recipe.command)}
                        className="bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
                      >
                        복사
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedRecipeId((current) => current === recipe.id ? null : recipe.id)}
                        className="border-[#3B4A78] text-[#B8C3E6] hover:bg-[#111936]"
                      >
                        {isExpanded ? "설명 닫기" : "이게 뭐야?"}
                      </Button>
                    </div>
                    {isExpanded ? (
                      <div className="rounded-lg border border-[#1B2854] bg-[#0B1020] p-3 text-sm leading-6 text-[#B8C3E6]">
                        {recipe.explanation}
                      </div>
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
