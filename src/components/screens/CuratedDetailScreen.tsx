import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { GlossaryHighlightedText } from "@/components/GlossaryHighlightedText"
import { ProjectCoverPlaceholder } from "@/components/ProjectCoverPlaceholder"
import { Toast } from "@/components/Toast"
import { TopNav, type NavScreen } from "@/components/TopNav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type GlossaryTerm } from "@/data/glossary"
import { api, type CuratedContent, type CuratedRelatedRecommendation } from "@/lib/api"
import { readContentLevel, writeContentLevel } from "@/lib/content-level"
import { setGlossaryFocusTerm } from "@/lib/glossary-navigation"

interface ScreenProps {
  onNavigate?: (screen: NavScreen) => void
}

export function CuratedDetailScreen({ onNavigate }: ScreenProps) {
  const navigate = useNavigate()
  const params = useParams<{ contentId: string }>()
  const contentId = Number(params.contentId)
  const [item, setItem] = useState<CuratedContent | null>(null)
  const [relatedItems, setRelatedItems] = useState<CuratedRelatedRecommendation[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTone: "info" | "success" | "error" = "info"

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

  const handleSelectGlossaryTerm = (term: GlossaryTerm) => {
    setGlossaryFocusTerm(term.term)
    navigate("/glossary")
  }

  useEffect(() => {
    if (!item) {
      setRelatedItems([])
      return
    }

    const fetchRelated = async () => {
      setRelatedLoading(true)
      try {
        const response = await api.getCuratedRelatedContent(item.id, 4)
        setRelatedItems(response.items || [])
      } catch {
        setRelatedItems([])
      } finally {
        setRelatedLoading(false)
      }
    }

    void fetchRelated()
  }, [item])

  useEffect(() => {
    if (!shareCopied) return
    const timer = window.setTimeout(() => setShareCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [shareCopied])

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  const shareUrl = item ? `${window.location.origin}/curated/${item.id}` : ""

  const copyShareUrl = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl)
      return
    }
    const textarea = document.createElement("textarea")
    textarea.value = shareUrl
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    document.execCommand("copy")
    document.body.removeChild(textarea)
  }

  const handleShare = async (
    channel: "native" | "copy" | "x" | "facebook" | "linkedin" | "threads" | "instagram" | "kakao"
  ) => {
    if (!item) return
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedTitle = encodeURIComponent(item.title)
    const encodedSummary = encodeURIComponent(item.summary_beginner || "")

    try {
      if (channel === "native") {
        if (navigator.share) {
          await navigator.share({ title: item.title, text: item.summary_beginner || "", url: shareUrl })
          setShareMenuOpen(false)
          return
        }
        await copyShareUrl()
        setShareCopied(true)
        return
      }
      if (channel === "copy") {
        await copyShareUrl()
        setShareCopied(true)
        return
      }
      if (channel === "instagram") {
        await copyShareUrl()
        setShareCopied(true)
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer")
        return
      }
      if (channel === "kakao") {
        if (navigator.share) {
          await navigator.share({ title: item.title, text: `${item.title}\n${shareUrl}`, url: shareUrl })
          setShareMenuOpen(false)
          return
        }
        await copyShareUrl()
        setShareCopied(true)
        window.open("https://story.kakao.com/share", "_blank", "noopener,noreferrer")
        return
      }
      const shareMap = {
        x: `https://x.com/intent/tweet?text=${encodedTitle}%20-%20${encodedSummary}&url=${encodedUrl}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        threads: `https://www.threads.net/intent/post?text=${encodedTitle}%20-%20${encodedSummary}%20${encodedUrl}`,
      }
      window.open(shareMap[channel], "_blank", "noopener,noreferrer,width=620,height=700")
    } catch (err) {
      console.error("Share failed:", err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1020] px-4 py-10">
        <div className="max-w-7xl mx-auto animate-pulse space-y-4">
          <div className="h-10 w-1/2 bg-[#111936] rounded" />
          <div className="h-4 w-1/3 bg-[#111936] rounded" />
          <div className="aspect-video bg-[#111936] rounded-xl" />
          <div className="h-24 bg-[#111936] rounded-xl" />
          <div className="h-24 bg-[#111936] rounded-xl" />
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#0B1020] px-4 py-10">
        <div className="mx-auto max-w-xl rounded-xl border border-[#111936] bg-[#161F42] p-6 text-center">
          <h2 className="text-xl font-semibold text-[#F4F7FF]">콘텐츠를 찾을 수 없습니다</h2>
          <p className="mt-2 text-sm text-[#B8C3E6]">{error ?? "요청한 큐레이션을 불러올 수 없습니다."}</p>
          <Button
            type="button"
            className="mt-4 bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
            onClick={() => navigate("/curated")}
          >
            목록으로 이동
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <TopNav active="curated" onNavigate={onNavigate} titleSuffix="Curated" />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="font-display text-4xl font-bold text-[#F4F7FF] mb-2">{item.title}</h1>
              <div className="flex items-center gap-4 text-[#B8C3E6]">
                <span>by <strong className="text-[#F4F7FF]">{item.repo_owner}</strong></span>
                <span>•</span>
                <span>⭐ {item.stars}</span>
                <Badge variant="secondary" className="bg-[#111936] text-[#B8C3E6]">{item.category || "미분류"}</Badge>
                {item.is_korean_dev ? <Badge className="bg-[#1A3B35] text-[#8CF0D2]">🇰🇷 국산</Badge> : null}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-[#111936] text-[#B8C3E6] hover:bg-[#161F42] hover:text-[#F4F7FF]"
                onClick={() => navigate("/curated")}
              >
                ← 목록
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  className="border-[#111936] text-[#B8C3E6] hover:bg-[#161F42] hover:text-[#F4F7FF]"
                  onClick={() => setShareMenuOpen((prev) => !prev)}
                >
                  공유
                </Button>
                {shareMenuOpen ? (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[#111936] bg-[#111936] p-2 shadow-lg z-20">
                    <button onClick={() => void handleShare("native")} className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]">기기 공유</button>
                    <button onClick={() => void handleShare("copy")} className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]">{shareCopied ? "링크 복사됨" : "링크 복사"}</button>
                    <button onClick={() => void handleShare("x")} className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]">X 공유</button>
                    <button onClick={() => void handleShare("threads")} className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]">Threads 공유</button>
                    <button onClick={() => void handleShare("facebook")} className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]">Facebook 공유</button>
                    <button onClick={() => void handleShare("linkedin")} className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]">LinkedIn 공유</button>
                    <button onClick={() => void handleShare("instagram")} className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]">Instagram 공유</button>
                    <button onClick={() => void handleShare("kakao")} className="w-full text-left px-3 py-2 rounded text-[#F4F7FF] hover:bg-[#161F42]">KakaoTalk 공유</button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {cleanedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-[#161F42] text-[#B8C3E6]">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Cover */}
        <div className="aspect-video bg-gradient-to-br from-[#161F42] to-[#0B1020] rounded-xl mb-8 overflow-hidden flex items-center justify-center">
          {item.thumbnail_url ? (
            <img
              src={item.thumbnail_url}
              alt={item.title}
              className="h-full w-full object-cover"
              onError={(e) => { e.currentTarget.style.display = "none" }}
            />
          ) : (
            <ProjectCoverPlaceholder
              seedKey={String(item.id)}
              title={item.title}
              summary={item.summary_beginner}
              platform={item.category}
              tags={item.tags}
              likeCount={item.stars}
              size="detail"
              className="rounded-xl"
            />
          )}
        </div>

        {/* External Links */}
        <div className="flex flex-wrap gap-4 mb-4">
          <Button
            className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020]"
            onClick={() => {
              const url = item.source_url || (item.repo_owner && item.repo_name ? `https://github.com/${item.repo_owner}/${item.repo_name}` : "")
              if (url) window.open(url, "_blank", "noopener,noreferrer")
            }}
          >
            📂 GitHub 열기
          </Button>
          {item.language ? (
            <Button variant="outline" className="border-[#111936] text-[#B8C3E6] cursor-default" disabled>
              {item.language}
            </Button>
          ) : null}
          {item.license ? (
            <Button variant="outline" className="border-[#111936] text-[#B8C3E6] cursor-default" disabled>
              {item.license}
            </Button>
          ) : null}
        </div>

        {/* License Explanation */}
        {item.license_explanation ? (
          <div className="mb-8 rounded-xl border border-[#111936] bg-[#161F42] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8A96BE] mb-1">📋 라이선스 안내</p>
            <p className="text-sm text-[#B8C3E6]">{item.license_explanation}</p>
          </div>
        ) : null}

        {/* Summary Tabs */}
        <Tabs defaultValue={readContentLevel()} className="mb-8" onValueChange={(v) => writeContentLevel(v as "beginner" | "mid" | "expert")}>
          <TabsList className="bg-[#161F42] border-0">
            <TabsTrigger value="beginner" className="data-[state=active]:bg-[#23D5AB] data-[state=active]:text-[#0B1020]">🌱 입문자</TabsTrigger>
            <TabsTrigger value="mid" className="data-[state=active]:bg-[#23D5AB] data-[state=active]:text-[#0B1020]">💻 개발자</TabsTrigger>
            <TabsTrigger value="expert" className="data-[state=active]:bg-[#23D5AB] data-[state=active]:text-[#0B1020]">🔧 전문가</TabsTrigger>
          </TabsList>
          <TabsContent value="beginner" className="mt-4">
            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-6">
                <GlossaryHighlightedText
                  as="p"
                  className="text-[#F4F7FF] whitespace-pre-line"
                  text={item.summary_beginner || "요약이 준비되지 않았습니다."}
                  onSelectTerm={handleSelectGlossaryTerm}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="mid" className="mt-4">
            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-6">
                <GlossaryHighlightedText
                  as="p"
                  className="text-[#F4F7FF] whitespace-pre-line"
                  text={item.summary_mid || "요약이 준비되지 않았습니다."}
                  onSelectTerm={handleSelectGlossaryTerm}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="expert" className="mt-4">
            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-6">
                <GlossaryHighlightedText
                  as="p"
                  className="text-[#F4F7FF] whitespace-pre-line"
                  text={item.summary_expert || "요약이 준비되지 않았습니다."}
                  onSelectTerm={handleSelectGlossaryTerm}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Related Section */}
        <section>
          <h3 className="font-display text-xl font-semibold text-[#F4F7FF] mb-4">
            관련 큐레이션 {relatedItems.length > 0 ? relatedItems.length : ""}
          </h3>

          {relatedLoading ? <p className="text-sm text-[#8A96BE]">관련 항목을 불러오는 중...</p> : null}

          {!relatedLoading && relatedItems.length === 0 ? (
            <p className="text-sm text-[#8A96BE]">같은 주제의 추천 항목이 아직 없어요.</p>
          ) : null}

          <div className="space-y-3">
            {relatedItems.map((related) => (
              <button
                key={related.item.id}
                type="button"
                onClick={() => {
                  void api.trackCuratedRelatedClick(
                    item.id,
                    related.item.id,
                    related.reasons[0]?.code,
                  ).catch((err) => console.error("Failed to log curated related click:", err))
                  navigate(`/curated/${related.item.id}`)
                }}
                className="block w-full rounded-xl border border-[#111936] bg-[#161F42] px-4 py-3 text-left transition-colors hover:border-[#23D5AB]/50"
              >
                <p className="font-medium text-[#F4F7FF]">{related.item.title}</p>
                <p className="mt-1 text-xs text-[#8A96BE]">{related.item.repo_owner}/{related.item.repo_name} · ⭐ {related.item.stars}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {related.reasons.slice(0, 3).map((reason) => (
                    <span key={`${related.item.id}-${reason.code}`} className="rounded-full bg-[#111936] px-2 py-0.5 text-[11px] text-[#B8C3E6]">
                      {reason.label}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {toastMessage ? <Toast message={toastMessage} tone={toastTone} /> : null}
    </div>
  )
}
