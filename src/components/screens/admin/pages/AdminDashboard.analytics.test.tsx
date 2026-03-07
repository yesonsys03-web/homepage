import { cleanup, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"

const mocks = vi.hoisted(() => ({
  getAdminStats: vi.fn(),
  getAdminActionLogs: vi.fn(),
  getAdminCuratedRelatedClicksSummary: vi.fn(),
  getAdminActionObservability: vi.fn(),
  getAdminPolicies: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  api: {
    getAdminStats: mocks.getAdminStats,
    getAdminActionLogs: mocks.getAdminActionLogs,
    getAdminCuratedRelatedClicksSummary: mocks.getAdminCuratedRelatedClicksSummary,
    getAdminActionObservability: mocks.getAdminActionObservability,
    getAdminPolicies: mocks.getAdminPolicies,
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
        {
          id: "log-2",
          admin_nickname: "ops",
          action_type: "policy_updated",
          target_type: "moderation_settings",
          target_id: "00000000-0000-0000-0000-000000000001",
          reason: "keywords=1, threshold=3, retention_days=180, view_window_days=14, mask_reasons=false, page_editor_enabled=true, rollout_stage=qa, pilot_admin_count=1, curated_quality_threshold=52",
          created_at: "2026-03-07T01:00:00Z",
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
      daily_curated_collection_counts: [{ day: "2026-03-04", run_count: 1, created_total: 2 }],
      curated_collection_summary: {
        succeeded: 1,
        failed: 0,
        skipped: 0,
        created_total: 2,
      },
      curated_review_queue_summary: {
        pending: 3,
        review_license: 1,
        review_duplicate: 2,
        review_quality: 4,
        total: 10,
      },
      curated_collection_failure_distribution: [],
    })
    mocks.getAdminPolicies.mockResolvedValue({
      blocked_keywords: [],
      custom_blocked_keywords: [],
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
      curated_review_quality_threshold: 52,
      updated_at: "2026-03-04T00:00:00Z",
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("renders curated related click widget data", async () => {
    renderScreen()

    expect(await screen.findByText("Curated 검수 큐")).toBeInTheDocument()
    expect(await screen.findByText("현재 검수 대기 총합")).toBeInTheDocument()
    expect(screen.getByText("현재 품질 기준")).toBeInTheDocument()
    expect(screen.getAllByText("Q 52").length).toBeGreaterThan(0)
    expect(screen.getByText("최근 기준 변경")).toBeInTheDocument()
    expect(screen.getByText("라이선스 검토")).toBeInTheDocument()
    expect(screen.getByText("중복 검토")).toBeInTheDocument()
    expect(screen.getByText("품질 검토")).toBeInTheDocument()
    expect(await screen.findByText("Curated 추천 클릭")).toBeInTheDocument()
    expect(await screen.findByText("Starter Repo → Deploy Kit")).toBeInTheDocument()
    expect(screen.getByText("총 클릭")).toBeInTheDocument()
    expect(screen.getAllByText("태그 일치").length).toBeGreaterThan(0)
    expect(mocks.getAdminCuratedRelatedClicksSummary).toHaveBeenCalledWith(30, 5)
    expect(mocks.getAdminActionObservability).toHaveBeenCalledWith(30)
    expect(mocks.getAdminPolicies).toHaveBeenCalled()
    expect(mocks.getAdminActionLogs).toHaveBeenCalledWith(6, { actionType: "policy_updated" })
  })

  it("renders an error state when curated click summary fails", async () => {
    mocks.getAdminCuratedRelatedClicksSummary.mockRejectedValueOnce(new Error("boom"))

    renderScreen()

    expect(await screen.findByText("추천 클릭 집계를 불러오지 못했습니다.")).toBeInTheDocument()
  })
})
