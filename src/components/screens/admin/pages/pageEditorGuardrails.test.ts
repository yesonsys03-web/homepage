import { describe, expect, it } from "vitest"

import type { PageDocument } from "@/lib/api"

import { validatePageDocument } from "./pageEditorGuardrails"

function createDocument(overrides?: Partial<PageDocument>): PageDocument {
  return {
    pageId: "about_page",
    status: "draft",
    version: 1,
    title: "About",
    seo: { metaTitle: "About", metaDescription: "Desc", ogImage: null },
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        order: 0,
        visible: true,
        content: { headline: "Headline", highlight: "H", description: "D", contactEmail: "hello@test.dev" },
      },
      {
        id: "rt-1",
        type: "rich_text",
        order: 1,
        visible: true,
        content: { body: "Body" },
      },
      {
        id: "img-1",
        type: "image",
        order: 2,
        visible: true,
        content: { src: "https://example.com/image.png", alt: "alt", caption: "cap" },
      },
      {
        id: "cta-1",
        type: "cta",
        order: 3,
        visible: true,
        content: { label: "Go", href: "https://example.com", style: "primary" },
      },
    ],
    updatedBy: "admin",
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe("validatePageDocument", () => {
  it("returns no blocking issues for a valid document", () => {
    const issues = validatePageDocument(createDocument())
    expect(issues.filter((issue) => issue.level === "blocking")).toHaveLength(0)
  })

  it("flags duplicate block order as blocking", () => {
    const document = createDocument()
    document.blocks[1] = { ...document.blocks[1], order: 0 }

    const issues = validatePageDocument(document)
    expect(issues.some((issue) => issue.level === "blocking" && issue.field === "blocks[*].order")).toBe(true)
  })

  it("flags invalid URL as blocking", () => {
    const document = createDocument()
    document.blocks[3] = {
      ...document.blocks[3],
      content: { label: "Go", href: "not-a-url", style: "primary" },
    }

    const issues = validatePageDocument(document)
    expect(issues.some((issue) => issue.level === "blocking" && issue.field.includes("href"))).toBe(true)
  })

  it("flags image alt missing as warning", () => {
    const document = createDocument()
    document.blocks[2] = {
      ...document.blocks[2],
      content: { src: "https://example.com/image.png", alt: "", caption: "cap" },
    }

    const issues = validatePageDocument(document)
    expect(issues.some((issue) => issue.level === "warning" && issue.field.includes("alt"))).toBe(true)
  })
})
