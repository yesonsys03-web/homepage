import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  ApiRequestError,
  api,
  type AdminPageMigrationBackupListResponse,
  type AdminPagePublishScheduleItem,
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
const API_TARGET = import.meta.env.VITE_API_BASE || "http://localhost:8000"
const DESKTOP_LAYOUT_MEDIA_QUERY = "(min-width: 1440px)"
const NOTEBOOK_LAYOUT_MEDIA_QUERY = "(min-width: 1024px) and (max-width: 1439px)"
const PROPERTY_PANEL_MIN_WIDTH = 320
const PROPERTY_PANEL_MAX_WIDTH = 440
const PROPERTY_PANEL_DEFAULT_WIDTH = 360
const SIDE_RAIL_STORAGE_KEY = "page_editor_rail_width"
const SIDE_RAIL_MIN_WIDTH = 160
const SIDE_RAIL_MAX_WIDTH = 220
const SIDE_RAIL_DEFAULT_WIDTH = 176
const SIDE_RAIL_COLLAPSED_WIDTH = 48

type EditorTab = "overview" | "editor" | "preview" | "versions" | "settings"
type PreviewDevice = "desktop" | "tablet" | "mobile"
type EditorZoom = 80 | 100 | 120
type EditorInteractionSurface = "panel" | "canvas"
type EditorUiVariant = "baseline" | "enhanced"
type EditorPanel = "blocks" | "canvas" | "properties"
type SupportedBlockType = "hero" | "rich_text" | "image" | "cta" | "feature_list" | "faq" | "gallery"

const SIDE_RAIL_ITEMS: Array<{
  panel: EditorPanel
  label: string
  shortLabel: string
  ariaLabel: string
}> = [
  { panel: "blocks", label: "블록", shortLabel: "B", ariaLabel: "블록 목록" },
  { panel: "canvas", label: "캔버스", shortLabel: "C", ariaLabel: "캔버스 미리보기" },
  { panel: "properties", label: "속성", shortLabel: "P", ariaLabel: "속성 패널" },
]

type PageConflictDetail = {
  current_version?: number
  current_updated_by?: string
  current_updated_at?: string
  retryable?: boolean
  message?: string
}

const SUPPORTED_BLOCK_TYPES: SupportedBlockType[] = [
  "hero",
  "rich_text",
  "image",
  "cta",
  "feature_list",
  "faq",
  "gallery",
]

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
  gallery: "Gallery",
}

function getAboutMappingTarget(block: Pick<PageBlock, "id" | "type"> | null): string | null {
  if (!block) return null
  if (block.id === "values" && block.type === "feature_list") return "About Values"
  if (block.id === "team" && block.type === "feature_list") return "About Team"
  if (block.id === "faq" && block.type === "faq") return "About FAQ"
  return null
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
  if (type === "gallery") {
    return {
      id: `gallery_${Date.now()}_${order}`,
      type,
      order,
      visible: true,
      content: { items: [], layout: "grid" },
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

function cloneDocument(document: PageDocument): PageDocument {
  return JSON.parse(JSON.stringify(document)) as PageDocument
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
    if (error.message === "Failed to fetch") {
      return `서버 연결에 실패했습니다 (${API_TARGET}). API 서버 실행 상태와 네트워크/프록시 설정을 확인해 주세요.`
    }
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
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)
  const [schedulingPublish, setSchedulingPublish] = useState(false)
  const [processingSchedules, setProcessingSchedules] = useState(false)
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
  const [publishSchedules, setPublishSchedules] = useState<AdminPagePublishScheduleItem[]>([])
  const [selectedBackupKey, setSelectedBackupKey] = useState("")
  const [showDryRunBackupsOnly, setShowDryRunBackupsOnly] = useState(false)
  const [scheduledPublishAt, setScheduledPublishAt] = useState("")
  const [scheduleTimezone, setScheduleTimezone] = useState("Asia/Seoul")

  const [pageTitle, setPageTitle] = useState("About Page")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [ogImage, setOgImage] = useState("")
  const [blocks, setBlocks] = useState<PageBlock[]>(defaultBlocks())
  const [selectedBlockId, setSelectedBlockId] = useState<string>(blocks[0]?.id ?? "")
  const [conflictVersion, setConflictVersion] = useState<number | null>(null)
  const [conflictUpdatedBy, setConflictUpdatedBy] = useState<string | null>(null)
  const [conflictUpdatedAt, setConflictUpdatedAt] = useState<string | null>(null)
  const [pendingConflictDocument, setPendingConflictDocument] = useState<PageDocument | null>(null)
  const [pendingConflictReason, setPendingConflictReason] = useState("")
  const [listItemsInput, setListItemsInput] = useState("[]")
  const [listItemsError, setListItemsError] = useState<string | null>(null)
  const [styleInput, setStyleInput] = useState("{}")
  const [styleInputError, setStyleInputError] = useState<string | null>(null)
  const [panelSectionOpen, setPanelSectionOpen] = useState({
    content: true,
    style: false,
    advanced: false,
  })
  const [activeEditorPanel, setActiveEditorPanel] = useState<EditorPanel>("blocks")
  const [autoSwitchToProperties, setAutoSwitchToProperties] = useState(true)
  const [isDesktopWide, setIsDesktopWide] = useState(false)
  const [isNotebookWide, setIsNotebookWide] = useState(false)
  const [isMobileItemsOpen, setIsMobileItemsOpen] = useState(false)
  const [isSideRailCollapsed, setIsSideRailCollapsed] = useState(false)
  const [focusedSideRailIndex, setFocusedSideRailIndex] = useState(0)
  const [sideRailWidth, setSideRailWidth] = useState(() => {
    if (typeof window === "undefined") {
      return SIDE_RAIL_DEFAULT_WIDTH
    }
    try {
      const stored = Number(localStorage.getItem(SIDE_RAIL_STORAGE_KEY))
      if (Number.isFinite(stored)) {
        return Math.max(SIDE_RAIL_MIN_WIDTH, Math.min(SIDE_RAIL_MAX_WIDTH, stored))
      }
    } catch {
    }
    return SIDE_RAIL_DEFAULT_WIDTH
  })
  const [isResizingSideRail, setIsResizingSideRail] = useState(false)
  const [propertyPanelWidth, setPropertyPanelWidth] = useState(PROPERTY_PANEL_DEFAULT_WIDTH)
  const [isResizingPropertyPanel, setIsResizingPropertyPanel] = useState(false)
  const [isNotebookPropertyPanelOpen, setIsNotebookPropertyPanelOpen] = useState(false)
  const [pendingEditorAction, setPendingEditorAction] = useState<
    { kind: "select_block"; blockId: string }
    | { kind: "switch_tab"; tab: EditorTab }
    | null
  >(null)

  const lastSavedSnapshotRef = useRef<string>("")
  const previewSwitchStartedRef = useRef<number | null>(null)
  const panelSwitchStartedAtRef = useRef<number | null>(null)
  const resizeStartXRef = useRef<number | null>(null)
  const resizeStartWidthRef = useRef<number>(PROPERTY_PANEL_DEFAULT_WIDTH)
  const sideRailResizeStartXRef = useRef<number | null>(null)
  const sideRailResizeStartWidthRef = useRef<number>(SIDE_RAIL_DEFAULT_WIDTH)
  const editorCanvasScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const editorCanvasScrollTopRef = useRef(0)
  const shouldRestoreEditorCanvasScrollRef = useRef(false)
  const editSessionStartedRef = useRef<number>(performance.now())
  const panelCanvasRoundtripCountRef = useRef(0)
  const lastEditorInteractionSurfaceRef = useRef<EditorInteractionSurface | null>(null)
  const editorCanvasScrollDistanceRef = useRef(0)
  const lastEditorCanvasScrollTopRef = useRef<number | null>(null)
  const firstFieldInputStartedAtRef = useRef<number | null>(null)
  const lastSavedDocumentRef = useRef<PageDocument | null>(null)
  const sideRailItemButtonsRef = useRef<Array<HTMLButtonElement | null>>([])

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  )
  const selectedAboutMappingTarget = useMemo(
    () => getAboutMappingTarget(selectedBlock),
    [selectedBlock],
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
    if (
      !selectedBlock ||
      (selectedBlock.type !== "feature_list" &&
        selectedBlock.type !== "faq" &&
        selectedBlock.type !== "gallery")
    ) {
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
      const savedDocument = cloneDocument({ ...document, blocks: normalizedBlocks })
      lastSavedSnapshotRef.current = snapshotOf(savedDocument)
      lastSavedDocumentRef.current = savedDocument
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

  const reloadDraft = async (metricSource: string = "reload", clearPendingConflict: boolean = true) => {
    const startedAt = performance.now()
    const draft = await api.getAdminPageDraft(PAGE_ID)
    setBaseVersion(draft.baseVersion)
    setPublishedVersion(draft.publishedVersion)
    applyDocument(draft.document, true)
    setConflictVersion(null)
    setConflictUpdatedBy(null)
    setConflictUpdatedAt(null)
    if (clearPendingConflict) {
      setPendingConflictDocument(null)
      setPendingConflictReason("")
    }
    logPerfEvent("editor_initial_load", performance.now() - startedAt, metricSource)
    resetEditorSessionMetrics()
  }

  const refreshPublishSchedules = async () => {
    if (!isSuperAdmin) {
      setPublishSchedules([])
      return
    }
    setLoadingSchedules(true)
    try {
      const response = await api.getAdminPagePublishSchedules(PAGE_ID, 50)
      setPublishSchedules(response.items)
    } catch (error) {
      setErrorBanner(parseErrorMessage(error))
    } finally {
      setLoadingSchedules(false)
    }
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
      setLoadingSchedules(true)
      try {
        const [response, backups, schedules] = await Promise.all([
          api.getAdminPageVersions(PAGE_ID, 50),
          isSuperAdmin ? api.getAdminPageMigrationBackups(PAGE_ID, 20) : Promise.resolve({ pageId: PAGE_ID, count: 0, items: [] }),
          isSuperAdmin ? api.getAdminPagePublishSchedules(PAGE_ID, 50) : Promise.resolve({ pageId: PAGE_ID, count: 0, items: [] }),
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
        setPublishSchedules(schedules.items)
      } catch (error) {
        setErrorBanner(parseErrorMessage(error))
      } finally {
        setLoadingVersions(false)
        setLoadingBackups(false)
        setLoadingSchedules(false)
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
      lastSavedDocumentRef.current = cloneDocument(savedDocument)
      setConflictVersion(null)
      setConflictUpdatedBy(null)
      setConflictUpdatedAt(null)
      setPendingConflictDocument(null)
      setPendingConflictReason("")
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
        const detail = error.detail as PageConflictDetail | string
        const currentVersion =
          typeof detail === "object" && detail !== null && typeof detail.current_version === "number"
            ? detail.current_version
            : null
        const currentUpdatedBy =
          typeof detail === "object" && detail !== null && typeof detail.current_updated_by === "string"
            ? detail.current_updated_by
            : null
        const currentUpdatedAt =
          typeof detail === "object" && detail !== null && typeof detail.current_updated_at === "string"
            ? detail.current_updated_at
            : null
        setConflictVersion(currentVersion)
        setConflictUpdatedBy(currentUpdatedBy)
        setConflictUpdatedAt(currentUpdatedAt)
        setPendingConflictDocument(cloneDocument(buildDocument))
        setPendingConflictReason(reason)
        const conflictMessage =
          typeof detail === "object" && detail !== null && detail.message
            ? String(detail.message)
            : "저장 충돌이 발생했습니다. 최신 버전을 불러와 다시 시도하세요"
        const conflictMeta = currentUpdatedBy || currentUpdatedAt
          ? ` (최신 변경: ${currentUpdatedBy ?? "unknown"}${currentUpdatedAt ? ` / ${currentUpdatedAt}` : ""})`
          : ""
        setErrorBanner(
          `${conflictMessage}${conflictMeta}`,
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

  const switchEditorPanel = useCallback((panel: EditorPanel, source: EditorInteractionSurface = "panel") => {
    const previousPanel = activeEditorPanel
    if (previousPanel === panel) {
      return
    }
    panelSwitchStartedAtRef.current = performance.now()
    markEditorInteraction(source)
    setActiveEditorPanel(panel)
    if (panel !== "canvas") {
      markEditorCanvasScrollForRestore()
    }
    const frame = window.requestAnimationFrame(() => {
      if (panelSwitchStartedAtRef.current === null) {
        return
      }
      const durationMs = performance.now() - panelSwitchStartedAtRef.current
      panelSwitchStartedAtRef.current = null
      logPerfEvent(
        "preview_switch",
        durationMs,
        buildEditorMetricSource(`panel_switch:${previousPanel}->${panel}`),
      )
    })
    window.setTimeout(() => {
      window.cancelAnimationFrame(frame)
    }, 0)
  }, [activeEditorPanel, buildEditorMetricSource, logPerfEvent, markEditorCanvasScrollForRestore, markEditorInteraction])

  const requestTabSwitch = useCallback((nextTab: EditorTab) => {
    if (nextTab === activeTab) {
      return
    }
    if (activeTab === "editor" && isDirty) {
      setPendingEditorAction({ kind: "switch_tab", tab: nextTab })
      return
    }
    setActiveTab(nextTab)
  }, [activeTab, isDirty])

  const requestBlockSelect = useCallback((blockId: string, source: EditorInteractionSurface) => {
    if (blockId === selectedBlockId) {
      return
    }
    markEditorInteraction(source)
    markEditorCanvasScrollForRestore()
    if (isDirty) {
      setPendingEditorAction({ kind: "select_block", blockId })
      return
    }
    setSelectedBlockId(blockId)
    firstFieldInputStartedAtRef.current = performance.now()
    if (autoSwitchToProperties) {
      setActiveEditorPanel("properties")
    }
  }, [autoSwitchToProperties, isDirty, markEditorCanvasScrollForRestore, markEditorInteraction, selectedBlockId])

  useEffect(() => {
    const activeIndex = SIDE_RAIL_ITEMS.findIndex((item) => item.panel === activeEditorPanel)
    if (activeIndex >= 0) {
      setFocusedSideRailIndex(activeIndex)
    }
  }, [activeEditorPanel])

  const activateSideRailByIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(SIDE_RAIL_ITEMS.length - 1, index))
    const target = SIDE_RAIL_ITEMS[clamped]
    setFocusedSideRailIndex(clamped)
    sideRailItemButtonsRef.current[clamped]?.focus()
    switchEditorPanel(target.panel)
  }, [switchEditorPanel])

  const discardDirtyChangesAndContinue = useCallback(async () => {
    const saved = lastSavedDocumentRef.current
    if (saved) {
      applyDocument(cloneDocument(saved), true)
    } else {
      await reloadDraft("discard_unsaved")
    }

    if (!pendingEditorAction) {
      return
    }
    if (pendingEditorAction.kind === "select_block") {
      setSelectedBlockId(pendingEditorAction.blockId)
      firstFieldInputStartedAtRef.current = performance.now()
      if (autoSwitchToProperties) {
        setActiveEditorPanel("properties")
      }
    }
    if (pendingEditorAction.kind === "switch_tab") {
      setActiveTab(pendingEditorAction.tab)
    }
    setPendingEditorAction(null)
  }, [autoSwitchToProperties, pendingEditorAction])

  const saveDirtyChangesAndContinue = useCallback(async () => {
    await saveInternal("auto")
    if (blockingIssues.length > 0) {
      return
    }
    if (!pendingEditorAction) {
      return
    }
    if (pendingEditorAction.kind === "select_block") {
      setSelectedBlockId(pendingEditorAction.blockId)
      firstFieldInputStartedAtRef.current = performance.now()
      if (autoSwitchToProperties) {
        setActiveEditorPanel("properties")
      }
    }
    if (pendingEditorAction.kind === "switch_tab") {
      setActiveTab(pendingEditorAction.tab)
    }
    setPendingEditorAction(null)
  }, [autoSwitchToProperties, blockingIssues.length, pendingEditorAction])

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
    if (!isDesktopWide && !isNotebookWide) {
      setIsMobileItemsOpen(false)
      setIsSideRailCollapsed(false)
    }
  }, [isDesktopWide, isNotebookWide])

  useEffect(() => {
    try {
      localStorage.setItem(SIDE_RAIL_STORAGE_KEY, String(sideRailWidth))
    } catch {
    }
  }, [sideRailWidth])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return
      }
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [isDirty])

  useEffect(() => {
    if (!isMobileItemsOpen) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return
      }
      setIsMobileItemsOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isMobileItemsOpen])

  const startSideRailResize = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if ((!isDesktopWide && !isNotebookWide) || event.button !== 0 || isSideRailCollapsed) {
      return
    }
    sideRailResizeStartXRef.current = event.clientX
    sideRailResizeStartWidthRef.current = sideRailWidth
    setIsResizingSideRail(true)
    event.preventDefault()
  }, [isDesktopWide, isNotebookWide, isSideRailCollapsed, sideRailWidth])

  useEffect(() => {
    if (!isResizingSideRail) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (sideRailResizeStartXRef.current === null) {
        return
      }
      const deltaX = event.clientX - sideRailResizeStartXRef.current
      const nextWidth = Math.max(
        SIDE_RAIL_MIN_WIDTH,
        Math.min(SIDE_RAIL_MAX_WIDTH, sideRailResizeStartWidthRef.current + deltaX),
      )
      setSideRailWidth(nextWidth)
    }

    const handleMouseUp = () => {
      setIsResizingSideRail(false)
      sideRailResizeStartXRef.current = null
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizingSideRail])

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

  const schedulePublish = async () => {
    if (!isSuperAdmin) return
    if (!reason.trim()) {
      setErrorBanner("예약 게시에는 사유 입력이 필요합니다")
      return
    }
    if (!scheduledPublishAt.trim()) {
      setErrorBanner("예약 게시 시각을 입력하세요")
      return
    }

    const targetDate = new Date(scheduledPublishAt)
    if (Number.isNaN(targetDate.getTime())) {
      setErrorBanner("예약 게시 시각 형식이 올바르지 않습니다")
      return
    }

    setSchedulingPublish(true)
    setErrorBanner(null)
    setNotice(null)
    try {
      await api.createAdminPagePublishSchedule(
        PAGE_ID,
        targetDate.toISOString(),
        reason.trim(),
        scheduleTimezone,
        baseVersion,
      )
      setReason("")
      setScheduledPublishAt("")
      await Promise.all([refreshPublishSchedules(), api.getAdminPageVersions(PAGE_ID, 50).then((res) => setVersions(res.items))])
      setNotice("예약 게시를 등록했습니다")
    } catch (error) {
      setErrorBanner(parseErrorMessage(error))
    } finally {
      setSchedulingPublish(false)
    }
  }

  const cancelScheduledPublish = async (scheduleId: string) => {
    if (!isSuperAdmin) return
    if (!reason.trim()) {
      setErrorBanner("예약 취소에는 사유 입력이 필요합니다")
      return
    }
    setSchedulingPublish(true)
    setErrorBanner(null)
    try {
      await api.cancelAdminPagePublishSchedule(PAGE_ID, scheduleId, reason.trim())
      setReason("")
      await refreshPublishSchedules()
      setNotice("예약 게시를 취소했습니다")
    } catch (error) {
      setErrorBanner(parseErrorMessage(error))
    } finally {
      setSchedulingPublish(false)
    }
  }

  const retryScheduledPublish = async (scheduleId: string) => {
    if (!isSuperAdmin) return
    if (!reason.trim()) {
      setErrorBanner("재시도 요청에는 사유 입력이 필요합니다")
      return
    }
    setSchedulingPublish(true)
    setErrorBanner(null)
    try {
      await api.retryAdminPagePublishSchedule(PAGE_ID, scheduleId, reason.trim())
      setReason("")
      await refreshPublishSchedules()
      setNotice("예약 게시 재시도를 요청했습니다")
    } catch (error) {
      setErrorBanner(parseErrorMessage(error))
    } finally {
      setSchedulingPublish(false)
    }
  }

  const processDueSchedules = async () => {
    if (!isSuperAdmin) return
    setProcessingSchedules(true)
    setErrorBanner(null)
    setNotice(null)
    try {
      const result = await api.processAdminPagePublishSchedules(PAGE_ID, 20, reason.trim() || undefined)
      await Promise.all([
        refreshPublishSchedules(),
        api.getAdminPageVersions(PAGE_ID, 50).then((res) => setVersions(res.items)),
        reloadDraft("scheduled_publish_process", false),
      ])
      setNotice(`예약 게시 처리 완료: 성공 ${result.published} / 실패 ${result.failed}`)
    } catch (error) {
      setErrorBanner(parseErrorMessage(error))
    } finally {
      setProcessingSchedules(false)
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
    if (firstFieldInputStartedAtRef.current !== null) {
      logPerfEvent(
        "edit_completion_time",
        performance.now() - firstFieldInputStartedAtRef.current,
        buildEditorMetricSource("first_field_input"),
      )
      firstFieldInputStartedAtRef.current = null
    }
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

  const updateSelectedFeatureListItems = (nextItems: Array<Record<string, unknown>>) => {
    updateSelectedBlockContent("items", nextItems)
    setListItemsInput(JSON.stringify(nextItems, null, 2))
    setListItemsError(null)
  }

  const updateSelectedFeatureListItemField = (
    index: number,
    key: string,
    value: string,
  ) => {
    if (!selectedBlock || selectedBlock.type !== "feature_list") return
    const currentItems = Array.isArray(selectedBlock.content.items)
      ? (selectedBlock.content.items as Array<Record<string, unknown>>)
      : []
    if (index < 0 || index >= currentItems.length) return
    const nextItems = currentItems.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: value } : item,
    )
    updateSelectedFeatureListItems(nextItems)
  }

  const addSelectedMappedFeatureListItem = () => {
    if (!selectedBlock || selectedBlock.type !== "feature_list") return
    const currentItems = Array.isArray(selectedBlock.content.items)
      ? (selectedBlock.content.items as Array<Record<string, unknown>>)
      : []
    const template =
      selectedBlock.id === "values"
        ? { emoji: "", title: "", description: "" }
        : selectedBlock.id === "team"
          ? { name: "", role: "", description: "" }
          : { title: "", description: "" }
    updateSelectedFeatureListItems([...currentItems, template])
  }

  const removeSelectedMappedFeatureListItem = (index: number) => {
    if (!selectedBlock || selectedBlock.type !== "feature_list") return
    const currentItems = Array.isArray(selectedBlock.content.items)
      ? (selectedBlock.content.items as Array<Record<string, unknown>>)
      : []
    if (index < 0 || index >= currentItems.length) return
    const nextItems = currentItems.filter((_, itemIndex) => itemIndex !== index)
    updateSelectedFeatureListItems(nextItems)
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
        <Button variant={activeTab === "overview" ? "default" : "outline"} onClick={() => requestTabSwitch("overview")}>개요</Button>
        <Button variant={activeTab === "editor" ? "default" : "outline"} onClick={() => requestTabSwitch("editor")}>Hero</Button>
        <Button variant={activeTab === "preview" ? "default" : "outline"} onClick={() => requestTabSwitch("preview")}>미리보기</Button>
        <Button variant={activeTab === "versions" ? "default" : "outline"} onClick={() => requestTabSwitch("versions")}>버전</Button>
        <Button variant={activeTab === "settings" ? "default" : "outline"} onClick={() => requestTabSwitch("settings")}>About</Button>
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
          {conflictUpdatedBy || conflictUpdatedAt ? (
            <span className="rounded border border-rose-500/30 px-2 py-1 text-rose-100">
              최신 변경 정보: {conflictUpdatedBy ?? "unknown"}{conflictUpdatedAt ? ` / ${conflictUpdatedAt}` : ""}
            </span>
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
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {(isDesktopWide || isNotebookWide) ? (
                <div
                  className="relative flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/70 p-1"
                  style={{ width: isSideRailCollapsed ? SIDE_RAIL_COLLAPSED_WIDTH : sideRailWidth }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault()
                      activateSideRailByIndex(focusedSideRailIndex + 1)
                      return
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault()
                      activateSideRailByIndex(focusedSideRailIndex - 1)
                      return
                    }
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      activateSideRailByIndex(focusedSideRailIndex)
                    }
                  }}
                >
                  <button
                    type="button"
                    className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200"
                    aria-label={isSideRailCollapsed ? "레일 펼치기" : "레일 접기"}
                    onClick={() => setIsSideRailCollapsed((prev) => !prev)}
                  >
                    {isSideRailCollapsed ? ">" : "<"}
                  </button>
                  <div className="flex flex-1 gap-1 overflow-hidden">
                    {SIDE_RAIL_ITEMS.map((item, index) => (
                      <button
                        key={item.panel}
                        ref={(node) => {
                          sideRailItemButtonsRef.current[index] = node
                        }}
                        type="button"
                        aria-label={item.ariaLabel}
                        className={`rounded px-2 py-1 text-xs ${activeEditorPanel === item.panel ? "bg-emerald-500/20 text-emerald-200" : "text-slate-300"}`}
                        onFocus={() => setFocusedSideRailIndex(index)}
                        onClick={() => activateSideRailByIndex(index)}
                      >
                        {isSideRailCollapsed ? item.shortLabel : item.label}
                      </button>
                    ))}
                  </div>
                  {!isSideRailCollapsed ? (
                    <button
                      type="button"
                      aria-label="레일 너비 조절"
                      onMouseDown={startSideRailResize}
                      className={`absolute -right-1 top-0 h-full w-1 cursor-col-resize rounded ${isResizingSideRail ? "bg-emerald-400/80" : "bg-slate-600/40"}`}
                    />
                  ) : null}
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsMobileItemsOpen((prev) => !prev)}>Items</Button>
              )}
              <label className="ml-auto flex items-center gap-1 text-xs text-slate-300">
                <input type="checkbox" checked={autoSwitchToProperties} onChange={(event) => setAutoSwitchToProperties(event.target.checked)} />
                블록 선택 시 속성 자동 전환
              </label>
            </div>
            {!(isDesktopWide || isNotebookWide) && isMobileItemsOpen ? (
              <div className="mb-2 flex flex-wrap gap-1 rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                <Button size="sm" variant={activeEditorPanel === "blocks" ? "default" : "outline"} onClick={() => { switchEditorPanel("blocks"); setIsMobileItemsOpen(false) }}>블록 목록</Button>
                <Button size="sm" variant={activeEditorPanel === "canvas" ? "default" : "outline"} onClick={() => { switchEditorPanel("canvas"); setIsMobileItemsOpen(false) }}>캔버스</Button>
                <Button size="sm" variant={activeEditorPanel === "properties" ? "default" : "outline"} onClick={() => { switchEditorPanel("properties"); setIsMobileItemsOpen(false) }}>속성 패널</Button>
              </div>
            ) : null}
            <div className="grid gap-4">
            <div className={`space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 ${activeEditorPanel === "blocks" ? "" : "hidden"}`}>
              <p className="text-sm font-medium text-slate-100">블록 목록</p>
              {normalizeBlocks(blocks).map((block, index) => {
                const supported = SUPPORTED_BLOCK_TYPES.includes(block.type as SupportedBlockType)
                const aboutMappingTarget = getAboutMappingTarget(block)
                return (
                  <div
                    key={block.id}
                    className={`space-y-2 rounded border px-3 py-2 ${selectedBlockId === block.id ? "border-emerald-400/70 bg-slate-800" : "border-slate-700 bg-slate-900"}`}
                  >
                    <button
                      className="w-full text-left text-sm text-slate-100"
                      onClick={() => requestBlockSelect(block.id, "panel")}
                      type="button"
                    >
                      {index + 1}. {BLOCK_LABEL[block.type as SupportedBlockType] ?? block.type}
                      {aboutMappingTarget ? ` (${aboutMappingTarget})` : ""}
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

            <div className={`space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 ${activeEditorPanel === "canvas" ? "" : "hidden"}`}>
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
                      onClick={() => requestBlockSelect(block.id, "canvas")}
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

            <div className={`relative space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 ${activeEditorPanel === "properties" ? "" : "hidden"}`}>
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
                </div>
                {!selectedBlock ? <p className="text-sm text-slate-300">선택된 블록이 없습니다.</p> : null}
                {selectedBlock ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <span className="rounded border border-slate-600 px-2 py-1">{BLOCK_LABEL[selectedBlock.type as SupportedBlockType] ?? selectedBlock.type}</span>
                      {selectedAboutMappingTarget ? (
                        <span className="rounded border border-cyan-500/50 px-2 py-1 text-cyan-200">{selectedAboutMappingTarget}</span>
                      ) : null}
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

                      {selectedBlock.type === "feature_list" || selectedBlock.type === "faq" || selectedBlock.type === "gallery" ? (
                        <>
                          {selectedBlock.type === "feature_list" && (selectedBlock.id === "values" || selectedBlock.id === "team") ? (
                            <div className="space-y-2 rounded border border-slate-700 bg-slate-950/60 p-2">
                              <p className="text-xs text-cyan-200">
                                {selectedBlock.id === "values"
                                  ? "About Values 블록입니다. 여기서 제목/설명을 바로 수정하면 됩니다."
                                  : "About Team 블록입니다. name/role/description을 수정하세요."}
                              </p>
                              {Array.isArray(selectedBlock.content.items) &&
                              selectedBlock.content.items.length > 0 ? (
                                (selectedBlock.content.items as Array<Record<string, unknown>>).map((item, itemIndex) => (
                                  <div key={`${selectedBlock.id}-mapped-item-${itemIndex}`} className="space-y-1 rounded border border-slate-700 p-2">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs text-slate-300">항목 {itemIndex + 1}</p>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeSelectedMappedFeatureListItem(itemIndex)}
                                      >
                                        항목 삭제
                                      </Button>
                                    </div>
                                    {selectedBlock.id === "values" ? (
                                      <>
                                        <input
                                          value={String(item.emoji ?? "")}
                                          onChange={(event) =>
                                            updateSelectedFeatureListItemField(itemIndex, "emoji", event.target.value)
                                          }
                                          placeholder="emoji"
                                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                                        />
                                        <input
                                          value={String(item.title ?? "")}
                                          onChange={(event) =>
                                            updateSelectedFeatureListItemField(itemIndex, "title", event.target.value)
                                          }
                                          placeholder="title"
                                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                                        />
                                        <textarea
                                          value={String(item.description ?? "")}
                                          onChange={(event) =>
                                            updateSelectedFeatureListItemField(itemIndex, "description", event.target.value)
                                          }
                                          rows={3}
                                          placeholder="description"
                                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <input
                                          value={String(item.name ?? "")}
                                          onChange={(event) =>
                                            updateSelectedFeatureListItemField(itemIndex, "name", event.target.value)
                                          }
                                          placeholder="name"
                                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                                        />
                                        <input
                                          value={String(item.role ?? "")}
                                          onChange={(event) =>
                                            updateSelectedFeatureListItemField(itemIndex, "role", event.target.value)
                                          }
                                          placeholder="role"
                                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                                        />
                                        <textarea
                                          value={String(item.description ?? "")}
                                          onChange={(event) =>
                                            updateSelectedFeatureListItemField(itemIndex, "description", event.target.value)
                                          }
                                          rows={3}
                                          placeholder="description"
                                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                                        />
                                      </>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-400">등록된 항목이 없습니다.</p>
                              )}
                              <Button variant="outline" size="sm" onClick={addSelectedMappedFeatureListItem}>
                                항목 추가
                              </Button>
                            </div>
                          ) : null}
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
                          {selectedBlock.type === "gallery" ? (
                            <input
                              value={String(selectedBlock.content.layout ?? "grid")}
                              onChange={(event) => updateSelectedBlockContent("layout", event.target.value)}
                              placeholder="layout (grid/carousel)"
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                            />
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
          </>
        ) : null}

        {activeTab === "preview" ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant={previewDevice === "desktop" ? "default" : "outline"} onClick={() => handlePreviewDeviceChange("desktop")}>Desktop</Button>
              <Button variant={previewDevice === "tablet" ? "default" : "outline"} onClick={() => handlePreviewDeviceChange("tablet")}>Tablet</Button>
              <Button variant={previewDevice === "mobile" ? "default" : "outline"} onClick={() => handlePreviewDeviceChange("mobile")}>Mobile</Button>
            </div>
            <div
              className={`mx-auto rounded-xl border border-slate-700 bg-slate-900 p-4 ${
                previewDevice === "mobile"
                  ? "max-w-sm"
                  : previewDevice === "tablet"
                    ? "max-w-2xl"
                    : "max-w-4xl"
              }`}
            >
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
                    if (block.type === "gallery") {
                      const items = Array.isArray(block.content.items)
                        ? (block.content.items as Array<Record<string, unknown>>)
                        : []
                      return (
                        <div key={block.id} className="rounded border border-slate-700 p-3">
                          <p className="mb-2 text-sm font-medium text-slate-100">
                            Gallery ({items.length}) · {String(block.content.layout ?? "grid")}
                          </p>
                          {items.length === 0 ? (
                            <p className="text-xs text-slate-400">등록된 이미지가 없습니다.</p>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {items.map((item, idx) => {
                                const src = String(item.src ?? "")
                                const alt = String(item.alt ?? "")
                                const caption = String(item.caption ?? "")
                                return (
                                  <div key={`${block.id}-gallery-${idx}`} className="space-y-1 rounded border border-slate-700 p-2">
                                    {src ? (
                                      <img src={src} alt={alt} className="h-28 w-full rounded object-cover" />
                                    ) : (
                                      <div className="h-28 w-full rounded bg-slate-800" />
                                    )}
                                    <p className="text-xs text-slate-300">{caption || `(item ${idx + 1})`}</p>
                                  </div>
                                )
                              })}
                            </div>
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

            {isSuperAdmin ? (
              <div className="space-y-2 rounded border border-slate-700 bg-slate-900 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">예약 게시</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void refreshPublishSchedules()}
                    disabled={loadingSchedules || schedulingPublish || processingSchedules}
                  >
                    {loadingSchedules ? "로딩 중..." : "목록 새로고침"}
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <input
                    type="datetime-local"
                    aria-label="예약 게시 시각"
                    value={scheduledPublishAt}
                    onChange={(event) => setScheduledPublishAt(event.target.value)}
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                  />
                  <input
                    aria-label="예약 게시 timezone"
                    value={scheduleTimezone}
                    onChange={(event) => setScheduleTimezone(event.target.value)}
                    placeholder="timezone"
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                  />
                  <Button
                    onClick={() => void schedulePublish()}
                    disabled={schedulingPublish || processingSchedules}
                    className="bg-emerald-500 text-slate-900 hover:bg-emerald-400"
                  >
                    {schedulingPublish ? "처리 중..." : "예약 게시 등록"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void processDueSchedules()}
                    disabled={processingSchedules || schedulingPublish}
                  >
                    {processingSchedules ? "처리 중..." : "예약 게시 처리 실행"}
                  </Button>
                </div>

                {publishSchedules.length === 0 ? (
                  <p className="text-xs text-slate-400">등록된 예약 게시가 없습니다.</p>
                ) : (
                  <div className="space-y-2 rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300">
                    {publishSchedules.map((schedule) => (
                      <div
                        key={schedule.scheduleId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-700 px-2 py-1"
                      >
                        <div>
                          <p>
                            {schedule.scheduleId} · draft v{schedule.draftVersion} · {schedule.status}
                          </p>
                          <p className="text-slate-400">
                            publishAt: {schedule.publishAt} ({schedule.timezone})
                          </p>
                          {schedule.lastError ? (
                            <p className="text-rose-300">error: {schedule.lastError}</p>
                          ) : null}
                        </div>
                        <div className="flex gap-1">
                          {(schedule.status === "scheduled" || schedule.status === "failed") ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void cancelScheduledPublish(schedule.scheduleId)}
                              disabled={schedulingPublish || processingSchedules}
                            >
                              취소
                            </Button>
                          ) : null}
                          {schedule.status === "failed" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void retryScheduledPublish(schedule.scheduleId)}
                              disabled={schedulingPublish || processingSchedules}
                            >
                              재시도 요청
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

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

        {pendingEditorAction ? (
          <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3">
            <p className="text-sm text-amber-100">미저장 변경이 있습니다. 이동 전에 처리하세요.</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void saveDirtyChangesAndContinue()} className="bg-emerald-500 text-slate-900 hover:bg-emerald-400">
                저장 후 이동
              </Button>
              <Button size="sm" variant="outline" onClick={() => void discardDirtyChangesAndContinue()}>
                폐기 후 이동
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPendingEditorAction(null)}>
                취소
              </Button>
            </div>
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
            <Button variant="outline" onClick={() => void reloadDraft("conflict_reload", false)}>
              최신 Draft 불러오기
            </Button>
          ) : null}
          {pendingConflictDocument ? (
            <Button
              variant="outline"
              onClick={() => {
                applyDocument(cloneDocument(pendingConflictDocument), false)
                if (pendingConflictReason.trim()) {
                  setReason(pendingConflictReason)
                }
                setConflictVersion(null)
                setConflictUpdatedBy(null)
                setConflictUpdatedAt(null)
                setPendingConflictDocument(null)
                setNotice("로컬 변경을 다시 적용했습니다. 내용 확인 후 저장하세요")
              }}
            >
              로컬 변경 다시 적용
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
