import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface RowActionItem {
  key: string
  label: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}

interface RowActionsProps {
  label: string
  actions: RowActionItem[]
}

export function RowActions({ label, actions }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          aria-label={`${label} 작업 메뉴`}
        >
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 border-slate-700 bg-slate-800 text-slate-100">
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-slate-400">작업</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.key}
            onClick={action.onClick}
            disabled={action.disabled}
            className={action.danger ? "text-red-400 focus:bg-red-500/10 focus:text-red-300" : "text-slate-100"}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
