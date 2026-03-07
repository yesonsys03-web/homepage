import type { ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"

const mocks = vi.hoisted(() => ({
  getAdminActionLogs: vi.fn(),
  getAdminActionObservability: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  api: {
    getAdminActionLogs: mocks.getAdminActionLogs,
    getAdminActionObservability: mocks.getAdminActionObservability,
  },
}))

import { AdminLogs } from "./AdminLogs"

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  )
}

function renderWithRoute(ui: ReactNode, initialEntries: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  )
}

describe("AdminLogs observability", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAdminActionLogs.mockResolvedValue({
      items: [
        {
          id: "1",
          admin_id: "admin-1",
          admin_nickname: "admin",
          action_type: "page_published",
          target_type: "page",
          target_id: "target-1",
          reason: "release",
          created_at: "2026-03-04T00:00:00Z",
        },
        {
          id: "policy-log-1",
          admin_id: "admin-2",
          admin_nickname: "ops",
          action_type: "policy_updated",
          target_type: "moderation_settings",
          target_id: "00000000-0000-0000-0000-000000000001",
          reason: "curated_quality_threshold=52",
          created_at: "2026-03-07T00:00:00Z",
        },
      ],
      next_cursor: null,
    })
    mocks.getAdminActionObservability.mockResolvedValue({
      window_days: 30,
      daily_publish_counts: [{ day: "2026-03-04", publish_count: 2 }],
      summary: {
        published: 2,
        rolled_back: 1,
        draft_saved: 4,
        conflicts: 1,
        rollback_ratio: 0.5,
        conflict_rate: 0.2,
      },
      publish_failure_distribution: [{ reason: "validation_failed", count: 1 }],
      daily_curated_collection_counts: [
        { day: "2026-03-04", run_count: 2, created_total: 3 },
      ],
      curated_collection_summary: {
        succeeded: 1,
        failed: 1,
        skipped: 0,
        created_total: 3,
      },
      curated_collection_failure_distribution: [
        { reason: "GitHub API request failed", count: 1 },
      ],
    })
  })

  it("renders observability metrics and allows filter query params", async () => {
    renderWithQueryClient(<AdminLogs />)

    await screen.findByText("관측 지표")
    await waitFor(() => {
      expect(screen.getByText("일별 publish 합계")).toBeInTheDocument()
    })
    expect(screen.getByText("50.0%")).toBeInTheDocument()
    expect(screen.getByText("20.0%")).toBeInTheDocument()
    expect(screen.getByText("validation_failed")).toBeInTheDocument()
    expect(screen.getByText("자동 수집 성공")).toBeInTheDocument()
    expect(screen.getByText("자동 수집 실패")).toBeInTheDocument()
    expect(screen.getByText("2회 / 3건")).toBeInTheDocument()
    expect(screen.getByText("GitHub API request failed")).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText("action_type"), {
      target: { value: "page_published" },
    })
    fireEvent.change(screen.getByPlaceholderText("page_id (예: about_page)"), {
      target: { value: "about_page" },
    })

    await waitFor(() => {
      expect(mocks.getAdminActionLogs).toHaveBeenLastCalledWith(
        200,
        {
          actionType: "page_published",
          actorId: undefined,
          pageId: "about_page",
        },
      )
    })
  })

  it("reads admin log filters from query string", async () => {
    renderWithRoute(<AdminLogs />, ["/admin/logs?actionType=policy_updated&query=curated_quality_threshold&windowDays=60&targetLogId=policy-log-1"])

    expect(await screen.findByDisplayValue("policy_updated")).toBeInTheDocument()
    expect(screen.getByDisplayValue("curated_quality_threshold")).toBeInTheDocument()
    expect(screen.getByText("threshold history에서 이동한 로그를 강조 표시하고 있습니다.")).toBeInTheDocument()

    await waitFor(() => {
      expect(mocks.getAdminActionLogs).toHaveBeenLastCalledWith(200, {
        actionType: "policy_updated",
        actorId: undefined,
        pageId: undefined,
      })
    })
    expect(mocks.getAdminActionObservability).toHaveBeenLastCalledWith(60)
    const highlightedRows = screen
      .getAllByRole("row", { name: /policy_updated.*curated_quality_threshold=52.*ops/i })
      .filter((row) => row.getAttribute("data-highlighted") === "true")
    expect(highlightedRows).toHaveLength(1)
  })
})
