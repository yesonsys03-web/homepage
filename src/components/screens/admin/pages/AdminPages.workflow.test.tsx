import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  class ApiRequestError extends Error {
    status: number
    detail: unknown

    constructor(status: number, detail: unknown) {
      super(typeof detail === "string" ? detail : "Request failed")
      this.status = status
      this.detail = detail
    }
  }

  return {
    ApiRequestError,
    getAdminPageDraft: vi.fn(),
    updateAdminPageDraft: vi.fn(),
    publishAdminPage: vi.fn(),
    getAdminPageVersions: vi.fn(),
    getAdminPageVersion: vi.fn(),
    rollbackAdminPage: vi.fn(),
    compareAdminPageVersions: vi.fn(),
    logAdminPagePerfEvent: vi.fn(),
    getAdminPageMigrationBackups: vi.fn(),
    restoreAdminPageMigration: vi.fn(),
    getAdminPagePublishSchedules: vi.fn(),
    createAdminPagePublishSchedule: vi.fn(),
    cancelAdminPagePublishSchedule: vi.fn(),
    retryAdminPagePublishSchedule: vi.fn(),
    processAdminPagePublishSchedules: vi.fn(),
  }
})

vi.mock("@/lib/api", () => ({
  ApiRequestError: mocks.ApiRequestError,
  api: {
    getAdminPageDraft: mocks.getAdminPageDraft,
    updateAdminPageDraft: mocks.updateAdminPageDraft,
    publishAdminPage: mocks.publishAdminPage,
    getAdminPageVersions: mocks.getAdminPageVersions,
    getAdminPageVersion: mocks.getAdminPageVersion,
    rollbackAdminPage: mocks.rollbackAdminPage,
    compareAdminPageVersions: mocks.compareAdminPageVersions,
    logAdminPagePerfEvent: mocks.logAdminPagePerfEvent,
    getAdminPageMigrationBackups: mocks.getAdminPageMigrationBackups,
    restoreAdminPageMigration: mocks.restoreAdminPageMigration,
    getAdminPagePublishSchedules: mocks.getAdminPagePublishSchedules,
    createAdminPagePublishSchedule: mocks.createAdminPagePublishSchedule,
    cancelAdminPagePublishSchedule: mocks.cancelAdminPagePublishSchedule,
    retryAdminPagePublishSchedule: mocks.retryAdminPagePublishSchedule,
    processAdminPagePublishSchedules: mocks.processAdminPagePublishSchedules,
  },
}))

vi.mock("@/lib/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      email: "admin@example.com",
      nickname: "admin",
      role: "super_admin",
    },
    isLoading: false,
  }),
}))

import { AdminPages } from "./AdminPages"

function draftResponse() {
  return {
    pageId: "about_page",
    baseVersion: 2,
    publishedVersion: 1,
    document: {
      pageId: "about_page",
      status: "draft",
      version: 2,
      title: "About Page",
      seo: { metaTitle: "About", metaDescription: "Desc", ogImage: null },
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          order: 0,
          visible: true,
          content: {
            headline: "Headline",
            highlight: "Highlight",
            description: "Description",
            contactEmail: "hello@example.com",
          },
        },
        {
          id: "rich-1",
          type: "rich_text",
          order: 1,
          visible: true,
          content: { body: "body" },
        },
        {
          id: "img-1",
          type: "image",
          order: 2,
          visible: true,
          content: { src: "https://example.com/a.png", alt: "alt", caption: "cap" },
        },
        {
          id: "cta-1",
          type: "cta",
          order: 3,
          visible: true,
          content: { label: "Go", href: "https://example.com", style: "primary" },
        },
        {
          id: "feature-1",
          type: "feature_list",
          order: 4,
          visible: true,
          content: {
            items: [
              { title: "정확성", description: "입력 데이터 검증" },
              { title: "안정성", description: "복구 절차" },
            ],
          },
        },
        {
          id: "faq-1",
          type: "faq",
          order: 5,
          visible: true,
          content: {
            items: [{ question: "Q1", answer: "A1" }],
          },
        },
      ],
      updatedBy: "admin-1",
      updatedAt: "2026-03-04T00:00:00Z",
    },
  }
}

describe("AdminPages workflow regression", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAdminPageDraft.mockResolvedValue(draftResponse())
    mocks.updateAdminPageDraft.mockResolvedValue({ savedVersion: 3, document: draftResponse().document })
    mocks.publishAdminPage.mockResolvedValue({ publishedVersion: 3 })
    mocks.rollbackAdminPage.mockResolvedValue({ restoredDraftVersion: 3, publishedVersion: 1 })
    mocks.getAdminPageVersions.mockResolvedValue({
      items: [
        { page_id: "about_page", version: 3, status: "draft", reason: "save", created_by: "admin-1", created_at: "2026-03-04T01:00:00Z" },
        { page_id: "about_page", version: 2, status: "draft", reason: "save", created_by: "admin-1", created_at: "2026-03-04T00:00:00Z" },
      ],
      next_cursor: null,
    })
    mocks.compareAdminPageVersions.mockResolvedValue({
      pageId: "about_page",
      fromVersion: 2,
      toVersion: 3,
      changes: [{ kind: "field_changed", block_id: "hero-1", message: "블록 필드 변경: hero-1" }],
      summary: { total: 1, added: 0, removed: 0, reordered: 0, field_changed: 1 },
    })
    mocks.logAdminPagePerfEvent.mockResolvedValue({ ok: true })
    mocks.getAdminPageMigrationBackups.mockResolvedValue({
      pageId: "about_page",
      count: 2,
      items: [
        {
          backupKey: "about_page_migration_backup_111",
          capturedAt: "2026-03-04T12:00:00Z",
          reason: "migration run",
          dryRun: false,
          sourceKey: "about_content",
          updatedAt: "2026-03-04T12:00:01Z",
        },
        {
          backupKey: "about_page_migration_backup_110",
          capturedAt: "2026-03-04T11:00:00Z",
          reason: "dry run",
          dryRun: true,
          sourceKey: "about_content",
          updatedAt: "2026-03-04T11:00:01Z",
        },
      ],
    })
    mocks.restoreAdminPageMigration.mockResolvedValue({
      pageId: "about_page",
      dryRun: true,
      restored: false,
      backupKey: "about_page_migration_backup_111",
      validation: {
        blocking: [],
        warnings: [],
        blockingCount: 0,
        warningCount: 0,
      },
    })
    mocks.getAdminPagePublishSchedules.mockResolvedValue({
      pageId: "about_page",
      count: 1,
      items: [
        {
          scheduleId: "ps_1",
          pageId: "about_page",
          draftVersion: 2,
          publishAt: "2026-03-10T10:00:00",
          timezone: "Asia/Seoul",
          status: "scheduled",
          reason: "campaign",
          attemptCount: 0,
          maxAttempts: 3,
          lastError: "",
          nextRetryAt: "",
          createdBy: "admin-1",
          createdAt: "2026-03-05T00:00:00Z",
          updatedAt: "2026-03-05T00:00:00Z",
          cancelledAt: "",
          publishedVersion: 0,
          publishedAt: "",
        },
      ],
    })
    mocks.createAdminPagePublishSchedule.mockResolvedValue({ scheduled: true, schedule: {} })
    mocks.cancelAdminPagePublishSchedule.mockResolvedValue({ cancelled: true, schedule: {} })
    mocks.retryAdminPagePublishSchedule.mockResolvedValue({ retried: true, schedule: {} })
    mocks.processAdminPagePublishSchedules.mockResolvedValue({
      pageId: "about_page",
      processed: 1,
      published: 1,
      failed: 0,
      items: [{ scheduleId: "ps_1", status: "published", publishedVersion: 3 }],
    })
  })

  it("shows compare diff result in versions tab", async () => {
    render(<AdminPages />)

    const versionTabButtons = await screen.findAllByRole("button", { name: "버전" })
    fireEvent.click(versionTabButtons[0])
    await screen.findByText("버전 비교")

    fireEvent.click(screen.getByRole("button", { name: "Diff 보기" }))

    await waitFor(() => {
      expect(mocks.compareAdminPageVersions).toHaveBeenCalledWith("about_page", 2, 3)
    })
    expect(screen.getByText(/총 1건/)).toBeInTheDocument()
    expect(screen.getByText("블록 필드 변경: hero-1")).toBeInTheDocument()
  })

  it("switches preview device to tablet preset", async () => {
    render(<AdminPages />)

    const previewTabButtons = await screen.findAllByRole("button", { name: "미리보기" })
    fireEvent.click(previewTabButtons[0])
    expect(await screen.findByText("desktop preview")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Tablet" }))
    expect(await screen.findByText("tablet preview")).toBeInTheDocument()
  })

  it("shows conflict recovery actions on draft save conflict", async () => {
    mocks.updateAdminPageDraft.mockRejectedValue(
      new mocks.ApiRequestError(409, {
        code: "page_version_conflict",
        message: "다른 편집 내용이 먼저 저장되었습니다",
        current_version: 5,
      }),
    )

    render(<AdminPages />)

    const reasonInputs = await screen.findAllByPlaceholderText("수정 사유 (수동 저장/게시/복원 시 필수)")
    const reasonInput = reasonInputs[reasonInputs.length - 1]
    fireEvent.change(reasonInput, { target: { value: "manual save" } })
    const saveButtons = screen.getAllByRole("button", { name: "Draft 저장" })
    fireEvent.click(saveButtons[saveButtons.length - 1])

    await screen.findByText("다른 편집 내용이 먼저 저장되었습니다")
    expect(screen.getByRole("button", { name: "최신 Draft 불러오기" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "로컬 변경 다시 적용" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "최신 Draft 불러오기" }))
    await waitFor(() => {
      expect(mocks.getAdminPageDraft).toHaveBeenCalledTimes(2)
    })

    fireEvent.click(screen.getByRole("button", { name: "로컬 변경 다시 적용" }))
    expect(screen.getByText("로컬 변경을 다시 적용했습니다. 내용 확인 후 저장하세요")).toBeInTheDocument()
  })

  it("executes backup restore dry-run from selected backup", async () => {
    render(<AdminPages />)

    const versionTabButtons = screen.getAllByRole("button", { name: "버전" })
    fireEvent.click(versionTabButtons[0])
    await screen.findByText("마이그레이션 백업 복구")
    expect(screen.getByText("capturedAt: 2026-03-04T12:00:00Z")).toBeInTheDocument()
    expect(screen.getByText("updatedAt: 2026-03-04T12:00:01Z")).toBeInTheDocument()
    expect(screen.getByText("reason: migration run")).toBeInTheDocument()
    expect(screen.getByText("type: applied backup")).toBeInTheDocument()

    const reasonInputs = screen.getAllByPlaceholderText("수정 사유 (수동 저장/게시/복원 시 필수)")
    reasonInputs.forEach((input) => {
      fireEvent.change(input, { target: { value: "restore validation" } })
    })

    fireEvent.click(screen.getByRole("button", { name: "dry-run 복구" }))

    await waitFor(() => {
      expect(mocks.restoreAdminPageMigration).toHaveBeenCalledWith(
        "about_page",
        "about_page_migration_backup_111",
        "restore validation",
        true,
      )
    })
    expect(screen.getByText("복구 dry-run 완료: about_page_migration_backup_111")).toBeInTheDocument()
  })

  it("filters backup options to dry-run only", async () => {
    render(<AdminPages />)

    const versionTabButtons = screen.getAllByRole("button", { name: "버전" })
    fireEvent.click(versionTabButtons[0])
    await screen.findByText("마이그레이션 백업 복구")

    fireEvent.click(screen.getByRole("checkbox", { name: "dry-run 백업만 보기" }))

    await screen.findByText("capturedAt: 2026-03-04T11:00:00Z")
    expect(screen.getByText("reason: dry run")).toBeInTheDocument()
    expect(screen.getByText("type: dry-run backup")).toBeInTheDocument()
  })

  it("creates scheduled publish from versions tab", async () => {
    render(<AdminPages />)

    const versionTabButtons = await screen.findAllByRole("button", { name: "버전" })
    fireEvent.click(versionTabButtons[0])
    await screen.findByText("예약 게시")

    const reasonInputs = screen.getAllByPlaceholderText("수정 사유 (수동 저장/게시/복원 시 필수)")
    fireEvent.change(reasonInputs[reasonInputs.length - 1], { target: { value: "schedule publish" } })

    fireEvent.change(screen.getByLabelText("예약 게시 시각"), { target: { value: "2026-03-10T10:00" } })

    fireEvent.click(screen.getByRole("button", { name: "예약 게시 등록" }))

    await waitFor(() => {
      expect(mocks.createAdminPagePublishSchedule).toHaveBeenCalled()
    })
  })

  it("allows editing feature_list block in Hero tab", async () => {
    render(<AdminPages />)

    const heroTabButtons = screen.getAllByRole("button", { name: "Hero" })
    fireEvent.click(heroTabButtons[0])

    const featureButtons = await screen.findAllByRole("button", { name: /FeatureList/ })
    fireEvent.click(featureButtons[0])

    const itemsEditor = screen.getByPlaceholderText("items JSON")
    fireEvent.change(itemsEditor, {
      target: {
        value: JSON.stringify(
          [{ title: "개선", description: "feature_list 편집 가능" }],
          null,
          2,
        ),
      },
    })

    expect(screen.queryByText("유효한 JSON 형식으로 입력하세요")).not.toBeInTheDocument()
  })

  it("allows editing FAQ block in Hero tab", async () => {
    render(<AdminPages />)

    const heroTabButtons = screen.getAllByRole("button", { name: "Hero" })
    fireEvent.click(heroTabButtons[0])

    const faqButtons = await screen.findAllByRole("button", { name: /FAQ/ })
    fireEvent.click(faqButtons[0])

    const itemsEditor = screen.getByPlaceholderText("items JSON")
    fireEvent.change(itemsEditor, {
      target: {
        value: JSON.stringify(
          [{ question: "새 질문", answer: "새 답변" }],
          null,
          2,
        ),
      },
    })

    expect(screen.queryByText("유효한 JSON 형식으로 입력하세요")).not.toBeInTheDocument()
  })

  it("shows JSON validation error for invalid and non-array items", async () => {
    render(<AdminPages />)

    const heroTabButtons = screen.getAllByRole("button", { name: "Hero" })
    fireEvent.click(heroTabButtons[0])

    const featureButtons = await screen.findAllByRole("button", { name: /FeatureList/ })
    fireEvent.click(featureButtons[0])

    const itemsEditor = screen.getByPlaceholderText("items JSON")
    fireEvent.change(itemsEditor, { target: { value: "{" } })
    expect(screen.getByText("유효한 JSON 형식으로 입력하세요")).toBeInTheDocument()

    fireEvent.change(itemsEditor, { target: { value: "{}" } })
    expect(screen.getByText("items는 배열(JSON Array)이어야 합니다")).toBeInTheDocument()
  })

  it("blocks manual save without reason", async () => {
    render(<AdminPages />)

    const saveButtons = await screen.findAllByRole("button", { name: "Draft 저장" })
    fireEvent.click(saveButtons[saveButtons.length - 1])

    expect(screen.getByText("수동 저장은 수정 사유가 필요합니다")).toBeInTheDocument()
    expect(mocks.updateAdminPageDraft).not.toHaveBeenCalled()
  })

})
