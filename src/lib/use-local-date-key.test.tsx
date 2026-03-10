import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useLocalDateKey } from "./use-local-date-key"

function Probe() {
  const dateKey = useLocalDateKey()
  return <div>{dateKey}</div>
}

describe("useLocalDateKey", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("reschedules when the window regains focus", () => {
    vi.setSystemTime(new Date(2026, 2, 8, 23, 59, 50))
    render(<Probe />)

    expect(screen.getByText("2026-03-08")).toBeInTheDocument()

    vi.setSystemTime(new Date(2026, 2, 9, 0, 0, 5))
    act(() => {
      window.dispatchEvent(new Event("focus"))
    })

    expect(screen.getByText("2026-03-09")).toBeInTheDocument()
  })
})
