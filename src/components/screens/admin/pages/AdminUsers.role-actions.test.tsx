import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  currentRole: "admin" as "admin" | "super_admin",
}))

vi.mock("@/lib/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "operator-1",
      email: "ops@example.com",
      nickname: "ops",
      role: mocks.currentRole,
    },
    isLoading: false,
  }),
}))

vi.mock("@/components/screens/admin/hooks/useAdminUsers", () => ({
  getUserApprovalState: () => ({ tone: "secondary", label: "활성" }),
  getUserLimitState: () => ({ isLimited: false, label: "정상" }),
  useAdminUsers: () => ({
    loadingUsers: false,
    users: [
      {
        id: "target-admin",
        email: "admin@example.com",
        nickname: "admin-target",
        role: "admin",
        status: "active",
        created_at: "2026-03-01T00:00:00Z",
      },
    ],
    actions: {
      approve: vi.fn(),
      reject: vi.fn(),
      role: vi.fn(),
      limit: vi.fn(),
      unlimit: vi.fn(),
      suspend: vi.fn(),
      unsuspend: vi.fn(),
      revokeTokens: vi.fn(),
      scheduleDelete: vi.fn(),
      cancelDeleteSchedule: vi.fn(),
      deleteNow: vi.fn(),
    },
  }),
}))

vi.mock("@/components/screens/admin/components/DataTable", () => ({
  DataTable: ({ rows, renderRow }: { rows: Array<Record<string, unknown>>; renderRow: (row: any) => ReactNode }) => (
    <table>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row.id)}>{renderRow(row)}</tr>
        ))}
      </tbody>
    </table>
  ),
}))

vi.mock("@/components/screens/admin/components/RowActions", () => ({
  RowActions: ({ actions }: { actions: Array<{ key: string; label: string }> }) => (
    <div>
      {actions.map((action) => (
        <span key={action.key}>{action.label}</span>
      ))}
    </div>
  ),
}))

vi.mock("@/components/screens/admin/components/EditDrawer", () => ({
  EditDrawer: () => null,
}))

import { AdminUsers } from "./AdminUsers"

describe("AdminUsers role-based action visibility", () => {
  it("hides super-admin-only actions for regular admin", () => {
    mocks.currentRole = "admin"
    render(<AdminUsers />)

    expect(screen.queryByText("관리자 승격")).not.toBeInTheDocument()
    expect(screen.queryByText("일반 권한")).not.toBeInTheDocument()
    expect(screen.queryByText("즉시 삭제")).not.toBeInTheDocument()
  })

  it("shows super-admin-only actions for super admin", () => {
    mocks.currentRole = "super_admin"
    render(<AdminUsers />)

    expect(screen.getByText("관리자 승격")).toBeInTheDocument()
    expect(screen.getByText("일반 권한")).toBeInTheDocument()
    expect(screen.getByText("즉시 삭제")).toBeInTheDocument()
  })
})
