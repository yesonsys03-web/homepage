import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  ChallengesScreen,
  getDailyChallengeProgressBaseline,
} from "./ChallengesScreen"

vi.mock("@/lib/use-local-date-key", () => ({
  useLocalDateKey: () => "2026-03-08",
}))

vi.mock("@/components/TodayGlossaryChallengeCard", () => ({
  TodayGlossaryChallengeCard: ({ onSelectTerm }: { onSelectTerm?: (term: { term: string }) => void }) => (
    <button type="button" onClick={() => onSelectTerm?.({ term: "환경변수" })}>
      glossary-card
    </button>
  ),
}))

describe("ChallengesScreen", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it("stores daily challenge completion progress locally", () => {
    render(<ChallengesScreen />)

    fireEvent.click(screen.getByRole("button", { name: /완료했어요|색 바꾸고 완료했어요|링크 붙이고 완료했어요|카피 다듬고 완료했어요/ }))

    const raw = window.localStorage.getItem("vibecoder_daily_challenge_progress")
    expect(raw).toBeTruthy()
    expect(raw).toContain('"completed":true')
    expect(screen.getByRole("button", { name: "오늘 챌린지 완료" })).toBeInTheDocument()
  })

  it("persists the current date key when asking for help", () => {
    render(<ChallengesScreen />)

    fireEvent.click(screen.getByRole("button", { name: "질문있어요" }))

    expect(window.localStorage.getItem("vibecoder_daily_challenge_progress")).toContain('"dateKey":"2026-03-08"')
  })

  it("navigates to glossary when the glossary companion card asks for detail view", () => {
    const onNavigate = vi.fn()

    render(<ChallengesScreen onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole("button", { name: "glossary-card" }))

    expect(onNavigate).toHaveBeenCalledWith("glossary")
    expect(window.localStorage.getItem("vibecoder_glossary_focus_term")).toBe("환경변수")
  })

  it("resets previous-day completion flags but keeps cumulative count", () => {
    expect(
      getDailyChallengeProgressBaseline(
        {
          dateKey: "2026-03-08",
          completed: true,
          askedForHelp: true,
          streak: 3,
        },
        "2026-03-09",
      ),
    ).toEqual({
      dateKey: "2026-03-09",
      completed: false,
      askedForHelp: false,
      streak: 3,
    })
  })
})
