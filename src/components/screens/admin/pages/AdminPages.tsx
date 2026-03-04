import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { api, type AboutContent } from "@/lib/api"

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reason, setReason] = useState("")
  const [heroTitle, setHeroTitle] = useState(ABOUT_FALLBACK.hero_title)
  const [heroHighlight, setHeroHighlight] = useState(ABOUT_FALLBACK.hero_highlight)
  const [heroDescription, setHeroDescription] = useState(ABOUT_FALLBACK.hero_description)
  const [contactEmail, setContactEmail] = useState(ABOUT_FALLBACK.contact_email)
  const [valuesInput, setValuesInput] = useState("")
  const [teamInput, setTeamInput] = useState("")
  const [faqInput, setFaqInput] = useState("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const about = await api.getAboutContent()
        setHeroTitle(about.hero_title)
        setHeroHighlight(about.hero_highlight)
        setHeroDescription(about.hero_description)
        setContactEmail(about.contact_email)
        setValuesInput(toLines(about.values || [], (item) => `${item.emoji}|${item.title}|${item.description}`))
        setTeamInput(toLines(about.team_members || [], (item) => `${item.name}|${item.role}|${item.description}`))
        setFaqInput(toLines(about.faqs || [], (item) => `${item.question}|${item.answer}`))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const save = async () => {
    const cleanReason = reason.trim()
    if (!cleanReason) return

    const values = valuesInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [emoji = "", title = "", ...rest] = line.split("|")
        return { emoji: emoji.trim(), title: title.trim(), description: rest.join("|").trim() }
      })
      .filter((item) => item.emoji && item.title && item.description)

    const teamMembers = teamInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name = "", role = "", ...rest] = line.split("|")
        return { name: name.trim(), role: role.trim(), description: rest.join("|").trim() }
      })
      .filter((item) => item.name && item.role && item.description)

    const faqs = faqInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [question = "", ...rest] = line.split("|")
        return { question: question.trim(), answer: rest.join("|").trim() }
      })
      .filter((item) => item.question && item.answer)

    setSaving(true)
    try {
      await api.updateAboutContent({
        hero_title: heroTitle.trim(),
        hero_highlight: heroHighlight.trim(),
        hero_description: heroDescription.trim(),
        contact_email: contactEmail.trim(),
        values,
        team_members: teamMembers,
        faqs,
        reason: cleanReason,
      })
      setReason("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-50">페이지 편집</h1>
      {loading ? <div className="h-24 animate-pulse rounded-xl bg-slate-800" /> : null}
      <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-5">
        <input value={heroTitle} onChange={(event) => setHeroTitle(event.target.value)} placeholder="Hero title" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
        <input value={heroHighlight} onChange={(event) => setHeroHighlight(event.target.value)} placeholder="Hero highlight" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
        <textarea value={heroDescription} onChange={(event) => setHeroDescription(event.target.value)} rows={3} placeholder="Hero description" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
        <input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="Contact email" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
        <textarea value={valuesInput} onChange={(event) => setValuesInput(event.target.value)} rows={4} placeholder="emoji|title|description" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
        <textarea value={teamInput} onChange={(event) => setTeamInput(event.target.value)} rows={4} placeholder="name|role|description" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
        <textarea value={faqInput} onChange={(event) => setFaqInput(event.target.value)} rows={4} placeholder="question|answer" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
        <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="수정 사유 (필수)" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
        <Button onClick={() => void save()} disabled={saving} className="bg-[#FF5D8F] text-white hover:bg-[#ff4a83]">
          {saving ? "저장 중..." : "페이지 저장"}
        </Button>
      </div>
    </section>
  )
}
