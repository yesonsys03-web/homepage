import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/use-auth"
type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'challenges' | 'about'

interface ScreenProps {
  onNavigate?: (screen: Screen) => void
}


export function AdminScreen({ onNavigate }: ScreenProps) {
  const { user, logout } = useAuth()
  const [reports, setReports] = useState<Array<{
    id: string
    targetType: string
    targetContent: string
    reason: string
    status: string
    reporter: string
    targetUser: string
    createdAt: string
  }>>([])
  const [loading, setLoading] = useState(true)

  const loadReports = async () => {
    setLoading(true)
    try {
      const data = await api.getReports()
      const items = Array.isArray(data.items) ? data.items : []
      const mapped = items.map((item: {
        id: string
        target_type: string
        target_id: string
        reason: string
        status: string
        reporter_id?: string
        created_at: string
      }) => ({
        id: item.id,
        targetType: item.target_type,
        targetContent: item.target_id,
        reason: item.reason,
        status: item.status,
        reporter: item.reporter_id || "unknown",
        targetUser: item.target_id,
        createdAt: new Date(item.created_at).toLocaleString("ko-KR"),
      }))
      setReports(mapped)
    } catch (error) {
      console.error("Failed to fetch reports:", error)
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const stats = useMemo(() => {
    const open = reports.filter((r) => r.status === "open").length
    const reviewing = reports.filter((r) => r.status === "reviewing").length
    const resolvedToday = reports.filter((r) => r.status === "resolved").length
    return [
      { label: "총 신고", value: String(reports.length), color: "text-[#F4F7FF]" },
      { label: "미처리", value: String(open), color: "text-[#FF6B6B]" },
      { label: "검토중", value: String(reviewing), color: "text-[#FFB547]" },
      { label: "처리완료", value: String(resolvedToday), color: "text-[#23D5AB]" },
    ]
  }, [reports])

  const recentActions = useMemo(() => {
    return reports
      .filter((report) => report.status === "resolved" || report.status === "rejected")
      .slice(0, 5)
      .map((report) => ({
        action: report.status === "resolved" ? "신고 처리" : "신고 거절",
        target: report.targetUser,
        admin: user?.nickname || "admin",
        time: report.createdAt,
      }))
  }, [reports, user?.nickname])

  const handleUpdateReport = async (reportId: string, status: string) => {
    try {
      await api.updateReport(reportId, status)
      await loadReports()
    } catch (error) {
      console.error("Failed to update report:", error)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1020]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-[#0B1020]/95 backdrop-blur-sm border-b border-[#111936]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">VibeCoder <span className="text-[#FF5D8F]">Admin</span></h1>
          <nav className="flex gap-6">
            <button onClick={() => onNavigate?.('home')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Home</button>
            <button onClick={() => onNavigate?.('explore')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Explore</button>
            <button onClick={() => onNavigate?.('challenges')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">Challenges</button>
            <button onClick={() => onNavigate?.('about')} className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">About</button>
          </nav>
          <Button onClick={logout} className="bg-[#FF5D8F] hover:bg-[#FF5D8F]/90 text-white font-semibold">
            로그아웃
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <Card key={i} className="bg-[#161F42] border-0">
              <CardContent className="p-4 text-center">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-[#B8C3E6]">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="reports">
          <TabsList className="bg-[#161F42] border-0 mb-6">
            <TabsTrigger value="reports" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">
              📋 신고 큐
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">
              👤 사용자
            </TabsTrigger>
            <TabsTrigger value="actions" className="data-[state=active]:bg-[#FF5D8F] data-[state=active]:text-white">
              📝 작업 로그
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 text-[#B8C3E6]">로딩 중...</div>
                ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#111936]">
                      <th className="text-left p-4 text-[#B8C3E6] font-medium">상태</th>
                      <th className="text-left p-4 text-[#B8C3E6] font-medium">유형</th>
                      <th className="text-left p-4 text-[#B8C3E6] font-medium">내용</th>
                      <th className="text-left p-4 text-[#B8C3E6] font-medium">사유</th>
                      <th className="text-left p-4 text-[#B8C3E6] font-medium">대상</th>
                      <th className="text-left p-4 text-[#B8C3E6] font-medium">신고자</th>
                      <th className="text-left p-4 text-[#B8C3E6] font-medium">시간</th>
                      <th className="text-left p-4 text-[#B8C3E6] font-medium">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => (
                      <tr key={report.id} className="border-b border-[#111936]/50 hover:bg-[#111936]/30">
                        <td className="p-4">
                          <Badge variant={
                            report.status === "open" ? "destructive" : 
                            report.status === "reviewing" ? "secondary" :
                            report.status === "resolved" ? "default" : "outline"
                          }>
                            {report.status === "open" ? "미처리" : 
                             report.status === "reviewing" ? "검토중" :
                             report.status === "resolved" ? "처리완료" : "거절"}
                          </Badge>
                        </td>
                        <td className="p-4 text-[#F4F7FF]">{report.targetType}</td>
                        <td className="p-4 text-[#F4F7FF] max-w-xs truncate">{report.targetContent}</td>
                        <td className="p-4 text-[#B8C3E6]">{report.reason}</td>
                        <td className="p-4 text-[#FF5D8F]">{report.targetUser}</td>
                        <td className="p-4 text-[#B8C3E6]">{report.reporter}</td>
                        <td className="p-4 text-[#B8C3E6]">{report.createdAt}</td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white text-xs"
                              disabled={report.status === "resolved"}
                              onClick={() => handleUpdateReport(report.id, "resolved")}
                            >
                              숨기기
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
                              onClick={() => handleUpdateReport(report.id, "reviewing")}
                            >
                              제한
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
                              onClick={() => handleUpdateReport(report.id, "rejected")}
                            >
                              거절
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

          <TabsContent value="users">
            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-6">
                <p className="text-[#B8C3E6]">사용자 관리 화면입니다.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions">
            <Card className="bg-[#161F42] border-0">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#111936]">
                      <th className="text-left p-4 text-[#B8C3E6] font-medium">작업</th>
                      <th className="text-left p-4 text-[#B8C3E6] font-medium">대상</th>
                      <th className="text-left p-4 text-[#B8C3E6] font-medium">관리자</th>
                      <th className="text-left p-4 text-[#B8C3E6] font-medium">시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActions.map((action, i) => (
                      <tr key={i} className="border-b border-[#111936]/50">
                        <td className="p-4 text-[#F4F7FF]">{action.action}</td>
                        <td className="p-4 text-[#FF5D8F]">{action.target}</td>
                        <td className="p-4 text-[#B8C3E6]">{action.admin}</td>
                        <td className="p-4 text-[#B8C3E6]">{action.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
