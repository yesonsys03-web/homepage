import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  updateReport: vi.fn(),
  getReports: vi.fn(),
  getAdminActionLogs: vi.fn(),
  getAdminUsers: vi.fn(),
  getAdminProjects: vi.fn(),
  getAboutContent: vi.fn(),
  getAdminPolicies: vi.fn(),
  getAdminOAuthSettings: vi.fn(),
  getAdminOAuthHealth: vi.fn(),
  prefetchAdminTabData: vi.fn(),
}))

vi.mock("@/lib/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      email: "admin@example.com",
      nickname: "admin",
      role: "admin",
      status: "active",
    },
    logout: vi.fn(),
  }),
}))

vi.mock("@/lib/api", () => ({
  api: {
    hasAdminTabCache: vi.fn(() => false),
    prefetchAdminTabData: mocks.prefetchAdminTabData,
    getReports: mocks.getReports,
    updateReport: mocks.updateReport,
    getAdminActionLogs: mocks.getAdminActionLogs,
    getAdminUsers: mocks.getAdminUsers,
    getAdminProjects: mocks.getAdminProjects,
    getAboutContent: mocks.getAboutContent,
    getAdminPolicies: mocks.getAdminPolicies,
    getAdminOAuthSettings: mocks.getAdminOAuthSettings,
    getAdminOAuthHealth: mocks.getAdminOAuthHealth,
  },
}))

import { AdminScreen } from "./AdminScreen"
import { createAppQueryClient } from "@/lib/query-client"

describe("AdminScreen report action smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getReports.mockResolvedValue({
      items: [
        {
          id: "r-1",
          target_type: "comment",
          target_id: "c-1",
          reason: "abuse",
          status: "open",
          reporter_id: "u-2",
          created_at: "2026-03-03T00:00:00Z",
        },
      ],
      total: 1,
    })
    mocks.updateReport.mockResolvedValue(undefined)
    mocks.getAdminActionLogs.mockResolvedValue({ items: [] })
    mocks.getAdminUsers.mockResolvedValue({ items: [] })
    mocks.getAdminProjects.mockResolvedValue({ items: [] })
    mocks.getAboutContent.mockResolvedValue({
      hero_title: "title",
      hero_highlight: "highlight",
      hero_description: "desc",
      contact_email: "hello@example.com",
      values: [{ emoji: "A", title: "t", description: "d" }],
      team_members: [{ name: "n", role: "r", description: "d" }],
      faqs: [{ question: "q", answer: "a" }],
    })
    mocks.getAdminPolicies.mockResolvedValue({
      id: 1,
      blocked_keywords: [],
      custom_blocked_keywords: [],
      baseline_keyword_categories: {},
      auto_hide_report_threshold: 3,
      home_filter_tabs: [{ id: "all", label: "전체" }],
      explore_filter_tabs: [{ id: "all", label: "전체" }],
      admin_log_retention_days: 365,
      admin_log_view_window_days: 30,
      admin_log_mask_reasons: true,
      updated_at: "2026-03-03T00:00:00Z",
      last_updated_by: "admin",
      last_updated_by_id: "admin-1",
      last_updated_action_at: "2026-03-03T00:00:00Z",
    })
    mocks.getAdminOAuthSettings.mockResolvedValue({
      google_oauth_enabled: false,
      google_redirect_uri: "",
      google_frontend_redirect_uri: "",
    })
    mocks.getAdminOAuthHealth.mockResolvedValue({
      google_oauth_enabled: false,
      google_redirect_uri: "",
      google_frontend_redirect_uri: "",
      has_client_id: false,
      has_client_secret: false,
      is_ready: false,
    })

    vi.spyOn(window, "prompt").mockReturnValue("정상 처리")
    vi.spyOn(window, "alert").mockImplementation(() => undefined)
  })

  it("updates report status via report action button", async () => {
    const queryClient = createAppQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <AdminScreen />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText("abuse")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "처리" }))

    await waitFor(() => {
      expect(mocks.updateReport).toHaveBeenCalledWith("r-1", "resolved", "정상 처리")
    })
  })
})
