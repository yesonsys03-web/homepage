export type AdminRouteKey =
  | "dashboard"
  | "users"
  | "content"
  | "curated"
  | "reports"
  | "pages"
  | "policies"
  | "logs"

export const ADMIN_ROUTE_META: Record<AdminRouteKey, { label: string; path: string }> = {
  dashboard: { label: "개요", path: "/admin" },
  users: { label: "사용자", path: "/admin/users" },
  content: { label: "콘텐츠", path: "/admin/content" },
  curated: { label: "큐레이션", path: "/admin/curated" },
  reports: { label: "신고", path: "/admin/reports" },
  pages: { label: "페이지", path: "/admin/pages" },
  policies: { label: "정책", path: "/admin/policies" },
  logs: { label: "로그", path: "/admin/logs" },
}
