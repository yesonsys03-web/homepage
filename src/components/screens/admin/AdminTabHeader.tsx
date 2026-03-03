import { Button } from "@/components/ui/button"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"

type AdminTabKey = "reports" | "users" | "content" | "pages" | "policies" | "actions"

interface AdminTabHeaderProps {
  onTabHoverPrefetch: (tab: AdminTabKey) => void
  onManualRefresh: () => void
}

export function AdminTabHeader({ onTabHoverPrefetch, onManualRefresh }: AdminTabHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <TabsList className="bg-[#161F42] border-0">
        <TabsTrigger onMouseEnter={() => onTabHoverPrefetch("reports")} value="reports" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">📋 신고 큐</TabsTrigger>
        <TabsTrigger onMouseEnter={() => onTabHoverPrefetch("users")} value="users" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">👤 사용자 관리</TabsTrigger>
        <TabsTrigger onMouseEnter={() => onTabHoverPrefetch("content")} value="content" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">🧩 콘텐츠 관리</TabsTrigger>
        <TabsTrigger onMouseEnter={() => onTabHoverPrefetch("pages")} value="pages" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">📝 페이지 관리</TabsTrigger>
        <TabsTrigger onMouseEnter={() => onTabHoverPrefetch("policies")} value="policies" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">⚙️ 정책/룰</TabsTrigger>
        <TabsTrigger onMouseEnter={() => onTabHoverPrefetch("actions")} value="actions" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">📝 관리자 로그</TabsTrigger>
      </TabsList>
      <Button
        type="button"
        variant="outline"
        className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
        onClick={onManualRefresh}
      >
        데이터 새로고침
      </Button>
    </div>
  )
}
