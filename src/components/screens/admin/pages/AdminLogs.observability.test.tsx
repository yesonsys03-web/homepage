import type { ReactNode } from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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
          metadata: {
            page_id: "about_page",
            draft_version: 2,
            published_version: 3,
          },
          created_at: "2026-03-04T00:00:00Z",
        },
        {
          id: "draft-log-1",
          admin_id: "admin-1",
          admin_nickname: "admin",
          action_type: "page_draft_saved",
          target_type: "page",
          target_id: "target-1",
          reason: "source=manual; reason=draft save",
          metadata: {
            page_id: "about_page",
            source: "manual",
            base_version: 2,
            saved_version: 3,
          },
          created_at: "2026-03-04T00:05:00Z",
        },
        {
          id: "rollback-log-1",
          admin_id: "admin-1",
          admin_nickname: "admin",
          action_type: "page_rolled_back",
          target_type: "page",
          target_id: "target-1",
          reason: "rollback",
          metadata: {
            page_id: "about_page",
            target_version: 3,
            restored_draft_version: 4,
            published_version: 4,
            publish_now: true,
          },
          created_at: "2026-03-04T00:10:00Z",
        },
        {
          id: "policy-log-1",
          admin_id: "admin-2",
          admin_nickname: "ops",
          action_type: "policy_updated",
          target_type: "moderation_settings",
          target_id: "00000000-0000-0000-0000-000000000001",
          reason: "Curated 품질 기준 Q 45 -> Q 52",
          metadata: {
            event: "policy_update",
            curated_quality_threshold: {
              previous: 45,
              next: 52,
            },
            changed_fields: {
              curated_review_quality_threshold: {
                previous: 45,
                next: 52,
              },
              admin_log_mask_reasons: {
                previous: true,
                next: false,
              },
              admin_log_view_window_days: {
                previous: 30,
                next: 60,
              },
              page_editor_rollout_stage: {
                previous: "qa",
                next: "pilot",
              },
            },
          },
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

  afterEach(() => {
    cleanup()
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
    expect(screen.getByText("게시 버전: v2 -> v3")).toBeInTheDocument()
    expect(screen.getByText("저장 소스: manual")).toBeInTheDocument()
    expect(screen.getByText("저장 버전: v2 -> v3")).toBeInTheDocument()
    expect(screen.getByText("복원 버전: v3 -> v4")).toBeInTheDocument()
    expect(screen.getByText("즉시 게시: 예")).toBeInTheDocument()

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
    expect(await screen.findByText("threshold history에서 이동한 로그를 강조 표시하고 있습니다.")).toBeInTheDocument()

    await waitFor(() => {
      expect(mocks.getAdminActionLogs).toHaveBeenLastCalledWith(200, {
        actionType: "policy_updated",
        actorId: undefined,
        pageId: undefined,
      })
    })
    expect(mocks.getAdminActionObservability).toHaveBeenLastCalledWith(60)
    expect(screen.getByText("품질 기준: Q 45 -> Q 52")).toBeInTheDocument()
    expect(screen.getByText("reason 마스킹: 켜짐 -> 꺼짐")).toBeInTheDocument()
    expect(screen.getByText("기본 조회 기간: 30 -> 60")).toBeInTheDocument()
    const expandButton = screen.getByRole("button", { name: "+1개 변경" })
    expect(expandButton).toBeInTheDocument()
    fireEvent.click(expandButton)
    expect(screen.getByRole("button", { name: "추가 변경 접기 (1개)" })).toBeInTheDocument()
    expect(screen.getByText("롤아웃 단계: qa -> pilot")).toBeInTheDocument()
    const highlightedRows = screen
      .getAllByRole("row", { name: /policy_updated.*q 45 -> q 52.*ops/i })
      .filter((row) => row.getAttribute("data-highlighted") === "true")
    expect(highlightedRows).toHaveLength(1)
  })

  it("shows a fallback hint when target log is missing from filtered results", async () => {
    renderWithRoute(<AdminLogs />, ["/admin/logs?actionType=policy_updated&query=curated_quality_threshold&targetLogId=missing-log"])

    expect(await screen.findByDisplayValue("policy_updated")).toBeInTheDocument()
    expect(await screen.findByText("요청한 로그를 현재 필터 결과에서 찾지 못했습니다. 필터나 검색어를 조정해 다시 확인하세요.")).toBeInTheDocument()
    expect(screen.queryByText("threshold history에서 이동한 로그를 강조 표시하고 있습니다.")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "필터 초기화" }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("action_type")).toHaveValue("")
      expect(screen.getByPlaceholderText("작업/대상/사유 검색")).toHaveValue("")
      expect(screen.queryByText("요청한 로그를 현재 필터 결과에서 찾지 못했습니다. 필터나 검색어를 조정해 다시 확인하세요.")).not.toBeInTheDocument()
    })
  })
})
