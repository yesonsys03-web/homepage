import { useMemo, useState } from "react"

import { EditDrawer } from "@/components/screens/admin/components/EditDrawer"
import { RowActions } from "@/components/screens/admin/components/RowActions"
import { DataTable, type DataTableColumn } from "@/components/screens/admin/components/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getUserApprovalState, getUserLimitState, useAdminUsers } from "@/components/screens/admin/hooks/useAdminUsers"
import type { AdminManagedUser } from "@/lib/api"

type UserActionType =
  | "approve"
  | "reject"
  | "role_admin"
  | "role_user"
  | "limit"
  | "unlimit"
  | "suspend"
  | "unsuspend"
  | "revoke"
  | "schedule_delete"
  | "cancel_delete"
  | "delete_now"

const USER_TABLE_COLUMNS: DataTableColumn[] = [
  { key: "nickname", header: "닉네임" },
  { key: "email", header: "이메일" },
  { key: "role", header: "권한" },
  { key: "status", header: "상태" },
  { key: "actions", header: "작업" },
]

export function AdminUsers() {
  const { users, loadingUsers, actions } = useAdminUsers()
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<AdminManagedUser | null>(null)
  const [actionType, setActionType] = useState<UserActionType | null>(null)
  const [reason, setReason] = useState("운영 정책 위반")
  const [hours, setHours] = useState("24")
  const [days, setDays] = useState("30")
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return users
    }

    return users.filter((user) => {
      return (
        user.nickname.toLowerCase().includes(query)
        || user.email.toLowerCase().includes(query)
        || user.role.toLowerCase().includes(query)
      )
    })
  }, [search, users])

  const openAction = (user: AdminManagedUser, type: UserActionType) => {
    setSelected(user)
    setActionType(type)
    setReason("운영 정책 위반")
    setHours("24")
    setDays("30")
  }

  const closeDrawer = (open: boolean) => {
    if (!open) {
      setSelected(null)
      setActionType(null)
      setSubmitting(false)
    }
  }

  const submitAction = async () => {
    if (!selected || !actionType) return

    setSubmitting(true)
    try {
      if (actionType === "approve") await actions.approve(selected.id)
      if (actionType === "reject") await actions.reject(selected.id, reason)
      if (actionType === "role_admin") await actions.role(selected.id, "admin")
      if (actionType === "role_user") await actions.role(selected.id, "user")
      if (actionType === "limit") await actions.limit(selected.id, Number(hours), reason)
      if (actionType === "unlimit") await actions.unlimit(selected.id)
      if (actionType === "suspend") await actions.suspend(selected.id, reason)
      if (actionType === "unsuspend") await actions.unsuspend(selected.id)
      if (actionType === "revoke") await actions.revokeTokens(selected.id, reason)
      if (actionType === "schedule_delete") await actions.scheduleDelete(selected.id, Number(days), reason)
      if (actionType === "cancel_delete") await actions.cancelDeleteSchedule(selected.id)
      if (actionType === "delete_now") await actions.deleteNow(selected.id, reason)
      closeDrawer(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-slate-50">사용자 관리</h1>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="닉네임/이메일/권한 검색"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none ring-[#FF5D8F]/40 focus:ring-2 md:w-72"
        />
      </div>

      <DataTable
        columns={USER_TABLE_COLUMNS}
        rows={filtered}
        loading={loadingUsers}
        emptyMessage="검색 결과가 없습니다."
        getRowKey={(user) => user.id}
        renderRow={(user) => {
          const approval = getUserApprovalState(user)
          const limit = getUserLimitState(user)

          return (
            <>
              <td className="px-4 py-3 text-sm text-slate-100">{user.nickname}</td>
              <td className="px-4 py-3 text-sm text-slate-300">{user.email}</td>
              <td className="px-4 py-3 text-sm text-slate-300">{user.role}</td>
              <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={approval.tone}>{approval.label}</Badge>
                  <span className="text-xs text-slate-400">{limit.label}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-slate-300">
                <RowActions
                  label={`${user.nickname} 사용자`}
                  actions={[
                    { key: "approve", label: "가입 승인", onClick: () => openAction(user, "approve"), disabled: user.status !== "pending" },
                    { key: "reject", label: "가입 반려", onClick: () => openAction(user, "reject"), disabled: user.status !== "pending", danger: true },
                    { key: "role-admin", label: "관리자 승격", onClick: () => openAction(user, "role_admin"), disabled: user.role === "admin" || user.role === "super_admin" },
                    { key: "role-user", label: "일반 권한", onClick: () => openAction(user, "role_user"), disabled: user.role !== "admin" },
                    { key: "limit", label: "계정 제한", onClick: () => openAction(user, "limit") },
                    { key: "unlimit", label: "제한 해제", onClick: () => openAction(user, "unlimit"), disabled: !limit.isLimited },
                    { key: "suspend", label: "계정 정지", onClick: () => openAction(user, "suspend"), danger: true },
                    { key: "unsuspend", label: "정지 해제", onClick: () => openAction(user, "unsuspend"), disabled: user.status !== "suspended" },
                    { key: "revoke", label: "세션 무효화", onClick: () => openAction(user, "revoke") },
                    { key: "schedule-delete", label: "삭제 예약", onClick: () => openAction(user, "schedule_delete"), danger: true },
                    { key: "cancel-delete", label: "삭제 예약 취소", onClick: () => openAction(user, "cancel_delete"), disabled: user.status !== "pending_delete" },
                    { key: "delete-now", label: "즉시 삭제", onClick: () => openAction(user, "delete_now"), danger: true },
                  ]}
                />
              </td>
            </>
          )
        }}
      />

      <EditDrawer
        open={Boolean(selected && actionType)}
        title={selected ? `${selected.nickname} 작업` : "사용자 작업"}
        description="행 액션을 드로어로 통일해 빠르게 처리합니다."
        submitting={submitting}
        onOpenChange={closeDrawer}
        onSubmit={() => void submitAction()}
      >
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-300">
          선택 작업: <span className="text-slate-100">{actionType || "-"}</span>
        </div>

        {actionType === "limit" ? (
          <label className="block text-sm text-slate-300">
            제한 시간(시간)
            <input
              type="number"
              min={1}
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </label>
        ) : null}

        {actionType === "schedule_delete" ? (
          <label className="block text-sm text-slate-300">
            삭제 예약 기간(일)
            <input
              type="number"
              min={1}
              value={days}
              onChange={(event) => setDays(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </label>
        ) : null}

        <label className="block text-sm text-slate-300">
          사유
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </label>
      </EditDrawer>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          className="border-slate-700 text-slate-200"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          상단으로
        </Button>
      </div>
    </section>
  )
}
