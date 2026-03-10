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
      curated_related_click_boost_min_relevance: 6,
      curated_related_click_boost_multiplier: 48,
      curated_related_click_boost_cap: 180,
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
          reason: "curated_quality_threshold=45, curated_quality_threshold_previous=40, keywords=1, threshold=3, retention_days=180, view_window_days=14, mask_reasons=false, page_editor_enabled=true, rollout_stage=qa, pilot_admin_count=1, curated_quality_threshold_next=45",
          metadata: {
            event: "policy_update",
            curated_quality_threshold: {
              previous: 40,
              next: 45,
            },
            changed_fields: {
              curated_review_quality_threshold: {
                previous: 40,
                next: 45,
              },
            },
          },
          created_at: "2026-03-07T02:00:00Z",
        },
      ],
    })
    mocks.updateAdminPolicies.mockResolvedValue({
      blocked_keywords: ["spam", "nsfw"],
      custom_blocked_keywords: ["spam", "nsfw"],
      baseline_keyword_categories: {},
      auto_hide_report_threshold: 3,
      home_filter_tabs: [],
      explore_filter_tabs: [],
      admin_log_retention_days: 365,
      admin_log_view_window_days: 30,
      admin_log_mask_reasons: true,
      page_editor_enabled: true,
      page_editor_rollout_stage: "qa",
      page_editor_pilot_admin_ids: ["admin-1", "admin-2"],
      page_editor_publish_fail_rate_threshold: 0.2,
      page_editor_rollback_ratio_threshold: 0.3,
      page_editor_conflict_rate_threshold: 0.25,
      curated_review_quality_threshold: 52,
      curated_related_click_boost_min_relevance: 8,
      curated_related_click_boost_multiplier: 36,
      curated_related_click_boost_cap: 140,
      updated_at: "2026-03-08T00:00:00Z",
    })
    mocks.updateAdminOAuthSettings.mockResolvedValue({})
  })

  it("loads and saves log policy values", async () => {
    renderScreen()

    const retentionInput = await screen.findByLabelText("관리자 로그 보존 기간(일)")
    const viewWindowInput = screen.getByLabelText("관리자 로그 기본 조회 기간(일)")
    const maskCheckbox = screen.getByLabelText("로그 사유(reason) 마스킹 사용")
    const curatedThresholdInput = screen.getByLabelText("Curated 품질 검토 기준(1~100)")
    const clickBoostMinRelevanceInput = screen.getByLabelText("추천 클릭 최소 관련성(1~100)")
    const clickBoostMultiplierInput = screen.getByLabelText("추천 클릭 multiplier(1~200)")
    const clickBoostCapInput = screen.getByLabelText("추천 클릭 cap(1~500)")

    expect(retentionInput).toHaveValue(180)
    expect(viewWindowInput).toHaveValue(14)
    expect(maskCheckbox).not.toBeChecked()
    expect(curatedThresholdInput).toHaveValue(45)
    expect(clickBoostMinRelevanceInput).toHaveValue(6)
    expect(clickBoostMultiplierInput).toHaveValue(48)
    expect(clickBoostCapInput).toHaveValue(180)
    expect(screen.getByText(/quality score가/)).toBeInTheDocument()
    expect(screen.getByText(/관련 추천 클릭 boost는 최소 관련성/)).toBeInTheDocument()
    expect(screen.getByText("최근 품질 기준 변경")).toBeInTheDocument()
    expect(screen.getByText("Q 45 (40 -> 45)")).toBeInTheDocument()

    fireEvent.change(retentionInput, { target: { value: "365" } })
    fireEvent.change(viewWindowInput, { target: { value: "30" } })
    fireEvent.change(curatedThresholdInput, { target: { value: "52" } })
    fireEvent.change(clickBoostMinRelevanceInput, { target: { value: "8" } })
    fireEvent.change(clickBoostMultiplierInput, { target: { value: "36" } })
    fireEvent.change(clickBoostCapInput, { target: { value: "140" } })
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
        8,
        36,
        140,
      )
    })
    await waitFor(() => {
      expect(retentionInput).toHaveValue(365)
      expect(viewWindowInput).toHaveValue(30)
      expect(maskCheckbox).toBeChecked()
      expect(curatedThresholdInput).toHaveValue(52)
      expect(clickBoostMinRelevanceInput).toHaveValue(8)
      expect(clickBoostMultiplierInput).toHaveValue(36)
      expect(clickBoostCapInput).toHaveValue(140)
    })
    expect(mocks.getAdminActionLogs).toHaveBeenCalledWith(8, { actionType: "policy_updated" }, { force: true })
    expect(mocks.getAdminActionLogs).toHaveBeenCalledWith(8, { actionType: "policy_updated" }, { force: true })
  })

  it("shows a query error instead of the empty state when policy history fails", async () => {
    mocks.getAdminActionLogs.mockRejectedValueOnce(new Error("history failed"))

    renderScreen()

    expect(await screen.findByText("정책 변경 이력을 불러오지 못했습니다.")).toBeInTheDocument()
    expect(screen.queryByText("기록된 변경 이력이 없습니다.")).not.toBeInTheDocument()
  })
})
