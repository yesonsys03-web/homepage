import { Card, CardContent } from "@/components/ui/card"

type StatItem = {
  label: string
  value: string
  color: string
}

interface AdminStatsCardsProps {
  stats: StatItem[]
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-[#161F42] border-0">
          <CardContent className="p-4 text-center">
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-[#B8C3E6]">{stat.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
