import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"

export type ProjectStatus = "all" | "published" | "hidden" | "deleted"

export function useAdminContent() {
  const queryClient = useQueryClient()

  const projectsQuery = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const data = await api.getAdminProjects(undefined, 400)
      return Array.isArray(data.items) ? data.items : []
    },
  })

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])

  const refreshProjectsAndLogs = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-actions"] }),
    ])
  }

  const actions = {
    update: async (projectId: string, payload: { title: string; summary: string; tags: string[]; reason: string }) => {
      await api.updateAdminProject(projectId, {
        title: payload.title,
        summary: payload.summary,
        tags: payload.tags,
        reason: payload.reason,
      })
      await refreshProjectsAndLogs()
    },
    hide: async (projectId: string, reason: string) => {
      await api.hideAdminProject(projectId, reason)
      await refreshProjectsAndLogs()
    },
    restore: async (projectId: string, reason: string) => {
      await api.restoreAdminProject(projectId, reason)
      await refreshProjectsAndLogs()
    },
    remove: async (projectId: string, reason: string) => {
      await api.deleteAdminProject(projectId, reason)
      await refreshProjectsAndLogs()
    },
  }

  return {
    projects,
    loadingProjects: projectsQuery.isPending,
    actions,
  }
}
