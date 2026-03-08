import { describe, expect, it } from "vitest"

import { getLocalDateKey, getLocalDaySeed, parseLocalDateKey } from "./daily"

describe("daily helpers", () => {
  it("parses local date keys without UTC drift", () => {
    const parsed = parseLocalDateKey("2026-03-08")

    expect(getLocalDateKey(parsed)).toBe("2026-03-08")
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(2)
    expect(parsed.getDate()).toBe(8)
  })

  it("builds stable local day seeds from date keys", () => {
    expect(getLocalDaySeed(new Date(2026, 2, 8, 23, 59))).toBe(20260308)
    expect(getLocalDaySeed(new Date(2026, 2, 9, 0, 1))).toBe(20260309)
  })
})
