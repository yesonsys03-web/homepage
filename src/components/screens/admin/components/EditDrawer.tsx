import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface EditDrawerProps {
  open: boolean
  title: string
  description?: string
  submitting?: boolean
  onOpenChange: (next: boolean) => void
  onSubmit: () => void
  children: ReactNode
}

export function EditDrawer({
  open,
  title,
  description,
  submitting,
  onOpenChange,
  onSubmit,
  children,
}: EditDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full border-slate-700 bg-slate-900 text-slate-100 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription className="text-slate-400">{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="mt-6 space-y-4">{children}</div>
        <SheetFooter className="mt-6">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={Boolean(submitting)}
            className="bg-[#FF5D8F] text-white hover:bg-[#ff4a83]"
          >
            {submitting ? "저장 중..." : "저장"}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 text-slate-200">
            취소
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
