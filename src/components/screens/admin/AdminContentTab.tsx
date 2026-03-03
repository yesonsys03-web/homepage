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
  handleProjectSingleAction: (action: "hide" | "restore" | "delete", projectId: string) => void
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

      <Card className="bg-[#161F42] border-0">
        <CardContent className="p-0">
          {loading.loadingProjects ? (
            <div className="p-6 text-[#B8C3E6]">프로젝트 로딩 중...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#111936]">
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">상태</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">제목</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">작성자</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">플랫폼</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">반응</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="border-b border-[#111936]/50 hover:bg-[#111936]/30">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={bulk.selectedProjectIds.includes(project.id)}
                        onChange={() => toggleProjectSelection(project.id)}
                      />
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          project.status === "published"
                            ? "default"
                            : project.status === "hidden"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {project.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-[#F4F7FF] max-w-xs truncate">{project.title}</td>
                    <td className="p-4 text-[#B8C3E6]">{project.author_nickname}</td>
                    <td className="p-4 text-[#B8C3E6]">{project.platform}</td>
                    <td className="p-4 text-[#B8C3E6]">❤️ {project.like_count} · 💬 {project.comment_count}</td>
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
                          onClick={() => startEditingProject(project)}
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
                          onClick={() => handleProjectSingleAction("hide", project.id)}
                          disabled={project.status === "hidden" || project.status === "deleted"}
                        >
                          숨김
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
                          onClick={() => handleProjectSingleAction("restore", project.id)}
                          disabled={project.status === "published"}
                        >
                          복구
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white text-xs"
                          onClick={() => handleProjectSingleAction("delete", project.id)}
                          disabled={project.status === "deleted"}
                        >
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  )
}
