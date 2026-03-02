import { useState } from "react"
import { Button } from "@/components/ui/button"

type ReportModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (reason: string) => Promise<void> | void
}

const REPORT_REASONS = ["spam", "abuse", "adult", "other"] as const

export function ReportModal({ open, onClose, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("abuse")
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await onSubmit(reason)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#0B1020]/75 px-4">
      <div className="w-full max-w-md rounded-xl border border-[#111936] bg-[#161F42] p-5">
        <h3 className="font-display text-xl text-[#F4F7FF] mb-2">댓글 신고</h3>
        <p className="text-sm text-[#B8C3E6] mb-4">신고 사유를 선택해주세요.</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {REPORT_REASONS.map((item) => (
            <button
              key={item}
              className={`rounded-lg px-3 py-2 text-sm border duration-100 ${
                reason === item
                  ? "border-[#23D5AB] text-[#23D5AB]"
                  : "border-[#111936] text-[#B8C3E6] hover:border-[#23D5AB]/40"
              }`}
              onClick={() => setReason(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="border-[#111936] text-[#B8C3E6]" onClick={onClose}>
            취소
          </Button>
          <Button
            className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020]"
            disabled={loading}
            onClick={() => void handleSubmit()}
          >
            {loading ? "전송 중..." : "신고하기"}
          </Button>
        </div>
      </div>
    </div>
  )
}
