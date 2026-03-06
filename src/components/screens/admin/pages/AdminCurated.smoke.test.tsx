import type { ReactNode } from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAdminCuratedContent: vi.fn(),
  updateAdminCuratedContent: vi.fn(),
  deleteAdminCuratedContent: vi.fn(),
  runAdminCuratedCollection: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  api: {
    getAdminCuratedContent: mocks.getAdminCuratedContent,
    updateAdminCuratedContent: mocks.updateAdminCuratedContent,
    deleteAdminCuratedContent: mocks.deleteAdminCuratedContent,
    runAdminCuratedCollection: mocks.runAdminCuratedCollection,
  },
}))

vi.mock("@/components/screens/admin/components/RowActions", () => ({
  RowActions: ({ actions }: { actions: Array<{ key: string; label: string; onClick: () => void }> }) => (
    <div>
      {actions.map((action) => (
        <button key={action.key} type="button" onClick={action.onClick}>
          {action.label}
        </button>
      ))}
    </div>
  ),
}))

vi.mock("@/components/screens/admin/components/EditDrawer", () => ({
  EditDrawer: ({ open, children, onSubmit }: { open: boolean; children: ReactNode; onSubmit: () => void }) =>
    open ? (
      <div>
        {children}
        <button type="button" onClick={onSubmit}>
          저장
        </button>
      </div>
    ) : null,
}))

import { AdminCurated } from "./AdminCurated"

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminCurated />
    </QueryClientProvider>,
  )
}

describe("AdminCurated smoke", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getAdminCuratedContent.mockImplementation(async (status?: string) => {
      if (status === "pending") {
        return {
          items: [
            {
              id: 7,
              title: "Starter Repo",
              repo_name: "starter-repo",
              repo_owner: "example",
              status: "pending",
              category: "tool",
              stars: 40,
              quality_score: 7,
              relevance_score: 8,
              summary_beginner: "beginner",
              summary_mid: "mid",
              summary_expert: "expert",
              reject_reason: "",
            },
          ],
          total: 1,
        }
      }

      return {
        items: [
          {
            id: 7,
            title: "Starter Repo",
            repo_name: "starter-repo",
            repo_owner: "example",
            status: "pending",
            category: "tool",
            stars: 40,
            quality_score: 7,
            relevance_score: 8,
            summary_beginner: "beginner",
            summary_mid: "mid",
            summary_expert: "expert",
            reject_reason: "",
          },
        ],
        total: 1,
      }
    })

    mocks.updateAdminCuratedContent.mockResolvedValue({ ok: true })
    mocks.deleteAdminCuratedContent.mockResolvedValue({ deleted: true, id: 7 })
    mocks.runAdminCuratedCollection.mockResolvedValue({ created: 1, daily_limit: 5, collected_today: 1 })
  })

  it("approves pending item via row action", async () => {
    renderScreen()

    expect(await screen.findByText("Starter Repo")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "승인" }))
    fireEvent.click(screen.getByRole("button", { name: "저장" }))

    await waitFor(() => {
      expect(mocks.updateAdminCuratedContent).toHaveBeenCalledWith(7, {
        status: "approved",
        reject_reason: "",
      })
    })
  })

  it("runs collection from toolbar button", async () => {
    renderScreen()

    fireEvent.click(await screen.findByRole("button", { name: "수집 실행" }))

    await waitFor(() => {
      expect(mocks.runAdminCuratedCollection).toHaveBeenCalled()
    })
  })

  it("shows failure message when approve action fails", async () => {
    mocks.updateAdminCuratedContent.mockRejectedValueOnce(new Error("승인 처리 실패"))

    renderScreen()

    fireEvent.click(await screen.findByRole("button", { name: "승인" }))
    fireEvent.click(screen.getByRole("button", { name: "저장" }))

    expect(await screen.findByText("승인 처리 실패")).toBeInTheDocument()
  })

  it("shows failure message when reject action fails", async () => {
    mocks.updateAdminCuratedContent.mockRejectedValueOnce(new Error("반려 처리 실패"))

    renderScreen()

    fireEvent.click(await screen.findByRole("button", { name: "반려" }))
    fireEvent.change(screen.getByLabelText("반려 사유"), {
      target: { value: "품질 기준 미달" },
    })
    fireEvent.click(screen.getByRole("button", { name: "저장" }))

    expect(await screen.findByText("반려 처리 실패")).toBeInTheDocument()
    expect(mocks.updateAdminCuratedContent).toHaveBeenCalledWith(7, {
      status: "rejected",
      reject_reason: "품질 기준 미달",
    })
  })

  it("shows failure message when delete action fails", async () => {
    mocks.deleteAdminCuratedContent.mockRejectedValueOnce(new Error("삭제 처리 실패"))

    renderScreen()

    fireEvent.click(await screen.findByRole("button", { name: "삭제" }))
    fireEvent.click(screen.getByRole("button", { name: "저장" }))

    expect(await screen.findByText("삭제 처리 실패")).toBeInTheDocument()
  })

  it("shows failure message when collection run fails", async () => {
    mocks.runAdminCuratedCollection.mockRejectedValueOnce(new Error("수집 실행 실패"))

    renderScreen()

    fireEvent.click(await screen.findByRole("button", { name: "수집 실행" }))

    expect(await screen.findByText("수집 실행 실패")).toBeInTheDocument()
  })
})
