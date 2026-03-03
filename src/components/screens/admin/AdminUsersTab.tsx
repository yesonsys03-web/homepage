import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  handleRejectUser: (userId: string) => void
  handleLimitUser: (userId: string) => void
  handleUnlimitUser: (userId: string) => void
  handleSuspendUser: (userId: string) => void
  handleUnsuspendUser: (userId: string) => void
  handleRevokeUserTokens: (userId: string) => void
  handleScheduleUserDelete: (userId: string) => void
  handleCancelUserDeleteSchedule: (userId: string) => void
  handleDeleteUserNow: (userId: string) => void
}

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
  return (
    <TabsContent value="users">
      <Card className="bg-[#161F42] border-0">
        <CardContent className="p-0">
          {loadingUsers ? (
            <div className="p-6 text-[#B8C3E6]">사용자 로딩 중...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#111936]">
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">닉네임</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">이메일</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">권한</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">상태</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">제한 종료</th>
                  <th className="text-left p-4 text-[#B8C3E6] font-medium">작업</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const limitState = getUserLimitState(user)
                  const approvalState = getUserApprovalState(user)
                  const canHardDelete = authUserRole === "super_admin"
                  return (
                    <tr key={user.id} className="border-b border-[#111936]/50 hover:bg-[#111936]/30">
                      <td className="p-4 text-[#F4F7FF]">{user.nickname}</td>
                      <td className="p-4 text-[#B8C3E6]">{user.email || "-"}</td>
                      <td className="p-4 text-[#B8C3E6]">{user.role}</td>
                      <td className="p-4">
                        <Badge variant={approvalState.tone}>{approvalState.label}</Badge>
                        <p className="text-xs text-[#B8C3E6] mt-2">제재: {limitState.label}</p>
                      </td>
                      <td className="p-4 text-[#B8C3E6]">
                        {user.limited_until ? new Date(user.limited_until).toLocaleString("ko-KR") : "-"}
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex flex-wrap gap-1 max-w-[640px]">
                          <Button
                            size="sm"
                            className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] text-xs whitespace-nowrap"
                            disabled={user.role === "admin" || user.status !== "pending"}
                            onClick={() => handleApproveUser(user.id)}
                          >
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10 text-xs whitespace-nowrap"
                            disabled={user.role === "admin" || user.status !== "pending"}
                            onClick={() => handleRejectUser(user.id)}
                          >
                            반려
                          </Button>
                          <Button
                            size="sm"
                            className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white text-xs whitespace-nowrap"
                            disabled={user.role === "admin" || limitState.isLimited || user.status !== "active"}
                            onClick={() => handleLimitUser(user.id)}
                          >
                            24h 제한
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs whitespace-nowrap"
                            disabled={user.role === "admin" || !limitState.isLimited}
                            onClick={() => handleUnlimitUser(user.id)}
                          >
                            제한 해제
                          </Button>
                          <Button
                            size="sm"
                            className="bg-[#FFB547] hover:bg-[#FFB547]/90 text-[#0B1020] text-xs whitespace-nowrap"
                            disabled={user.role === "admin" || user.status === "suspended" || user.status === "deleted"}
                            onClick={() => handleSuspendUser(user.id)}
                          >
                            계정 정지
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#FFB547] text-[#FFB547] hover:bg-[#FFB547]/10 text-xs whitespace-nowrap"
                            disabled={user.role === "admin" || user.status !== "suspended"}
                            onClick={() => handleUnsuspendUser(user.id)}
                          >
                            정지 해제
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#23D5AB] text-[#23D5AB] hover:bg-[#23D5AB]/10 text-xs whitespace-nowrap"
                            disabled={user.role === "admin" || user.status === "deleted"}
                            onClick={() => handleRevokeUserTokens(user.id)}
                          >
                            세션 무효화
                          </Button>
                          <Button
                            size="sm"
                            className="bg-[#6B8BFF] hover:bg-[#6B8BFF]/90 text-white text-xs whitespace-nowrap"
                            disabled={user.role === "admin" || user.status === "pending_delete" || user.status === "deleted"}
                            onClick={() => handleScheduleUserDelete(user.id)}
                          >
                            삭제 예약
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#6B8BFF] text-[#6B8BFF] hover:bg-[#6B8BFF]/10 text-xs whitespace-nowrap"
                            disabled={user.status !== "pending_delete"}
                            onClick={() => handleCancelUserDeleteSchedule(user.id)}
                          >
                            예약 취소
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10 text-xs whitespace-nowrap"
                            disabled={!canHardDelete || user.role === "admin" || user.status === "deleted"}
                            onClick={() => handleDeleteUserNow(user.id)}
                          >
                            즉시 삭제
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  )
}
