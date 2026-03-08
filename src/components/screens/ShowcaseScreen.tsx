import { useEffect, useState } from "react"

import { TopNav } from "@/components/TopNav"
import { Toast } from "@/components/Toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ProjectCoverPlaceholder } from "@/components/ProjectCoverPlaceholder"
import { ApiRequestError, api, type Project } from "@/lib/api"
import {
  readShowcaseBookmarks,
  setShowcaseSubmitContext,
  toggleShowcaseBookmark,
  writeShowcaseBookmarks,
} from "@/lib/showcase"

type Screen = "home" | "detail" | "submit" | "profile" | "admin" | "login" | "register" | "explore" | "showcase" | "playground" | "glossary" | "curated" | "challenges" | "about"

interface ShowcaseScreenProps {
  onNavigate?: (screen: Screen) => void
  onOpenProject?: (projectId: string) => void
}

function isMissingProjectError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    return error.status === 404
  }

  if (!(error instanceof Error)) {
    return false
  }

  return /not found|missing/i.test(error.message)
}

function mergeBookmarkedProject(current: Project[], project: Project, bookmarkIds: string[]): Project[] {
  const next = current.filter((item) => item.id !== project.id)
  next.push(project)
  next.sort((left, right) => bookmarkIds.indexOf(left.id) - bookmarkIds.indexOf(right.id))
  return next
}

export function ShowcaseScreen({ onNavigate, onOpenProject }: ShowcaseScreenProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<"latest" | "popular">("latest")
  const [bookmarkIds, setBookmarkIds] = useState<string[]>(() => readShowcaseBookmarks())
  const [bookmarkedProjects, setBookmarkedProjects] = useState<Project[]>([])
  const [missingBookmarkIds, setMissingBookmarkIds] = useState<string[]>([])
  const [bookmarkErrorIds, setBookmarkErrorIds] = useState<string[]>([])
  const [bookmarksLoading, setBookmarksLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [bookmarksReloadToken, setBookmarksReloadToken] = useState(0)

  useEffect(() => {
    if (!toastMessage) return
    const timeoutId = window.setTimeout(() => setToastMessage(null), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  useEffect(() => {
    let active = true

    if (bookmarkIds.length === 0) {
      setBookmarkedProjects([])
      setMissingBookmarkIds([])
      setBookmarkErrorIds([])
      setBookmarksLoading(false)
      return () => {
        active = false
      }
    }

    setBookmarkedProjects([])
    setMissingBookmarkIds([])
    setBookmarkErrorIds([])
    setBookmarksLoading(true)

    let remaining = bookmarkIds.length
    bookmarkIds.forEach((projectId) => {
      void api.getProject(projectId)
        .then((project) => {
          if (!active) {
            return
          }
          setBookmarkedProjects((current) => mergeBookmarkedProject(current, project, bookmarkIds))
        })
        .catch((error) => {
          if (!active) {
            return
          }
          if (isMissingProjectError(error)) {
            setMissingBookmarkIds((current) => [...current, projectId])
            return
          }
          setBookmarkErrorIds((current) => [...current, projectId])
        })
        .finally(() => {
          if (!active) {
            return
          }
          remaining -= 1
          if (remaining <= 0) {
            setBookmarksLoading(false)
          }
        })
    })

    return () => {
      active = false
    }
  }, [bookmarkIds, bookmarksReloadToken])

  useEffect(() => {
    const fetchProjects = async () => {
      const params = { sort, tag: "showcase" }
      const hasCache = api.hasProjectsCache(params)
      if (!hasCache) {
        setLoading(true)
      }

      const applyProjects = (data: { items: Project[] }) => {
        setProjects(data.items || [])
      }

      try {
        const data = await api.getProjects(params, { onRevalidate: applyProjects })
        applyProjects(data)
      } catch (error) {
        console.error("Failed to fetch showcase projects:", error)
        setProjects([])
      } finally {
        setLoading(false)
      }
    }

    void fetchProjects()
  }, [sort])

  const handleSubmitShowcase = () => {
    setShowcaseSubmitContext()
    onNavigate?.("submit")
  }

  const handleBookmark = (projectId: string) => {
    const next = toggleShowcaseBookmark(bookmarkIds, projectId)
    setBookmarkIds(next)
    writeShowcaseBookmarks(next)
    setToastMessage(
      next.includes(projectId)
        ? "저도 만들어볼게요 목록에 담았어요."
        : "저도 만들어볼게요 목록에서 뺐어요.",
    )
  }

  const handleRetryBookmarks = () => {
    setBookmarksReloadToken((current) => current + 1)
  }

  return (
    <div className="min-h-screen bg-[#0B1020]">
      <TopNav active="showcase" onNavigate={onNavigate} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <section className="rounded-3xl border border-[#111936] bg-[radial-gradient(circle_at_top_left,_rgba(35,213,171,0.18),_transparent_35%),linear-gradient(180deg,#161F42_0%,#0F1734_100%)] p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#23D5AB]">VIBE_02 Showcase MVP</p>
              <h2 className="font-display text-4xl font-bold text-[#F4F7FF] md:text-5xl">나도 만들었어요를 올리는 자랑 게시판</h2>
              <p className="max-w-2xl text-base leading-7 text-[#B8C3E6]">
                완성작이 아니어도 괜찮아요. 버튼 하나 바꾼 실험도, 첫 배포도, 방금 고친 에러도
                여기에 올리면 다른 바이브코더에게는 시작 신호가 됩니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleSubmitShowcase}
                className="bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
              >
                자랑하기
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigate?.("explore")}
                className="border-[#3B4A78] text-[#F4F7FF] hover:bg-[#111936]"
              >
                전체 탐색 보기
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[#B8C3E6]">
            <span className="rounded-full border border-[#2A3A6A] bg-[#111936] px-3 py-1">👏 칭찬 중심 반응</span>
            <span className="rounded-full border border-[#2A3A6A] bg-[#111936] px-3 py-1">💬 만든 과정 공유</span>
            <span className="rounded-full border border-[#2A3A6A] bg-[#111936] px-3 py-1">🚀 첫 배포도 환영</span>
          </div>
        </section>

        <section className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-2xl font-bold text-[#F4F7FF]">오늘 올라온 자랑</h3>
            <p className="mt-1 text-sm text-[#8A96BE]">좋아요 대신 박수처럼 읽히도록, 인기순도 그대로 응원 수 기준으로 보여줍니다.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className={sort === "latest" ? "border-[#23D5AB] text-[#23D5AB] hover:bg-[#23D5AB]/10" : "border-[#3B4A78] text-[#B8C3E6] hover:bg-[#111936]"}
              onClick={() => setSort("latest")}
            >
              최신 자랑
            </Button>
            <Button
              variant="outline"
              className={sort === "popular" ? "border-[#FF5D8F] text-[#FF5D8F] hover:bg-[#FF5D8F]/10" : "border-[#3B4A78] text-[#B8C3E6] hover:bg-[#111936]"}
              onClick={() => setSort("popular")}
            >
              박수 많은 순
            </Button>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#111936] bg-[#161F42] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A96BE]">build-it-later list</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-[#F4F7FF]">저도 만들어볼게요</h3>
              <p className="mt-1 text-sm text-[#8A96BE]">나중에 따라 만들어보고 싶은 자랑 글을 따로 모아두는 목록입니다.</p>
            </div>
            <span className="rounded-full border border-[#24335F] px-3 py-1 text-sm text-[#B8C3E6]">
              {bookmarkIds.length}개 저장됨
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {bookmarksLoading ? (
              Array.from({ length: Math.min(3, Math.max(1, bookmarkIds.length)) }).map((_, index) => (
                <div key={`bookmark-skeleton-${index}`} className="rounded-2xl border border-[#111936] bg-[#0B1020]/60 p-4 animate-pulse">
                  <div className="h-4 w-1/3 rounded bg-[#111936]" />
                  <div className="mt-3 h-3 w-full rounded bg-[#111936]" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-[#111936]" />
                </div>
              ))
            ) : bookmarkIds.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#24335F] bg-[#0B1020]/50 p-5 text-sm text-[#B8C3E6]">
                아직 담아둔 자랑 글이 없어요. 마음에 드는 프로젝트를 만나면 `저도 만들어볼게요`로 모아둘 수 있어요.
              </div>
            ) : (
              <>
                {bookmarkedProjects.map((project) => (
                  <Card
                    key={`bookmark-${project.id}`}
                    onClick={() => onOpenProject?.(project.id)}
                    className="cursor-pointer border-[#111936] bg-[#0B1020]/60 transition-colors hover:border-[#23D5AB]/50"
                  >
                    <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#8A96BE]">
                          <span>by {project.author_nickname}</span>
                          <span>•</span>
                          <span>{project.platform || "Showcase"}</span>
                        </div>
                        <h4 className="font-display text-xl font-bold text-[#F4F7FF]">
                          {project.title}
                        </h4>
                        <p className="line-clamp-2 text-sm text-[#B8C3E6]">{project.summary}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[#B8C3E6]">👏 {project.like_count}</span>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#24335F] text-[#B8C3E6] hover:bg-[#111936] hover:text-[#F4F7FF]"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleBookmark(project.id)
                          }}
                        >
                          목록에서 빼기
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {missingBookmarkIds.map((projectId) => (
                  <div key={`missing-${projectId}`} className="rounded-2xl border border-dashed border-[#3B4A78] bg-[#0B1020]/50 p-4 text-sm text-[#B8C3E6]">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-[#F4F7FF]">불러올 수 없는 자랑 글</p>
                        <p className="mt-1 text-xs text-[#8A96BE]">삭제되었거나 더 이상 열 수 없는 항목일 수 있어요.</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-[#24335F] text-[#B8C3E6] hover:bg-[#111936] hover:text-[#F4F7FF]"
                        onClick={() => handleBookmark(projectId)}
                      >
                        목록에서 정리하기
                      </Button>
                    </div>
                  </div>
                ))}

                {bookmarkErrorIds.length > 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#FFB547]/40 bg-[#0B1020]/50 p-4 text-sm text-[#B8C3E6]">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-[#F4F7FF]">일시적으로 불러오지 못한 자랑 글이 있어요</p>
                        <p className="mt-1 text-xs text-[#8A96BE]">네트워크나 서버 상태 때문에 잠깐 실패했을 수 있어요. 목록에서 지우지 않고 다시 시도할 수 있습니다.</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-[#FFB547]/50 text-[#FFB547] hover:bg-[#111936]"
                        onClick={handleRetryBookmarks}
                      >
                        다시 불러오기
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={`showcase-skeleton-${index}`} className="overflow-hidden rounded-2xl border border-[#111936] bg-[#161F42] animate-pulse">
                <div className="aspect-video bg-[#111936]" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/3 rounded bg-[#111936]" />
                  <div className="h-3 w-full rounded bg-[#111936]" />
                  <div className="h-3 w-5/6 rounded bg-[#111936]" />
                </div>
              </div>
            ))
          ) : projects.length === 0 ? (
            <Card className="col-span-full border-[#111936] bg-[#161F42]">
              <CardContent className="flex flex-col items-start gap-4 p-6 text-[#B8C3E6]">
                <div>
                  <h4 className="font-display text-2xl font-bold text-[#F4F7FF]">첫 자랑을 기다리고 있어요</h4>
                  <p className="mt-2 text-sm leading-6">
                    아직 자랑 글이 비어 있어요. 방금 만든 화면 한 장, 첫 배포 링크 하나만 있어도 충분합니다.
                  </p>
                </div>
                <Button onClick={handleSubmitShowcase} className="bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90">
                  첫 자랑 올리기
                </Button>
              </CardContent>
            </Card>
          ) : (
            projects.map((project) => (
              <Card
                key={project.id}
                onClick={() => onOpenProject?.(project.id)}
                className="cursor-pointer overflow-hidden border-[#111936] bg-[#161F42] transition-colors hover:border-[#23D5AB]/50"
              >
                <div className="aspect-video bg-gradient-to-br from-[#161F42] to-[#0B1020]">
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt={project.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    <ProjectCoverPlaceholder
                      seedKey={project.id}
                      title={project.title}
                      summary={project.summary}
                      description={project.description}
                      platform={project.platform}
                      tags={project.tags}
                      likeCount={project.like_count}
                      createdAt={project.created_at}
                      isHot={sort === "popular" && project.like_count > 0}
                      size="card"
                    />
                  )}
                </div>
                <CardContent className="space-y-4 p-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-[#111936] px-2 py-1 text-xs text-[#B8C3E6]">{project.platform || "Showcase"}</span>
                      <span className="text-xs text-[#8A96BE]">by {project.author_nickname}</span>
                    </div>
                    <h4 className="line-clamp-2 font-display text-xl font-bold text-[#F4F7FF]">{project.title}</h4>
                    <p className="line-clamp-3 text-sm leading-6 text-[#B8C3E6]">{project.summary}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {project.tags.slice(0, 4).map((tag) => (
                      <span key={`${project.id}-${tag}`} className="rounded-full border border-[#24335F] px-2 py-1 text-xs text-[#B8C3E6]">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm text-[#B8C3E6]">
                    <span>👏 {project.like_count}명이 박수쳤어요</span>
                    <div className="flex items-center gap-3">
                      <span>💬 {project.comment_count}개의 반응</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleBookmark(project.id)
                        }}
                        className="rounded-full border border-[#24335F] px-3 py-1 text-xs text-[#B8C3E6] transition hover:border-[#23D5AB] hover:text-[#F4F7FF]"
                        aria-label={bookmarkIds.includes(project.id) ? `${project.title} 저도 만들어볼게요 해제` : `${project.title} 저도 만들어볼게요 추가`}
                      >
                        🔖 {bookmarkIds.includes(project.id) ? "담아뒀어요" : "저도 만들어볼게요"}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </main>
      {toastMessage ? <Toast message={toastMessage} tone="success" /> : null}
    </div>
  )
}
