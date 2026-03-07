import { cleanup, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"

const mocks = vi.hoisted(() => ({
  getAdminStats: vi.fn(),
  getAdminActionLogs: vi.fn(),
  getAdminCuratedRelatedClicksSummary: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  api: {
    getAdminStats: mocks.getAdminStats,
    getAdminActionLogs: mocks.getAdminActionLogs,
    getAdminCuratedRelatedClicksSummary: mocks.getAdminCuratedRelatedClicksSummary,
  },
}))

import { AdminDashboard } from "./AdminDashboard"

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AdminDashboard />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe("AdminDashboard analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAdminStats.mockResolvedValue({
      total_users: 120,
      total_projects: 45,
      open_reports: 7,
      pending_user_approvals: 2,
      users_this_week: 8,
      users_last_week: 5,
      projects_this_week: 4,
      projects_last_week: 2,
      users_week_delta: 3,
      projects_week_delta: 2,
      weekly_trend: [{ day: "2026-03-02", new_users: 2, new_projects: 1 }],
    })
    mocks.getAdminActionLogs.mockResolvedValue({
      items: [
        {
          id: "log-1",
          admin_nickname: "ops",
          action_type: "approve_curated",
          target_type: "curated",
          target_id: "7",
          created_at: "2026-03-07T00:00:00Z",
        },
      ],
    })
    mocks.getAdminCuratedRelatedClicksSummary.mockResolvedValue({
      window_days: 30,
      source_content_id: null,
      total_clicks: 19,
      unique_pairs: 6,
      top_pairs: [
        {
          source_content_id: 1,
          source_title: "Starter Repo",
          target_content_id: 2,
          target_title: "Deploy Kit",
          click_count: 7,
          last_clicked_at: "2026-03-07T03:00:00Z",
          top_reason_code: "tag_overlap",
          top_reason_label: "태그 일치",
          top_reason_count: 5,
        },
      ],
      top_reasons: [
        { reason_code: "tag_overlap", reason_label: "태그 일치", click_count: 9 },
        { reason_code: "recent_update", reason_label: "최근 업데이트", click_count: 4 },
      ],
      available_sources: [{ content_id: 1, title: "Starter Repo" }],
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("renders curated related click widget data", async () => {
    renderScreen()

    expect(await screen.findByText("Curated 추천 클릭")).toBeInTheDocument()
    expect(await screen.findByText("Starter Repo → Deploy Kit")).toBeInTheDocument()
    expect(screen.getByText("총 클릭")).toBeInTheDocument()
    expect(screen.getAllByText("태그 일치").length).toBeGreaterThan(0)
    expect(mocks.getAdminCuratedRelatedClicksSummary).toHaveBeenCalledWith(30, 5)
  })

  it("renders an error state when curated click summary fails", async () => {
    mocks.getAdminCuratedRelatedClicksSummary.mockRejectedValueOnce(new Error("boom"))

    renderScreen()

    expect(await screen.findByText("추천 클릭 집계를 불러오지 못했습니다.")).toBeInTheDocument()
  })
})
