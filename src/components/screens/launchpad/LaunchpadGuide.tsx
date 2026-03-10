import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { installGuides, type InstallGuide } from "@/data/launchpad-guides"

type OS = "mac" | "windows"

function copyToClipboard(text: string, onCopied: (id: string) => void, id: string) {
  navigator.clipboard.writeText(text).then(() => {
    onCopied(id)
    setTimeout(() => onCopied(""), 1500)
  }).catch(() => undefined)
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function ToolCard({
  guide,
  selected,
  onClick,
}: {
  guide: InstallGuide
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={guide.status === "coming-soon"}
      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all
        ${guide.status === "coming-soon" ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
        ${selected ? "border-[#23D5AB] bg-[#23D5AB]/10" : "border-[#1B2854] bg-[#111936] hover:border-[#23D5AB]/50"}`}
    >
      <span className="text-3xl">{guide.emoji}</span>
      <p className="text-sm font-bold text-[#F4F7FF]">{guide.name}</p>
      {guide.status === "coming-soon" && (
        <Badge className="bg-[#1B2854] text-[#8A96BE] text-xs">준비중</Badge>
      )}
      {guide.status === "ready" && selected && (
        <Badge className="bg-[#23D5AB]/20 text-[#23D5AB] text-xs">선택됨</Badge>
      )}
    </button>
  )
}

export function LaunchpadGuide() {
  const [selectedTool, setSelectedTool] = useState<InstallGuide["tool"]>("claude-code")
  const [os, setOs] = useState<OS>("mac")
  const [copiedId, setCopiedId] = useState("")

  const guide = installGuides.find((g) => g.tool === selectedTool)
  const steps = guide?.steps[os] ?? []
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  return (
    <div className="space-y-6">
      {isMobile && (
        <div className="rounded-xl border border-[#FFB547]/40 bg-[#FFB547]/10 px-4 py-3 text-sm text-[#FFB547]">
          📱 터미널 명령어는 PC에서 진행해 주세요. 지금은 내용을 미리 보는 중이에요.
        </div>
      )}

      {/* Tool selection */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#8A96BE]">도구 선택</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {installGuides.map((g) => (
            <ToolCard
              key={g.tool}
              guide={g}
              selected={selectedTool === g.tool}
              onClick={() => {
                if (g.status === "ready") setSelectedTool(g.tool)
              }}
            />
          ))}
        </div>
      </div>

      {guide && guide.status === "ready" && (
        <div className="space-y-5">
          {/* Guide header */}
          <div className="rounded-2xl border border-[#111936] bg-[#0B1020]/60 p-5">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{guide.emoji}</span>
              <div>
                <h3 className="font-display text-xl font-bold text-[#F4F7FF]">{guide.name}</h3>
                <p className="text-sm text-[#B8C3E6]">{guide.tagline}</p>
              </div>
            </div>

            {/* Prerequisites */}
            {guide.prerequisites.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#8A96BE]">먼저 필요한 것들</p>
                <ul className="mt-2 space-y-1">
                  {guide.prerequisites.map((prereq) => (
                    <li key={prereq.name} className="flex items-start gap-2 text-sm text-[#B8C3E6]">
                      <span className="text-[#23D5AB]">✓</span>
                      <span>
                        <strong className="text-[#F4F7FF]">{prereq.name}</strong>
                        {" — "}
                        {prereq.install_guide}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* OS tabs */}
          <div className="flex gap-2">
            {(["mac", "windows"] as OS[]).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOs(o)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors
                  ${os === o
                    ? "border-[#23D5AB] bg-[#23D5AB]/15 text-[#23D5AB]"
                    : "border-[#1B2854] bg-[#111936] text-[#B8C3E6] hover:border-[#23D5AB]/40"}`}
              >
                {o === "mac" ? "🍎 Mac" : "🪟 Windows"}
              </button>
            ))}
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <Card key={idx} className="border-[#111936] bg-[#0B1020]/60">
                <CardContent className="p-4">
                  <p className="mb-2 text-xs uppercase tracking-widest text-[#8A96BE]">{idx + 1}단계</p>
                  <div className="flex items-center gap-2 rounded-lg border border-[#1B2854] bg-[#111936] px-4 py-2.5">
                    <code className="flex-1 font-mono text-sm text-[#23D5AB]">{step.command}</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(step.command, setCopiedId, `step-${idx}`)}
                      className="shrink-0 text-xs text-[#8A96BE] hover:text-[#23D5AB] transition-colors"
                    >
                      {copiedId === `step-${idx}` ? "✓ 복사됨" : "📋 복사"}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-[#B8C3E6]">{step.explanation}</p>
                  {step.note && (
                    <p className="mt-1 text-xs text-[#FFB547]">⚠️ {step.note}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Settings template */}
          {guide.settings_template && (
            <Card className="border-[#23D5AB]/30 bg-[#0B1020]/60">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-widest text-[#23D5AB]">⚙️ 기본 세팅 파일</p>
                <p className="mt-1 font-mono text-sm font-bold text-[#F4F7FF]">{guide.settings_template.filename}</p>
                <p className="mt-1 text-sm text-[#B8C3E6]">{guide.settings_template.explanation}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-[#23D5AB]/40 text-[#23D5AB] hover:bg-[#23D5AB]/10"
                    onClick={() =>
                      copyToClipboard(
                        guide.settings_template!.content,
                        setCopiedId,
                        "settings",
                      )
                    }
                  >
                    {copiedId === "settings" ? "✓ 복사됨" : "📋 텍스트 복사"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-[#3B4A78] text-[#B8C3E6] hover:bg-[#111936]"
                    onClick={() =>
                      downloadFile(
                        guide.settings_template!.content,
                        guide.settings_template!.filename,
                      )
                    }
                  >
                    ⬇️ 파일 다운로드
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          {guide.tips.length > 0 && (
            <div className="rounded-2xl border border-[#111936] bg-[#0B1020]/60 p-5">
              <p className="text-xs uppercase tracking-widest text-[#8A96BE]">💡 활용 팁</p>
              <ul className="mt-3 space-y-2">
                {guide.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#B8C3E6]">
                    <span className="mt-0.5 text-[#23D5AB]">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
