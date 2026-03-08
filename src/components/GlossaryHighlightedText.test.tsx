import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { GlossaryHighlightedText } from "./GlossaryHighlightedText"

describe("GlossaryHighlightedText", () => {
  it("highlights glossary terms and passes the selected term back", () => {
    const onSelectTerm = vi.fn()

    render(
      <GlossaryHighlightedText
        text="API와 Git을 같이 보면 흐름이 빨라져요."
        onSelectTerm={onSelectTerm}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "API" }))

    expect(onSelectTerm).toHaveBeenCalledWith(expect.objectContaining({ id: "api", term: "API" }))
    expect(screen.getByText("두 앱이 서로 대화하는 방법")).toBeInTheDocument()
  })
})
