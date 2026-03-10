export interface ActivityItem {
  id: string
  title: string
  subtitle: string
  at: string
}

interface ActivityFeedProps {
  title: string
  items: ActivityItem[]
  emptyMessage?: string
}

export function ActivityFeed({ title, items, emptyMessage = "최근 활동이 없습니다." }: ActivityFeedProps) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <h2 className="text-lg font-medium text-slate-100">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-4 py-3">
              <p className="text-sm font-medium text-slate-100">{item.title}</p>
              <p className="mt-1 text-xs text-slate-400">{item.subtitle}</p>
              <p className="mt-2 text-xs text-slate-500">{item.at}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
