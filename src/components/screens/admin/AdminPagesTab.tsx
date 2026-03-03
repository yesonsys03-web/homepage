import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"

interface AdminPagesTabProps {
  loading: {
    loadingAboutContent: boolean
    savingAboutContent: boolean
  }
  fields: {
    aboutHeroTitle: string
    setAboutHeroTitle: (value: string) => void
    aboutHeroHighlight: string
    setAboutHeroHighlight: (value: string) => void
    aboutHeroDescription: string
    setAboutHeroDescription: (value: string) => void
    aboutContactEmail: string
    setAboutContactEmail: (value: string) => void
    aboutValuesInput: string
    setAboutValuesInput: (value: string) => void
    aboutTeamInput: string
    setAboutTeamInput: (value: string) => void
    aboutFaqInput: string
    setAboutFaqInput: (value: string) => void
    aboutReason: string
    setAboutReason: (value: string) => void
  }
  actions: {
    handleSaveAboutContent: () => void
  }
}

export function AdminPagesTab({
  loading,
  fields,
  actions,
}: AdminPagesTabProps) {
  return (
    <TabsContent value="pages">
      <Card className="bg-[#161F42] border-0">
        <CardContent className="p-6 space-y-4">
          {loading.loadingAboutContent ? (
            <div className="text-[#B8C3E6]">About 콘텐츠 로딩 중...</div>
          ) : (
            <>
              <div>
                <h3 className="text-[#F4F7FF] font-semibold mb-2">About Hero</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={fields.aboutHeroTitle}
                    onChange={(event) => fields.setAboutHeroTitle(event.target.value)}
                    placeholder="Hero title"
                    className="bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                  />
                  <input
                    value={fields.aboutHeroHighlight}
                    onChange={(event) => fields.setAboutHeroHighlight(event.target.value)}
                    placeholder="Hero highlight"
                    className="bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                  />
                </div>
                <textarea
                  value={fields.aboutHeroDescription}
                  onChange={(event) => fields.setAboutHeroDescription(event.target.value)}
                  rows={3}
                  placeholder="Hero description"
                  className="mt-3 w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                />
                <input
                  value={fields.aboutContactEmail}
                  onChange={(event) => fields.setAboutContactEmail(event.target.value)}
                  placeholder="Contact email"
                  className="mt-3 w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                />
              </div>

              <div>
                <h3 className="text-[#F4F7FF] font-semibold mb-2">Values (emoji|title|description)</h3>
                <textarea
                  value={fields.aboutValuesInput}
                  onChange={(event) => fields.setAboutValuesInput(event.target.value)}
                  rows={4}
                  className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                />
              </div>

              <div>
                <h3 className="text-[#F4F7FF] font-semibold mb-2">Team (name|role|description)</h3>
                <textarea
                  value={fields.aboutTeamInput}
                  onChange={(event) => fields.setAboutTeamInput(event.target.value)}
                  rows={4}
                  className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                />
              </div>

              <div>
                <h3 className="text-[#F4F7FF] font-semibold mb-2">FAQ (question|answer)</h3>
                <textarea
                  value={fields.aboutFaqInput}
                  onChange={(event) => fields.setAboutFaqInput(event.target.value)}
                  rows={5}
                  className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                />
              </div>

              <div>
                <input
                  value={fields.aboutReason}
                  onChange={(event) => fields.setAboutReason(event.target.value)}
                  placeholder="수정 사유 (필수)"
                  className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                />
              </div>

              <div>
                <Button
                  onClick={actions.handleSaveAboutContent}
                  disabled={loading.savingAboutContent}
                  className="bg-[#FF5D8F] hover:bg-[#FF5D8F]/90 text-white"
                >
                  {loading.savingAboutContent ? "저장 중..." : "About 페이지 저장"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  )
}
