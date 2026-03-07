import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { api, type AdminManagedUser } from "@/lib/api"

export function getUserLimitState(user: AdminManagedUser): { isLimited: boolean; label: string } {
  if (!user.limited_until) {
    return { isLimited: false, label: "정상" }
  }

  const limitDate = new Date(user.limited_until)
  if (Number.isNaN(limitDate.getTime())) {
    return { isLimited: false, label: "정상" }
  }

  if (limitDate.getTime() > Date.now()) {
    return { isLimited: true, label: "제한중" }
  }

  return { isLimited: false, label: "만료" }
}

export function getUserApprovalState(user: AdminManagedUser): {
  tone: "destructive" | "secondary"
  label: string
} {
  const status = user.status || "active"
  if (status === "pending") return { tone: "destructive", label: "승인 대기" }
  if (status === "rejected") return { tone: "destructive", label: "반려" }
  if (status === "suspended") return { tone: "destructive", label: "정지" }
  if (status === "pending_delete") return { tone: "destructive", label: "삭제 예정" }
  if (status === "deleted") return { tone: "destructive", label: "삭제됨" }
  return { tone: "secondary", label: "활성" }
}

export function useAdminUsers() {
  const queryClient = useQueryClient()

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const data = await api.getAdminUsers(300)
      return Array.isArray(data.items) ? data.items : []
    },
  })

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data])

  const refreshUsersAndLogs = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-actions"] }),
    ])
  }

  const actions = {
    approve: async (userId: string) => {
      await api.approveUser(userId)
      await refreshUsersAndLogs()
    },
    reject: async (userId: string, reason: string) => {
      await api.rejectUser(userId, reason.trim())
      await refreshUsersAndLogs()
    },
    role: async (userId: string, role: "user" | "admin") => {
      await api.updateAdminUserRole(userId, role)
      await refreshUsersAndLogs()
    },
    limit: async (userId: string, hours: number, reason?: string) => {
      await api.limitUser(userId, hours, reason || undefined)
      await refreshUsersAndLogs()
    },
    unlimit: async (userId: string) => {
      await api.unlimitUser(userId)
      await refreshUsersAndLogs()
    },
    suspend: async (userId: string, reason: string) => {
      await api.suspendUser(userId, reason.trim())
      await refreshUsersAndLogs()
    },
    unsuspend: async (userId: string) => {
      await api.unsuspendUser(userId)
      await refreshUsersAndLogs()
    },
    revokeTokens: async (userId: string, reason?: string) => {
      await api.revokeUserTokens(userId, reason || undefined)
      await refreshUsersAndLogs()
    },
    scheduleDelete: async (userId: string, days: number, reason: string) => {
      await api.scheduleUserDelete(userId, days, reason.trim())
      await refreshUsersAndLogs()
    },
    cancelDeleteSchedule: async (userId: string) => {
      await api.cancelUserDeleteSchedule(userId)
      await refreshUsersAndLogs()
    },
    deleteNow: async (userId: string, reason: string) => {
      await api.deleteUserNow(userId, reason.trim())
      await refreshUsersAndLogs()
    },
  }

  const pendingApprovalCount = useMemo(
    () => users.filter((user) => (user.status || "active") === "pending").length,
    [users]
  )

  return {
    users,
    loadingUsers: usersQuery.isPending,
    pendingApprovalCount,
    actions,
  }
}
