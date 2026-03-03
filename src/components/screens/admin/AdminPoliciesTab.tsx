import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import type { AdminOAuthHealth } from "@/lib/api"

interface AdminPoliciesTabProps {
  loading: {
    loadingPolicies: boolean
    loadingOAuthSettings: boolean
    savingOAuthSettings: boolean
    savingPolicies: boolean
  }
  oauth: {
    oauthHealth: AdminOAuthHealth | null
    oauthEnabled: boolean
    setOauthEnabled: (value: boolean) => void
    oauthGoogleRedirectUri: string
    setOauthGoogleRedirectUri: (value: string) => void
    oauthFrontendRedirectUri: string
    setOauthFrontendRedirectUri: (value: string) => void
    handleSaveOAuthSettings: () => void
  }
  policyMeta: {
    policyUpdatedBy: string | null
    policyUpdatedAt: string | null
    policyPreviewQuery: string
    setPolicyPreviewQuery: (value: string) => void
  }
  policyCategories: {
    filteredBaselineKeywordCategories: Record<string, string[]>
    collapsedPolicyCategories: Record<string, boolean>
    handleTogglePolicyCategory: (category: string) => void
    handleExpandAllPolicyCategories: () => void
    handleCollapseAllPolicyCategories: () => void
  }
  policyForms: {
    blockedKeywordsInput: string
    setBlockedKeywordsInput: (value: string) => void
    autoHideThreshold: number
    setAutoHideThreshold: (value: number) => void
    adminLogRetentionDays: number
    setAdminLogRetentionDays: (value: number) => void
    adminLogViewWindowDays: number
    setAdminLogViewWindowDays: (value: number) => void
    adminLogMaskReasons: boolean
    setAdminLogMaskReasons: (value: boolean) => void
    homeFilterTabsInput: string
    setHomeFilterTabsInput: (value: string) => void
    exploreFilterTabsInput: string
    setExploreFilterTabsInput: (value: string) => void
    handleSavePolicies: () => void
  }
  csvActions: {
    handleExportPoliciesCsv: () => void
    handleImportPoliciesCsvClick: () => void
    csvImportInputRef: React.RefObject<HTMLInputElement | null>
    handleImportPoliciesCsvFile: (event: React.ChangeEvent<HTMLInputElement>) => void
  }
}

export function AdminPoliciesTab({
  loading,
  oauth,
  policyMeta,
  policyCategories,
  policyForms,
  csvActions,
}: AdminPoliciesTabProps) {
  const { loadingPolicies, loadingOAuthSettings, savingOAuthSettings, savingPolicies } = loading
  const {
    oauthHealth,
    oauthEnabled,
    setOauthEnabled,
    oauthGoogleRedirectUri,
    setOauthGoogleRedirectUri,
    oauthFrontendRedirectUri,
    setOauthFrontendRedirectUri,
    handleSaveOAuthSettings,
  } = oauth
  const { policyUpdatedBy, policyUpdatedAt, policyPreviewQuery, setPolicyPreviewQuery } = policyMeta
  const {
    filteredBaselineKeywordCategories,
    collapsedPolicyCategories,
    handleTogglePolicyCategory,
    handleExpandAllPolicyCategories,
    handleCollapseAllPolicyCategories,
  } = policyCategories
  const {
    blockedKeywordsInput,
    setBlockedKeywordsInput,
    autoHideThreshold,
    setAutoHideThreshold,
    adminLogRetentionDays,
    setAdminLogRetentionDays,
    adminLogViewWindowDays,
    setAdminLogViewWindowDays,
    adminLogMaskReasons,
    setAdminLogMaskReasons,
    homeFilterTabsInput,
    setHomeFilterTabsInput,
    exploreFilterTabsInput,
    setExploreFilterTabsInput,
    handleSavePolicies,
  } = policyForms
  const {
    handleExportPoliciesCsv,
    handleImportPoliciesCsvClick,
    csvImportInputRef,
    handleImportPoliciesCsvFile,
  } = csvActions
  return (
    <TabsContent value="policies">
      <Card className="bg-[#161F42] border-0">
        <CardContent className="p-6 space-y-6">
          {loadingPolicies ? (
            <div className="text-[#B8C3E6]">정책 로딩 중...</div>
          ) : (
            <>
              <div className="rounded-lg border border-[#111936] bg-[#0B1020] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[#F4F7FF] font-semibold">Google OAuth 운영 설정</h3>
                    <p className="text-xs text-[#B8C3E6] mt-1">비밀키는 서버 환경변수로 관리하고, 이 화면에서는 런타임 토글/리다이렉트만 관리합니다.</p>
                  </div>
                  <Badge variant={oauthHealth?.is_ready ? "secondary" : "destructive"}>
                    {oauthHealth?.is_ready ? "준비됨" : "미완료"}
                  </Badge>
                </div>
                {loadingOAuthSettings ? (
                  <p className="text-xs text-[#B8C3E6]">OAuth 설정을 불러오는 중...</p>
                ) : (
                  <>
                    <label className="flex items-center gap-2 text-sm text-[#F4F7FF]">
                      <input
                        type="checkbox"
                        checked={oauthEnabled}
                        onChange={(event) => setOauthEnabled(event.target.checked)}
                      />
                      Google OAuth 활성화
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-[#B8C3E6] mb-1">Google Redirect URI</p>
                        <input
                          value={oauthGoogleRedirectUri}
                          onChange={(event) => setOauthGoogleRedirectUri(event.target.value)}
                          placeholder="https://api.your-domain.com/api/auth/google/callback"
                          className="w-full bg-[#161F42] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-[#B8C3E6] mb-1">Frontend Redirect URI</p>
                        <input
                          value={oauthFrontendRedirectUri}
                          onChange={(event) => setOauthFrontendRedirectUri(event.target.value)}
                          placeholder="https://app.your-domain.com"
                          className="w-full bg-[#161F42] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF]"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-[#B8C3E6] space-y-1">
                      <p>Client ID: {oauthHealth?.has_client_id ? "설정됨" : "누락"}</p>
                      <p>Client Secret: {oauthHealth?.has_client_secret ? "설정됨" : "누락"}</p>
                    </div>
                    <div>
                      <Button
                        onClick={handleSaveOAuthSettings}
                        disabled={savingOAuthSettings}
                        className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020]"
                      >
                        {savingOAuthSettings ? "저장 중..." : "OAuth 설정 저장"}
                      </Button>
                    </div>
                  </>
                )}
              </div>

              <div>
                <h3 className="text-[#F4F7FF] font-semibold mb-2">기본 금칙 카테고리 (자동 적용)</h3>
                <p className="text-xs text-[#B8C3E6] mb-3">아래 목록은 시스템 기본 규칙으로 항상 적용됩니다.</p>
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-xs text-[#B8C3E6]">
                    최근 수정자: <span className="text-[#F4F7FF]">{policyUpdatedBy || "시스템"}</span>
                    {policyUpdatedAt ? ` · ${new Date(policyUpdatedAt).toLocaleString("ko-KR")}` : ""}
                  </div>
                  <input
                    value={policyPreviewQuery}
                    onChange={(event) => setPolicyPreviewQuery(event.target.value)}
                    placeholder="카테고리/금칙어 미리보기 검색"
                    className="w-full md:w-72 bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#B8C3E6]/60 focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
                  />
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                    onClick={handleExpandAllPolicyCategories}
                  >
                    전체 펼치기
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                    onClick={handleCollapseAllPolicyCategories}
                  >
                    전체 접기
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                    onClick={handleExportPoliciesCsv}
                  >
                    CSV 내보내기
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                    onClick={handleImportPoliciesCsvClick}
                  >
                    CSV 가져오기
                  </Button>
                  <input
                    ref={csvImportInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleImportPoliciesCsvFile}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(filteredBaselineKeywordCategories).map(([category, keywords]) => (
                    <div key={category} className="rounded-lg border border-[#111936] bg-[#0B1020] p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#F4F7FF]">
                          {category} <span className="text-[#B8C3E6] text-xs">({keywords.length})</span>
                        </p>
                        <button
                          type="button"
                          className="text-xs text-[#B8C3E6] hover:text-[#F4F7FF]"
                          onClick={() => handleTogglePolicyCategory(category)}
                        >
                          {collapsedPolicyCategories[category] ? "펼치기" : "접기"}
                        </button>
                      </div>
                      {!collapsedPolicyCategories[category] ? (
                        <p className="text-xs text-[#B8C3E6] leading-relaxed">
                          {keywords.length > 0 ? keywords.join(", ") : "-"}
                        </p>
                      ) : (
                        <p className="text-xs text-[#B8C3E6]/70">접힘</p>
                      )}
                    </div>
                  ))}
                  {Object.keys(filteredBaselineKeywordCategories).length === 0 && (
                    <div className="rounded-lg border border-[#111936] bg-[#0B1020] p-3 text-xs text-[#B8C3E6]">
                      검색 결과가 없습니다.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-[#F4F7FF] font-semibold mb-2">추가 금칙어 목록 (관리자 커스텀)</h3>
                <p className="text-xs text-[#B8C3E6] mb-2">쉼표(,)로 구분해서 입력하세요. 입력 항목은 기본 카테고리와 합쳐서 적용됩니다.</p>
                <textarea
                  value={blockedKeywordsInput}
                  onChange={(event) => setBlockedKeywordsInput(event.target.value)}
                  rows={4}
                  className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#B8C3E6]/60 focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
                />
              </div>

              <div>
                <h3 className="text-[#F4F7FF] font-semibold mb-2">자동 임시 숨김 임계치</h3>
                <p className="text-xs text-[#B8C3E6] mb-2">동일 대상 신고 누적 건수 기준</p>
                <input
                  type="number"
                  min={1}
                  value={autoHideThreshold}
                  onChange={(event) => setAutoHideThreshold(Number(event.target.value) || 1)}
                  className="w-32 bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-[#F4F7FF] font-semibold mb-2">관리자 로그 보존 기간(일)</h3>
                  <p className="text-xs text-[#B8C3E6] mb-2">만료된 로그는 서버 시작 시 정리됩니다 (최소 30일)</p>
                  <input
                    type="number"
                    min={30}
                    value={adminLogRetentionDays}
                    onChange={(event) => setAdminLogRetentionDays(Number(event.target.value) || 30)}
                    className="w-32 bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
                  />
                </div>
                <div>
                  <h3 className="text-[#F4F7FF] font-semibold mb-2">관리자 로그 기본 조회 기간(일)</h3>
                  <p className="text-xs text-[#B8C3E6] mb-2">로그 탭 기본 목록 조회 범위 (최소 1일)</p>
                  <input
                    type="number"
                    min={1}
                    value={adminLogViewWindowDays}
                    onChange={(event) => setAdminLogViewWindowDays(Number(event.target.value) || 1)}
                    className="w-32 bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-[#F4F7FF]">
                <input
                  type="checkbox"
                  checked={adminLogMaskReasons}
                  onChange={(event) => setAdminLogMaskReasons(event.target.checked)}
                  className="rounded border-[#111936] bg-[#0B1020]"
                />
                로그 사유(reason) 민감정보 마스킹 사용
              </label>

              <div>
                <h3 className="text-[#F4F7FF] font-semibold mb-2">Home 탭 구성</h3>
                <p className="text-xs text-[#B8C3E6] mb-2">한 줄에 `id|label` 형식으로 입력 (예: web|Web)</p>
                <textarea
                  value={homeFilterTabsInput}
                  onChange={(event) => setHomeFilterTabsInput(event.target.value)}
                  rows={6}
                  className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#B8C3E6]/60 focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
                />
              </div>

              <div>
                <h3 className="text-[#F4F7FF] font-semibold mb-2">Explore 탭 구성</h3>
                <p className="text-xs text-[#B8C3E6] mb-2">한 줄에 `id|label` 형식으로 입력 (예: mobile|Mobile)</p>
                <textarea
                  value={exploreFilterTabsInput}
                  onChange={(event) => setExploreFilterTabsInput(event.target.value)}
                  rows={6}
                  className="w-full bg-[#0B1020] border border-[#111936] rounded-lg px-3 py-2 text-sm text-[#F4F7FF] placeholder:text-[#B8C3E6]/60 focus:outline-none focus:ring-2 focus:ring-[#FF5D8F]/40"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSavePolicies}
                  disabled={savingPolicies}
                  className="bg-[#FF5D8F] hover:bg-[#FF5D8F]/90 text-white"
                >
                  {savingPolicies ? "저장 중..." : "정책 저장"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  )
}
