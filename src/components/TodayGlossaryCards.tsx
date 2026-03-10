import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { glossaryCategoryTone, type GlossaryTerm } from "@/data/glossary"

type TodayGlossaryCardsProps = {
  terms: GlossaryTerm[]
  title?: string
  description?: string
  onSelectTerm?: (term: GlossaryTerm) => void
  ctaLabel?: string
}

export function TodayGlossaryCards({
  terms,
  title = "🃏 오늘의 추천 용어",
  description = "오늘 읽어두면 막힐 때 바로 떠올리기 쉬운 용어를 골라뒀어요.",
  onSelectTerm,
  ctaLabel = "용어 보기",
}: TodayGlossaryCardsProps) {
  return (
    <section className="rounded-2xl border border-[#111936] bg-[#161F42] p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-2xl font-bold text-[#F4F7FF]">{title}</h3>
          <p className="mt-1 text-[#B8C3E6]">{description}</p>
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#8A96BE]">daily picks</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {terms.map((term) => (
          <Card
            key={term.id}
            className={`overflow-hidden border bg-gradient-to-br ${glossaryCategoryTone(term.category)} py-0`}
          >
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl leading-none">{term.emoji}</span>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8A96BE]">{term.category}</p>
                  <h4 className="font-display text-xl font-bold text-[#F4F7FF]">{term.term}</h4>
                </div>
              </div>
              <p className="text-sm font-semibold text-[#F4F7FF]">{term.one_liner}</p>
              <p className="text-sm leading-6 text-[#D8E0FF]">{term.analogy}</p>
              <Button
                type="button"
                size="sm"
                onClick={() => onSelectTerm?.(term)}
                className="bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90"
              >
                {ctaLabel}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
