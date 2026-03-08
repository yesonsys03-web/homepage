import type { ReactNode } from "react"

import type { GlossaryTerm } from "@/data/glossary"
import { cn } from "@/lib/utils"

type GlossaryHoverTermProps = {
  term: GlossaryTerm
  children?: ReactNode
  className?: string
  previewClassName?: string
  variant?: "inline" | "chip"
  onSelectTerm?: (term: GlossaryTerm) => void
}

export function GlossaryHoverTerm({
  term,
  children,
  className,
  previewClassName,
  variant = "inline",
  onSelectTerm,
}: GlossaryHoverTermProps) {
  return (
    <span className="group relative inline-flex max-w-full align-baseline">
      <button
        type="button"
        onClick={() => onSelectTerm?.(term)}
        className={cn(
          "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#23D5AB]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1020]",
          variant === "inline"
            ? "rounded-md border border-[#23D5AB]/30 bg-[#23D5AB]/10 px-1.5 py-0.5 text-inherit underline decoration-dotted underline-offset-4 hover:border-[#23D5AB]/60 hover:bg-[#23D5AB]/18 hover:text-[#F4F7FF]"
            : "rounded-full border border-[#3B4A78] bg-[#111936] px-3 py-1 text-xs text-[#B8C3E6] hover:border-[#23D5AB]/50 hover:bg-[#1B2854] hover:text-[#F4F7FF]",
          className,
        )}
      >
        {children ?? term.term}
      </button>

      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-full z-30 mt-3 hidden w-72 -translate-x-1/2 rounded-2xl border border-[#23D5AB]/30 bg-[#0B1020]/96 p-4 text-left shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur group-hover:block group-focus-within:block",
          previewClassName,
        )}
      >
        <span className="block text-xs uppercase tracking-[0.2em] text-[#8A96BE]">glossary preview</span>
        <span className="mt-2 flex items-center gap-2 text-[#F4F7FF]">
          <span className="text-2xl leading-none">{term.emoji}</span>
          <span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-[#8A96BE]">{term.category}</span>
            <span className="font-display text-lg font-bold">{term.term}</span>
          </span>
        </span>
        <span className="mt-3 block text-sm font-semibold text-[#F4F7FF]">{term.one_liner}</span>
        <span className="mt-2 block text-sm leading-6 text-[#D8E0FF]">{term.analogy}</span>
        <span className="mt-3 block text-xs text-[#8A96BE]">클릭하면 용어사전에서 이 항목으로 바로 이동합니다.</span>
      </span>
    </span>
  )
}
