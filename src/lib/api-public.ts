import {
  API_BASE,
  ApiRequestError,
  PUBLIC_TTL_MS,
  authFetch,
  createPublicCacheKey,
  fetchWithPublicSWR,
  hasPublicCache,
  invalidateProjectRelatedCaches,
  type SWRFetchOptions,
} from "./api-core"
import type {
  AboutContent,
  Comment,
  CommentsResponse,
  FilterTabsConfig,
  Project,
  ProjectsResponse,
  Report,
} from "./api-types"

export const publicApi = {
  getAboutContent: async (options?: SWRFetchOptions<AboutContent>) => {
    const key = createPublicCacheKey("filterTabs", { content: "about" })
    return fetchWithPublicSWR(
      key,
      PUBLIC_TTL_MS.filterTabs,
      async (signal) => {
        const res = await fetch(`${API_BASE}/api/content/about`, { signal, cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load about content")
        return res.json() as Promise<AboutContent>
      },
      options,
    )
  },

  getFilterTabs: async (options?: SWRFetchOptions<FilterTabsConfig>) => {
    const key = createPublicCacheKey("filterTabs")
    return fetchWithPublicSWR(
      key,
      PUBLIC_TTL_MS.filterTabs,
      async (signal) => {
        const res = await fetch(`${API_BASE}/api/content/filter-tabs`, { signal })
        if (!res.ok) throw new Error("Failed to load filter tabs")
        return res.json() as Promise<FilterTabsConfig>
      },
      options,
    )
  },

  getProjects: async (
    params?: { sort?: string; platform?: string; tag?: string },
    options?: SWRFetchOptions<ProjectsResponse>,
  ) => {
    const key = createPublicCacheKey("projectsList", {
      sort: params?.sort ?? "latest",
      platform: params?.platform ?? "all",
      tag: params?.tag ?? "all",
    })
    return fetchWithPublicSWR(
      key,
      PUBLIC_TTL_MS.projects,
      async (signal) => {
        const searchParams = new URLSearchParams()
        if (params?.sort) searchParams.set("sort", params.sort)
        if (params?.platform) searchParams.set("platform", params.platform)
        if (params?.tag) searchParams.set("tag", params.tag)
        const res = await fetch(`${API_BASE}/api/projects?${searchParams}`, { signal })
        if (!res.ok) throw new Error("Failed to fetch projects")
        return res.json() as Promise<ProjectsResponse>
      },
      options,
    )
  },

  getProject: async (id: string, options?: SWRFetchOptions<Project>) => {
    const key = createPublicCacheKey("project", { id })
    return fetchWithPublicSWR(
      key,
      PUBLIC_TTL_MS.projectDetail,
      async (signal) => {
        const res = await fetch(`${API_BASE}/api/projects/${id}`, { signal })
        if (!res.ok) throw new Error("Project not found")
        return res.json() as Promise<Project>
      },
      options,
    )
  },

  createProject: async (data: Partial<Project>) => {
    const res = await authFetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const created = (await res.json()) as Project
    invalidateProjectRelatedCaches(created.id)
    return created
  },

  updateProject: async (id: string, data: Partial<Project>) => {
    const res = await authFetch(`${API_BASE}/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const updated = (await res.json()) as Project
    invalidateProjectRelatedCaches(id)
    return updated
  },

  likeProject: async (id: string) => {
    const res = await authFetch(`${API_BASE}/api/projects/${id}/like`, { method: "POST" })
    const result = (await res.json()) as { like_count: number }
    invalidateProjectRelatedCaches(id)
    return result
  },

  unlikeProject: async (id: string) => {
    const res = await authFetch(`${API_BASE}/api/projects/${id}/like`, { method: "DELETE" })
    const result = (await res.json()) as { like_count: number }
    invalidateProjectRelatedCaches(id)
    return result
  },

  getComments: async (
    projectId: string,
    sort: string = "latest",
    options?: SWRFetchOptions<CommentsResponse>,
  ) => {
    const key = createPublicCacheKey("comments", { projectId, sort })
    return fetchWithPublicSWR(
      key,
      PUBLIC_TTL_MS.comments,
      async (signal) => {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/comments?sort=${sort}`, { signal })
        if (!res.ok) throw new Error("Failed to fetch comments")
        return res.json() as Promise<CommentsResponse>
      },
      options,
    )
  },

  createComment: async (projectId: string, content: string) => {
    const res = await authFetch(`${API_BASE}/api/projects/${projectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    const created = (await res.json()) as Comment
    invalidateProjectRelatedCaches(projectId)
    return created
  },

  reportComment: async (commentId: string, data: { target_type: string; target_id: string; reason: string }) => {
    const res = await authFetch(`${API_BASE}/api/comments/${commentId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return res.json() as Promise<Report>
  },

  hasProjectsCache: (params?: { sort?: string; platform?: string; tag?: string }) => {
    const key = createPublicCacheKey("projectsList", {
      sort: params?.sort ?? "latest",
      platform: params?.platform ?? "all",
      tag: params?.tag ?? "all",
    })
    return hasPublicCache(key)
  },

  hasProjectDetailCache: (projectId: string) => hasPublicCache(createPublicCacheKey("project", { id: projectId })),
  hasCommentsCache: (projectId: string, sort: string = "latest") => hasPublicCache(createPublicCacheKey("comments", { projectId, sort })),
}

export { ApiRequestError }
