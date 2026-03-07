import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"

type FormModalProps = {
  open: boolean
  title: string
  description?: string
  submitLabel?: string
  cancelLabel?: string
  submitDisabled?: boolean
  submitting?: boolean
  onClose: () => void
  onSubmit: () => void
  children: ReactNode
}

export function FormModal({
  open,
  title,
  description,
  submitLabel = "저장",
  cancelLabel = "취소",
  submitDisabled = false,
  submitting = false,
  onClose,
  onSubmit,
  children,
}: FormModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#0B1020]/80 px-4">
      <div className="w-full max-w-lg rounded-xl border border-[#111936] bg-[#161F42] p-5">
        <h3 className="mb-2 text-lg font-semibold text-[#F4F7FF]">{title}</h3>
        {description ? <p className="mb-4 text-sm text-[#B8C3E6]">{description}</p> : null}
        <div className="space-y-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
            onClick={onClose}
            disabled={submitting}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className="bg-[#FF5D8F] hover:bg-[#FF5D8F]/90 text-white"
            onClick={onSubmit}
            disabled={submitDisabled || submitting}
          >
            {submitting ? "처리 중..." : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
