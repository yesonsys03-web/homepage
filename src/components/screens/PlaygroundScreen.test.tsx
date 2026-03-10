import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api"
import { PlaygroundScreen } from "./PlaygroundScreen"

describe("PlaygroundScreen", () => {
  beforeEach(() => {
    window.localStorage.clear()
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("filters recipe cards by category", () => {
    render(<PlaygroundScreen />)

    fireEvent.click(screen.getByRole("button", { name: "Git" }))

    expect(screen.getByText("변경 저장하기")).toBeInTheDocument()
    expect(screen.queryByText("개발 서버 켜기")).not.toBeInTheDocument()
  })

  it("stores favorites and shows the explanation accordion", async () => {
    render(<PlaygroundScreen />)

    const targetCard = screen.getByText("개발 서버 켜기").closest("[data-slot='card']")
    expect(targetCard).toBeInstanceOf(HTMLElement)

    const cardQueries = within(targetCard as HTMLElement)

    fireEvent.click(cardQueries.getByRole("button", { name: "개발 서버 켜기 즐겨찾기 추가" }))
    fireEvent.click(cardQueries.getByRole("button", { name: "이게 뭐야?" }))

    expect(screen.getByText("가게 문을 열듯이 내 앱을 브라우저에서 볼 수 있게 해줘요. 보통 localhost 주소와 함께 열립니다.")).toBeInTheDocument()
    expect(window.localStorage.getItem("vibecoder_recipe_favorites")).toContain("dev-server")
  })

  it("translates general text and stores recent history", async () => {
    const onNavigate = vi.fn()

    vi.spyOn(api, "textTranslate").mockResolvedValueOnce({
      korean_summary: "새 Git 기록을 만들고 API 연결을 준비하라는 뜻이에요.",
      simple_analogy: "새 일기장을 만들고 Git 백업 연결을 처음 거는 단계예요.",
      commands: [
        {
          description: "새 Git 기록을 시작해요.",
          command: "git init",
        },
      ],
      related_terms: ["git", "레포지토리"],
      input_hash: "hash-1",
      source: "fallback",
    })

    render(<PlaygroundScreen onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole("button", { name: "텍스트 번역" }))
    fireEvent.change(screen.getByPlaceholderText("영어 README, 기술 문장, 명령 설명을 붙여넣으세요 (최대 2,000자)"), {
      target: { value: "Initialize a new git repository and set upstream to origin main branch" },
    })
    fireEvent.click(screen.getByRole("button", { name: "번역하기" }))

    await waitFor(() => {
      expect(screen.getByText("새 Git 기록을 만들고 ", { exact: false })).toBeInTheDocument()
    })
    expect(screen.getAllByRole("button", { name: "Git" }).length).toBeGreaterThan(0)
    expect(screen.getByText("쉽게 말하면:")).toBeInTheDocument()
    expect(screen.getByText("#git")).toBeInTheDocument()
    expect(window.localStorage.getItem("vibecoder_text_translation_history")).toContain("Initialize a new git repository")

    fireEvent.click(screen.getByRole("button", { name: "API" }))

    expect(window.localStorage.getItem("vibecoder_glossary_focus_term")).toBe("API")
    expect(onNavigate).toHaveBeenCalledWith("glossary")
  })
})
