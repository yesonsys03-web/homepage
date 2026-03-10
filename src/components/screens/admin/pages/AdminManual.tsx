import { useMemo, useState } from "react"

import manualSource from "../../../../../docs/admin_menual.md?raw"

type ManualSection = {
  id: string
  title: string
  level: 2 | 3
  body: string
  lines: string[]
  matchCount: number
}

export function AdminManual() {
  const [query, setQuery] = useState("")
  const keyword = query.trim().toLowerCase()

  const sections = useMemo(() => parseManualSections(manualSource), [])
  const filteredSections = useMemo(() => {
    if (!keyword) return sections.map((section) => ({ ...section, matchCount: 0 }))

    return sections
      .map((section) => {
        const titleMatches = countMatches(section.title.toLowerCase(), keyword)
        const lineMatches = section.lines.reduce((total, line) => {
          return total + countMatches(line.toLowerCase(), keyword)
        }, 0)
        return { ...section, matchCount: titleMatches + lineMatches }
      })
      .filter((section) => section.matchCount > 0)
  }, [keyword, sections])

  const totalMatches = useMemo(() => {
    return filteredSections.reduce((total, section) => total + section.matchCount, 0)
  }, [filteredSections])

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">운영 메뉴얼</h1>
          <p className="mt-1 text-sm text-slate-400">
            `docs/admin_menual.md` 원문을 그대로 기준으로 삼아, 관리자 화면 안에서 즉시 검색하고 대응 포인트를 찾을 수 있게 보여줍니다.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="제목, 장애 키워드, action_type, OAuth, restore 검색"
            className="min-w-[320px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none ring-[#FF5D8F]/40 focus:ring-2"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="전체 섹션" value={String(sections.length)} />
        <MetricCard label="검색 결과 섹션" value={String(filteredSections.length)} />
        <MetricCard label="검색 일치 수" value={String(totalMatches)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-100">빠른 이동</h2>
            <span className="text-xs text-slate-500">{filteredSections.length}개</span>
          </div>
          <div className="mt-3 max-h-[70vh] space-y-2 overflow-auto pr-1">
            {filteredSections.length === 0 ? (
              <p className="text-sm text-slate-500">일치하는 메뉴얼 섹션이 없습니다.</p>
            ) : (
              filteredSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 transition hover:border-[#FF5D8F]/60 hover:text-white"
                >
                  <p className={section.level === 2 ? "font-semibold text-slate-100" : "pl-3 text-slate-300"}>{section.title}</p>
                  {keyword ? (
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{section.matchCount} matches</p>
                  ) : null}
                </a>
              ))
            )}
          </div>
        </aside>

        <div className="space-y-4">
          {filteredSections.length === 0 ? (
            <article className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-sm text-slate-400">
              검색 결과가 없습니다. 더 짧은 키워드나 action_type, API 경로, 장애 증상으로 다시 검색해보세요.
            </article>
          ) : (
            filteredSections.map((section) => (
              <article id={section.id} key={section.id} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                <div className="border-b border-slate-700 bg-slate-900 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-slate-100">{section.title}</h2>
                    <span className="text-[11px] uppercase tracking-wide text-slate-500">
                      {section.level === 2 ? "section" : "subsection"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  {keyword ? <MatchPreview lines={section.lines} keyword={keyword} /> : null}
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm leading-6 text-slate-200">{section.body}</pre>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-50">{value}</p>
    </div>
  )
}

function MatchPreview({ lines, keyword }: { lines: string[]; keyword: string }) {
  const matchedLines = lines.filter((line) => line.toLowerCase().includes(keyword)).slice(0, 6)

  if (matchedLines.length === 0) return null

  return (
    <div className="rounded-lg border border-[#FF5D8F]/30 bg-[#FF5D8F]/8 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#FFB5CB]">일치 라인</p>
      <div className="mt-2 space-y-2 text-sm text-slate-200">
        {matchedLines.map((line, index) => (
          <p key={`${line}-${index}`} className="whitespace-pre-wrap break-words">
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}

function parseManualSections(source: string): ManualSection[] {
  const normalized = source.replace(/\r\n/g, "\n")
  const lines = normalized.split("\n")
  const sections: Array<{ id: string; title: string; level: 2 | 3; lines: string[] }> = []

  let current: { id: string; title: string; level: 2 | 3; lines: string[] } | null = null
  let untitledIndex = 0

  const pushCurrent = () => {
    if (!current) return
    const body = current.lines.join("\n").trim()
    sections.push({ ...current, lines: body ? body.split("\n") : [] })
  }

  lines.forEach((line) => {
    const level2 = line.match(/^##\s+(.*)$/)
    const level3 = line.match(/^###\s+(.*)$/)

    if (level2 || level3) {
      pushCurrent()
      const title = (level2?.[1] || level3?.[1] || "").trim()
      const level: 2 | 3 = level2 ? 2 : 3
      current = {
        id: toSectionId(title || `untitled-${untitledIndex++}`),
        title,
        level,
        lines: [],
      }
      return
    }

    if (!current) {
      current = {
        id: `overview-${untitledIndex++}`,
        title: "개요",
        level: 2,
        lines: [],
      }
    }

    current.lines.push(line)
  })

  pushCurrent()

  return sections
    .map((section) => ({
      id: section.id,
      title: section.title,
      level: section.level,
      body: section.lines.join("\n").trim(),
      lines: section.lines.filter((line) => line.trim().length > 0),
      matchCount: 0,
    }))
    .filter((section) => section.title || section.body)
}

function toSectionId(value: string): string {
  return value
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9\u3131-\uD79D]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function countMatches(haystack: string, needle: string): number {
  if (!needle) return 0
  return haystack.split(needle).length - 1
}
