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
  })

  it("shows compare diff result in versions tab", async () => {
    render(<AdminPages />)

    fireEvent.click(await screen.findByRole("button", { name: "버전" }))
    await screen.findByText("버전 비교")

    fireEvent.click(screen.getByRole("button", { name: "Diff 보기" }))

    await waitFor(() => {
      expect(mocks.compareAdminPageVersions).toHaveBeenCalledWith("about_page", 2, 3)
    })
    expect(screen.getByText(/총 1건/)).toBeInTheDocument()
    expect(screen.getByText("블록 필드 변경: hero-1")).toBeInTheDocument()
  })

  it("shows conflict banner and reload button on draft save conflict", async () => {
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
  })
})
