import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

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
    relevance_score: 8,
    beginner_value: 8,
    quality_score: 9,
    summary_beginner: "초보자 요약",
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

    expect(screen.getByText("Claude Starter Kit")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "상세보기" }))
    expect(onOpenCurated).toHaveBeenCalledWith(101)
  })
})
