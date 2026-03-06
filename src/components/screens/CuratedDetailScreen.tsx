import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { TopNav } from "@/components/TopNav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api, type CuratedContent } from "@/lib/api"

type Screen =
  | "home"
  | "detail"
  | "submit"
  | "profile"
  | "admin"
  | "login"
  | "register"
  | "explore"
  | "playground"
  | "glossary"
  | "curated"
  | "challenges"
  | "about"

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
}

type RelatedRecommendation = {
  item: CuratedContent
  reasons: string[]
}

function parseDateMs(value: string): number | null {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function freshnessScore(item: CuratedContent, nowMs: number): number {
  const sourceMs = parseDateMs(item.github_pushed_at) ?? parseDateMs(item.collected_at)
  if (sourceMs === null) {
    return 0
  }

  const dayMs = 24 * 60 * 60 * 1000
  const elapsedDays = Math.max(0, (nowMs - sourceMs) / dayMs)
  return Math.max(0, 30 - elapsedDays)
}

export function CuratedDetailScreen({ onNavigate }: ScreenProps) {
  const navigate = useNavigate()
  const params = useParams<{ contentId: string }>()
  const contentId = Number(params.contentId)
  const [item, setItem] = useState<CuratedContent | null>(null)
  const [relatedItems, setRelatedItems] = useState<RelatedRecommendation[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(contentId) || contentId <= 0) {
      setError("유효하지 않은 콘텐츠 ID입니다.")
      setLoading(false)
      return
    }

    const fetchDetail = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.getCuratedContentDetail(contentId)
        setItem(data)
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "큐레이션 상세를 불러오지 못했습니다."
        setError(message)
        setItem(null)
      } finally {
        setLoading(false)
      }
    }

    void fetchDetail()
  }, [contentId])

  const cleanedTags = useMemo(() => (item?.tags || []).filter(Boolean), [item?.tags])

  useEffect(() => {
    if (!item) {
      setRelatedItems([])
      return
    }

    const fetchRelated = async () => {
      setRelatedLoading(true)
      try {
        const response = await api.getCuratedContent({
          category: item.category || undefined,
          sort: "latest",
          limit: 24,
          offset: 0,
        })

        const nowMs = Date.now()
        const currentTagSet = new Set((item.tags || []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))
        const scored = (response.items || [])
          .filter((candidate) => candidate.id !== item.id)
          .map((candidate) => {
            const candidateTags = (candidate.tags || []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)
            const overlapCount = candidateTags.reduce((count, tag) => count + (currentTagSet.has(tag) ? 1 : 0), 0)
            const quality = typeof candidate.quality_score === "number" ? candidate.quality_score : 0
            const relevance = typeof candidate.relevance_score === "number" ? candidate.relevance_score : 0
            const freshness = freshnessScore(candidate, nowMs)
            const languageMatch = item.language && candidate.language && item.language === candidate.language ? 1 : 0
            const koreanMatch = item.is_korean_dev && candidate.is_korean_dev ? 1 : 0

            const reasons: string[] = []
            if (overlapCount > 0) {
              reasons.push(`태그 ${overlapCount}개 일치`)
            }
            if (freshness >= 20) {
              reasons.push("최근 업데이트")
            }
            if (quality >= 8) {
              reasons.push("품질 점수 높음")
            }
            if (languageMatch > 0 && item.language) {
              reasons.push(`${item.language} 언어 일치`)
            }
            if (koreanMatch > 0) {
              reasons.push("KR Dev 일치")
            }
            if (reasons.length === 0) {
              reasons.push("유사 카테고리")
            }

            return {
              candidate,
              reasons,
              score:
                overlapCount * 120
                + quality * 9
                + relevance * 8
                + freshness * 2
                + languageMatch * 12
                + koreanMatch * 8,
            }
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 4)
          .map((entry) => ({ item: entry.candidate, reasons: entry.reasons }))

        setRelatedItems(scored)
      } catch {
        setRelatedItems([])
      } finally {
        setRelatedLoading(false)
      }
    }

    void fetchRelated()
  }, [item])

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <TopNav active="curated" onNavigate={onNavigate} titleSuffix="Curated" />

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-5 flex items-center justify-between">
          <Button
            variant="outline"
            className="border-[#3B4A78] text-[#B8C3E6] hover:bg-[#111936]"
            onClick={() => navigate("/curated")}
          >
            ← 목록으로
          </Button>
          {item?.source_url ? (
            <a
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#23D5AB] hover:underline"
            >
              원본 GitHub 열기
            </a>
          ) : null}
        </div>

        {loading ? (
          <div className="h-80 animate-pulse rounded-2xl border border-[#111936] bg-[#161F42]" />
        ) : null}

        {error ? (
          <p className="rounded-xl border border-[#FF6B6B]/40 bg-[#2A1320] px-4 py-3 text-sm text-[#FFB7B7]">{error}</p>
        ) : null}

        {!loading && item ? (
          <div className="space-y-4">
            <Card className="border-[#111936] bg-[#161F42]">
              <CardHeader>
                <CardTitle className="text-2xl text-[#F4F7FF]">{item.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-[#111936] text-[#B8C3E6]">{item.category || "미분류"}</Badge>
                  <Badge className="bg-[#111936] text-[#B8C3E6]">{item.language || "Unknown"}</Badge>
                  <Badge className="bg-[#111936] text-[#B8C3E6]">⭐ {item.stars}</Badge>
                  {item.is_korean_dev ? <Badge className="bg-[#1A3B35] text-[#8CF0D2]">KR Dev</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#B8C3E6]">
                <p><strong className="text-[#F4F7FF]">repo:</strong> {item.repo_owner}/{item.repo_name}</p>
                <p><strong className="text-[#F4F7FF]">license:</strong> {item.license || "Unknown"}</p>
                <p><strong className="text-[#F4F7FF]">quality:</strong> {item.quality_score ?? "-"} / relevance: {item.relevance_score ?? "-"}</p>
                {cleanedTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {cleanedTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[#111936] px-2 py-1 text-xs">#{tag}</span>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-[#111936] bg-[#161F42]">
              <CardHeader>
                <CardTitle className="text-[#F4F7FF]">초보자 요약</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#B8C3E6]">{item.summary_beginner || "요약이 준비되지 않았습니다."}</CardContent>
            </Card>

            <Card className="border-[#111936] bg-[#161F42]">
              <CardHeader>
                <CardTitle className="text-[#F4F7FF]">중급자 요약</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#B8C3E6]">{item.summary_mid || "요약이 준비되지 않았습니다."}</CardContent>
            </Card>

            <Card className="border-[#111936] bg-[#161F42]">
              <CardHeader>
                <CardTitle className="text-[#F4F7FF]">전문가 요약</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#B8C3E6]">{item.summary_expert || "요약이 준비되지 않았습니다."}</CardContent>
            </Card>

            <Card className="border-[#111936] bg-[#161F42]">
              <CardHeader>
                <CardTitle className="text-[#F4F7FF]">관련 큐레이션</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatedLoading ? <p className="text-sm text-[#8A96BE]">관련 항목을 불러오는 중...</p> : null}

                {!relatedLoading && relatedItems.length === 0 ? (
                  <p className="text-sm text-[#8A96BE]">같은 주제의 추천 항목이 아직 없어요.</p>
                ) : null}

                {relatedItems.map((related) => (
                  <button
                    key={related.item.id}
                    type="button"
                    onClick={() => {
                      if (item) {
                        void api.trackCuratedRelatedClick(
                          item.id,
                          related.item.id,
                          related.reasons[0] || "관련 추천 클릭",
                        ).catch((error) => {
                          console.error("Failed to log curated related click:", error)
                        })
                      }
                      navigate(`/curated/${related.item.id}`)
                    }}
                    className="block w-full rounded-xl border border-[#111936] bg-[#0B1020] px-4 py-3 text-left transition-colors hover:border-[#23D5AB]/50"
                  >
                    <p className="font-medium text-[#F4F7FF]">{related.item.title}</p>
                    <p className="mt-1 text-xs text-[#8A96BE]">{related.item.repo_owner}/{related.item.repo_name} · ⭐ {related.item.stars}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {related.reasons.slice(0, 3).map((reason) => (
                        <span key={`${related.item.id}-${reason}`} className="rounded-full bg-[#111936] px-2 py-0.5 text-[11px] text-[#B8C3E6]">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  )
}
