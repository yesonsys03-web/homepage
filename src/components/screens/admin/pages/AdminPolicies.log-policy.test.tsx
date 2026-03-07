import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAdminPolicies: vi.fn(),
  getAdminOAuthSettings: vi.fn(),
  getAdminOAuthHealth: vi.fn(),
  getAdminActionLogs: vi.fn(),
  updateAdminPolicies: vi.fn(),
  updateAdminOAuthSettings: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  api: {
    getAdminPolicies: mocks.getAdminPolicies,
    getAdminOAuthSettings: mocks.getAdminOAuthSettings,
    getAdminOAuthHealth: mocks.getAdminOAuthHealth,
    getAdminActionLogs: mocks.getAdminActionLogs,
    updateAdminPolicies: mocks.updateAdminPolicies,
    updateAdminOAuthSettings: mocks.updateAdminOAuthSettings,
  },
}))

import { AdminPolicies } from "./AdminPolicies"

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AdminPolicies />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe("AdminPolicies log policy fields", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAdminPolicies.mockResolvedValue({
      blocked_keywords: [],
      custom_blocked_keywords: ["spam"],
      baseline_keyword_categories: {},
      auto_hide_report_threshold: 3,
      home_filter_tabs: [],
      explore_filter_tabs: [],
      admin_log_retention_days: 180,
      admin_log_view_window_days: 14,
      admin_log_mask_reasons: false,
      page_editor_enabled: true,
      page_editor_rollout_stage: "qa",
      page_editor_pilot_admin_ids: ["admin-1"],
      page_editor_publish_fail_rate_threshold: 0.2,
      page_editor_rollback_ratio_threshold: 0.3,
      page_editor_conflict_rate_threshold: 0.25,
      curated_review_quality_threshold: 45,
      updated_at: "2026-03-04T00:00:00Z",
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
    mocks.getAdminActionLogs.mockResolvedValue({
      items: [
        {
          id: "policy-log-1",
          admin_nickname: "ops",
          action_type: "policy_updated",
          target_type: "moderation_settings",
          target_id: "00000000-0000-0000-0000-000000000001",
          reason: "keywords=1, threshold=3, retention_days=180, view_window_days=14, mask_reasons=false, page_editor_enabled=true, rollout_stage=qa, pilot_admin_count=1, curated_quality_threshold=45",
          created_at: "2026-03-07T02:00:00Z",
        },
      ],
    })
    mocks.updateAdminPolicies.mockResolvedValue({})
    mocks.updateAdminOAuthSettings.mockResolvedValue({})
  })

  it("loads and saves log policy values", async () => {
    renderScreen()

    const retentionInput = await screen.findByLabelText("관리자 로그 보존 기간(일)")
    const viewWindowInput = screen.getByLabelText("관리자 로그 기본 조회 기간(일)")
    const maskCheckbox = screen.getByLabelText("로그 사유(reason) 마스킹 사용")
    const curatedThresholdInput = screen.getByLabelText("Curated 품질 검토 기준(1~100)")

    expect(retentionInput).toHaveValue(180)
    expect(viewWindowInput).toHaveValue(14)
    expect(maskCheckbox).not.toBeChecked()
    expect(curatedThresholdInput).toHaveValue(45)
    expect(screen.getByText(/quality score가/)).toBeInTheDocument()
    expect(screen.getByText("최근 품질 기준 변경")).toBeInTheDocument()
    expect(screen.getByText("Q 45")).toBeInTheDocument()

    fireEvent.change(retentionInput, { target: { value: "365" } })
    fireEvent.change(viewWindowInput, { target: { value: "30" } })
    fireEvent.change(curatedThresholdInput, { target: { value: "52" } })
    fireEvent.click(maskCheckbox)
    fireEvent.click(screen.getByRole("button", { name: "정책 저장" }))

    await waitFor(() => {
      expect(mocks.updateAdminPolicies).toHaveBeenCalledWith(
        ["spam"],
        3,
        undefined,
        undefined,
        365,
        30,
        true,
        true,
        "qa",
        ["admin-1"],
        0.2,
        0.3,
        0.25,
        52,
      )
    })
    expect(mocks.getAdminActionLogs).toHaveBeenCalledWith(8, { actionType: "policy_updated" })
  })
})
