import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  ApiRequestError,
  api,
  type AdminPageVersionCompareResponse,
  type AdminPageVersionListItem,
  type PageBlock,
  type PageDocument,
} from "@/lib/api"
import { useAuth } from "@/lib/use-auth"

import { validatePageDocument } from "./pageEditorGuardrails"

const PAGE_ID = "about_page"
const LOCAL_DRAFT_KEY = `page-editor-local-draft:${PAGE_ID}`

type EditorTab = "overview" | "editor" | "preview" | "versions" | "settings"
type PreviewDevice = "desktop" | "mobile"
type SupportedBlockType = "hero" | "rich_text" | "image" | "cta"

const SUPPORTED_BLOCK_TYPES: SupportedBlockType[] = ["hero", "rich_text", "image", "cta"]

const BLOCK_LABEL: Record<SupportedBlockType, string> = {
  hero: "Hero",
  rich_text: "RichText",
  image: "Image",
  cta: "CTA",
}

function createBlock(type: SupportedBlockType, order: number): PageBlock {
  if (type === "hero") {
    return {
      id: `hero_${Date.now()}_${order}`,
      type,
      order,
      visible: true,
      content: {
        headline: "",
        highlight: "",
        description: "",
        contactEmail: "",
      },
    }
  }
  if (type === "rich_text") {
    return {
      id: `rich_text_${Date.now()}_${order}`,
      type,
      order,
      visible: true,
      content: { body: "" },
    }
  }
  if (type === "image") {
    return {
      id: `image_${Date.now()}_${order}`,
      type,
      order,
      visible: true,
      content: { src: "", alt: "", caption: "" },
    }
  }
  return {
    id: `cta_${Date.now()}_${order}`,
    type,
    order,
    visible: true,
    content: { label: "", href: "", style: "primary" },
  }
}

function defaultBlocks(): PageBlock[] {
  return [
    createBlock("hero", 0),
    createBlock("rich_text", 1),
    createBlock("image", 2),
    createBlock("cta", 3),
  ]
}

function normalizeBlocks(blocks: PageBlock[]): PageBlock[] {
  return [...blocks]
    .sort((a, b) => a.order - b.order)
    .map((block, index) => ({ ...block, order: index }))
}

function snapshotOf(document: PageDocument): string {
  return JSON.stringify({
    title: document.title,
    seo: document.seo,
    blocks: document.blocks,
  })
}

function parseErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (typeof error.detail === "string") {
      return error.detail
    }
    if (typeof error.detail === "object" && error.detail && "message" in error.detail) {
      return String((error.detail as { message?: unknown }).message ?? "요청에 실패했습니다")
    }
    return `요청 실패 (${error.status})`
  }
  if (error instanceof Error) {
    return error.message
  }
  return "요청에 실패했습니다"
}

export function AdminPages() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === "super_admin"

  const [activeTab, setActiveTab] = useState<EditorTab>("overview")
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [baseVersion, setBaseVersion] = useState(0)
  const [publishedVersion, setPublishedVersion] = useState(0)
  const [versions, setVersions] = useState<AdminPageVersionListItem[]>([])
  const [compareFromVersion, setCompareFromVersion] = useState<number | null>(null)
  const [compareToVersion, setCompareToVersion] = useState<number | null>(null)
  const [compareResult, setCompareResult] = useState<AdminPageVersionCompareResponse | null>(null)

  const [pageTitle, setPageTitle] = useState("About Page")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [ogImage, setOgImage] = useState("")
  const [blocks, setBlocks] = useState<PageBlock[]>(defaultBlocks())
  const [selectedBlockId, setSelectedBlockId] = useState<string>(blocks[0]?.id ?? "")
  const [conflictVersion, setConflictVersion] = useState<number | null>(null)

  const lastSavedSnapshotRef = useRef<string>("")

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  )

  const buildDocument = useMemo((): PageDocument => {
    const normalizedBlocks = normalizeBlocks(blocks)
    return {
      pageId: PAGE_ID,
      status: "draft",
      version: baseVersion,
      title: pageTitle.trim() || "Untitled Page",
      seo: {
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),
        ogImage: ogImage.trim() || null,
      },
      blocks: normalizedBlocks,
      updatedBy: user?.id ?? "admin",
      updatedAt: new Date().toISOString(),
    }
  }, [baseVersion, blocks, metaDescription, metaTitle, ogImage, pageTitle, user?.id])

  const issues = useMemo(() => validatePageDocument(buildDocument), [buildDocument])
  const blockingIssues = issues.filter((issue) => issue.level === "blocking")
  const warningIssues = issues.filter((issue) => issue.level === "warning")

  const isDirty = useMemo(
    () => snapshotOf(buildDocument) !== lastSavedSnapshotRef.current,
    [buildDocument],
  )

  const applyDocument = (document: PageDocument, markAsSaved: boolean = true) => {
    setPageTitle(document.title || "About Page")
    setMetaTitle(document.seo?.metaTitle || "")
    setMetaDescription(document.seo?.metaDescription || "")
    setOgImage(String(document.seo?.ogImage || ""))

    const normalizedBlocks = normalizeBlocks(document.blocks.length ? document.blocks : defaultBlocks())
    setBlocks(normalizedBlocks)
    setSelectedBlockId(normalizedBlocks[0]?.id ?? "")

    if (markAsSaved) {
      lastSavedSnapshotRef.current = snapshotOf({ ...document, blocks: normalizedBlocks })
    }
  }

  const reloadDraft = async () => {
    const draft = await api.getAdminPageDraft(PAGE_ID)
    setBaseVersion(draft.baseVersion)
    setPublishedVersion(draft.publishedVersion)
    applyDocument(draft.document, true)
    setConflictVersion(null)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErrorBanner(null)
      try {
        await reloadDraft()
      } catch (error) {
        setErrorBanner(parseErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    if (activeTab !== "versions") return
    const loadVersions = async () => {
      setLoadingVersions(true)
      try {
        const response = await api.getAdminPageVersions(PAGE_ID, 50)
        setVersions(response.items)
        if (response.items.length >= 2) {
          setCompareFromVersion(response.items[1].version)
          setCompareToVersion(response.items[0].version)
        }
      } catch (error) {
        setErrorBanner(parseErrorMessage(error))
      } finally {
        setLoadingVersions(false)
      }
    }
    void loadVersions()
  }, [activeTab])

  const saveInternal = async (source: "manual" | "auto") => {
    if (source === "manual" && !reason.trim()) {
      setErrorBanner("수동 저장은 수정 사유가 필요합니다")
      return
    }
    if (blockingIssues.length > 0) {
      setErrorBanner("차단 이슈를 먼저 해결해야 저장할 수 있습니다")
      return
    }

    setErrorBanner(null)
    setNotice(null)
    if (source === "auto") setAutoSaving(true)
    if (source === "manual") setSaving(true)

    try {
      const response = await api.updateAdminPageDraft(
        PAGE_ID,
        baseVersion,
        buildDocument,
        source === "manual" ? reason.trim() : reason.trim() || "auto-save",
        source,
      )

      const nextVersion = response.savedVersion
      setBaseVersion(nextVersion)
      if (source === "manual") {
        setReason("")
      }

      const savedDocument: PageDocument = {
        ...buildDocument,
        version: nextVersion,
      }
      lastSavedSnapshotRef.current = snapshotOf(savedDocument)
      setConflictVersion(null)
      setNotice(source === "manual" ? "Draft를 저장했습니다" : "자동 저장 완료")

      try {
        localStorage.removeItem(LOCAL_DRAFT_KEY)
      } catch {}
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) {
        const detail = error.detail as { current_version?: number; message?: string } | string
        const currentVersion =
          typeof detail === "object" && detail !== null && typeof detail.current_version === "number"
            ? detail.current_version
            : null
        setConflictVersion(currentVersion)
        setErrorBanner(
          typeof detail === "object" && detail !== null && detail.message
            ? String(detail.message)
            : "저장 충돌이 발생했습니다. 최신 버전을 불러와 다시 시도하세요",
        )
      } else {
        if (error instanceof ApiRequestError && error.status >= 500) {
          try {
            localStorage.setItem(
              LOCAL_DRAFT_KEY,
              JSON.stringify({
                document: buildDocument,
                baseVersion,
                reason,
                savedAt: new Date().toISOString(),
              }),
            )
            setNotice("서버 오류로 브라우저 임시 저장을 남겼습니다")
          } catch {}
        }
        setErrorBanner(parseErrorMessage(error))
      }
    } finally {
      setSaving(false)
      setAutoSaving(false)
    }
  }

  useEffect(() => {
    if (loading || saving || autoSaving || publishing) return
    if (!isDirty) return
    if (blockingIssues.length > 0) return

    const timer = window.setTimeout(() => {
      void saveInternal("auto")
    }, 4000)

    return () => window.clearTimeout(timer)
  }, [autoSaving, blockingIssues.length, isDirty, loading, publishing, saving, buildDocument])

  const publish = async () => {
    if (!isSuperAdmin) return
    if (!reason.trim()) {
      setErrorBanner("Publish에는 사유 입력이 필요합니다")
      return
    }
    if (isDirty) {
      setErrorBanner("Publish 전에 최신 Draft를 먼저 저장하세요")
      return
    }
    if (blockingIssues.length > 0) {
      setErrorBanner("차단 이슈를 먼저 해결해야 Publish할 수 있습니다")
      return
    }
    if (!window.confirm("현재 Draft를 게시하시겠습니까?")) return

    setPublishing(true)
    setErrorBanner(null)
    setNotice(null)
    try {
      const result = await api.publishAdminPage(PAGE_ID, reason.trim(), baseVersion)
      setPublishedVersion(result.publishedVersion)
      setBaseVersion(result.publishedVersion)
      setReason("")
      lastSavedSnapshotRef.current = snapshotOf({ ...buildDocument, version: result.publishedVersion })
      setNotice(`v${result.publishedVersion} 게시 완료`)
    } catch (error) {
      setErrorBanner(parseErrorMessage(error))
    } finally {
      setPublishing(false)
    }
  }

  const rollbackTo = async (targetVersion: number) => {
    if (!isSuperAdmin) return
    if (!reason.trim()) {
      setErrorBanner("롤백에는 사유 입력이 필요합니다")
      return
    }
    if (!window.confirm(`v${targetVersion}으로 복원할까요?`)) return

    setPublishing(true)
    setErrorBanner(null)
    try {
      const result = await api.rollbackAdminPage(PAGE_ID, targetVersion, reason.trim(), false)
      setBaseVersion(result.restoredDraftVersion)
      if (typeof result.publishedVersion === "number") {
        setPublishedVersion(result.publishedVersion)
      }
      setReason("")
      await reloadDraft()
      const response = await api.getAdminPageVersions(PAGE_ID, 50)
      setVersions(response.items)
      setNotice(`v${targetVersion} 기반으로 Draft를 복원했습니다`)
    } catch (error) {
      setErrorBanner(parseErrorMessage(error))
    } finally {
      setPublishing(false)
    }
  }

  const compareVersions = async () => {
    if (compareFromVersion === null || compareToVersion === null) {
      setErrorBanner("비교할 버전 2개를 선택하세요")
      return
    }
    if (compareFromVersion === compareToVersion) {
      setErrorBanner("서로 다른 버전을 선택하세요")
      return
    }

    setComparing(true)
    setErrorBanner(null)
    try {
      const result = await api.compareAdminPageVersions(PAGE_ID, compareFromVersion, compareToVersion)
      setCompareResult(result)
    } catch (error) {
      setErrorBanner(parseErrorMessage(error))
    } finally {
      setComparing(false)
    }
  }

  const addBlock = (type: SupportedBlockType) => {
    setBlocks((prev) => {
      const next = normalizeBlocks([...prev, createBlock(type, prev.length)])
      setSelectedBlockId(next[next.length - 1]?.id ?? "")
      return next
    })
  }

  const duplicateBlock = (blockId: string) => {
    setBlocks((prev) => {
      const target = prev.find((block) => block.id === blockId)
      if (!target) return prev
      const duplicate: PageBlock = {
        ...target,
        id: `${target.id}_copy_${Date.now()}`,
        order: prev.length,
      }
      const next = normalizeBlocks([...prev, duplicate])
      setSelectedBlockId(duplicate.id)
      return next
    })
  }

  const deleteBlock = (blockId: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev
      const next = normalizeBlocks(prev.filter((block) => block.id !== blockId))
      if (selectedBlockId === blockId) {
        setSelectedBlockId(next[0]?.id ?? "")
      }
      return next
    })
  }

  const moveBlock = (blockId: string, direction: -1 | 1) => {
    setBlocks((prev) => {
      const ordered = normalizeBlocks(prev)
      const index = ordered.findIndex((block) => block.id === blockId)
      if (index < 0) return prev
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= ordered.length) return prev
      const clone = [...ordered]
      const [moved] = clone.splice(index, 1)
      clone.splice(nextIndex, 0, moved)
      return normalizeBlocks(clone)
    })
  }

  const toggleVisible = (blockId: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, visible: !block.visible } : block,
      ),
    )
  }

  const updateSelectedBlockContent = (key: string, value: string) => {
    if (!selectedBlock) return
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlock.id
          ? {
              ...block,
              content: {
                ...block.content,
                [key]: value,
              },
            }
          : block,
      ),
    )
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-50">페이지 편집</h1>

      {loading ? <div className="h-24 animate-pulse rounded-xl bg-slate-800" /> : null}

      {errorBanner ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          {errorBanner}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {notice}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant={activeTab === "overview" ? "default" : "outline"} onClick={() => setActiveTab("overview")}>개요</Button>
        <Button variant={activeTab === "editor" ? "default" : "outline"} onClick={() => setActiveTab("editor")}>편집기</Button>
        <Button variant={activeTab === "preview" ? "default" : "outline"} onClick={() => setActiveTab("preview")}>미리보기</Button>
        <Button variant={activeTab === "versions" ? "default" : "outline"} onClick={() => setActiveTab("versions")}>버전</Button>
        <Button variant={activeTab === "settings" ? "default" : "outline"} onClick={() => setActiveTab("settings")}>설정</Button>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="rounded border border-slate-600 px-2 py-1">page: {PAGE_ID}</span>
          <span className="rounded border border-slate-600 px-2 py-1">draft v{baseVersion}</span>
          <span className="rounded border border-slate-600 px-2 py-1">published v{publishedVersion}</span>
          <span className={`rounded border px-2 py-1 ${isDirty ? "border-amber-500/50 text-amber-200" : "border-emerald-500/40 text-emerald-200"}`}>
            {isDirty ? "미저장 변경 있음" : "저장 상태"}
          </span>
          {autoSaving ? <span className="rounded border border-sky-500/40 px-2 py-1 text-sky-200">자동 저장 중...</span> : null}
          {conflictVersion !== null ? (
            <span className="rounded border border-rose-500/40 px-2 py-1 text-rose-200">충돌 감지 (최신 v{conflictVersion})</span>
          ) : null}
        </div>

        {activeTab === "overview" ? (
          <div className="space-y-3 text-sm text-slate-200">
            <p>권한 정책: publish/rollback은 super_admin 전용입니다.</p>
            <p>충돌 전략: 낙관적 동시성(baseVersion) + 409 충돌 처리입니다.</p>
            <p>
              가드레일: blocking {blockingIssues.length}건 / warning {warningIssues.length}건
            </p>
          </div>
        ) : null}

        {activeTab === "editor" ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-sm font-medium text-slate-100">블록 목록</p>
              {normalizeBlocks(blocks).map((block, index) => {
                const supported = SUPPORTED_BLOCK_TYPES.includes(block.type as SupportedBlockType)
                return (
                  <div
                    key={block.id}
                    className={`space-y-2 rounded border px-3 py-2 ${selectedBlockId === block.id ? "border-emerald-400/70 bg-slate-800" : "border-slate-700 bg-slate-900"}`}
                  >
                    <button
                      className="w-full text-left text-sm text-slate-100"
                      onClick={() => setSelectedBlockId(block.id)}
                      type="button"
                    >
                      {index + 1}. {BLOCK_LABEL[block.type as SupportedBlockType] ?? block.type}
                      {!supported ? " (읽기 전용)" : ""}
                    </button>
                    <div className="flex flex-wrap gap-1">
                      <Button variant="outline" size="sm" onClick={() => moveBlock(block.id, -1)} disabled={!supported || index === 0}>↑</Button>
                      <Button variant="outline" size="sm" onClick={() => moveBlock(block.id, 1)} disabled={!supported || index === blocks.length - 1}>↓</Button>
                      <Button variant="outline" size="sm" onClick={() => toggleVisible(block.id)} disabled={!supported}>
                        {block.visible ? "숨김" : "표시"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => duplicateBlock(block.id)} disabled={!supported}>복제</Button>
                      <Button variant="outline" size="sm" onClick={() => deleteBlock(block.id)} disabled={!supported || blocks.length <= 1}>삭제</Button>
                    </div>
                  </div>
                )
              })}
              <div className="flex flex-wrap gap-1 pt-2">
                {SUPPORTED_BLOCK_TYPES.map((type) => (
                  <Button key={type} variant="outline" size="sm" onClick={() => addBlock(type)}>
                    + {BLOCK_LABEL[type]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-sm font-medium text-slate-100">캔버스 미리보기</p>
              {normalizeBlocks(blocks)
                .filter((block) => block.visible)
                .map((block) => (
                  <div key={block.id} className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
                    <p className="font-medium text-slate-100">{BLOCK_LABEL[block.type as SupportedBlockType] ?? block.type}</p>
                    <pre className="overflow-auto text-xs text-slate-300">{JSON.stringify(block.content, null, 2)}</pre>
                  </div>
                ))}
            </div>

            <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-sm font-medium text-slate-100">속성 패널</p>
              {!selectedBlock ? <p className="text-sm text-slate-300">선택된 블록이 없습니다.</p> : null}

              {selectedBlock?.type === "hero" ? (
                <>
                  <input value={String(selectedBlock.content.headline ?? "")} onChange={(event) => updateSelectedBlockContent("headline", event.target.value)} placeholder="headline" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                  <input value={String(selectedBlock.content.highlight ?? "")} onChange={(event) => updateSelectedBlockContent("highlight", event.target.value)} placeholder="highlight" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                  <textarea value={String(selectedBlock.content.description ?? "")} onChange={(event) => updateSelectedBlockContent("description", event.target.value)} rows={4} placeholder="description" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                  <input value={String(selectedBlock.content.contactEmail ?? "")} onChange={(event) => updateSelectedBlockContent("contactEmail", event.target.value)} placeholder="contactEmail" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </>
              ) : null}

              {selectedBlock?.type === "rich_text" ? (
                <textarea value={String(selectedBlock.content.body ?? "")} onChange={(event) => updateSelectedBlockContent("body", event.target.value)} rows={8} placeholder="body" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
              ) : null}

              {selectedBlock?.type === "image" ? (
                <>
                  <input value={String(selectedBlock.content.src ?? "")} onChange={(event) => updateSelectedBlockContent("src", event.target.value)} placeholder="https://..." className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                  <input value={String(selectedBlock.content.alt ?? "")} onChange={(event) => updateSelectedBlockContent("alt", event.target.value)} placeholder="alt" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                  <textarea value={String(selectedBlock.content.caption ?? "")} onChange={(event) => updateSelectedBlockContent("caption", event.target.value)} rows={3} placeholder="caption" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </>
              ) : null}

              {selectedBlock?.type === "cta" ? (
                <>
                  <input value={String(selectedBlock.content.label ?? "")} onChange={(event) => updateSelectedBlockContent("label", event.target.value)} placeholder="label" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                  <input value={String(selectedBlock.content.href ?? "")} onChange={(event) => updateSelectedBlockContent("href", event.target.value)} placeholder="https://..." className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                  <input value={String(selectedBlock.content.style ?? "primary")} onChange={(event) => updateSelectedBlockContent("style", event.target.value)} placeholder="style" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </>
              ) : null}

              {selectedBlock && !SUPPORTED_BLOCK_TYPES.includes(selectedBlock.type as SupportedBlockType) ? (
                <p className="text-xs text-slate-400">이 블록 타입은 현재 MVP 편집 범위 밖입니다.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "preview" ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant={previewDevice === "desktop" ? "default" : "outline"} onClick={() => setPreviewDevice("desktop")}>Desktop</Button>
              <Button variant={previewDevice === "mobile" ? "default" : "outline"} onClick={() => setPreviewDevice("mobile")}>Mobile</Button>
            </div>
            <div className={`mx-auto rounded-xl border border-slate-700 bg-slate-900 p-4 ${previewDevice === "mobile" ? "max-w-sm" : "max-w-4xl"}`}>
              <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                <span>{previewDevice} preview</span>
                <span className="rounded border border-slate-600 px-2 py-0.5">{baseVersion === publishedVersion && baseVersion > 0 ? "published state" : "draft state"}</span>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-slate-100">{pageTitle}</h2>
              <div className="space-y-4">
                {normalizeBlocks(blocks)
                  .filter((block) => block.visible)
                  .map((block) => {
                    if (block.type === "hero") {
                      return (
                        <div key={block.id} className="space-y-1 rounded border border-slate-700 p-3">
                          <p className="text-lg font-semibold text-slate-100">{String(block.content.headline ?? "")}</p>
                          <p className="text-slate-300">{String(block.content.highlight ?? "")}</p>
                          <p className="text-slate-300">{String(block.content.description ?? "")}</p>
                        </div>
                      )
                    }
                    if (block.type === "rich_text") {
                      return <p key={block.id} className="whitespace-pre-wrap rounded border border-slate-700 p-3 text-slate-200">{String(block.content.body ?? "")}</p>
                    }
                    if (block.type === "image") {
                      const src = String(block.content.src ?? "")
                      return (
                        <div key={block.id} className="space-y-2 rounded border border-slate-700 p-3">
                          {src ? <img src={src} alt={String(block.content.alt ?? "")} className="h-48 w-full rounded object-cover" /> : <div className="h-48 w-full rounded bg-slate-800" />}
                          <p className="text-sm text-slate-300">{String(block.content.caption ?? "")}</p>
                        </div>
                      )
                    }
                    if (block.type === "cta") {
                      return (
                        <a key={block.id} href={String(block.content.href ?? "#")} className="inline-flex rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-900">
                          {String(block.content.label ?? "CTA")}
                        </a>
                      )
                    }
                    return (
                      <div key={block.id} className="rounded border border-slate-700 p-3 text-sm text-slate-300">
                        {block.type}
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "versions" ? (
          <div className="space-y-2">
            <div className="rounded border border-slate-700 bg-slate-900 p-3">
              <p className="mb-2 text-sm font-medium text-slate-100">버전 비교</p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={compareFromVersion ?? ""}
                  onChange={(event) => setCompareFromVersion(Number(event.target.value) || null)}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                >
                  <option value="">from</option>
                  {versions.map((version) => (
                    <option key={`from-${version.version}`} value={version.version}>v{version.version}</option>
                  ))}
                </select>
                <span className="text-slate-400">→</span>
                <select
                  value={compareToVersion ?? ""}
                  onChange={(event) => setCompareToVersion(Number(event.target.value) || null)}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                >
                  <option value="">to</option>
                  {versions.map((version) => (
                    <option key={`to-${version.version}`} value={version.version}>v{version.version}</option>
                  ))}
                </select>
                <Button variant="outline" onClick={() => void compareVersions()} disabled={comparing || loadingVersions}>
                  {comparing ? "비교 중..." : "Diff 보기"}
                </Button>
              </div>

              {compareResult ? (
                <div className="mt-3 space-y-2 text-xs text-slate-300">
                  <p>
                    총 {compareResult.summary.total}건 (추가 {compareResult.summary.added} / 제거 {compareResult.summary.removed} / 순서 {compareResult.summary.reordered} / 필드 {compareResult.summary.field_changed})
                  </p>
                  <div className="max-h-48 space-y-1 overflow-auto rounded border border-slate-700 bg-slate-950 p-2">
                    {compareResult.changes.length === 0 ? (
                      <p className="text-slate-400">변경 사항이 없습니다.</p>
                    ) : (
                      compareResult.changes.map((change, index) => (
                        <p key={`${change.kind}-${change.block_id}-${index}`}>{change.message}</p>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {loadingVersions ? <p className="text-slate-300">버전 로딩 중...</p> : null}
            {!loadingVersions && versions.length === 0 ? <p className="text-slate-300">버전 이력이 없습니다.</p> : null}
            {versions.map((versionItem) => (
              <div key={`${versionItem.page_id}-${versionItem.version}`} className="flex items-center justify-between rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                <div>
                  <p>v{versionItem.version} · {versionItem.status}</p>
                  <p className="text-xs text-slate-400">{versionItem.created_at}</p>
                </div>
                {isSuperAdmin ? (
                  <Button variant="outline" onClick={() => void rollbackTo(versionItem.version)} disabled={publishing}>이 버전으로 복원</Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "settings" ? (
          <div className="space-y-2">
            <input value={pageTitle} onChange={(event) => setPageTitle(event.target.value)} placeholder="Page title" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            <input value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} placeholder="SEO title" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            <textarea value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} rows={3} placeholder="SEO description" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            <input value={ogImage} onChange={(event) => setOgImage(event.target.value)} placeholder="OG image URL" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
          </div>
        ) : null}

        <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
          <p className="text-sm font-medium text-slate-100">검증 결과</p>
          {blockingIssues.length === 0 && warningIssues.length === 0 ? (
            <p className="text-sm text-emerald-300">검증 이슈가 없습니다.</p>
          ) : (
            <div className="space-y-1 text-xs">
              {blockingIssues.map((issue) => (
                <p key={`b-${issue.field}-${issue.message}`} className="text-rose-300">[차단] {issue.field}: {issue.message}</p>
              ))}
              {warningIssues.map((issue) => (
                <p key={`w-${issue.field}-${issue.message}`} className="text-amber-300">[경고] {issue.field}: {issue.message}</p>
              ))}
            </div>
          )}
        </div>

        <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="수정 사유 (수동 저장/게시/복원 시 필수)" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void saveInternal("manual")} disabled={saving || autoSaving} className="bg-[#FF5D8F] text-white hover:bg-[#ff4a83]">
            {saving ? "저장 중..." : "Draft 저장"}
          </Button>
          {isSuperAdmin ? (
            <Button onClick={() => void publish()} disabled={publishing} className="bg-emerald-500 text-slate-900 hover:bg-emerald-400">
              {publishing ? "처리 중..." : "Publish"}
            </Button>
          ) : null}
          {conflictVersion !== null ? (
            <Button variant="outline" onClick={() => void reloadDraft()}>
              최신 Draft 불러오기
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
