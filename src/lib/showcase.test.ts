import { beforeEach, describe, expect, it } from "vitest"

import {
  SHOWCASE_SUBMIT_CONTEXT_KEY,
  hasShowcaseTag,
  consumeShowcaseSubmitContext,
} from "./showcase"

describe("showcase submit context", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it("returns false for expired showcase context", () => {
    window.sessionStorage.setItem(
      SHOWCASE_SUBMIT_CONTEXT_KEY,
      JSON.stringify({ source: "showcase", expiresAt: Date.now() - 1_000 }),
    )

    expect(consumeShowcaseSubmitContext()).toBe(false)
    expect(window.sessionStorage.getItem(SHOWCASE_SUBMIT_CONTEXT_KEY)).toBeNull()
  })

  it("returns false for malformed showcase context payload", () => {
    window.sessionStorage.setItem(SHOWCASE_SUBMIT_CONTEXT_KEY, "not-json")

    expect(consumeShowcaseSubmitContext()).toBe(false)
    expect(window.sessionStorage.getItem(SHOWCASE_SUBMIT_CONTEXT_KEY)).toBeNull()
  })

  it("detects showcase tags case-insensitively", () => {
    expect(hasShowcaseTag(["React", "Showcase"])).toBe(true)
    expect(hasShowcaseTag(["React", "Tool"])).toBe(false)
  })
})
