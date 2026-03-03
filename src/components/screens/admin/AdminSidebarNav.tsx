import { Button } from "@/components/ui/button"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"

type AdminTabKey = "reports" | "users" | "content" | "pages" | "policies" | "actions"

interface AdminSidebarNavProps {
  onTabHoverPrefetch: (tab: AdminTabKey) => void
  onManualRefresh: () => void
}

const ADMIN_TAB_ITEMS: Array<{ key: AdminTabKey; label: string; emoji: string }> = [
  { key: "reports", label: "신고 큐", emoji: "📋" },
  { key: "users", label: "사용자 관리", emoji: "👤" },
  { key: "content", label: "콘텐츠 관리", emoji: "🧩" },
  { key: "pages", label: "페이지 관리", emoji: "📝" },
  { key: "policies", label: "정책/룰", emoji: "⚙️" },
  { key: "actions", label: "관리자 로그", emoji: "🧾" },
]

export function AdminSidebarNav({ onTabHoverPrefetch, onManualRefresh }: AdminSidebarNavProps) {
  return (
    <aside className="rounded-xl border border-[#111936] bg-[#111936]/30 p-3 md:sticky md:top-24">
      <p className="mb-2 px-2 text-xs font-semibold tracking-wide text-[#B8C3E6]">ADMIN NAVIGATION</p>
      <TabsList className="w-full bg-transparent p-0" aria-label="관리자 탭 네비게이션">
        {ADMIN_TAB_ITEMS.map((item) => (
          <TabsTrigger
            key={item.key}
            value={item.key}
            onMouseEnter={() => onTabHoverPrefetch(item.key)}
            onFocus={() => onTabHoverPrefetch(item.key)}
            className="mb-1 h-auto w-full justify-start rounded-lg border border-transparent px-3 py-2 text-sm data-[state=active]:border-[#FF5D8F]/50 data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white"
          >
            <span aria-hidden>{item.emoji}</span>
            <span>{item.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <Button
        type="button"
        variant="outline"
        className="mt-3 w-full border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
        onClick={onManualRefresh}
      >
        데이터 새로고침
      </Button>
    </aside>
  )
}
