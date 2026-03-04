import type { PageDocument } from "@/lib/api"

export type GuardrailLevel = "blocking" | "warning"

export interface GuardrailIssue {
  level: GuardrailLevel
  field: string
  message: string
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function validatePageDocument(document: PageDocument): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []
  const orderSet = new Set<number>()

  document.blocks.forEach((block, index) => {
    if (orderSet.has(block.order)) {
      issues.push({
        level: "blocking",
        field: "blocks[*].order",
        message: "블록 order 값이 중복되었습니다",
      })
    }
    orderSet.add(block.order)

    if (block.type === "hero") {
      const headline = String(block.content.headline ?? "").trim()
      if (!headline) {
        issues.push({
          level: "blocking",
          field: `blocks[${index}].content.headline`,
          message: "Hero headline은 필수입니다",
        })
      }
      if (headline.length > 80) {
        issues.push({
          level: "warning",
          field: `blocks[${index}].content.headline`,
          message: "Hero headline 권장 길이(80자)를 초과했습니다",
        })
      }
    }

    if (block.type === "rich_text") {
      const body = String(block.content.body ?? "").trim()
      if (block.visible && !body) {
        issues.push({
          level: "blocking",
          field: `blocks[${index}].content.body`,
          message: "RichText body는 필수입니다",
        })
      }
      if (body.length > 2000) {
        issues.push({
          level: "warning",
          field: `blocks[${index}].content.body`,
          message: "RichText body 권장 길이(2000자)를 초과했습니다",
        })
      }
    }

    if (block.type === "image") {
      const src = String(block.content.src ?? "").trim()
      const alt = String(block.content.alt ?? "").trim()
      if (block.visible && !src) {
        issues.push({
          level: "blocking",
          field: `blocks[${index}].content.src`,
          message: "Image src는 필수입니다",
        })
      }
      if (src && !isHttpUrl(src)) {
        issues.push({
          level: "blocking",
          field: `blocks[${index}].content.src`,
          message: "Image src URL 형식이 올바르지 않습니다",
        })
      }
      if (src && !alt) {
        issues.push({
          level: "warning",
          field: `blocks[${index}].content.alt`,
          message: "이미지 alt 텍스트를 입력하는 것을 권장합니다",
        })
      }
    }

    if (block.type === "cta") {
      const label = String(block.content.label ?? "").trim()
      const href = String(block.content.href ?? "").trim()
      if (block.visible && !label) {
        issues.push({
          level: "blocking",
          field: `blocks[${index}].content.label`,
          message: "CTA label은 필수입니다",
        })
      }
      if (block.visible && !href) {
        issues.push({
          level: "blocking",
          field: `blocks[${index}].content.href`,
          message: "CTA href는 필수입니다",
        })
      }
      if (href && !isHttpUrl(href)) {
        issues.push({
          level: "blocking",
          field: `blocks[${index}].content.href`,
          message: "CTA href URL 형식이 올바르지 않습니다",
        })
      }

      if (["click here", "more", "learn more", "여기", "자세히"].includes(label.toLowerCase())) {
        issues.push({
          level: "warning",
          field: `blocks[${index}].content.label`,
          message: "CTA 라벨을 더 구체적으로 작성하는 것을 권장합니다",
        })
      }
    }
  })

  const ogImage = String(document.seo.ogImage ?? "").trim()
  if (ogImage && !isHttpUrl(ogImage)) {
    issues.push({
      level: "blocking",
      field: "seo.ogImage",
      message: "OG 이미지 URL 형식이 올바르지 않습니다",
    })
  }

  return issues
}
