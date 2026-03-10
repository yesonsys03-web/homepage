import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAboutContent: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  api: {
    getAboutContent: mocks.getAboutContent,
  },
}))

import { AboutScreen } from "./AboutScreen"

describe("AboutScreen visibility mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not render hidden/empty sections from published payload", async () => {
    mocks.getAboutContent.mockResolvedValueOnce({
      hero_title: "",
      hero_highlight: "",
      hero_description: "",
      contact_email: "",
      values: [],
      team_members: [],
      faqs: [],
    })

    render(<AboutScreen />)

    await waitFor(() => {
      expect(mocks.getAboutContent).toHaveBeenCalled()
    })

    expect(screen.queryByRole("button", { name: "시작하기" })).not.toBeInTheDocument()
    expect(screen.queryByText("👥 Team")).not.toBeInTheDocument()
    expect(screen.queryByText("❓ FAQ")).not.toBeInTheDocument()
    expect(screen.queryByText("📮 Contact Us")).not.toBeInTheDocument()
    expect(document.getElementById("about-faq-jsonld")).toBeNull()
  })

  it("renders sections when published payload includes visible content", async () => {
    mocks.getAboutContent.mockResolvedValueOnce({
      hero_title: "완성도보다",
      hero_highlight: "바이브",
      hero_description: "설명",
      contact_email: "hello@example.com",
      values: [{ emoji: "🎨", title: "창작", description: "자유" }],
      team_members: [
        {
          name: "devkim",
          role: "Founder",
          description: "소개",
        },
      ],
      faqs: [{ question: "Q1", answer: "A1" }],
    })

    render(<AboutScreen />)

    expect(await screen.findByRole("button", { name: "시작하기" })).toBeInTheDocument()
    expect(screen.getByText("👥 Team")).toBeInTheDocument()
    expect(screen.getByText("❓ FAQ")).toBeInTheDocument()
    expect(screen.getByText("📮 Contact Us")).toBeInTheDocument()
    expect(screen.getByText("창작")).toBeInTheDocument()
    expect(screen.getByText("Q1")).toBeInTheDocument()

    await waitFor(() => {
      expect(document.getElementById("about-faq-jsonld")).not.toBeNull()
    })
  })
})
