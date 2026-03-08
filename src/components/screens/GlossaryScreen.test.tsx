import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { GlossaryScreen } from "./GlossaryScreen"

vi.mock("@/lib/api", () => ({
  api: {
    requestGlossaryTerm: vi.fn().mockResolvedValue({ ok: true }),
  },
}))

afterEach(() => {
  cleanup()
})

describe("GlossaryScreen", () => {
  it("renders today's glossary cards and gallery", () => {
    render(<GlossaryScreen />)

    expect(screen.getByRole("heading", { name: "🃏 오늘의 추천 용어" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "🎴 실생활 비유 카드 갤러리" })).toBeInTheDocument()
  })

  it("focuses a term when selecting it from the gallery", () => {
    render(<GlossaryScreen />)

    fireEvent.click(screen.getAllByRole("button", { name: "이 용어로 이동" })[0])

    expect(screen.getByDisplayValue("API")).toBeInTheDocument()
    expect(screen.getByText("API 용어를 중심으로 보여드릴게요.")).toBeInTheDocument()
  })
})
