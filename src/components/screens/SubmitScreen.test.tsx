import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/use-auth", () => ({
  useAuth: () => ({ user: null }),
}))

import { buildShowcasePrefillTags } from "@/lib/showcase"
import { SubmitScreen } from "./SubmitScreen"

describe("SubmitScreen showcase prefill", () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
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
  })

  it("prefills the showcase tag when opened from the showcase board", async () => {
    window.sessionStorage.setItem(
      "vibecoder_showcase_submit_context",
      JSON.stringify({ source: "showcase", expiresAt: Date.now() + 60_000 }),
    )

    render(<SubmitScreen />)

    expect(await screen.findByText(/#showcase/)).toBeInTheDocument()
    expect(screen.getByText("showcase ×")).toBeInTheDocument()
    expect(screen.getByText("👏 0")).toBeInTheDocument()
    expect(window.sessionStorage.getItem("vibecoder_showcase_submit_context")).toBeNull()
  })

  it("does not claim showcase prefill when five tags already exist", () => {
    const result = buildShowcasePrefillTags(["React", "Python", "AI", "Tool", "Game"])

    expect(result.applied).toBe(false)
    expect(result.tags).toEqual(["React", "Python", "AI", "Tool", "Game"])
  })
})
