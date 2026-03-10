import type { ReactNode } from "react"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
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

function renderScreen(initialEntries: string[] = ["/admin/curated"]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <AdminCurated />
      </QueryClientProvider>
    </MemoryRouter>,
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
              review_metadata: {
                reason_codes: ["canonical_url_match", "title_match"],
                canonical_url_match: true,
                title_match: true,
                matched_existing_ids: [14],
              },
            },
          ],
          total: 1,
        }
      }

      if (status === "review_license") {
        return {
          items: [
            {
              id: 8,
              title: "Unknown License Repo",
              repo_name: "unknown-license-repo",
              repo_owner: "example",
              status: "review_license",
              category: "tool",
              stars: 22,
              quality_score: 52,
              relevance_score: 7,
              summary_beginner: "beginner",
              summary_mid: "mid",
              summary_expert: "expert",
              reject_reason: "",
              review_metadata: {
                reason_codes: ["license_missing"],
                license_value: "",
              },
            },
          ],
          total: 2,
        }
      }

      if (status === "review_duplicate") {
        return { items: [], total: 1 }
      }

      if (status === "review_quality") {
        return {
          items: [
            {
              id: 9,
              title: "Low Quality Repo",
              repo_name: "low-quality-repo",
              repo_owner: "example",
              status: "review_quality",
              category: "tool",
              stars: 12,
              quality_score: 40,
              relevance_score: 6,
              summary_beginner: "beginner",
              summary_mid: "mid",
              summary_expert: "expert",
              reject_reason: "",
              review_metadata: {
                reason_codes: ["quality_below_threshold"],
                quality_score_value: 40,
                quality_threshold: 45,
              },
            },
          ],
          total: 3,
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
            review_metadata: {
              reason_codes: ["canonical_url_match", "title_match"],
              canonical_url_match: true,
              title_match: true,
              matched_existing_ids: [14],
            },
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

  it("moves item to quality review via row action", async () => {
    renderScreen()

    expect(await screen.findByText("Starter Repo")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "품질 검토" }))
    fireEvent.click(screen.getByRole("button", { name: "저장" }))

    await waitFor(() => {
      expect(mocks.updateAdminCuratedContent).toHaveBeenCalledWith(7, {
        status: "review_quality",
        reject_reason: "",
      })
    })
  })

  it("shows aggregated review queue count", async () => {
    renderScreen()

    expect(await screen.findByText("검수 대기 7건")).toBeInTheDocument()
    expect(screen.getByText("Review Reason Guide")).toBeInTheDocument()
    expect(screen.queryByText("라이선스 없음")).not.toBeInTheDocument()
  })

  it("reads status filter from query string and shows duplicate reason chips", async () => {
    renderScreen(["/admin/curated?status=pending"])

    expect(await screen.findByDisplayValue("일반 대기")).toBeInTheDocument()
    expect(await screen.findByText("Starter Repo")).toBeInTheDocument()
    expect(screen.getByText("URL 일치")).toBeInTheDocument()
    expect(screen.getByText("제목 일치")).toBeInTheDocument()
    expect(screen.getByText("기존 항목 ID: 14")).toBeInTheDocument()
  })

  it("shows structured license review metadata", async () => {
    renderScreen(["/admin/curated?status=review_license"])

    expect(await screen.findByDisplayValue("라이선스 검토")).toBeInTheDocument()
    expect(await screen.findByText("Unknown License Repo")).toBeInTheDocument()
    expect(screen.getByText("라이선스 없음")).toBeInTheDocument()
  })

  it("shows structured quality review metadata", async () => {
    renderScreen(["/admin/curated?status=review_quality"])

    expect(await screen.findByDisplayValue("품질 검토")).toBeInTheDocument()
    expect(await screen.findByText("Low Quality Repo")).toBeInTheDocument()
    expect(screen.getByText("품질 기준 미달")).toBeInTheDocument()
    expect(screen.getByText("품질 점수 40 / 기준 45")).toBeInTheDocument()
  })

  it("expands review reason guide on demand", async () => {
    renderScreen()

    const guideHeading = screen.getByText("Review Reason Guide")
    const guideCandidate = guideHeading.closest("div.rounded-xl") ?? guideHeading.parentElement
    const guide = guideCandidate instanceof HTMLElement ? guideCandidate : null
    expect(guide).not.toBeNull()
    expect(screen.queryByText("같은 canonical URL이 기존 항목 또는 같은 배치 후보와 겹칩니다.")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "가이드 펼치기" }))

    expect(await screen.findByText("같은 canonical URL이 기존 항목 또는 같은 배치 후보와 겹칩니다.")).toBeInTheDocument()
    if (guide) {
      expect(within(guide).getByText("품질 기준 미달")).toBeInTheDocument()
    }
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
