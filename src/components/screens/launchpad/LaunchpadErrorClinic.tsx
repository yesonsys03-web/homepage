import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"
import type { ErrorClinicResult } from "@/lib/api-types"

const TOOL_OPTIONS = [
  { label: "Claude Code", value: "claude-code" },
  { label: "Gemini CLI", value: "gemini-cli" },
  { label: "Codex CLI", value: "codex-cli" },
  { label: "OpenCode", value: "opencode" },
]

const OS_OPTIONS = [
  { label: "🍎 Mac", value: "mac" },
  { label: "🪟 Windows", value: "windows" },
]

export function LaunchpadErrorClinic() {
  const [errorText, setErrorText] = useState("")
  const [tool, setTool] = useState("claude-code")
  const [os, setOs] = useState("mac")
  const [toolVersion, setToolVersion] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ErrorClinicResult | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const canSubmit = errorText.trim().length > 0 && errorText.trim().length <= 2000 && !loading

  const handleAnalyze = async () => {
    if (!canSubmit) return
    setLoading(true)
    setFetchError(null)
    setResult(null)
    try {
      const res = await api.submitErrorClinic({
        error_text: errorText.trim(),
        tool,
        os,
        tool_version: toolVersion.trim() || undefined,
      })
      setResult(res)
    } catch {
      setFetchError("에러를 분석하지 못했어요. 잠시 후 다시 시도해주세요.")
    } finally {
      setLoading(false)
    }
  }

  const copyCommand = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1500)
    }).catch(() => undefined)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#111936] bg-[#0B1020]/60 p-5">
        <p className="text-sm text-[#B8C3E6]">
          🏥 설치하다 막혔나요? 에러를 붙여넣으면 해결책을 바로 알려드려요. 당연한 거예요, 다들 겪어요 😄
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* Tool selector */}
          <div>
            <p className="mb-1 text-xs text-[#8A96BE]">어떤 도구?</p>
            <select
              value={tool}
              onChange={(e) => setTool(e.target.value)}
              className="w-full rounded-lg border border-[#1B2854] bg-[#111936] px-3 py-2 text-sm text-[#F4F7FF]"
            >
              {TOOL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* OS selector */}
          <div>
            <p className="mb-1 text-xs text-[#8A96BE]">OS?</p>
            <div className="flex gap-2">
              {OS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOs(o.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors
                    ${os === o.value
                      ? "border-[#23D5AB] bg-[#23D5AB]/15 text-[#23D5AB]"
                      : "border-[#1B2854] bg-[#111936] text-[#B8C3E6] hover:border-[#23D5AB]/40"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Version (optional) */}
        <div className="mt-3">
          <p className="mb-1 text-xs text-[#8A96BE]">버전? (선택)</p>
          <input
            type="text"
            value={toolVersion}
            onChange={(e) => setToolVersion(e.target.value)}
            placeholder="예: v1.2.3"
            className="w-full rounded-lg border border-[#1B2854] bg-[#111936] px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#8A96BE]"
          />
        </div>

        {/* Error text */}
        <div className="mt-3">
          <p className="mb-1 text-xs text-[#8A96BE]">에러 로그 ({errorText.trim().length}/2000자)</p>
          <textarea
            value={errorText}
            onChange={(e) => setErrorText(e.target.value)}
            placeholder="여기에 에러 메시지를 붙여넣기"
            rows={6}
            className="w-full rounded-lg border border-[#1B2854] bg-[#111936] px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#8A96BE] resize-y"
          />
        </div>

        <Button
          type="button"
          onClick={() => void handleAnalyze()}
          disabled={!canSubmit}
          className="mt-3 bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90 disabled:opacity-50"
        >
          {loading ? "🔍 분석 중..." : "🔍 분석하기"}
        </Button>
      </div>

      {/* Result */}
      {fetchError && (
        <p className="text-sm text-[#FF6B6B]">{fetchError}</p>
      )}

      {result && (
        <Card className="border-[#23D5AB]/30 bg-[#0B1020]/60">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#8A96BE]">🔎 진단</p>
              <p className="mt-1 text-sm text-[#F4F7FF]">{result.diagnosis}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[#8A96BE]">💊 해결책</p>
              <p className="mt-1 whitespace-pre-line text-sm text-[#B8C3E6]">{result.solution}</p>
            </div>
            {result.commands.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8A96BE]">📋 실행할 명령어</p>
                <div className="mt-2 space-y-2">
                  {result.commands.map((cmd, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg border border-[#1B2854] bg-[#111936] px-4 py-2.5">
                      <code className="flex-1 font-mono text-sm text-[#23D5AB]">{cmd}</code>
                      <button
                        type="button"
                        onClick={() => copyCommand(cmd, idx)}
                        className="shrink-0 text-xs text-[#8A96BE] hover:text-[#23D5AB] transition-colors"
                      >
                        {copiedIdx === idx ? "✓ 복사됨" : "📋 복사"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
