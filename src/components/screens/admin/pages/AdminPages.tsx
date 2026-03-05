import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  ApiRequestError,
  api,
  type AdminPageMigrationBackupListResponse,
  type AdminPagePerfScenario,
  type AdminPageVersionCompareResponse,
  type AdminPageVersionListItem,
  type PageBlock,
  type PageDocument,
} from "@/lib/api"
import { useAuth } from "@/lib/use-auth"

import { validatePageDocument } from "./pageEditorGuardrails"

const PAGE_ID = "about_page"
const LOCAL_DRAFT_KEY = `page-editor-local-draft:${PAGE_ID}`
const EDITOR_UI_VARIANT_STORAGE_KEY = `page-editor-ui-variant:${PAGE_ID}`
const DESKTOP_LAYOUT_MEDIA_QUERY = "(min-width: 1440px)"
const NOTEBOOK_LAYOUT_MEDIA_QUERY = "(min-width: 1024px) and (max-width: 1439px)"
const PROPERTY_PANEL_MIN_WIDTH = 320
const PROPERTY_PANEL_MAX_WIDTH = 440
const PROPERTY_PANEL_DEFAULT_WIDTH = 360

type EditorTab = "overview" | "editor" | "preview" | "versions" | "settings"
type PreviewDevice = "desktop" | "mobile"
type EditorZoom = 80 | 100 | 120
type EditorInteractionSurface = "panel" | "canvas"
type EditorUiVariant = "baseline" | "enhanced"
type SupportedBlockType = "hero" | "rich_text" | "image" | "cta" | "feature_list" | "faq"

const SUPPORTED_BLOCK_TYPES: SupportedBlockType[] = ["hero", "rich_text", "image", "cta"]

function normalizeEditorUiVariant(value: string | null | undefined): EditorUiVariant {
  if (value === "baseline") {
    return "baseline"
  }
  return "enhanced"
}

const BLOCK_LABEL: Record<SupportedBlockType, string> = {
  hero: "Hero",
  rich_text: "RichText",
  image: "Image",
  cta: "CTA",
  feature_list: "FeatureList",
  faq: "FAQ",
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
  if (type === "feature_list") {
    return {
      id: `feature_list_${Date.now()}_${order}`,
      type,
      order,
      visible: true,
      content: { items: [] },
    }
  }
  if (type === "faq") {
    return {
      id: `faq_${Date.now()}_${order}`,
      type,
      order,
      visible: true,
      content: { items: [] },
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
    createBlock("feature_list", 4),
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
  const [editorZoom, setEditorZoom] = useState<EditorZoom>(100)
  const [editorUiVariant, setEditorUiVariant] = useState<EditorUiVariant>(() => {
    if (typeof window === "undefined") {
      return "enhanced"
    }
    const queryVariant = new URLSearchParams(window.location.search).get("editor_ui_variant")
    if (queryVariant) {
      return normalizeEditorUiVariant(queryVariant)
    }
    try {
      return normalizeEditorUiVariant(localStorage.getItem(EDITOR_UI_VARIANT_STORAGE_KEY))
    } catch {
      return "enhanced"
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)
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
  const [migrationBackups, setMigrationBackups] = useState<AdminPageMigrationBackupListResponse["items"]>([])
  const [selectedBackupKey, setSelectedBackupKey] = useState("")
  const [showDryRunBackupsOnly, setShowDryRunBackupsOnly] = useState(false)

  const [pageTitle, setPageTitle] = useState("About Page")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [ogImage, setOgImage] = useState("")
  const [blocks, setBlocks] = useState<PageBlock[]>(defaultBlocks())
  const [selectedBlockId, setSelectedBlockId] = useState<string>(blocks[0]?.id ?? "")
  const [conflictVersion, setConflictVersion] = useState<number | null>(null)
  const [listItemsInput, setListItemsInput] = useState("[]")
  const [listItemsError, setListItemsError] = useState<string | null>(null)
  const [styleInput, setStyleInput] = useState("{}")
  const [styleInputError, setStyleInputError] = useState<string | null>(null)
  const [panelSectionOpen, setPanelSectionOpen] = useState({
    content: true,
    style: false,
    advanced: false,
  })
  const [isDesktopWide, setIsDesktopWide] = useState(false)
  const [isNotebookWide, setIsNotebookWide] = useState(false)
  const [propertyPanelWidth, setPropertyPanelWidth] = useState(PROPERTY_PANEL_DEFAULT_WIDTH)
  const [isResizingPropertyPanel, setIsResizingPropertyPanel] = useState(false)
  const [isNotebookPropertyPanelOpen, setIsNotebookPropertyPanelOpen] = useState(false)

  const lastSavedSnapshotRef = useRef<string>("")
  const previewSwitchStartedRef = useRef<number | null>(null)
  const resizeStartXRef = useRef<number | null>(null)
  const resizeStartWidthRef = useRef<number>(PROPERTY_PANEL_DEFAULT_WIDTH)
  const editorCanvasScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const editorCanvasScrollTopRef = useRef(0)
  const shouldRestoreEditorCanvasScrollRef = useRef(false)
  const editSessionStartedRef = useRef<number>(performance.now())
  const panelCanvasRoundtripCountRef = useRef(0)
  const lastEditorInteractionSurfaceRef = useRef<EditorInteractionSurface | null>(null)
  const editorCanvasScrollDistanceRef = useRef(0)
  const lastEditorCanvasScrollTopRef = useRef<number | null>(null)

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  )
  const selectedBlockSupported = useMemo(
    () =>
      selectedBlock
        ? SUPPORTED_BLOCK_TYPES.includes(selectedBlock.type as SupportedBlockType)
        : false,
    [selectedBlock],
  )
  const selectedBackup = useMemo(
    () => migrationBackups.find((item) => item.backupKey === selectedBackupKey) ?? null,
    [migrationBackups, selectedBackupKey],
  )
  const filteredMigrationBackups = useMemo(
    () =>
      showDryRunBackupsOnly
        ? migrationBackups.filter((item) => item.dryRun)
        : migrationBackups,
    [migrationBackups, showDryRunBackupsOnly],
  )

  const markEditorCanvasScrollForRestore = useCallback(() => {
    const container = editorCanvasScrollContainerRef.current
    if (!container) {
      return
    }
    editorCanvasScrollTopRef.current = container.scrollTop
    shouldRestoreEditorCanvasScrollRef.current = true
  }, [])

  const getCurrentEditorDevice = useCallback((): "desktop" | "notebook" | "mobile" => {
    if (isDesktopWide) return "desktop"
    if (isNotebookWide) return "notebook"
    return "mobile"
  }, [isDesktopWide, isNotebookWide])

  const getCurrentEditorMode = useCallback((): "balanced" | "canvas_focus" | "property_focus" => {
    if (isDesktopWide) return "balanced"
    if (isNotebookWide) return isNotebookPropertyPanelOpen ? "property_focus" : "canvas_focus"
    return "canvas_focus"
  }, [isDesktopWide, isNotebookWide, isNotebookPropertyPanelOpen])

  const resetEditorSessionMetrics = useCallback(() => {
    editSessionStartedRef.current = performance.now()
    panelCanvasRoundtripCountRef.current = 0
    lastEditorInteractionSurfaceRef.current = null
    editorCanvasScrollDistanceRef.current = 0
    const container = editorCanvasScrollContainerRef.current
    lastEditorCanvasScrollTopRef.current = container ? container.scrollTop : null
  }, [])

  const markEditorInteraction = useCallback(
    (surface: EditorInteractionSurface) => {
      if (activeTab !== "editor") {
        return
      }
      const previous = lastEditorInteractionSurfaceRef.current
      if (previous && previous !== surface) {
        panelCanvasRoundtripCountRef.current += 1
      }
      lastEditorInteractionSurfaceRef.current = surface
    },
    [activeTab],
  )

  const buildEditorMetricSource = useCallback(
    (label: string) =>
      `${label};tab=editor;device=${getCurrentEditorDevice()};mode=${getCurrentEditorMode()};zoom=${editorZoom};ui_variant=${editorUiVariant}`,
    [editorUiVariant, editorZoom, getCurrentEditorDevice, getCurrentEditorMode],
  )

  useEffect(() => {
    try {
      localStorage.setItem(EDITOR_UI_VARIANT_STORAGE_KEY, editorUiVariant)
    } catch {
    }
  }, [editorUiVariant])

  const handleEditorCanvasScroll = useCallback(() => {
    const container = editorCanvasScrollContainerRef.current
    if (!container) {
      return
    }
    markEditorInteraction("canvas")
    if (lastEditorCanvasScrollTopRef.current === null) {
      lastEditorCanvasScrollTopRef.current = container.scrollTop
    } else {
      editorCanvasScrollDistanceRef.current += Math.abs(container.scrollTop - lastEditorCanvasScrollTopRef.current)
      lastEditorCanvasScrollTopRef.current = container.scrollTop
    }
    editorCanvasScrollTopRef.current = container.scrollTop
  }, [markEditorInteraction])

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return
    }

    const desktopMediaQuery = window.matchMedia(DESKTOP_LAYOUT_MEDIA_QUERY)
    const notebookMediaQuery = window.matchMedia(NOTEBOOK_LAYOUT_MEDIA_QUERY)

    const syncLayoutMode = () => {
      setIsDesktopWide(desktopMediaQuery.matches)
      setIsNotebookWide(notebookMediaQuery.matches)
    }

    syncLayoutMode()

    if (
      typeof desktopMediaQuery.addEventListener === "function"
      && typeof notebookMediaQuery.addEventListener === "function"
    ) {
      desktopMediaQuery.addEventListener("change", syncLayoutMode)
      notebookMediaQuery.addEventListener("change", syncLayoutMode)
      return () => {
        desktopMediaQuery.removeEventListener("change", syncLayoutMode)
        notebookMediaQuery.removeEventListener("change", syncLayoutMode)
      }
    }

    desktopMediaQuery.addListener(syncLayoutMode)
    notebookMediaQuery.addListener(syncLayoutMode)
    return () => {
      desktopMediaQuery.removeListener(syncLayoutMode)
      notebookMediaQuery.removeListener(syncLayoutMode)
    }
  }, [])

  useEffect(() => {
    if (!isDesktopWide) {
      setIsResizingPropertyPanel(false)
    }
  }, [isDesktopWide])

  useEffect(() => {
    if (!isNotebookWide || activeTab !== "editor") {
      setIsNotebookPropertyPanelOpen(false)
    }
  }, [activeTab, isNotebookWide])

  useEffect(() => {
    if (!isNotebookWide || !isNotebookPropertyPanelOpen || activeTab !== "editor") {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return
      }
      markEditorCanvasScrollForRestore()
      markEditorInteraction("panel")
      setIsNotebookPropertyPanelOpen(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    activeTab,
    isNotebookPropertyPanelOpen,
    isNotebookWide,
    markEditorCanvasScrollForRestore,
    markEditorInteraction,
  ])

  useEffect(() => {
    if (activeTab !== "editor") {
      return
    }
    resetEditorSessionMetrics()
  }, [activeTab, resetEditorSessionMetrics])

  useEffect(() => {
    if (activeTab !== "editor") {
      return
    }
    if (!shouldRestoreEditorCanvasScrollRef.current) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const container = editorCanvasScrollContainerRef.current
      if (!container) {
        return
      }
      container.scrollTop = editorCanvasScrollTopRef.current
      shouldRestoreEditorCanvasScrollRef.current = false
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    activeTab,
    blocks,
    editorZoom,
    isNotebookPropertyPanelOpen,
    panelSectionOpen,
    selectedBlockId,
  ])

  const startPropertyPanelResize = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!isDesktopWide || event.button !== 0) {
        return
      }
      resizeStartXRef.current = event.clientX
      resizeStartWidthRef.current = propertyPanelWidth
      setIsResizingPropertyPanel(true)
      event.preventDefault()
    },
    [isDesktopWide, propertyPanelWidth],
  )

  useEffect(() => {
    if (!isResizingPropertyPanel) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (resizeStartXRef.current === null) {
        return
      }
      const deltaX = event.clientX - resizeStartXRef.current
      const nextWidth = Math.max(
        PROPERTY_PANEL_MIN_WIDTH,
        Math.min(PROPERTY_PANEL_MAX_WIDTH, resizeStartWidthRef.current - deltaX),
      )
      setPropertyPanelWidth(nextWidth)
    }

    const handleMouseUp = () => {
      setIsResizingPropertyPanel(false)
      resizeStartXRef.current = null
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizingPropertyPanel])

  useEffect(() => {
    if (selectedBackupKey && filteredMigrationBackups.some((item) => item.backupKey === selectedBackupKey)) {
      return
    }
    setSelectedBackupKey(filteredMigrationBackups[0]?.backupKey ?? "")
  }, [filteredMigrationBackups, selectedBackupKey])

  useEffect(() => {
    if (!selectedBlock || (selectedBlock.type !== "feature_list" && selectedBlock.type !== "faq")) {
      setListItemsError(null)
      return
    }

    const items = Array.isArray(selectedBlock.content.items)
      ? selectedBlock.content.items
      : []
    setListItemsInput(JSON.stringify(items, null, 2))
    setListItemsError(null)
  }, [selectedBlock])

  useEffect(() => {
    if (!selectedBlock) {
      setStyleInput("{}")
      setStyleInputError(null)
      return
    }

    setStyleInput(JSON.stringify(selectedBlock.style ?? {}, null, 2))
    setStyleInputError(null)
    setPanelSectionOpen({
      content: true,
      style: false,
      advanced: false,
    })
  }, [selectedBlock])

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

  const logPerfEvent = (
    scenario: AdminPagePerfScenario,
    durationMs: number,
    source: string,
  ) => {
    if (!Number.isFinite(durationMs) || durationMs < 0) return
    void api
      .logAdminPagePerfEvent(PAGE_ID, scenario, Number(durationMs.toFixed(2)), source)
      .catch((error) => {
        console.error("page perf event log failed", error)
      })
  }

  const reloadDraft = async (metricSource: string = "reload") => {
    const startedAt = performance.now()
    const draft = await api.getAdminPageDraft(PAGE_ID)
    setBaseVersion(draft.baseVersion)
    setPublishedVersion(draft.publishedVersion)
    applyDocument(draft.document, true)
    setConflictVersion(null)
    logPerfEvent("editor_initial_load", performance.now() - startedAt, metricSource)
    resetEditorSessionMetrics()
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErrorBanner(null)
      try {
        await reloadDraft("initial_load")
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
      setLoadingBackups(true)
      try {
        const [response, backups] = await Promise.all([
          api.getAdminPageVersions(PAGE_ID, 50),
          isSuperAdmin ? api.getAdminPageMigrationBackups(PAGE_ID, 20) : Promise.resolve({ pageId: PAGE_ID, count: 0, items: [] }),
        ])
        setVersions(response.items)
        if (response.items.length >= 2) {
          setCompareFromVersion(response.items[1].version)
          setCompareToVersion(response.items[0].version)
        }
        setMigrationBackups(backups.items)
        setSelectedBackupKey((current) => {
          if (current && backups.items.some((item) => item.backupKey === current)) {
            return current
          }
          return backups.items[0]?.backupKey ?? ""
        })
      } catch (error) {
        setErrorBanner(parseErrorMessage(error))
      } finally {
        setLoadingVersions(false)
        setLoadingBackups(false)
      }
    }
    void loadVersions()
  }, [activeTab, isSuperAdmin])

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
    const saveStartedAt = performance.now()

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
      logPerfEvent("draft_save_roundtrip", performance.now() - saveStartedAt, source)
      logPerfEvent(
        "panel_canvas_roundtrip_count",
        panelCanvasRoundtripCountRef.current,
        buildEditorMetricSource(`save_source=${source}`),
      )
      logPerfEvent(
        "edit_completion_time",
        performance.now() - editSessionStartedRef.current,
        buildEditorMetricSource(`save_source=${source}`),
      )
      logPerfEvent(
        "editor_scroll_distance",
        editorCanvasScrollDistanceRef.current,
        buildEditorMetricSource(`save_source=${source}`),
      )
      resetEditorSessionMetrics()

      try {
        localStorage.removeItem(LOCAL_DRAFT_KEY)
      } catch (storageError) {
        console.error("failed to clear local draft backup", storageError)
      }
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
          } catch (storageError) {
            console.error("failed to save local draft backup", storageError)
          }
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

  useEffect(() => {
    if (activeTab !== "preview") return
    if (previewSwitchStartedRef.current === null) return

    const startedAt = previewSwitchStartedRef.current
    previewSwitchStartedRef.current = null

    const frame = window.requestAnimationFrame(() => {
      logPerfEvent(
        "preview_switch",
        performance.now() - startedAt,
        `tab=${activeTab};device=${previewDevice}`,
      )
    })

    return () => window.cancelAnimationFrame(frame)
  }, [activeTab, previewDevice])

  const handlePreviewDeviceChange = (device: PreviewDevice) => {
    if (device === previewDevice) return
    previewSwitchStartedRef.current = performance.now()
    setPreviewDevice(device)
  }

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
      await reloadDraft("rollback_reload")
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

  const refreshMigrationBackups = async () => {
    if (!isSuperAdmin) return
    setLoadingBackups(true)
    try {
      const response = await api.getAdminPageMigrationBackups(PAGE_ID, 20)
      setMigrationBackups(response.items)
      setSelectedBackupKey((current) => {
        if (current && response.items.some((item) => item.backupKey === current)) {
          return current
        }
        return response.items[0]?.backupKey ?? ""
      })
    } catch (error) {
      setErrorBanner(parseErrorMessage(error))
    } finally {
      setLoadingBackups(false)
    }
  }

  const restoreFromBackup = async (dryRun: boolean) => {
    if (!isSuperAdmin) return
    if (!selectedBackupKey) {
      setErrorBanner("복구할 backupKey를 선택하세요")
      return
    }
    if (!reason.trim()) {
      setErrorBanner("복구에는 사유 입력이 필요합니다")
      return
    }
    if (!dryRun && !window.confirm(`backupKey(${selectedBackupKey})로 복구할까요?`)) return

    setRestoringBackup(true)
    setErrorBanner(null)
    setNotice(null)
    try {
      const result = await api.restoreAdminPageMigration(PAGE_ID, selectedBackupKey, reason.trim(), dryRun)
      if (result.dryRun) {
        setNotice(`복구 dry-run 완료: ${result.backupKey}`)
        return
      }

      setReason("")
      await reloadDraft("migration_restore")
      const [versionsResponse, backupsResponse] = await Promise.all([
        api.getAdminPageVersions(PAGE_ID, 50),
        api.getAdminPageMigrationBackups(PAGE_ID, 20),
      ])
      setVersions(versionsResponse.items)
      setMigrationBackups(backupsResponse.items)
      setSelectedBackupKey(backupsResponse.items[0]?.backupKey ?? "")
      setNotice(`백업 복구 완료: ${result.backupKey}`)
    } catch (error) {
      setErrorBanner(parseErrorMessage(error))
    } finally {
      setRestoringBackup(false)
    }
  }

  const addBlock = (type: SupportedBlockType) => {
    markEditorCanvasScrollForRestore()
    markEditorInteraction("panel")
    setBlocks((prev) => {
      const next = normalizeBlocks([...prev, createBlock(type, prev.length)])
      setSelectedBlockId(next[next.length - 1]?.id ?? "")
      return next
    })
  }

  const duplicateBlock = (blockId: string) => {
    markEditorCanvasScrollForRestore()
    markEditorInteraction("panel")
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
    markEditorCanvasScrollForRestore()
    markEditorInteraction("panel")
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
    markEditorCanvasScrollForRestore()
    markEditorInteraction("panel")
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
    markEditorCanvasScrollForRestore()
    markEditorInteraction("panel")
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, visible: !block.visible } : block,
      ),
    )
  }

  const updateSelectedBlockContent = (key: string, value: unknown) => {
    if (!selectedBlock) return
    markEditorCanvasScrollForRestore()
    markEditorInteraction("panel")
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

  const updateSelectedBlockStyle = (nextStyle: Record<string, unknown>) => {
    if (!selectedBlock) return
    markEditorCanvasScrollForRestore()
    markEditorInteraction("panel")
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlock.id
          ? {
              ...block,
              style: nextStyle,
            }
          : block,
      ),
    )
  }

  const togglePanelSection = (section: "content" | "style" | "advanced") => {
    markEditorCanvasScrollForRestore()
    markEditorInteraction("panel")
    setPanelSectionOpen((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
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
        <Button variant={activeTab === "editor" ? "default" : "outline"} onClick={() => setActiveTab("editor")}>Hero</Button>
        <Button variant={activeTab === "preview" ? "default" : "outline"} onClick={() => setActiveTab("preview")}>미리보기</Button>
        <Button variant={activeTab === "versions" ? "default" : "outline"} onClick={() => setActiveTab("versions")}>버전</Button>
        <Button variant={activeTab === "settings" ? "default" : "outline"} onClick={() => setActiveTab("settings")}>About</Button>
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
          <>
            {isNotebookWide ? (
              <div className="mb-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    markEditorCanvasScrollForRestore()
                    markEditorInteraction("panel")
                    setIsNotebookPropertyPanelOpen(true)
                  }}
                >
                  속성 패널 열기
                </Button>
              </div>
            ) : null}
            <div
              className={`grid gap-4 ${isDesktopWide ? "items-start" : "lg:grid-cols-2"}`}
              style={
                isDesktopWide
                  ? {
                      gridTemplateColumns: `minmax(240px, 300px) minmax(720px, 1fr) ${propertyPanelWidth}px`,
                    }
                  : undefined
              }
            >
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
                      onClick={() => {
                        markEditorCanvasScrollForRestore()
                        markEditorInteraction("panel")
                        setSelectedBlockId(block.id)
                      }}
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
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-100">캔버스 미리보기</p>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <div className="flex items-center gap-1">
                    <span className="px-1 text-[11px] text-slate-400">A/B</span>
                    {(["baseline", "enhanced"] as const).map((variant) => (
                      <Button
                        key={variant}
                        variant={editorUiVariant === variant ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          markEditorInteraction("panel")
                          setEditorUiVariant(variant)
                        }}
                      >
                        {variant === "baseline" ? "A" : "B"}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    {[80, 100, 120].map((zoom) => (
                      <Button
                        key={zoom}
                        variant={editorZoom === zoom ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          markEditorCanvasScrollForRestore()
                          markEditorInteraction("panel")
                          setEditorZoom(zoom as EditorZoom)
                        }}
                      >
                        {zoom}%
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div
                ref={editorCanvasScrollContainerRef}
                onScroll={handleEditorCanvasScroll}
                className="overflow-auto rounded border border-slate-700 bg-slate-950 p-2"
              >
                <div
                  className="space-y-2"
                  style={{
                    transform: `scale(${editorZoom / 100})`,
                    transformOrigin: "top center",
                  }}
                >
                  {normalizeBlocks(blocks)
                    .filter((block) => block.visible)
                    .map((block) => (
                      <button
                        key={block.id}
                        type="button"
                      onClick={() => {
                        markEditorCanvasScrollForRestore()
                        markEditorInteraction("canvas")
                        setSelectedBlockId(block.id)
                      }}
                        className={`w-full rounded border px-3 py-2 text-left text-sm ${
                          selectedBlockId === block.id
                            ? "border-emerald-400 bg-emerald-500/10 text-slate-100"
                            : "border-slate-700 bg-slate-800 text-slate-200"
                        }`}
                      >
                        <p className="font-medium text-slate-100">{BLOCK_LABEL[block.type as SupportedBlockType] ?? block.type}</p>
                        <pre className="overflow-auto text-xs text-slate-300">{JSON.stringify(block.content, null, 2)}</pre>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div
              className={`relative space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 ${
                isNotebookWide
                  ? `fixed right-0 top-0 z-40 h-full w-[min(420px,92vw)] overflow-auto rounded-none border-l border-slate-700 transition-transform ${
                      isNotebookPropertyPanelOpen ? "translate-x-0" : "translate-x-full"
                    }`
                  : ""
              }`}
            >
              {isDesktopWide ? (
                <button
                  type="button"
                  aria-label="속성 패널 너비 조절"
                  onMouseDown={startPropertyPanelResize}
                  className={`absolute -left-2 top-0 h-full w-2 cursor-col-resize rounded bg-slate-600/40 transition hover:bg-emerald-400/60 ${isResizingPropertyPanel ? "bg-emerald-400/70" : ""}`}
                />
              ) : null}
              <div className="sticky top-0 z-10 space-y-2 border-b border-slate-700 bg-slate-900/95 pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">속성 패널</p>
                  {isNotebookWide ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      markEditorCanvasScrollForRestore()
                      markEditorInteraction("panel")
                      setIsNotebookPropertyPanelOpen(false)
                    }}
                  >
                    닫기
                  </Button>
                  ) : null}
                </div>
                {!selectedBlock ? <p className="text-sm text-slate-300">선택된 블록이 없습니다.</p> : null}
                {selectedBlock ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <span className="rounded border border-slate-600 px-2 py-1">{BLOCK_LABEL[selectedBlock.type as SupportedBlockType] ?? selectedBlock.type}</span>
                      <span className={`rounded border px-2 py-1 ${isDirty ? "border-amber-500/40 text-amber-200" : "border-emerald-500/40 text-emerald-200"}`}>
                        {isDirty ? "미저장" : "저장됨"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button variant="outline" size="sm" onClick={() => duplicateBlock(selectedBlock.id)} disabled={!selectedBlockSupported}>복제</Button>
                      <Button variant="outline" size="sm" onClick={() => toggleVisible(selectedBlock.id)} disabled={!selectedBlockSupported}>
                        {selectedBlock.visible ? "숨김" : "표시"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteBlock(selectedBlock.id)} disabled={!selectedBlockSupported || blocks.length <= 1}>삭제</Button>
                    </div>
                  </>
                ) : null}
              </div>

              {selectedBlock ? (
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm font-medium text-slate-100"
                    onClick={() => togglePanelSection("content")}
                  >
                    <span>Content</span>
                    <span className="text-xs text-slate-400">{panelSectionOpen.content ? "접기" : "펼치기"}</span>
                  </button>
                  {panelSectionOpen.content ? (
                    <div className="space-y-2 rounded border border-slate-700 bg-slate-900/40 p-3">
                      {selectedBlock.type === "hero" ? (
                        <>
                          <input value={String(selectedBlock.content.headline ?? "")} onChange={(event) => updateSelectedBlockContent("headline", event.target.value)} placeholder="headline" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                          <input value={String(selectedBlock.content.highlight ?? "")} onChange={(event) => updateSelectedBlockContent("highlight", event.target.value)} placeholder="highlight" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                          <textarea value={String(selectedBlock.content.description ?? "")} onChange={(event) => updateSelectedBlockContent("description", event.target.value)} rows={4} placeholder="description" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                          <input value={String(selectedBlock.content.contactEmail ?? "")} onChange={(event) => updateSelectedBlockContent("contactEmail", event.target.value)} placeholder="contactEmail" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                        </>
                      ) : null}

                      {selectedBlock.type === "rich_text" ? (
                        <textarea value={String(selectedBlock.content.body ?? "")} onChange={(event) => updateSelectedBlockContent("body", event.target.value)} rows={8} placeholder="body" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                      ) : null}

                      {selectedBlock.type === "image" ? (
                        <>
                          <input value={String(selectedBlock.content.src ?? "")} onChange={(event) => updateSelectedBlockContent("src", event.target.value)} placeholder="https://..." className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                          <input value={String(selectedBlock.content.alt ?? "")} onChange={(event) => updateSelectedBlockContent("alt", event.target.value)} placeholder="alt" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                          <textarea value={String(selectedBlock.content.caption ?? "")} onChange={(event) => updateSelectedBlockContent("caption", event.target.value)} rows={3} placeholder="caption" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                        </>
                      ) : null}

                      {selectedBlock.type === "cta" ? (
                        <>
                          <input value={String(selectedBlock.content.label ?? "")} onChange={(event) => updateSelectedBlockContent("label", event.target.value)} placeholder="label" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                          <input value={String(selectedBlock.content.href ?? "")} onChange={(event) => updateSelectedBlockContent("href", event.target.value)} placeholder="https://..." className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                          <input value={String(selectedBlock.content.style ?? "primary")} onChange={(event) => updateSelectedBlockContent("style", event.target.value)} placeholder="style" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                        </>
                      ) : null}

                      {selectedBlock.type === "feature_list" || selectedBlock.type === "faq" ? (
                        <>
                          <textarea
                            value={listItemsInput}
                            onChange={(event) => {
                              const next = event.target.value
                              setListItemsInput(next)
                              try {
                                const parsed = JSON.parse(next)
                                if (!Array.isArray(parsed)) {
                                  setListItemsError("items는 배열(JSON Array)이어야 합니다")
                                  return
                                }
                                setListItemsError(null)
                                updateSelectedBlockContent("items", parsed)
                              } catch {
                                setListItemsError("유효한 JSON 형식으로 입력하세요")
                              }
                            }}
                            rows={10}
                            placeholder="items JSON"
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100"
                          />
                          {listItemsError ? (
                            <p className="text-xs text-rose-300">{listItemsError}</p>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm font-medium text-slate-100"
                    onClick={() => togglePanelSection("style")}
                  >
                    <span>Style</span>
                    <span className="text-xs text-slate-400">{panelSectionOpen.style ? "접기" : "펼치기"}</span>
                  </button>
                  {panelSectionOpen.style ? (
                    <div className="space-y-2 rounded border border-slate-700 bg-slate-900/40 p-3">
                      <textarea
                        value={styleInput}
                        onChange={(event) => {
                          const next = event.target.value
                          setStyleInput(next)
                          try {
                            const parsed = JSON.parse(next)
                            if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
                              setStyleInputError("style은 JSON object여야 합니다")
                              return
                            }
                            setStyleInputError(null)
                            updateSelectedBlockStyle(parsed as Record<string, unknown>)
                          } catch {
                            setStyleInputError("유효한 JSON 형식으로 입력하세요")
                          }
                        }}
                        rows={6}
                        placeholder="style JSON"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100"
                      />
                      {styleInputError ? <p className="text-xs text-rose-300">{styleInputError}</p> : null}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm font-medium text-slate-100"
                    onClick={() => togglePanelSection("advanced")}
                  >
                    <span>Advanced</span>
                    <span className="text-xs text-slate-400">{panelSectionOpen.advanced ? "접기" : "펼치기"}</span>
                  </button>
                  {panelSectionOpen.advanced ? (
                    <div className="space-y-1 rounded border border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-300">
                      <p>id: {selectedBlock.id}</p>
                      <p>order: {selectedBlock.order}</p>
                      <p>visible: {selectedBlock.visible ? "true" : "false"}</p>
                      <p>type: {selectedBlock.type}</p>
                    </div>
                  ) : null}

                  {!selectedBlockSupported ? (
                    <p className="text-xs text-slate-400">이 블록 타입은 현재 MVP 편집 범위 밖입니다.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            </div>
            {isNotebookWide && isNotebookPropertyPanelOpen ? (
              <button
                type="button"
                aria-label="속성 패널 닫기"
                className="fixed inset-0 z-30 bg-slate-950/70"
                onClick={() => {
                  markEditorCanvasScrollForRestore()
                  markEditorInteraction("panel")
                  setIsNotebookPropertyPanelOpen(false)
                }}
              />
            ) : null}
          </>
        ) : null}

        {activeTab === "preview" ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant={previewDevice === "desktop" ? "default" : "outline"} onClick={() => handlePreviewDeviceChange("desktop")}>Desktop</Button>
              <Button variant={previewDevice === "mobile" ? "default" : "outline"} onClick={() => handlePreviewDeviceChange("mobile")}>Mobile</Button>
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
                    if (block.type === "feature_list") {
                      const items = Array.isArray(block.content.items)
                        ? (block.content.items as Array<Record<string, unknown>>)
                        : []
                      return (
                        <div key={block.id} className="rounded border border-slate-700 p-3">
                          <p className="mb-2 text-sm font-medium text-slate-100">Feature list ({items.length})</p>
                          {items.length === 0 ? (
                            <p className="text-xs text-slate-400">등록된 항목이 없습니다.</p>
                          ) : (
                            <ul className="space-y-1 text-sm text-slate-300">
                              {items.map((item, idx) => (
                                <li key={`${block.id}-item-${idx}`}>{JSON.stringify(item)}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    }
                    if (block.type === "faq") {
                      const items = Array.isArray(block.content.items)
                        ? (block.content.items as Array<Record<string, unknown>>)
                        : []
                      return (
                        <div key={block.id} className="rounded border border-slate-700 p-3">
                          <p className="mb-2 text-sm font-medium text-slate-100">FAQ ({items.length})</p>
                          {items.length === 0 ? (
                            <p className="text-xs text-slate-400">등록된 질문이 없습니다.</p>
                          ) : (
                            <ul className="space-y-2 text-sm text-slate-300">
                              {items.map((item, idx) => (
                                <li key={`${block.id}-faq-${idx}`}>
                                  <p className="font-medium text-slate-200">Q. {String(item.question ?? "")}</p>
                                  <p>A. {String(item.answer ?? "")}</p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
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

            {isSuperAdmin ? (
              <div className="space-y-2 rounded border border-slate-700 bg-slate-900 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">마이그레이션 백업 복구</p>
                  <Button variant="outline" size="sm" onClick={() => void refreshMigrationBackups()} disabled={loadingBackups || restoringBackup}>
                    {loadingBackups ? "로딩 중..." : "목록 새로고침"}
                  </Button>
                </div>
                <select
                  value={selectedBackupKey}
                  onChange={(event) => setSelectedBackupKey(event.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                >
                  {filteredMigrationBackups.length === 0 ? (
                    <option value="">사용 가능한 백업이 없습니다</option>
                  ) : (
                    filteredMigrationBackups.map((item) => (
                      <option key={item.backupKey} value={item.backupKey}>
                        {item.backupKey} · {item.capturedAt}
                      </option>
                    ))
                  )}
                </select>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={showDryRunBackupsOnly}
                    onChange={(event) => setShowDryRunBackupsOnly(event.target.checked)}
                  />
                  dry-run 백업만 보기
                </label>
                <p className="text-xs text-slate-400">
                  복구 대상: {selectedBackupKey || "없음"}
                </p>
                {selectedBackup ? (
                  <div className="space-y-1 rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300">
                    <p>capturedAt: {selectedBackup.capturedAt}</p>
                    <p>updatedAt: {selectedBackup.updatedAt}</p>
                    <p>reason: {selectedBackup.reason || "(none)"}</p>
                    <p>sourceKey: {selectedBackup.sourceKey}</p>
                    <p>type: {selectedBackup.dryRun ? "dry-run backup" : "applied backup"}</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void restoreFromBackup(true)} disabled={restoringBackup || loadingBackups || !selectedBackupKey}>
                    dry-run 복구
                  </Button>
                  <Button onClick={() => void restoreFromBackup(false)} disabled={restoringBackup || loadingBackups || !selectedBackupKey} className="bg-emerald-500 text-slate-900 hover:bg-emerald-400">
                    {restoringBackup ? "복구 중..." : "백업 복구 실행"}
                  </Button>
                </div>
              </div>
            ) : null}
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
            <Button variant="outline" onClick={() => void reloadDraft("conflict_reload")}>
              최신 Draft 불러오기
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
