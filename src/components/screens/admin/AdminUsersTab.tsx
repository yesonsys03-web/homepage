import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { FormModal } from "@/components/FormModal"
import { AdminTable } from "@/components/screens/admin/AdminTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
import type { AdminManagedUser } from "@/lib/api"

interface UserLimitState {
  isLimited: boolean
  label: string
}

interface UserApprovalState {
  label: string
  tone: "default" | "secondary" | "destructive" | "outline"
}

interface AdminUsersTabProps {
  loadingUsers: boolean
  users: AdminManagedUser[]
  authUserRole?: string
  getUserLimitState: (user: AdminManagedUser) => UserLimitState
  getUserApprovalState: (user: AdminManagedUser) => UserApprovalState
  handleApproveUser: (userId: string) => void
  handleRejectUser: (userId: string, reason: string) => Promise<void>
  handleLimitUser: (userId: string, hours: number, reason?: string) => Promise<void>
  handleUnlimitUser: (userId: string) => void
  handleSuspendUser: (userId: string, reason: string) => Promise<void>
  handleUnsuspendUser: (userId: string) => void
  handleRevokeUserTokens: (userId: string, reason?: string) => Promise<void>
  handleScheduleUserDelete: (userId: string, days: number, reason: string) => Promise<void>
  handleCancelUserDeleteSchedule: (userId: string) => void
  handleDeleteUserNow: (userId: string, reason: string) => Promise<void>
}

type UserActionModalType = "limit" | "suspend" | "revoke" | "schedule_delete" | "delete_now" | "reject"

const ACTION_BUTTON_BASE =
  "h-8 w-full justify-center px-2 text-xs whitespace-nowrap"

export function AdminUsersTab({
  loadingUsers,
  users,
  authUserRole,
  getUserLimitState,
  getUserApprovalState,
  handleApproveUser,
  handleRejectUser,
  handleLimitUser,
  handleUnlimitUser,
  handleSuspendUser,
  handleUnsuspendUser,
  handleRevokeUserTokens,
  handleScheduleUserDelete,
  handleCancelUserDeleteSchedule,
  handleDeleteUserNow,
}: AdminUsersTabProps) {
  const [activeModal, setActiveModal] = useState<{ userId: string; type: UserActionModalType } | null>(null)
  const [modalReason, setModalReason] = useState("")
  const [modalHours, setModalHours] = useState("24")
  const [modalDays, setModalDays] = useState("30")
  const [confirmDangerousAction, setConfirmDangerousAction] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [openActionMenuUserId, setOpenActionMenuUserId] = useState<string | null>(null)

  const openActionModal = (type: UserActionModalType, userId: string) => {
    setActiveModal({ type, userId })
    setModalReason(
      type === "limit"
        ? "운영 정책 위반"
        : type === "suspend"
          ? "보안 정책 위반"
          : type === "revoke"
            ? "보안 점검"
            : type === "schedule_delete"
              ? "보안 위협 계정 조사"
              : type === "delete_now"
                ? "중대한 보안 위협"
                : "가입 정보 확인 필요",
    )
    setModalHours("24")
    setModalDays("30")
    setConfirmDangerousAction(false)
  }

  const closeActionModal = () => {
    if (submitting) return
    setActiveModal(null)
  }

  const modalConfig = useMemo(() => {
    if (!activeModal) return null
    switch (activeModal.type) {
      case "limit":
        return {
          title: "사용자 24h 제한",
          description: "제한 시간(시간)과 사유를 입력하세요. 사유는 선택입니다.",
          submitLabel: "제한 적용",
        }
      case "suspend":
        return {
          title: "사용자 계정 정지",
          description: "위험 작업입니다. 정지 사유를 입력하고 확인하세요.",
          submitLabel: "계정 정지",
        }
      case "revoke":
        return {
          title: "사용자 세션 무효화",
          description: "로그인 세션을 강제로 만료합니다. 사유는 선택입니다.",
          submitLabel: "세션 무효화",
        }
      case "schedule_delete":
        return {
          title: "삭제 예약",
          description: "예약 기간(일)과 사유를 입력하세요.",
          submitLabel: "삭제 예약",
        }
      case "delete_now":
        return {
          title: "즉시 삭제",
          description: "되돌릴 수 없는 작업입니다. 사유 입력 후 명시적으로 확인해야 진행됩니다.",
          submitLabel: "즉시 삭제 실행",
        }
      case "reject":
        return {
          title: "가입 반려",
          description: "반려 사유를 입력하세요.",
          submitLabel: "반려 처리",
        }
    }
  }, [activeModal])

  const submitActionModal = async () => {
    if (!activeModal) return
    const reason = modalReason.trim()

    setSubmitting(true)
    try {
      switch (activeModal.type) {
        case "limit": {
          const hours = Number(modalHours)
          if (!Number.isFinite(hours) || hours <= 0) {
            window.alert("유효한 시간(1 이상)을 입력해주세요")
            return
          }
          await handleLimitUser(activeModal.userId, hours, reason || undefined)
          break
        }
        case "suspend": {
          if (!reason) {
            window.alert("정지 사유를 입력해주세요")
            return
          }
          if (!confirmDangerousAction) {
            window.alert("명시적 확인 체크가 필요합니다")
            return
          }
          await handleSuspendUser(activeModal.userId, reason)
          break
        }
        case "revoke": {
          await handleRevokeUserTokens(activeModal.userId, reason || undefined)
          break
        }
        case "schedule_delete": {
          const days = Number(modalDays)
          if (!Number.isFinite(days) || days < 1) {
            window.alert("유효한 기간(1일 이상)을 입력해주세요")
            return
          }
          if (!reason) {
            window.alert("삭제 예약 사유를 입력해주세요")
            return
          }
          await handleScheduleUserDelete(activeModal.userId, days, reason)
          break
        }
        case "delete_now": {
          if (!reason) {
            window.alert("즉시 삭제 사유를 입력해주세요")
            return
          }
          if (!confirmDangerousAction) {
            window.alert("명시적 확인 체크가 필요합니다")
            return
          }
          await handleDeleteUserNow(activeModal.userId, reason)
          break
        }
        case "reject": {
          if (!reason) {
            window.alert("반려 사유를 입력해주세요")
            return
          }
          await handleRejectUser(activeModal.userId, reason)
          break
        }
      }
      closeActionModal()
    } finally {
      setSubmitting(false)
    }
  }

  const columns = useMemo<Array<ColumnDef<AdminManagedUser>>>(
    () => [
      {
        accessorKey: "nickname",
        header: "닉네임",
        cell: ({ row }) => <span className="text-[#F4F7FF]">{row.original.nickname}</span>,
      },
      {
        accessorKey: "email",
        header: "이메일",
        cell: ({ row }) => <span className="text-[#B8C3E6]">{row.original.email || "-"}</span>,
      },
      {
        accessorKey: "role",
        header: "권한",
        cell: ({ row }) => <span className="text-[#B8C3E6]">{row.original.role}</span>,
      },
      {
        id: "status",
        header: "상태",
        cell: ({ row }) => {
          const limitState = getUserLimitState(row.original)
          const approvalState = getUserApprovalState(row.original)
          return (
            <div>
              <Badge variant={approvalState.tone}>{approvalState.label}</Badge>
              <p className="mt-2 text-xs text-[#B8C3E6]">제재: {limitState.label}</p>
            </div>
          )
        },
      },
      {
        id: "limited_until",
        accessorKey: "limited_until",
        header: "제한 종료",
        cell: ({ row }) => (
          <span className="text-[#B8C3E6]">
            {row.original.limited_until
              ? new Date(row.original.limited_until).toLocaleString("ko-KR")
              : "-"}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: "작업",
        cell: ({ row }) => {
          const user = row.original
          const limitState = getUserLimitState(user)
          const canHardDelete = authUserRole === "super_admin"
          const isActionMenuOpen = openActionMenuUserId === user.id

          const actions = [
            {
              id: "approve",
              label: "승인",
              className: `${ACTION_BUTTON_BASE} bg-[#23D5AB] text-[#0B1020] hover:bg-[#23D5AB]/90`,
              disabled: user.role === "admin" || user.status !== "pending",
              onClick: () => handleApproveUser(user.id),
            },
            {
              id: "reject",
              label: "반려",
              className: `${ACTION_BUTTON_BASE} border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10`,
              variant: "outline" as const,
              disabled: user.role === "admin" || user.status !== "pending",
              onClick: () => openActionModal("reject", user.id),
            },
            {
              id: "limit",
              label: "24h 제한",
              className: `${ACTION_BUTTON_BASE} bg-[#FF6B6B] text-white hover:bg-[#FF6B6B]/90`,
              disabled: user.role === "admin" || limitState.isLimited || user.status !== "active",
              onClick: () => openActionModal("limit", user.id),
            },
            {
              id: "unlimit",
              label: "제한 해제",
              className: `${ACTION_BUTTON_BASE} border-[#111936] text-[#B8C3E6] hover:bg-[#111936]`,
              variant: "outline" as const,
              disabled: user.role === "admin" || !limitState.isLimited,
              onClick: () => handleUnlimitUser(user.id),
            },
            {
              id: "suspend",
              label: "계정 정지",
              className: `${ACTION_BUTTON_BASE} bg-[#FFB547] text-[#0B1020] hover:bg-[#FFB547]/90`,
              disabled: user.role === "admin" || user.status === "suspended" || user.status === "deleted",
              onClick: () => openActionModal("suspend", user.id),
            },
            {
              id: "unsuspend",
              label: "정지 해제",
              className: `${ACTION_BUTTON_BASE} border-[#FFB547] text-[#FFB547] hover:bg-[#FFB547]/10`,
              variant: "outline" as const,
              disabled: user.role === "admin" || user.status !== "suspended",
              onClick: () => handleUnsuspendUser(user.id),
            },
            {
              id: "revoke",
              label: "세션 무효화",
              className: `${ACTION_BUTTON_BASE} border-[#23D5AB] text-[#23D5AB] hover:bg-[#23D5AB]/10`,
              variant: "outline" as const,
              disabled: user.role === "admin" || user.status === "deleted",
              onClick: () => openActionModal("revoke", user.id),
            },
            {
              id: "schedule_delete",
              label: "삭제 예약",
              className: `${ACTION_BUTTON_BASE} bg-[#6B8BFF] text-white hover:bg-[#6B8BFF]/90`,
              disabled: user.role === "admin" || user.status === "pending_delete" || user.status === "deleted",
              onClick: () => openActionModal("schedule_delete", user.id),
            },
            {
              id: "cancel_delete_schedule",
              label: "예약 취소",
              className: `${ACTION_BUTTON_BASE} border-[#6B8BFF] text-[#6B8BFF] hover:bg-[#6B8BFF]/10`,
              variant: "outline" as const,
              disabled: user.status !== "pending_delete",
              onClick: () => handleCancelUserDeleteSchedule(user.id),
            },
            {
              id: "delete_now",
              label: "즉시 삭제",
              className: `${ACTION_BUTTON_BASE} border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10`,
              variant: "outline" as const,
              disabled: !canHardDelete || user.role === "admin" || user.status === "deleted",
              onClick: () => openActionModal("delete_now", user.id),
            },
          ]

          const primaryActionIds =
            user.status === "pending"
              ? ["approve", "reject"]
              : user.status === "suspended"
                ? ["unsuspend"]
                : user.status === "pending_delete"
                  ? ["cancel_delete_schedule"]
                  : user.status === "deleted"
                    ? []
                    : limitState.isLimited
                      ? ["unlimit", "suspend"]
                      : ["limit", "suspend"]

          const primaryActions = actions.filter((action) => primaryActionIds.includes(action.id))
          const secondaryActions = actions.filter((action) => !primaryActionIds.includes(action.id))

          return (
            <div className="relative w-[260px]">
              <div className="grid grid-cols-2 gap-1">
                {primaryActions.map((action) => (
                  <Button
                    key={action.id}
                    size="sm"
                    variant={action.variant}
                    className={action.className}
                    disabled={action.disabled}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ))}
                {primaryActions.length % 2 === 1 ? <div className="h-8" /> : null}
                {primaryActions.length === 0 ? <div className="col-span-2 h-8 rounded border border-[#111936] bg-[#111936]/30" /> : null}
                <div className="col-span-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 border-[#111936] px-0 text-base leading-none text-[#B8C3E6] hover:bg-[#111936]"
                    onClick={() =>
                      setOpenActionMenuUserId((prev) => (prev === user.id ? null : user.id))
                    }
                    disabled={secondaryActions.length === 0}
                    aria-label={isActionMenuOpen ? "추가 작업 메뉴 닫기" : "추가 작업 메뉴 열기"}
                    title={secondaryActions.length === 0 ? "추가 작업 없음" : "추가 작업"}
                    >
                    ⋮
                  </Button>
                </div>
              </div>

              {isActionMenuOpen && secondaryActions.length > 0 ? (
                <div className="absolute right-0 top-full z-20 mt-1 w-full rounded-lg border border-[#111936] bg-[#0B1020] p-2 shadow-xl">
                  <div className="grid grid-cols-2 gap-1">
                    {secondaryActions.map((action) => (
                      <Button
                        key={action.id}
                        size="sm"
                        variant={action.variant}
                        className={action.className}
                        disabled={action.disabled}
                        onClick={() => {
                          action.onClick()
                          setOpenActionMenuUserId(null)
                        }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )
        },
      },
    ],
    [
      authUserRole,
      getUserLimitState,
      getUserApprovalState,
      handleApproveUser,
      handleUnlimitUser,
      handleUnsuspendUser,
      handleCancelUserDeleteSchedule,
      openActionMenuUserId,
    ],
  )

  return (
    <TabsContent value="users">
      <AdminTable
        data={users}
        columns={columns}
        loading={loadingUsers}
        loadingMessage="사용자 로딩 중..."
        emptyMessage="표시할 사용자가 없습니다."
        initialPageSize={20}
      />
      <FormModal
        open={activeModal !== null}
        title={modalConfig?.title ?? "관리 작업"}
        description={modalConfig?.description}
        submitLabel={modalConfig?.submitLabel ?? "적용"}
        submitting={submitting}
        onClose={closeActionModal}
        onSubmit={() => void submitActionModal()}
      >
        {activeModal?.type === "limit" ? (
          <input
            type="number"
            min={1}
            value={modalHours}
            onChange={(event) => setModalHours(event.target.value)}
            placeholder="제한 시간 (시간)"
            className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
          />
        ) : null}

        {activeModal?.type === "schedule_delete" ? (
          <input
            type="number"
            min={1}
            value={modalDays}
            onChange={(event) => setModalDays(event.target.value)}
            placeholder="삭제 예약 기간 (일)"
            className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
          />
        ) : null}

        <textarea
          value={modalReason}
          onChange={(event) => setModalReason(event.target.value)}
          rows={4}
          placeholder="작업 사유"
          className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
        />

        {activeModal?.type === "delete_now" || activeModal?.type === "suspend" ? (
          <label className="inline-flex items-center gap-2 text-xs text-[#F4F7FF]">
            <input
              type="checkbox"
              checked={confirmDangerousAction}
              onChange={(event) => setConfirmDangerousAction(event.target.checked)}
            />
            {activeModal?.type === "delete_now"
              ? "되돌릴 수 없는 작업임을 확인하고 즉시 삭제를 진행합니다."
              : "위험 작업임을 확인하고 계정 정지를 진행합니다."}
          </label>
        ) : null}
      </FormModal>
    </TabsContent>
  )
}
