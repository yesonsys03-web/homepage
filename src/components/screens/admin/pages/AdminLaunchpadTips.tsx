import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import type { LaunchpadTip, LaunchpadTipPreview } from "@/lib/api-types"

const PLATFORM_ICON: Record<string, string> = {
  x: "𝕏",
  threads: "🧵",
  youtube: "▶️",
  other: "🔗",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
}

export function AdminLaunchpadTips() {
  const [tips, setTips] = useState<LaunchpadTip[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // URL fetch form state
  const [urlInput, setUrlInput] = useState("")
  const [fetching, setFetching] = useState(false)
  const [preview, setPreview] = useState<LaunchpadTipPreview | null>(null)
  const [editForm, setEditForm] = useState<Partial<LaunchpadTip>>({})
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadTips = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.adminGetLaunchpadTips()
      setTips(res.items)
    } catch {
      setError("팁 목록을 불러오지 못했어요.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTips()
  }, [])

  const handleFetchUrl = async () => {
    if (!urlInput.trim() || fetching) return
    setFetching(true)
    setPreview(null)
    setEditForm({})
    try {
      const data = await api.adminFetchTipUrl(urlInput.trim())
      setPreview(data)
      setEditForm({
        source_url: urlInput.trim(),
        platform: data.platform,
        author_handle: data.author_handle,
        og_title: data.og_title,
        og_image_url: data.og_image_url ?? undefined,
        description_kr: data.description_kr,
        tool_tags: data.tool_tags,
        topic_tags: data.topic_tags,
      })
    } catch {
      setError("URL 정보를 가져오지 못했어요.")
    } finally {
      setFetching(false)
    }
  }

  const handleSave = async () => {
    if (!editForm.source_url || !editForm.platform || !editForm.og_title || !editForm.description_kr) {
      return
    }
    setSaving(true)
    try {
      await api.adminCreateLaunchpadTip({
        source_url: editForm.source_url,
        platform: editForm.platform,
        og_title: editForm.og_title,
        description_kr: editForm.description_kr,
        author_handle: editForm.author_handle,
        og_image_url: editForm.og_image_url,
        tool_tags: editForm.tool_tags ?? [],
        topic_tags: editForm.topic_tags ?? [],
      })
      setSuccessMsg("팁이 추가됐어요!")
      setShowAddForm(false)
      setUrlInput("")
      setPreview(null)
      setEditForm({})
      void loadTips()
    } catch {
      setError("팁 저장에 실패했어요.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm("이 팁을 삭제할까요?")) return
    try {
      await api.adminDeleteLaunchpadTip(id)
      setTips((prev) => prev.filter((t) => t.id !== id))
    } catch {
      setError("삭제에 실패했어요.")
    }
  }

  const handleCheckLinks = async () => {
    try {
      const result = await api.adminCheckLaunchpadLinks()
      setSuccessMsg(`링크 체크 완료: ${result.checked}개 확인, ${result.invalid}개 만료`)
      void loadTips()
    } catch {
      setError("링크 체크에 실패했어요.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-[#F4F7FF]">🚀 런치패드 팁 관리</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleCheckLinks()}
            className="border-[#3B4A78] text-[#B8C3E6]"
          >
            🔗 링크 체크
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowAddForm((v) => !v)}
            className="bg-[#23D5AB] text-[#0B1020]"
          >
            + URL 추가
          </Button>
        </div>
      </div>

      {successMsg && (
        <p className="rounded-lg bg-[#23D5AB]/10 px-4 py-2 text-sm text-[#23D5AB]">{successMsg}</p>
      )}
      {error && (
        <p className="rounded-lg bg-[#FF6B6B]/10 px-4 py-2 text-sm text-[#FF6B6B]">{error}</p>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-2xl border border-[#1B2854] bg-[#111936] p-5 space-y-4">
          <h3 className="font-semibold text-[#F4F7FF]">팁 URL 추가</h3>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://x.com/..."
              className="flex-1 rounded-lg border border-[#1B2854] bg-[#0B1020] px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#8A96BE]"
            />
            <Button
              type="button"
              onClick={() => void handleFetchUrl()}
              disabled={fetching || !urlInput.trim()}
              className="bg-[#23D5AB] text-[#0B1020]"
            >
              {fetching ? "가져오는 중..." : "가져오기"}
            </Button>
          </div>

          {preview && (
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs text-[#8A96BE]">제목</p>
                <input
                  type="text"
                  value={editForm.og_title ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, og_title: e.target.value }))}
                  className="w-full rounded-lg border border-[#1B2854] bg-[#0B1020] px-3 py-2 text-sm text-[#F4F7FF]"
                />
              </div>
              <div>
                <p className="mb-1 text-xs text-[#8A96BE]">한국어 요약</p>
                <textarea
                  value={editForm.description_kr ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, description_kr: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-[#1B2854] bg-[#0B1020] px-3 py-2 text-sm text-[#F4F7FF] resize-y"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="bg-[#23D5AB] text-[#0B1020]"
                >
                  {saving ? "저장 중..." : "게시"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowAddForm(false); setPreview(null) }}
                  className="border-[#3B4A78] text-[#B8C3E6]"
                >
                  취소
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tips table */}
      {loading ? (
        <p className="text-sm text-[#8A96BE]">로딩 중...</p>
      ) : tips.length === 0 ? (
        <p className="text-sm text-[#B8C3E6]">등록된 팁이 없어요. URL을 추가해주세요.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#111936]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#111936] bg-[#0D1530] text-left text-xs uppercase tracking-wider text-[#8A96BE]">
                <th className="px-4 py-3">플랫폼</th>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">태그</th>
                <th className="px-4 py-3">링크</th>
                <th className="px-4 py-3">날짜</th>
                <th className="px-4 py-3">작업</th>
              </tr>
            </thead>
            <tbody>
              {tips.map((tip) => (
                <tr key={tip.id} className="border-b border-[#111936] hover:bg-[#0D1530]">
                  <td className="px-4 py-3 text-[#B8C3E6]">
                    {PLATFORM_ICON[tip.platform] ?? "🔗"} {tip.platform}
                  </td>
                  <td className="px-4 py-3 text-[#F4F7FF] max-w-xs">
                    <p className="truncate">{tip.og_title}</p>
                    {tip.author_handle && (
                      <p className="text-xs text-[#8A96BE]">@{tip.author_handle}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tip.tool_tags.map((t) => (
                        <Badge key={t} className="bg-[#23D5AB]/10 text-[#23D5AB] text-xs">{t}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {tip.is_link_valid ? (
                      <span className="text-[#23D5AB]">✓ 유효</span>
                    ) : (
                      <span className="text-[#FF6B6B]">🔴 만료</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#8A96BE]">{formatDate(tip.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <a
                        href={tip.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#23D5AB] hover:underline"
                      >
                        원글
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleDelete(tip.id)}
                        className="text-xs text-[#FF6B6B] hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
