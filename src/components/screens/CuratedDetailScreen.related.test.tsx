import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const navigateMock = vi.fn()

const mocks = vi.hoisted(() => ({
  getCuratedContentDetail: vi.fn(),
  getCuratedRelatedContent: vi.fn(),
  trackCuratedRelatedClick: vi.fn(),
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ contentId: "7" }),
  }
})

vi.mock("@/lib/api", () => ({
  api: {
    getCuratedContentDetail: mocks.getCuratedContentDetail,
    getCuratedRelatedContent: mocks.getCuratedRelatedContent,
    trackCuratedRelatedClick: mocks.trackCuratedRelatedClick,
  },
}))

import { CuratedDetailScreen } from "./CuratedDetailScreen"

describe("CuratedDetailScreen related recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigateMock.mockReset()
    mocks.getCuratedContentDetail.mockResolvedValue({
      id: 7,
      source_type: "github",
      source_url: "https://github.com/example/starter",
      canonical_url: "https://github.com/example/starter",
      repo_name: "starter",
      repo_owner: "example",
      title: "Starter Repo",
      category: "tool",
      language: "TypeScript",
      is_korean_dev: true,
      stars: 42,
      license: "MIT",
      relevance_score: 9,
      beginner_value: 8,
      quality_score: 8,
      summary_beginner: "API를 먼저 이해하면 beginner 진입이 빨라집니다.",
      summary_mid: "mid",
      summary_expert: "expert",
      tags: ["starter", "vite"],
      status: "approved",
      reject_reason: "",
      approved_at: "2026-03-01T00:00:00Z",
      approved_by: "admin-1",
      github_pushed_at: "2026-03-06T00:00:00Z",
      collected_at: "2026-03-06T00:00:00Z",
      updated_at: "2026-03-06T00:00:00Z",
    })
    mocks.getCuratedRelatedContent.mockResolvedValue({
      source: "server",
      items: [
        {
          item: {
            id: 8,
            source_type: "github",
            source_url: "https://github.com/example/deploy-kit",
            canonical_url: "https://github.com/example/deploy-kit",
            repo_name: "deploy-kit",
            repo_owner: "example",
            title: "Deploy Kit",
            category: "tool",
            language: "TypeScript",
            is_korean_dev: true,
            stars: 55,
            license: "MIT",
            relevance_score: 8,
            beginner_value: 7,
            quality_score: 9,
            summary_beginner: "beginner",
            summary_mid: "mid",
            summary_expert: "expert",
            tags: ["starter", "deploy"],
            status: "approved",
            reject_reason: "",
            approved_at: "2026-03-01T00:00:00Z",
            approved_by: "admin-1",
            github_pushed_at: "2026-03-06T00:00:00Z",
            collected_at: "2026-03-06T00:00:00Z",
            updated_at: "2026-03-06T00:00:00Z",
          },
          reasons: [
            { code: "tag_overlap", label: "태그 1개 일치" },
            { code: "recent_update", label: "최근 업데이트" },
            { code: "language_match", label: "TypeScript 언어 일치" },
          ],
        },
      ],
    })
    mocks.trackCuratedRelatedClick.mockResolvedValue({ ok: true, id: 1 })
  })

  afterEach(() => {
    cleanup()
  })

  it("renders server-calculated reasons and logs click with the top reason", async () => {
    render(<CuratedDetailScreen />)

    expect(await screen.findByText("Deploy Kit")).toBeInTheDocument()
    expect(screen.getByText("태그 1개 일치")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "API" })).toBeInTheDocument()
    expect(mocks.getCuratedRelatedContent).toHaveBeenCalledWith(7, 4)

    fireEvent.click(screen.getByRole("button", { name: /Deploy Kit/i }))

    await waitFor(() => {
      expect(mocks.trackCuratedRelatedClick).toHaveBeenCalledWith(7, 8, "tag_overlap")
    })
    expect(navigateMock).toHaveBeenCalledWith("/curated/8")
  })

  it("routes glossary-highlighted summary terms into the glossary screen", async () => {
    render(<CuratedDetailScreen />)

    fireEvent.click(await screen.findByRole("button", { name: "API" }))

    expect(window.localStorage.getItem("vibecoder_glossary_focus_term")).toBe("API")
    expect(navigateMock).toHaveBeenCalledWith("/glossary")
  })
})
