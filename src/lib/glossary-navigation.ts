import { safeLocalStorageSetItem } from "@/lib/safe-storage"

export const GLOSSARY_FOCUS_TERM_KEY = "vibecoder_glossary_focus_term"

export function setGlossaryFocusTerm(term: string) {
  if (typeof window === "undefined") {
    return
  }

  safeLocalStorageSetItem(GLOSSARY_FOCUS_TERM_KEY, term)
}
