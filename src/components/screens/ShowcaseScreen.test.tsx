import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api"
import { ShowcaseScreen } from "./ShowcaseScreen"

describe("ShowcaseScreen", () => {
  beforeEach(() => {
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it("loads showcase cards and routes CTA actions", async () => {
    const onNavigate = vi.fn()
    const onOpenProject = vi.fn()

    vi.spyOn(api, "hasProjectsCache").mockReturnValue(false)
    vi.spyOn(api, "getProjects").mockResolvedValue({
      items: [
        {
          id: "project-1",
          author_id: "user-1",
          author_nickname: "바이브메이커",
          title: "첫 배포 성공했어요",
          summary: "Cursor와 Claude로 랜딩 페이지를 배포한 기록이에요.",
          description: "작은 배포 기록",
          thumbnail_url: "",
          demo_url: "https://example.com",
          repo_url: "https://github.com/example/repo",
          platform: "web",
          like_count: 12,
          comment_count: 3,
          tags: ["React", "첫배포"],
          created_at: "2026-03-08T00:00:00Z",
          updated_at: "2026-03-08T00:00:00Z",
        },
      ],
    })

    render(<ShowcaseScreen onNavigate={onNavigate} onOpenProject={onOpenProject} />)

    await waitFor(() => {
      expect(screen.getAllByText("첫 배포 성공했어요").length).toBeGreaterThan(0)
    })
    expect(api.getProjects).toHaveBeenCalledWith(
      { sort: "latest", tag: "showcase" },
      expect.any(Object),
    )
    expect(screen.getByText("👏 12명이 박수쳤어요")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "자랑하기" }))
    expect(onNavigate).toHaveBeenCalledWith("submit")
    const rawContext = window.sessionStorage.getItem("vibecoder_showcase_submit_context")
    expect(rawContext).toBeTruthy()
    expect(rawContext).toContain("showcase")

    fireEvent.click(screen.getByRole("heading", { name: "첫 배포 성공했어요" }))
    expect(onOpenProject).toHaveBeenCalledWith("project-1")
  })

  it("stores a local showcase bookmark with the build-it-later action", async () => {
    vi.spyOn(api, "hasProjectsCache").mockReturnValue(false)
    vi.spyOn(api, "getProjects").mockResolvedValue({
      items: [
        {
          id: "project-1",
          author_id: "user-1",
          author_nickname: "바이브메이커",
          title: "첫 배포 성공했어요",
          summary: "Cursor와 Claude로 랜딩 페이지를 배포한 기록이에요.",
          description: "작은 배포 기록",
          thumbnail_url: "",
          demo_url: "https://example.com",
          repo_url: "https://github.com/example/repo",
          platform: "web",
          like_count: 12,
          comment_count: 3,
          tags: ["showcase", "React"],
          created_at: "2026-03-08T00:00:00Z",
          updated_at: "2026-03-08T00:00:00Z",
        },
      ],
    })

    render(<ShowcaseScreen />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "첫 배포 성공했어요 저도 만들어볼게요 추가" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "첫 배포 성공했어요 저도 만들어볼게요 추가" }))

    expect(window.localStorage.getItem("vibecoder_showcase_bookmarks")).toContain("project-1")
    expect(screen.getByText("저도 만들어볼게요 목록에 담았어요.")).toBeInTheDocument()
  })

  it("renders persisted bookmarks and lets users clean missing entries", async () => {
    window.localStorage.setItem("vibecoder_showcase_bookmarks", JSON.stringify(["project-1", "project-1", "missing-project"]))

    vi.spyOn(api, "hasProjectsCache").mockReturnValue(false)
    vi.spyOn(api, "getProjects").mockResolvedValue({ items: [] })
    vi.spyOn(api, "getProject").mockImplementation(async (id: string) => {
      if (id === "project-1") {
        return {
          id: "project-1",
          author_id: "user-1",
          author_nickname: "바이브메이커",
          title: "첫 배포 성공했어요",
          summary: "Cursor와 Claude로 랜딩 페이지를 배포한 기록이에요.",
          description: "작은 배포 기록",
          thumbnail_url: "",
          demo_url: "https://example.com",
          repo_url: "https://github.com/example/repo",
          platform: "web",
          like_count: 12,
          comment_count: 3,
          tags: ["showcase", "React"],
          created_at: "2026-03-08T00:00:00Z",
          updated_at: "2026-03-08T00:00:00Z",
        }
      }
      throw new Error("Project not found")
    })

    render(<ShowcaseScreen />)

    expect(await screen.findByText("저도 만들어볼게요")).toBeInTheDocument()
    expect(await screen.findByText("불러올 수 없는 자랑 글")).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: "목록에서 빼기" })).toBeInTheDocument()
    expect(screen.getByText("2개 저장됨")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "목록에서 정리하기" }))

    expect(window.localStorage.getItem("vibecoder_showcase_bookmarks")).toBe(JSON.stringify(["project-1"]))
  })

  it("shows a retry state for transient bookmark fetch failures", async () => {
    window.localStorage.setItem("vibecoder_showcase_bookmarks", JSON.stringify(["unstable-project"]))

    vi.spyOn(api, "hasProjectsCache").mockReturnValue(false)
    vi.spyOn(api, "getProjects").mockResolvedValue({ items: [] })
    vi.spyOn(api, "getProject").mockRejectedValue(new Error("network down"))

    render(<ShowcaseScreen />)

    expect(await screen.findByText("일시적으로 불러오지 못한 자랑 글이 있어요")).toBeInTheDocument()
    expect(screen.queryByText("불러올 수 없는 자랑 글")).not.toBeInTheDocument()
    expect(window.localStorage.getItem("vibecoder_showcase_bookmarks")).toBe(JSON.stringify(["unstable-project"]))
  })
})
