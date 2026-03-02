type ToastProps = {
  message: string
  tone?: "info" | "success" | "error"
}

export function Toast({ message, tone = "info" }: ToastProps) {
  const toneClass =
    tone === "success"
      ? "border-[#23D5AB]/60 text-[#23D5AB]"
      : tone === "error"
        ? "border-[#FF6B6B]/60 text-[#FF6B6B]"
        : "border-[#FFB547]/60 text-[#FFB547]"

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] rounded-lg border bg-[#111936] px-4 py-2 text-sm shadow-lg ${toneClass}`}
    >
      {message}
    </div>
  )
}
