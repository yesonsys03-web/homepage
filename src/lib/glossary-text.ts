import { glossaryTerms, type GlossaryTerm } from "@/data/glossary"

export type GlossaryTextSegment = {
  text: string
  term: GlossaryTerm | null
}

const glossaryTermsByKey = new Map(glossaryTerms.map((term) => [term.term.toLowerCase(), term]))
const sortedGlossaryTerms = [...glossaryTerms].sort((left, right) => right.term.length - left.term.length)
const glossaryMatcher = new RegExp(
  sortedGlossaryTerms
    .map((term) => createGlossaryPattern(term.term))
    .join("|"),
  "gi",
)

export function findGlossaryTerm(rawTerm: string): GlossaryTerm | null {
  return glossaryTermsByKey.get(rawTerm.trim().toLowerCase()) ?? null
}

export function splitTextWithGlossaryTerms(text: string): GlossaryTextSegment[] {
  if (!text) {
    return []
  }

  glossaryMatcher.lastIndex = 0
  const segments: GlossaryTextSegment[] = []
  let cursor = 0

  for (const match of text.matchAll(glossaryMatcher)) {
    const matchedText = match[0]
    const start = match.index ?? 0
    const end = start + matchedText.length
    const matchedTerm = findGlossaryTerm(matchedText)

    if (!matchedText || !matchedTerm) {
      continue
    }

    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), term: null })
    }

    segments.push({ text: text.slice(start, end), term: matchedTerm })
    cursor = end
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), term: null })
  }

  if (segments.length === 0) {
    return [{ text, term: null }]
  }

  return segments
}

function createGlossaryPattern(term: string): string {
  const escapedTerm = escapeRegExp(term)

  if (/^[A-Za-z0-9._ -]+$/.test(term)) {
    return `(?<![A-Za-z0-9])${escapedTerm}(?![A-Za-z0-9])`
  }

  return escapedTerm
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
