import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { AdminManual } from "./AdminManual"

afterEach(() => {
  cleanup()
})

describe("AdminManual", () => {
  it("renders manual sections from the markdown source", () => {
    render(<AdminManual />)

    expect(screen.getByRole("heading", { name: "운영 메뉴얼" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "1. 문서 목적" })).toBeInTheDocument()
  })

  it("filters sections by search keyword", () => {
    render(<AdminManual />)

    fireEvent.change(screen.getAllByPlaceholderText("제목, 장애 키워드, action_type, OAuth, restore 검색")[0], {
      target: { value: "OAuth" },
    })

    expect(screen.getAllByRole("heading", { name: "22. OAuth 장애 FAQ" }).length).toBeGreaterThan(0)
    expect(screen.queryAllByRole("heading", { name: "1. 문서 목적" })).toHaveLength(0)
  })
})
