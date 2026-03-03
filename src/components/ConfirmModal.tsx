import { Button } from "@/components/ui/button"

type ConfirmModalProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onClose: () => void
  onConfirm: () => void
  confirming?: boolean
  confirmDisabled?: boolean
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  danger = false,
  onClose,
  onConfirm,
  confirming = false,
  confirmDisabled = false,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#0B1020]/80 px-4">
      <div className="w-full max-w-md rounded-xl border border-[#111936] bg-[#161F42] p-5">
        <h3 className="mb-2 text-lg font-semibold text-[#F4F7FF]">{title}</h3>
        {description ? <p className="mb-4 text-sm text-[#B8C3E6] whitespace-pre-wrap">{description}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
            onClick={onClose}
            disabled={confirming}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className={
              danger
                ? "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white"
                : "bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020]"
            }
            onClick={onConfirm}
            disabled={confirmDisabled || confirming}
          >
            {confirming ? "처리 중..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
