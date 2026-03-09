import type {
  AdminListResponse,
  CommentsResponse,
  CuratedContentResponse,
  ProfileCommentsResponse,
  ProjectsResponse,
} from "./api-types"

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000"

export class ApiRequestError extends Error {
  status: number
  detail: unknown

  constructor(status: number, detail: unknown) {
    const message =
      typeof detail === "string"
        ? detail
        : typeof detail === "object" && detail !== null && "message" in detail
          ? String((detail as { message?: unknown }).message ?? "Request failed")
          : "Request failed"
    super(message)
    this.name = "ApiRequestError"
    this.status = status
    this.detail = detail
  }
}

function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("vibecoder_token")
  }
  return null
}

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken()
  const headers: HeadersInit = {
    ...options.headers,
  }

  if (token) {
    ;(headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(url, { ...options, headers })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "An error occurred" }))
    const detail = (error as { detail?: unknown }).detail ?? "Request failed"
    throw new ApiRequestError(res.status, detail)
  }

  return res
}

export type AdminTabCacheEntry<T> = {
  data?: T
  fetchedAt: number
  inflight?: Promise<T>
  controller?: AbortController
}

export type SWRFetchOptions<T> = {
  force?: boolean
  onRevalidate?: (data: T) => void
}

export const ADMIN_TAB_TTL_MS = {
  reports: 15_000,
  stats: 20_000,
  users: 120_000,
  content: 120_000,
  pages: 180_000,
  policies: 180_000,
  actions: 20_000,
} as const

export const PUBLIC_TTL_MS = {
  projects: 45_000,
  projectDetail: 20_000,
  comments: 8_000,
  filterTabs: 180_000,
} as const

const adminTabCache = new Map<string, AdminTabCacheEntry<unknown>>()
const publicDataCache = new Map<string, AdminTabCacheEntry<unknown>>()

function getCacheEntry<T>(key: string): AdminTabCacheEntry<T> | undefined {
  const entry = adminTabCache.get(key)
  return entry as AdminTabCacheEntry<T> | undefined
}

function isCacheFresh(entry: AdminTabCacheEntry<unknown> | undefined, ttlMs: number): boolean {
  if (!entry || entry.data === undefined) {
    return false
  }
  return Date.now() - entry.fetchedAt <= ttlMs
}

function upsertCacheEntry<T>(key: string, updater: (prev?: AdminTabCacheEntry<T>) => AdminTabCacheEntry<T>) {
  const prev = getCacheEntry<T>(key)
  const next = updater(prev)
  adminTabCache.set(key, next as AdminTabCacheEntry<unknown>)
}

async function fetchAndStoreAdminCache<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  force: boolean = false,
): Promise<T> {
  const previous = getCacheEntry<T>(key)
  if (force && previous?.controller) {
    previous.controller.abort()
  }

  const controller = new AbortController()
  const inflight = fetcher(controller.signal)
    .then((data) => {
      upsertCacheEntry<T>(key, () => ({ data, fetchedAt: Date.now() }))
      return data
    })
    .finally(() => {
      const latest = getCacheEntry<T>(key)
      if (latest?.inflight) {
        upsertCacheEntry<T>(key, (prev) => ({ data: prev?.data, fetchedAt: prev?.fetchedAt ?? 0 }))
      }
    })

  upsertCacheEntry<T>(key, (prev) => ({
    data: prev?.data,
    fetchedAt: prev?.fetchedAt ?? 0,
    inflight,
    controller,
  }))

  return inflight
}

export async function fetchWithAdminSWR<T>(
  key: string,
  ttlMs: number,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: SWRFetchOptions<T> = {},
): Promise<T> {
  const entry = getCacheEntry<T>(key)
  const hasCachedData = entry?.data !== undefined
  const fresh = isCacheFresh(entry, ttlMs)

  if (!options.force && hasCachedData) {
    if (!fresh) {
      const latest = getCacheEntry<T>(key)
      if (!latest?.inflight) {
        void fetchAndStoreAdminCache(key, fetcher)
          .then((data) => options.onRevalidate?.(data))
          .catch((error) => {
            if (error instanceof DOMException && error.name === "AbortError") return
            console.error(`Admin cache revalidate failed: ${key}`, error)
          })
      }
    }
    return entry.data as T
  }

  if (!options.force && entry?.inflight) return entry.inflight
  return fetchAndStoreAdminCache(key, fetcher, options.force)
}

export function createAdminCacheKey(
  tab: keyof typeof ADMIN_TAB_TTL_MS,
  params?: Record<string, string | number | undefined>,
) {
  const query = params
    ? Object.entries(params)
        .filter(([, value]) => value !== undefined)
        .map(([k, value]) => `${k}=${String(value)}`)
        .join("&")
    : ""
  return query ? `${tab}?${query}` : tab
}

export function hasAdminCache(key: string): boolean {
  const entry = getCacheEntry<unknown>(key)
  return entry?.data !== undefined
}

export function invalidateAdminCacheKey(key: string) {
  adminTabCache.delete(key)
}

function getPublicCacheEntry<T>(key: string): AdminTabCacheEntry<T> | undefined {
  return publicDataCache.get(key) as AdminTabCacheEntry<T> | undefined
}

function upsertPublicCacheEntry<T>(key: string, updater: (prev?: AdminTabCacheEntry<T>) => AdminTabCacheEntry<T>) {
  const prev = getPublicCacheEntry<T>(key)
  const next = updater(prev)
  publicDataCache.set(key, next as AdminTabCacheEntry<unknown>)
}

async function fetchAndStorePublicCache<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  force: boolean = false,
): Promise<T> {
  const previous = getPublicCacheEntry<T>(key)
  if (force && previous?.controller) {
    previous.controller.abort()
  }

  const controller = new AbortController()
  const inflight = fetcher(controller.signal)
    .then((data) => {
      upsertPublicCacheEntry<T>(key, () => ({ data, fetchedAt: Date.now() }))
      return data
    })
    .finally(() => {
      const latest = getPublicCacheEntry<T>(key)
      if (latest?.inflight) {
        upsertPublicCacheEntry<T>(key, (prev) => ({ data: prev?.data, fetchedAt: prev?.fetchedAt ?? 0 }))
      }
    })

  upsertPublicCacheEntry<T>(key, (prev) => ({
    data: prev?.data,
    fetchedAt: prev?.fetchedAt ?? 0,
    inflight,
    controller,
  }))

  return inflight
}

export async function fetchWithPublicSWR<T>(
  key: string,
  ttlMs: number,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: SWRFetchOptions<T> = {},
): Promise<T> {
  const entry = getPublicCacheEntry<T>(key)
  const hasCachedData = entry?.data !== undefined
  const fresh = isCacheFresh(entry, ttlMs)

  if (!options.force && hasCachedData) {
    if (!fresh) {
      const latest = getPublicCacheEntry<T>(key)
      if (!latest?.inflight) {
        void fetchAndStorePublicCache(key, fetcher)
          .then((data) => options.onRevalidate?.(data))
          .catch((error) => {
            if (error instanceof DOMException && error.name === "AbortError") return
            console.error(`Public cache revalidate failed: ${key}`, error)
          })
      }
    }
    return entry.data as T
  }

  if (!options.force && entry?.inflight) return entry.inflight
  return fetchAndStorePublicCache(key, fetcher, options.force)
}

export function createPublicCacheKey(
  kind: keyof typeof PUBLIC_TTL_MS | "projectsList" | "project" | "comments",
  params?: Record<string, string | number | undefined>,
) {
  const query = params
    ? Object.entries(params)
        .filter(([, value]) => value !== undefined)
        .map(([k, value]) => `${k}=${String(value)}`)
        .join("&")
    : ""
  return query ? `${kind}?${query}` : kind
}

export function hasPublicCache(key: string): boolean {
  const entry = getPublicCacheEntry<unknown>(key)
  return entry?.data !== undefined
}

export function invalidatePublicCacheByPrefix(prefix: string) {
  Array.from(publicDataCache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) publicDataCache.delete(key)
  })
}

export function invalidateProjectRelatedCaches(projectId: string) {
  invalidatePublicCacheByPrefix("projectsList")
  invalidatePublicCacheByPrefix(`project?id=${projectId}`)
  invalidatePublicCacheByPrefix(`comments?projectId=${projectId}`)
}

export type { AdminListResponse, CommentsResponse, CuratedContentResponse, ProfileCommentsResponse, ProjectsResponse }
