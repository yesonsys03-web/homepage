import { Button } from "@/components/ui/button"

type CommentComposerProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  isSubmitting?: boolean
}

export function CommentComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  isSubmitting = false,
}: CommentComposerProps) {
  return (
    <div className="mb-6">
      <p className="text-sm text-[#B8C3E6] mb-2">좋았던 포인트 한 가지를 남겨보세요</p>
      <p className="text-xs text-[#B8C3E6] mb-3">존중 기반 피드백만 허용</p>
      <textarea
        className="w-full bg-[#161F42] border border-[#111936] rounded-lg p-4 text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:outline-none focus:ring-2 focus:ring-[#23D5AB]"
        rows={4}
        placeholder={disabled ? "로그인 후 댓글을 작성할 수 있습니다." : "댓글을 입력하세요..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {disabled ? <p className="text-xs text-[#FFB547] mt-2">댓글 작성은 로그인 후 가능합니다.</p> : null}
      <Button
        className="mt-2 bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] duration-100"
        onClick={onSubmit}
        disabled={isSubmitting || disabled}
      >
        {isSubmitting ? "작성 중..." : disabled ? "로그인 필요" : "댓글 작성"}
      </Button>
    </div>
  )
}
