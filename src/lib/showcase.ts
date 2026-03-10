import {
  safeLocalStorageGetItem,
  safeLocalStorageSetItem,
  safeSessionStorageGetItem,
  safeSessionStorageRemoveItem,
  safeSessionStorageSetItem,
} from "@/lib/safe-storage"

export const SHOWCASE_SUBMIT_CONTEXT_KEY = "vibecoder_showcase_submit_context"
export const SHOWCASE_BOOKMARKS_KEY = "vibecoder_showcase_bookmarks"
const SHOWCASE_SUBMIT_CONTEXT_TTL_MS = 10 * 60 * 1000
const SHOWCASE_BOOKMARKS_MAX = 50

type ShowcaseSubmitContext = {
  source: "showcase"
  expiresAt: number
}

type ShowcasePrefillResult = {
  tags: string[]
  applied: boolean
}

export function setShowcaseSubmitContext(): void {
  try {
    const payload: ShowcaseSubmitContext = {
      source: "showcase",
      expiresAt: Date.now() + SHOWCASE_SUBMIT_CONTEXT_TTL_MS,
    }
    safeSessionStorageSetItem(SHOWCASE_SUBMIT_CONTEXT_KEY, JSON.stringify(payload))
  } catch {
    return
  }
}

export function consumeShowcaseSubmitContext(): boolean {
  try {
    const raw = safeSessionStorageGetItem(SHOWCASE_SUBMIT_CONTEXT_KEY)
    if (!raw) {
      return false
    }

    safeSessionStorageRemoveItem(SHOWCASE_SUBMIT_CONTEXT_KEY)
    const parsed = JSON.parse(raw) as Partial<ShowcaseSubmitContext>
    return parsed.source === "showcase" && typeof parsed.expiresAt === "number" && parsed.expiresAt > Date.now()
  } catch {
    return false
  }
}

export function buildShowcasePrefillTags(tags: string[]): ShowcasePrefillResult {
  if (tags.some((tag) => tag.toLowerCase() === "showcase")) {
    return { tags, applied: true }
  }

  if (tags.length >= 5) {
    return { tags, applied: false }
  }

  return {
    tags: [...tags, "showcase"],
    applied: true,
  }
}

export function hasShowcaseTag(tags: string[] | undefined | null): boolean {
  return (tags || []).some((tag) => tag.toLowerCase() === "showcase")
}

export function readShowcaseBookmarks(): string[] {
  try {
    const raw = safeLocalStorageGetItem(SHOWCASE_BOOKMARKS_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    const uniqueIds = new Set<string>()
    parsed.forEach((value) => {
      if (typeof value === "string" && value.trim()) {
        uniqueIds.add(value)
      }
    })
    return [...uniqueIds].slice(0, SHOWCASE_BOOKMARKS_MAX)
  } catch {
    return []
  }
}

export function writeShowcaseBookmarks(bookmarkIds: string[]): void {
  safeLocalStorageSetItem(SHOWCASE_BOOKMARKS_KEY, JSON.stringify(bookmarkIds))
}

export function toggleShowcaseBookmark(bookmarkIds: string[], projectId: string): string[] {
  return bookmarkIds.includes(projectId)
    ? bookmarkIds.filter((id) => id !== projectId)
    : [...bookmarkIds, projectId]
}
