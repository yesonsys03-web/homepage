import { cleanup, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAdminCuratedRelatedClicksSummary: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  api: {
    getAdminCuratedRelatedClicksSummary: mocks.getAdminCuratedRelatedClicksSummary,
  },
}))

import { AdminCuratedAnalytics } from "./AdminCuratedAnalytics"

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminCuratedAnalytics />
    </QueryClientProvider>,
  )
}

describe("AdminCuratedAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAdminCuratedRelatedClicksSummary.mockResolvedValue({
      window_days: 30,
      source_content_id: null,
      total_clicks: 24,
      unique_pairs: 8,
      top_pairs: [
        {
          source_content_id: 1,
          source_title: "Starter Repo",
          target_content_id: 2,
          target_title: "Deploy Kit",
          click_count: 8,
          last_clicked_at: "2026-03-07T03:00:00Z",
          top_reason_code: "tag_overlap",
          top_reason_label: "태그 일치",
          top_reason_count: 6,
        },
      ],
      top_reasons: [
        { reason_code: "tag_overlap", reason_label: "태그 일치", click_count: 11 },
        { reason_code: "recent_update", reason_label: "최근 업데이트", click_count: 5 },
      ],
      available_sources: [
        { content_id: 1, title: "Starter Repo" },
        { content_id: 3, title: "Docs Kit" },
      ],
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("renders normalized reason analytics", async () => {
    renderScreen()

    expect(await screen.findByText("큐레이션 추천 분석")).toBeInTheDocument()
    expect(await screen.findAllByText("Starter Repo")).toHaveLength(2)
    expect(screen.getAllByText("태그 일치").length).toBeGreaterThan(0)
    expect(screen.getByText("tag_overlap")).toBeInTheDocument()
    expect(screen.getByLabelText("소스 콘텐츠")).toBeInTheDocument()
    expect(mocks.getAdminCuratedRelatedClicksSummary).toHaveBeenCalledWith(30, 20, undefined)
  })
})
