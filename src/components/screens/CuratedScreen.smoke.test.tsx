import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const navigateMock = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

import type { CuratedContent } from "@/lib/api"

const mocks = vi.hoisted(() => ({
  getCuratedContent: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  api: {
    getCuratedContent: mocks.getCuratedContent,
  },
}))

import { CuratedScreen } from "./CuratedScreen"

function makeCuratedItem(id: number, title: string): CuratedContent {
  return {
    id,
    source_type: "github",
    source_url: `https://github.com/example/${id}`,
    canonical_url: `https://github.com/example/${id}`,
    repo_name: `repo-${id}`,
    repo_owner: "example",
    title,
    category: "tool",
    language: "TypeScript",
    is_korean_dev: true,
    stars: 120,
    license: "MIT",
    license_explanation: "MIT license",
    thumbnail_url: "",
    relevance_score: 8,
    beginner_value: 8,
    quality_score: 9,
    summary_beginner: "MCP 초보자 요약",
    summary_mid: "중급자 요약",
    summary_expert: "전문가 요약",
    tags: ["MCP"],
    status: "approved",
    reject_reason: "",
    approved_at: "",
    approved_by: "",
    github_pushed_at: "",
    collected_at: "",
    updated_at: "",
  }
}

describe("CuratedScreen smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigateMock.mockReset()
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    })
  })

  it("loads curated list and opens detail callback", async () => {
    mocks.getCuratedContent.mockResolvedValueOnce({
      items: [makeCuratedItem(101, "Claude Starter Kit")],
      total: 1,
    })

    const onOpenCurated = vi.fn()
    render(<CuratedScreen onOpenCurated={onOpenCurated} />)

    await waitFor(() => {
      expect(mocks.getCuratedContent).toHaveBeenCalled()
    })

    expect(screen.getAllByText("Claude Starter Kit").length).toBeGreaterThan(0)
    expect(screen.getAllByText("tool").length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByText("Claude Starter Kit")[0])
    expect(onOpenCurated).toHaveBeenCalledWith(101)
  })

  it("renders category chips from loaded content", async () => {
    mocks.getCuratedContent.mockResolvedValueOnce({
      items: [makeCuratedItem(202, "Glossary Starter")],
      total: 1,
    })

    render(<CuratedScreen />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "tool" })).toBeInTheDocument()
    })
  })
})
