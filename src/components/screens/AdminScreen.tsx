import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AdminScreen() {
  const stats = [
    { label: "총 신고", value: "24", color: "text-[#F4F7FF]" },
    { label: "미처리", value: "5", color: "text-[#FF6B6B]" },
    { label: "검토중", value: "3", color: "text-[#FFB547]" },
    { label: "오늘 처리", value: "8", color: "text-[#23D5AB]" },
  ]

  const reports = [
    { 
      id: "1", 
      targetType: "댓글", 
      targetContent: "이 댓글은不当합니다", 
      reason: "부정적 내용",
      status: "open", 
      reporter: "user_kim", 
      targetUser: "spam_user",
      createdAt: "10분 전" 
    },
    { 
      id: "2", 
      targetType: "작품", 
      targetContent: "스팸 작품 제목", 
      reason: "스팸",
      status: "reviewing", 
      reporter: "user_lee", 
      targetUser: "spammer123",
      createdAt: "2시간 전" 
    },
    { 
      id: "3", 
      targetType: "댓글", 
      targetContent: "광고 링크", 
      reason: "광고",
      status: "open", 
      reporter: "user_park", 
      targetUser: "ad_bot",
      createdAt: "3시간 전" 
    },
    { 
      id: "4", 
      targetType: "댓글", 
      targetContent: "不当なコメント", 
      reason: "부정적 내용",
      status: "resolved", 
      reporter: "user_choi", 
      targetUser: "angry_user",
      createdAt: "1일 전" 
    },
    { 
      id: "5", 
      targetType: "작품", 
      targetContent: "可疑한 프로젝트", 
      reason: "기타",
      status: "rejected", 
      reporter: "user_kang", 
      targetUser: "newbie",
      createdAt: "2일 전" 
    },
  ]

  const recentActions = [
    { action: "댓글 숨김", target: "user_abc", admin: "admin_kim", time: "5분 전" },
    { action: "사용자 제한", target: "spam_bot", admin: "admin_kim", time: "1시간 전" },
    { action: "댓글 복구", target: "user_xyz", admin: "admin_kim", time: "2시간 전" },
  ]

  return (
    <div className="min-h-screen bg-[#0B1020]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-[#0B1020]/95 backdrop-blur-sm border-b border-[#111936]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">VibeCoder <span className="text-[#FF5D8F]">Admin</span></h1>
          <nav className="flex gap-6">
            <a href="#" className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">대시보드</a>
            <a href="#" className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">신고 관리</a>
            <a href="#" className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">사용자 관리</a>
            <a href="#" className="text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors">설정</a>
          </nav>
          <Button className="bg-[#FF5D8F] hover:bg-[#FF5D8F]/90 text-white font-semibold">
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
                            >
                              숨기기
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936] text-xs"
                            >
                              제한
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
