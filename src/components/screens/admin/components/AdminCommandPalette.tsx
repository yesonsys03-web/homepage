import { Command } from "cmdk"
import { useMemo } from "react"
import { useNavigate } from "react-router-dom"

import { ADMIN_ROUTE_META, type AdminRouteKey } from "@/components/screens/admin/constants"

interface AdminCommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const COMMAND_KEYS: AdminRouteKey[] = [
  "dashboard",
  "users",
  "content",
  "curated",
  "reports",
  "pages",
  "policies",
  "logs",
  "manual",
]

export function AdminCommandPalette({ open, onOpenChange }: AdminCommandPaletteProps) {
  const navigate = useNavigate()

  const items = useMemo(
    () =>
      COMMAND_KEYS.map((key) => ({
        key,
        label: ADMIN_ROUTE_META[key].label,
        path: ADMIN_ROUTE_META[key].path,
      })),
    [],
  )

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="관리자 커맨드 팔레트"
      overlayClassName="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm"
      className="fixed left-1/2 top-[18%] z-50 w-[min(640px,92vw)] -translate-x-1/2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl"
    >
      <div className="border-b border-slate-700 px-3">
        <Command.Input
          placeholder="메뉴, 경로를 검색하세요..."
          className="h-12 w-full border-0 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
      </div>

      <Command.List className="max-h-[360px] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-slate-400">
          일치하는 메뉴가 없습니다.
        </Command.Empty>

        <Command.Group heading="Admin Navigation" className="text-xs text-slate-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
          {items.map((item) => (
            <Command.Item
              key={item.key}
              value={`${item.label} ${item.path}`}
              onSelect={() => {
                navigate(item.path)
                onOpenChange(false)
              }}
              className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-slate-200 aria-selected:bg-slate-800 aria-selected:text-white"
            >
              <span>{item.label}</span>
              <span className="text-xs text-slate-500">{item.path}</span>
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
