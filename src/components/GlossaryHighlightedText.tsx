import { Fragment, type ElementType } from "react"

import type { GlossaryTerm } from "@/data/glossary"
import { splitTextWithGlossaryTerms } from "@/lib/glossary-text"
import { cn } from "@/lib/utils"

import { GlossaryHoverTerm } from "./GlossaryHoverTerm"

type GlossaryHighlightedTextProps = {
  text: string
  as?: ElementType
  className?: string
  termClassName?: string
  previewClassName?: string
  onSelectTerm?: (term: GlossaryTerm) => void
}

export function GlossaryHighlightedText({
  text,
  as: Component = "span",
  className,
  termClassName,
  previewClassName,
  onSelectTerm,
}: GlossaryHighlightedTextProps) {
  const segments = splitTextWithGlossaryTerms(text)

  return (
    <Component className={cn("min-w-0", className)}>
      {segments.map((segment, index) => {
        if (!segment.term) {
          return <Fragment key={`glossary-segment-${index}`}>{segment.text}</Fragment>
        }

        return (
          <GlossaryHoverTerm
            key={`${segment.term.id}-${index}`}
            term={segment.term}
            className={termClassName}
            previewClassName={previewClassName}
            onSelectTerm={onSelectTerm}
          >
            {segment.text}
          </GlossaryHoverTerm>
        )
      })}
    </Component>
  )
}
