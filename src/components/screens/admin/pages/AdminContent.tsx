import { useMemo, useState } from "react"

import { EditDrawer } from "@/components/screens/admin/components/EditDrawer"
import { RowActions } from "@/components/screens/admin/components/RowActions"
import { DataTable, type DataTableColumn } from "@/components/screens/admin/components/DataTable"
import { Badge } from "@/components/ui/badge"
import { useAdminContent, type ProjectStatus } from "@/components/screens/admin/hooks/useAdminContent"
import type { AdminManagedProject } from "@/lib/api"

type ContentActionType = "edit" | "hide" | "restore" | "delete"

const CONTENT_TABLE_COLUMNS: DataTableColumn[] = [
  { key: "status", header: "상태" },
  { key: "title", header: "제목" },
  { key: "author", header: "작성자" },
  { key: "engagement", header: "반응" },
  { key: "actions", header: "작업" },
]

export function AdminContent() {
  const { projects, loadingProjects, actions } = useAdminContent()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<ProjectStatus>("all")
  const [selected, setSelected] = useState<AdminManagedProject | null>(null)
  const [actionType, setActionType] = useState<ContentActionType | null>(null)
  const [reason, setReason] = useState("운영 정책 위반")
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [tags, setTags] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return projects.filter((project) => {
      const statusOk = status === "all" || project.status === status
      if (!statusOk) return false
      if (!query) return true
      return (
        project.title.toLowerCase().includes(query)
        || project.summary.toLowerCase().includes(query)
        || project.author_nickname.toLowerCase().includes(query)
      )
    })
  }, [projects, search, status])

  const openAction = (project: AdminManagedProject, nextAction: ContentActionType) => {
    setSelected(project)
    setActionType(nextAction)
    setReason("운영 정책 위반")
    setTitle(project.title)
    setSummary(project.summary)
    setTags((project.tags || []).join(", "))
  }

  const closeDrawer = (open: boolean) => {
    if (!open) {
      setSelected(null)
      setActionType(null)
      setSubmitting(false)
    }
  }

  const submit = async () => {
    if (!selected || !actionType) return
    const cleanReason = reason.trim()
    if (!cleanReason) return

    setSubmitting(true)
    try {
      if (actionType === "edit") {
        const tagList = tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)

        await actions.update(selected.id, {
          title: title.trim(),
          summary: summary.trim(),
          tags: tagList,
          reason: cleanReason,
        })
      }

      if (actionType === "hide") await actions.hide(selected.id, cleanReason)
      if (actionType === "restore") await actions.restore(selected.id, cleanReason)
      if (actionType === "delete") await actions.remove(selected.id, cleanReason)
      closeDrawer(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-slate-50">콘텐츠 관리</h1>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ProjectStatus)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">전체</option>
            <option value="published">게시됨</option>
            <option value="hidden">숨김</option>
            <option value="deleted">삭제됨</option>
          </select>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="제목/작성자 검색"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none ring-[#FF5D8F]/40 focus:ring-2"
          />
        </div>
      </div>

      <DataTable
        columns={CONTENT_TABLE_COLUMNS}
        rows={filtered}
        loading={loadingProjects}
        emptyMessage="조건에 맞는 프로젝트가 없습니다."
        getRowKey={(project) => project.id}
        renderRow={(project) => (
          <>
            <td className="px-4 py-3 text-sm text-slate-300">
              <Badge variant={project.status === "published" ? "secondary" : project.status === "hidden" ? "outline" : "destructive"}>
                {project.status}
              </Badge>
            </td>
            <td className="px-4 py-3 text-sm text-slate-100">{project.title}</td>
            <td className="px-4 py-3 text-sm text-slate-300">{project.author_nickname}</td>
            <td className="px-4 py-3 text-sm text-slate-300">❤️ {project.like_count} · 💬 {project.comment_count}</td>
            <td className="px-4 py-3 text-sm text-slate-300">
              <RowActions
                label={`${project.title} 콘텐츠`}
                actions={[
                  { key: "edit", label: "수정", onClick: () => openAction(project, "edit") },
                  { key: "hide", label: "숨김", onClick: () => openAction(project, "hide"), disabled: project.status === "hidden" || project.status === "deleted" },
                  { key: "restore", label: "복구", onClick: () => openAction(project, "restore"), disabled: project.status === "published" },
                  { key: "delete", label: "삭제", onClick: () => openAction(project, "delete"), danger: true, disabled: project.status === "deleted" },
                ]}
              />
            </td>
          </>
        )}
      />

      <EditDrawer
        open={Boolean(selected && actionType)}
        title={selected ? `${selected.title} 작업` : "콘텐츠 작업"}
        description="테이블을 유지한 채 우측 드로어에서 편집합니다."
        submitting={submitting}
        onOpenChange={closeDrawer}
        onSubmit={() => void submit()}
      >
        {actionType === "edit" ? (
          <>
            <label className="block text-sm text-slate-300">
              제목
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </label>
            <label className="block text-sm text-slate-300">
              요약
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </label>
            <label className="block text-sm text-slate-300">
              태그 (쉼표 구분)
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </label>
          </>
        ) : null}

        <label className="block text-sm text-slate-300">
          작업 사유
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </label>
      </EditDrawer>
    </section>
  )
}
