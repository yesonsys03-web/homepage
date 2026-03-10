import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { pickDailyGlossaryTerms } from "@/data/glossary"

import {
  getDailyGlossaryProgressBaseline,
  TodayGlossaryChallengeCard,
} from "./TodayGlossaryChallengeCard"

describe("TodayGlossaryChallengeCard", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it("stores daily understanding and quiz XP locally", () => {
    const todayTerm = pickDailyGlossaryTerms(new Date(), 1)[0]

    render(<TodayGlossaryChallengeCard />)

    fireEvent.click(screen.getByRole("button", { name: "이해했어요 +5 XP" }))
    expect(window.localStorage.getItem("vibecoder_daily_glossary_xp")).toBe("5")
    expect(screen.getByText("누적 XP 5")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: todayTerm.analogy }))

    expect(window.localStorage.getItem("vibecoder_daily_glossary_xp")).toBe("15")
    expect(screen.getByText("정답! 오늘 퀴즈 XP를 획득했어요.")).toBeInTheDocument()
  })

  it("resets previous-day flags when a new date key is written", () => {
    expect(
      getDailyGlossaryProgressBaseline(
        {
          dateKey: "2026-03-08",
          understood: true,
          quizSolved: true,
          selectedAnswerId: "api",
        },
        "2026-03-09",
      ),
    ).toEqual({
      dateKey: "2026-03-09",
      understood: false,
      quizSolved: false,
    })
  })
})
