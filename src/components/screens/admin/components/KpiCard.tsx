import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string
  hint?: string
  delta?: string
  icon: LucideIcon
  tone?: "default" | "danger" | "success" | "warning"
}

const TONE_STYLES: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-slate-50",
  danger: "text-red-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
}

export function KpiCard({ title, value, hint, delta, icon: Icon, tone = "default" }: KpiCardProps) {
  return (
    <article className="group rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-lg transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal uppercase tracking-wide text-slate-400">{title}</p>
          <p className={cn("mt-2 text-3xl font-bold", TONE_STYLES[tone])}>{value}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-200">
          <Icon size={24} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>{hint || "실시간 집계"}</span>
        {delta ? <span className="font-medium text-slate-200">{delta}</span> : null}
      </div>
    </article>
  )
}
