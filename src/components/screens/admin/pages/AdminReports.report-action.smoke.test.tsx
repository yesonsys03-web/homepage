import type { ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  handleUpdateReport: vi.fn(),
}))

vi.mock("@/components/screens/admin/hooks/useAdminReports", () => ({
  useAdminReports: () => ({
    activeStatus: "all",
    setActiveStatus: vi.fn(),
    searchQuery: "",
    setSearchQuery: vi.fn(),
    filteredReports: [
      {
        id: "r-1",
        targetType: "comment",
        targetContent: "c-1",
        reason: "abuse",
        status: "open",
        reporter: "u-2",
        createdAt: "2026-03-03 00:00:00",
      },
    ],
    loadingReports: false,
    statusCounts: {
      total: 1,
      open: 1,
      reviewing: 0,
      resolved: 0,
    },
    handleUpdateReport: mocks.handleUpdateReport,
  }),
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

import { AdminReports } from "./AdminReports"

describe("AdminReports report action smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handleUpdateReport.mockResolvedValue(undefined)
  })

  it("updates report status via row action dropdown and drawer", async () => {
    render(<AdminReports />)

    expect(screen.getByText("abuse")).toBeInTheDocument()

    const completeButtons = screen.getAllByText("처리완료")
    fireEvent.click(completeButtons[completeButtons.length - 1])

    fireEvent.change(screen.getByLabelText("처리 사유"), {
      target: { value: "정상 처리" },
    })
    fireEvent.click(screen.getByRole("button", { name: "저장" }))

    await waitFor(() => {
      expect(mocks.handleUpdateReport).toHaveBeenCalledWith("r-1", "resolved", "정상 처리")
    })
  })
})
