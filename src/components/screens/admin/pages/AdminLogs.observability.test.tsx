import type { ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

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
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
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
})
