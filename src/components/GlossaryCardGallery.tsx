import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { glossaryCategoryTone, type GlossaryTerm } from "@/data/glossary"

type GlossaryCardGalleryProps = {
  terms: GlossaryTerm[]
  onSelectTerm?: (term: GlossaryTerm) => void
}

export function GlossaryCardGallery({ terms, onSelectTerm }: GlossaryCardGalleryProps) {
  const [flippedIds, setFlippedIds] = useState<string[]>([])

  const flippedSet = useMemo(() => new Set(flippedIds), [flippedIds])

  const toggleCard = (termId: string) => {
    setFlippedIds((current) => (
      current.includes(termId) ? current.filter((id) => id !== termId) : [...current, termId]
    ))
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {terms.map((term) => {
        const isFlipped = flippedSet.has(term.id)

        return (
          <Card
            key={term.id}
            className={`overflow-hidden border bg-gradient-to-br ${glossaryCategoryTone(term.category)} py-0 transition-transform duration-200 hover:-translate-y-1`}
          >
            <CardContent className="flex h-full flex-col justify-between gap-5 p-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-4xl leading-none">{term.emoji}</p>
                    <h3 className="mt-3 font-display text-2xl font-bold text-[#F4F7FF]">{term.term}</h3>
                  </div>
                  <Badge className="border-0 bg-[#111936]/80 text-[#B8C3E6]">{term.category}</Badge>
                </div>

                {isFlipped ? (
                  <div className="space-y-3 text-sm leading-6 text-[#D8E0FF]">
                    <p>{term.analogy}</p>
                    <p className="text-[#B8C3E6]">{term.when_appears}</p>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm leading-6 text-[#D8E0FF]">
                    <p>{term.one_liner}</p>
                    <p className="text-[#B8C3E6] line-clamp-3">{term.analogy}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => toggleCard(term.id)}
                  className="bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
                >
                  {isFlipped ? "앞면 보기" : "카드 뒤집기"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-[#3B4A78] bg-transparent text-[#B8C3E6] hover:bg-[#111936]"
                  onClick={() => onSelectTerm?.(term)}
                >
                  이 용어로 이동
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
