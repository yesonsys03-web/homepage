import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { ConfirmModal } from "@/components/ConfirmModal"
import { AdminTable } from "@/components/screens/admin/AdminTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import type { AdminManagedProject } from "@/lib/api"

type ProjectStatus = "all" | "published" | "hidden" | "deleted"

interface AdminContentTabProps {
  filters: {
    projectStatusFilter: ProjectStatus
    setProjectStatusFilter: (value: ProjectStatus) => void
    projectSearchQuery: string
    setProjectSearchQuery: (value: string) => void
  }
  bulk: {
    projectActionReason: string
    setProjectActionReason: (value: string) => void
    handleProjectBulkAction: (action: "hide" | "restore") => void
    isProjectActionReasonValid: boolean
    selectedProjectIds: string[]
  }
  editing: {
    editingProjectId: string | null
    editingProjectTitle: string
    setEditingProjectTitle: (value: string) => void
    editingProjectSummary: string
    setEditingProjectSummary: (value: string) => void
    editingProjectTagInput: string
    setEditingProjectTagInput: (value: string) => void
    editingProjectTags: string[]
    editingProjectReason: string
    setEditingProjectReason: (value: string) => void
    handleAddEditingProjectTag: () => void
    handleRemoveEditingProjectTag: (tag: string) => void
    handleSaveProjectEdit: () => void
    cancelEditingProject: () => void
  }
  loading: {
    loadingProjects: boolean
  }
  filteredProjects: AdminManagedProject[]
  toggleProjectSelection: (projectId: string) => void
  startEditingProject: (project: AdminManagedProject) => void
  handleProjectSingleAction: (action: "hide" | "restore" | "delete", projectId: string) => Promise<void>
}

export function AdminContentTab({
  filters,
  bulk,
  editing,
  loading,
  filteredProjects,
  toggleProjectSelection,
  startEditingProject,
  handleProjectSingleAction,
}: AdminContentTabProps) {
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<string | null>(null)
  const [submittingDelete, setSubmittingDelete] = useState(false)

  const requestProjectDelete = (projectId: string) => {
    setPendingDeleteProjectId(projectId)
  }

  const closeDeleteModal = () => {
    if (submittingDelete) return
    setPendingDeleteProjectId(null)
  }

  const confirmProjectDelete = async () => {
    if (!pendingDeleteProjectId) return
    setSubmittingDelete(true)
    try {
      await handleProjectSingleAction("delete", pendingDeleteProjectId)
      closeDeleteModal()
    } finally {
      setSubmittingDelete(false)
    }
  }

  const columns = useMemo<Array<ColumnDef<AdminManagedProject>>>(
    () => [
      {
        id: "selected",
        enableSorting: false,
        header: "선택",
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={bulk.selectedProjectIds.includes(row.original.id)}
            onChange={() => toggleProjectSelection(row.original.id)}
          />
        ),
      },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "published"
                ? "default"
                : row.original.status === "hidden"
                  ? "secondary"
                  : "destructive"
            }
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "title",
        header: "제목",
        cell: ({ row }) => <span className="block max-w-xs truncate text-[#F4F7FF]">{row.original.title}</span>,
      },
      {
        accessorKey: "author_nickname",
        header: "작성자",
        cell: ({ row }) => <span className="text-[#B8C3E6]">{row.original.author_nickname}</span>,
      },
      {
        accessorKey: "platform",
        header: "플랫폼",
        cell: ({ row }) => <span className="text-[#B8C3E6]">{row.original.platform}</span>,
      },
      {
        id: "reactions",
        header: "반응",
        cell: ({ row }) => <span className="text-[#B8C3E6]">❤️ {row.original.like_count} · 💬 {row.original.comment_count}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        header: "작업",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="outline"
              className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
              onClick={() => startEditingProject(row.original)}
            >
              수정
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
              onClick={() => handleProjectSingleAction("hide", row.original.id)}
              disabled={row.original.status === "hidden" || row.original.status === "deleted"}
            >
              숨김
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
              onClick={() => handleProjectSingleAction("restore", row.original.id)}
              disabled={row.original.status === "published"}
            >
              복구
            </Button>
            <Button
              size="sm"
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white text-xs"
              onClick={() => requestProjectDelete(row.original.id)}
              disabled={row.original.status === "deleted"}
            >
              삭제
            </Button>
          </div>
        ),
      },
    ],
    [bulk.selectedProjectIds, handleProjectSingleAction, startEditingProject, toggleProjectSelection],
  )

  return (
    <TabsContent value="content">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 flex-wrap">
          {(["all", "published", "hidden", "deleted"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => filters.setProjectStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filters.projectStatusFilter === status
                  ? "bg-[#FF5D8F] text-white"
                  : "bg-[#161F42] text-[#B8C3E6] hover:bg-[#1b2550]"
              }`}
            >
              {status === "all" ? "전체" : status}
            </button>
          ))}
        </div>
        <input
          value={filters.projectSearchQuery}
          onChange={(event) => filters.setProjectSearchQuery(event.target.value)}
          placeholder="제목/요약/작성자/플랫폼 검색"
          className="w-full md:w-72 bg-[#161F42] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#B8C3E6]/60 focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={bulk.projectActionReason}
          onChange={(event) => bulk.setProjectActionReason(event.target.value)}
          placeholder="콘텐츠 작업 사유 (필수)"
          className="w-full bg-[#161F42] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#B8C3E6]/60 focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
            onClick={() => bulk.handleProjectBulkAction("hide")}
            disabled={!bulk.isProjectActionReasonValid || bulk.selectedProjectIds.length === 0}
          >
            선택 숨김
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
            onClick={() => bulk.handleProjectBulkAction("restore")}
            disabled={!bulk.isProjectActionReasonValid || bulk.selectedProjectIds.length === 0}
          >
            선택 복구
          </Button>
        </div>
      </div>

      {editing.editingProjectId && (
        <Card className="bg-[#161F42] border border-[#FF5D8F]/40 mb-4">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-[#F4F7FF]">프로젝트 수정</p>
            <input
              value={editing.editingProjectTitle}
              onChange={(event) => editing.setEditingProjectTitle(event.target.value)}
              placeholder="제목"
              className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
            />
            <textarea
              value={editing.editingProjectSummary}
              onChange={(event) => editing.setEditingProjectSummary(event.target.value)}
              placeholder="요약"
              rows={3}
              className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
            />
            <div className="space-y-2">
              <p className="text-xs text-[#B8C3E6]">태그 수정 (추가/제거)</p>
              <div className="flex gap-2">
                <input
                  value={editing.editingProjectTagInput}
                  onChange={(event) => editing.setEditingProjectTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      editing.handleAddEditingProjectTag()
                    }
                  }}
                  placeholder="태그 입력 후 Enter"
                  className="flex-1 bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                  onClick={editing.handleAddEditingProjectTag}
                >
                  태그 추가
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editing.editingProjectTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => editing.handleRemoveEditingProjectTag(tag)}
                    className="rounded-full bg-[#111936] px-3 py-1 text-xs text-[#B8C3E6] hover:bg-[#FF5D8F]/20 hover:text-[#F4F7FF]"
                    title="클릭해서 제거"
                  >
                    {tag} ×
                  </button>
                ))}
              </div>
            </div>
            <input
              value={editing.editingProjectReason}
              onChange={(event) => editing.setEditingProjectReason(event.target.value)}
              placeholder="수정 사유 (필수)"
              className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                className="bg-[#FF5D8F] hover:bg-[#FF5D8F]/90 text-white"
                onClick={editing.handleSaveProjectEdit}
              >
                수정 저장
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                onClick={editing.cancelEditingProject}
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AdminTable
        data={filteredProjects}
        columns={columns}
        loading={loading.loadingProjects}
        loadingMessage="프로젝트 로딩 중..."
        emptyMessage="표시할 프로젝트가 없습니다."
        initialPageSize={20}
      />
      <ConfirmModal
        open={pendingDeleteProjectId !== null}
        title="프로젝트 삭제(소프트 삭제)"
        description="정말 삭제 처리하시겠습니까? 이 작업은 소프트 삭제로 처리됩니다."
        confirmLabel="삭제 진행"
        danger
        onClose={closeDeleteModal}
        onConfirm={() => void confirmProjectDelete()}
        confirming={submittingDelete}
      />
    </TabsContent>
  )
}
