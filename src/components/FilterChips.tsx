type ChipItem = {
  id: string
  label: string
}

type FilterChipsProps = {
  items: ChipItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export function FilterChips({ items, value, onChange, className }: FilterChipsProps) {
  return (
    <div className={className ?? "flex gap-2 flex-wrap"}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-100 ${
            value === item.id
              ? "bg-[#23D5AB] text-[#0B1020]"
              : "bg-[#161F42] text-[#B8C3E6] hover:bg-[#111936] hover:text-[#F4F7FF]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
