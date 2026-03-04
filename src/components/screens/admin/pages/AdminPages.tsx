import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { api, type AboutContent, type AdminPageVersionListItem, type PageDocument } from "@/lib/api"
import { useAuth } from "@/lib/use-auth"

const ABOUT_FALLBACK: AboutContent = {
  hero_title: "완성도보다 바이브.",
  hero_highlight: "실험도 작품이다.",
  hero_description: "VibeCoder 소개 문구",
  contact_email: "hello@vibecoder.dev",
  values: [{ emoji: "🎨", title: "창작", description: "창작을 장려합니다." }],
  team_members: [{ name: "admin", role: "operator", description: "운영자" }],
  faqs: [{ question: "무엇을 하나요?", answer: "프로젝트 공유 커뮤니티를 운영합니다." }],
}

function toLines<T>(items: T[], mapper: (item: T) => string): string {
  return items.map(mapper).join("\n")
}

export function AdminPages() {
  const PAGE_ID = "about_page"
  const { user } = useAuth()
  const isSuperAdmin = user?.role === "super_admin"

  const [activeTab, setActiveTab] = useState<"overview" | "editor" | "preview" | "versions" | "settings">("overview")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [reason, setReason] = useState("")
  const [baseVersion, setBaseVersion] = useState(0)
  const [publishedVersion, setPublishedVersion] = useState(0)
  const [versions, setVersions] = useState<AdminPageVersionListItem[]>([])
  const [heroTitle, setHeroTitle] = useState(ABOUT_FALLBACK.hero_title)
  const [heroHighlight, setHeroHighlight] = useState(ABOUT_FALLBACK.hero_highlight)
  const [heroDescription, setHeroDescription] = useState(ABOUT_FALLBACK.hero_description)
  const [contactEmail, setContactEmail] = useState(ABOUT_FALLBACK.contact_email)
  const [metaTitle, setMetaTitle] = useState(ABOUT_FALLBACK.hero_title)
  const [metaDescription, setMetaDescription] = useState(ABOUT_FALLBACK.hero_description)
  const [valuesInput, setValuesInput] = useState("")
  const [teamInput, setTeamInput] = useState("")
  const [faqInput, setFaqInput] = useState("")

  const parseLines = (text: string) =>
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

  const buildDocument = useMemo((): PageDocument => {
    const values = parseLines(valuesInput)
      .map((line) => {
        const [emoji = "", title = "", ...rest] = line.split("|")
        return { emoji: emoji.trim(), title: title.trim(), description: rest.join("|").trim() }
      })
      .filter((item) => item.emoji && item.title && item.description)

    const teamMembers = parseLines(teamInput)
      .map((line) => {
        const [name = "", role = "", ...rest] = line.split("|")
        return { name: name.trim(), role: role.trim(), description: rest.join("|").trim() }
      })
      .filter((item) => item.name && item.role && item.description)

    const faqs = parseLines(faqInput)
      .map((line) => {
        const [question = "", ...rest] = line.split("|")
        return { question: question.trim(), answer: rest.join("|").trim() }
      })
      .filter((item) => item.question && item.answer)

    return {
      pageId: PAGE_ID,
      status: "draft",
      version: baseVersion,
      title: "About Page",
      seo: {
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),
        ogImage: null,
      },
      blocks: [
        {
          id: "hero",
          type: "hero",
          order: 0,
          visible: true,
          content: {
            headline: heroTitle.trim(),
            highlight: heroHighlight.trim(),
            description: heroDescription.trim(),
            contactEmail: contactEmail.trim(),
          },
        },
        {
          id: "values",
          type: "feature_list",
          order: 1,
          visible: true,
          content: { items: values },
        },
        {
          id: "team",
          type: "feature_list",
          order: 2,
          visible: true,
          content: { items: teamMembers },
        },
        {
          id: "faq",
          type: "faq",
          order: 3,
          visible: true,
          content: { items: faqs },
        },
      ],
      updatedBy: user?.id || "admin",
      updatedAt: new Date().toISOString(),
    }
  }, [PAGE_ID, baseVersion, contactEmail, faqInput, heroDescription, heroHighlight, heroTitle, metaDescription, metaTitle, teamInput, user?.id, valuesInput])

  const applyDocument = (document: PageDocument) => {
    const hero = document.blocks.find((block) => block.id === "hero")
    const values = document.blocks.find((block) => block.id === "values")
    const team = document.blocks.find((block) => block.id === "team")
    const faq = document.blocks.find((block) => block.id === "faq")

    const heroContent = (hero?.content || {}) as Record<string, unknown>
    setHeroTitle(String(heroContent.headline || ABOUT_FALLBACK.hero_title))
    setHeroHighlight(String(heroContent.highlight || ABOUT_FALLBACK.hero_highlight))
    setHeroDescription(String(heroContent.description || ABOUT_FALLBACK.hero_description))
    setContactEmail(String(heroContent.contactEmail || ABOUT_FALLBACK.contact_email))

    const valuesItems = ((values?.content || {}) as Record<string, unknown>).items as Array<Record<string, string>> | undefined
    const teamItems = ((team?.content || {}) as Record<string, unknown>).items as Array<Record<string, string>> | undefined
    const faqItems = ((faq?.content || {}) as Record<string, unknown>).items as Array<Record<string, string>> | undefined

    setValuesInput(toLines(valuesItems || [], (item) => `${item.emoji || ""}|${item.title || ""}|${item.description || ""}`))
    setTeamInput(toLines(teamItems || [], (item) => `${item.name || ""}|${item.role || ""}|${item.description || ""}`))
    setFaqInput(toLines(faqItems || [], (item) => `${item.question || ""}|${item.answer || ""}`))

    setMetaTitle(document.seo?.metaTitle || ABOUT_FALLBACK.hero_title)
    setMetaDescription(document.seo?.metaDescription || ABOUT_FALLBACK.hero_description)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const draft = await api.getAdminPageDraft(PAGE_ID)
        setBaseVersion(draft.baseVersion)
        setPublishedVersion(draft.publishedVersion)
        applyDocument(draft.document)
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
      } finally {
        setLoadingVersions(false)
      }
    }
    void loadVersions()
  }, [PAGE_ID, activeTab])

  const save = async () => {
    const cleanReason = reason.trim()
    if (!cleanReason) return

    setSaving(true)
    try {
      const saved = await api.updateAdminPageDraft(PAGE_ID, baseVersion, buildDocument, cleanReason)
      setBaseVersion(saved.savedVersion)
      setReason("")
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    if (!isSuperAdmin) return
    const cleanReason = reason.trim()
    if (!cleanReason) return

    setPublishing(true)
    try {
      const result = await api.publishAdminPage(PAGE_ID, cleanReason)
      setPublishedVersion(result.publishedVersion)
      setBaseVersion(result.publishedVersion)
      setReason("")
    } finally {
      setPublishing(false)
    }
  }

  const rollbackTo = async (targetVersion: number) => {
    if (!isSuperAdmin) return
    const cleanReason = reason.trim()
    if (!cleanReason) return

    setPublishing(true)
    try {
      const result = await api.rollbackAdminPage(PAGE_ID, targetVersion, cleanReason, false)
      setBaseVersion(result.restoredDraftVersion)
      setReason("")
      const draft = await api.getAdminPageDraft(PAGE_ID)
      applyDocument(draft.document)
      const response = await api.getAdminPageVersions(PAGE_ID, 50)
      setVersions(response.items)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-50">페이지 편집</h1>
      {loading ? <div className="h-24 animate-pulse rounded-xl bg-slate-800" /> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant={activeTab === "overview" ? "default" : "outline"} onClick={() => setActiveTab("overview")}>개요</Button>
        <Button variant={activeTab === "editor" ? "default" : "outline"} onClick={() => setActiveTab("editor")}>편집기</Button>
        <Button variant={activeTab === "preview" ? "default" : "outline"} onClick={() => setActiveTab("preview")}>미리보기</Button>
        <Button variant={activeTab === "versions" ? "default" : "outline"} onClick={() => setActiveTab("versions")}>버전</Button>
        <Button variant={activeTab === "settings" ? "default" : "outline"} onClick={() => setActiveTab("settings")}>설정</Button>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-5">
        {activeTab === "overview" ? (
          <div className="space-y-2 text-sm text-slate-200">
            <p>페이지 ID: <span className="font-mono">{PAGE_ID}</span></p>
            <p>Draft 버전: {baseVersion}</p>
            <p>Published 버전: {publishedVersion}</p>
            <p>권한 정책: publish/rollback은 super_admin 전용</p>
          </div>
        ) : null}

        {activeTab === "editor" ? (
          <>
            <input value={heroTitle} onChange={(event) => setHeroTitle(event.target.value)} placeholder="Hero title" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            <input value={heroHighlight} onChange={(event) => setHeroHighlight(event.target.value)} placeholder="Hero highlight" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            <textarea value={heroDescription} onChange={(event) => setHeroDescription(event.target.value)} rows={3} placeholder="Hero description" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            <input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="Contact email" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            <textarea value={valuesInput} onChange={(event) => setValuesInput(event.target.value)} rows={4} placeholder="emoji|title|description" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            <textarea value={teamInput} onChange={(event) => setTeamInput(event.target.value)} rows={4} placeholder="name|role|description" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            <textarea value={faqInput} onChange={(event) => setFaqInput(event.target.value)} rows={4} placeholder="question|answer" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
          </>
        ) : null}

        {activeTab === "preview" ? (
          <div className="space-y-3 text-slate-100">
            <h2 className="text-xl font-semibold">{heroTitle}</h2>
            <p className="text-slate-300">{heroHighlight}</p>
            <p className="text-slate-300">{heroDescription}</p>
            <p className="text-slate-400">문의: {contactEmail}</p>
            <p className="text-xs text-slate-400">MVP 프리뷰 디바이스: desktop/mobile</p>
          </div>
        ) : null}

        {activeTab === "versions" ? (
          <div className="space-y-2">
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
            <input value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} placeholder="SEO title" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            <textarea value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} rows={3} placeholder="SEO description" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
          </div>
        ) : null}

        <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="수정 사유 (필수)" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={saving} className="bg-[#FF5D8F] text-white hover:bg-[#ff4a83]">
            {saving ? "저장 중..." : "Draft 저장"}
          </Button>
          {isSuperAdmin ? (
            <Button onClick={() => void publish()} disabled={publishing} className="bg-emerald-500 text-slate-900 hover:bg-emerald-400">
              {publishing ? "처리 중..." : "Publish"}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
