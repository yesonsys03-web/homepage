import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { extractCuratedThresholdHistoryEntry } from "./policyHistory"

export function AdminPolicies() {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingOauth, setSavingOauth] = useState(false)

  const [blockedKeywordsInput, setBlockedKeywordsInput] = useState("")
  const [autoHideThreshold, setAutoHideThreshold] = useState(3)
  const [adminLogRetentionDays, setAdminLogRetentionDays] = useState(365)
  const [adminLogViewWindowDays, setAdminLogViewWindowDays] = useState(30)
  const [adminLogMaskReasons, setAdminLogMaskReasons] = useState(true)
  const [pageEditorEnabled, setPageEditorEnabled] = useState(true)
  const [pageEditorRolloutStage, setPageEditorRolloutStage] = useState<"qa" | "pilot" | "open">("qa")
  const [pageEditorPilotAdminIdsInput, setPageEditorPilotAdminIdsInput] = useState("")
  const [pageEditorPublishFailRateThreshold, setPageEditorPublishFailRateThreshold] = useState(0.2)
  const [pageEditorRollbackRatioThreshold, setPageEditorRollbackRatioThreshold] = useState(0.3)
  const [pageEditorConflictRateThreshold, setPageEditorConflictRateThreshold] = useState(0.25)
  const [curatedReviewQualityThreshold, setCuratedReviewQualityThreshold] = useState(45)
  const [curatedRelatedClickBoostMinRelevance, setCuratedRelatedClickBoostMinRelevance] = useState(6)
  const [curatedRelatedClickBoostMultiplier, setCuratedRelatedClickBoostMultiplier] = useState(48)
  const [curatedRelatedClickBoostCap, setCuratedRelatedClickBoostCap] = useState(180)
  const [oauthEnabled, setOauthEnabled] = useState(false)
  const [oauthGoogleRedirectUri, setOauthGoogleRedirectUri] = useState("")
  const [oauthFrontendRedirectUri, setOauthFrontendRedirectUri] = useState("")
  const [oauthHealthText, setOauthHealthText] = useState("확인 중")
  const policyHistoryQuery = useQuery({
    queryKey: ["admin-actions", "policy-threshold-history", "policies"],
    queryFn: async () => api.getAdminActionLogs(8, { actionType: "policy_updated" }, { force: true }),
  })

  const applyPolicy = (policy: Awaited<ReturnType<typeof api.getAdminPolicies>>) => {
    setBlockedKeywordsInput((policy.custom_blocked_keywords || []).join(", "))
    setAutoHideThreshold(policy.auto_hide_report_threshold || 3)
    setAdminLogRetentionDays(policy.admin_log_retention_days || 365)
    setAdminLogViewWindowDays(policy.admin_log_view_window_days || 30)
    setAdminLogMaskReasons(policy.admin_log_mask_reasons ?? true)
    setPageEditorEnabled(policy.page_editor_enabled ?? true)
    setPageEditorRolloutStage(policy.page_editor_rollout_stage ?? "qa")
    setPageEditorPilotAdminIdsInput((policy.page_editor_pilot_admin_ids ?? []).join(", "))
    setPageEditorPublishFailRateThreshold(policy.page_editor_publish_fail_rate_threshold ?? 0.2)
    setPageEditorRollbackRatioThreshold(policy.page_editor_rollback_ratio_threshold ?? 0.3)
    setPageEditorConflictRateThreshold(policy.page_editor_conflict_rate_threshold ?? 0.25)
    setCuratedReviewQualityThreshold(policy.curated_review_quality_threshold ?? 45)
    setCuratedRelatedClickBoostMinRelevance(policy.curated_related_click_boost_min_relevance ?? 6)
    setCuratedRelatedClickBoostMultiplier(policy.curated_related_click_boost_multiplier ?? 48)
    setCuratedRelatedClickBoostCap(policy.curated_related_click_boost_cap ?? 180)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [policy, oauthSettings, oauthHealth] = await Promise.all([
          api.getAdminPolicies(),
          api.getAdminOAuthSettings(),
          api.getAdminOAuthHealth(),
        ])

        applyPolicy(policy)

        setOauthEnabled(oauthSettings.google_oauth_enabled)
        setOauthGoogleRedirectUri(oauthSettings.google_redirect_uri || "")
        setOauthFrontendRedirectUri(oauthSettings.google_frontend_redirect_uri || "")
        setOauthHealthText(oauthHealth.is_ready ? "준비됨" : "미완료")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const savePolicies = async () => {
    const keywords = blockedKeywordsInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    const pilotAdminIds = pageEditorPilotAdminIdsInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)

    setSaving(true)
    try {
      const savedPolicy = await api.updateAdminPolicies(
        keywords,
        autoHideThreshold,
        undefined,
        undefined,
        adminLogRetentionDays,
        adminLogViewWindowDays,
        adminLogMaskReasons,
        pageEditorEnabled,
        pageEditorRolloutStage,
        pilotAdminIds,
        pageEditorPublishFailRateThreshold,
        pageEditorRollbackRatioThreshold,
        pageEditorConflictRateThreshold,
        curatedReviewQualityThreshold,
        curatedRelatedClickBoostMinRelevance,
        curatedRelatedClickBoostMultiplier,
        curatedRelatedClickBoostCap,
      )
      applyPolicy(savedPolicy)
      void api.getAdminActionLogs(8, { actionType: "policy_updated" }, { force: true })
        .then((data) => {
          queryClient.setQueryData(["admin-actions", "policy-threshold-history", "policies"], data)
        })
        .catch((error: unknown) => {
          console.warn("admin policy history refresh failed", error)
        })
    } finally {
      setSaving(false)
    }
  }

  const saveOauth = async () => {
    setSavingOauth(true)
    try {
      await api.updateAdminOAuthSettings({
        google_oauth_enabled: oauthEnabled,
        google_redirect_uri: oauthGoogleRedirectUri.trim(),
        google_frontend_redirect_uri: oauthFrontendRedirectUri.trim(),
      })
      const health = await api.getAdminOAuthHealth()
      setOauthHealthText(health.is_ready ? "준비됨" : "미완료")
    } finally {
      setSavingOauth(false)
    }
  }

  const thresholdHistory = (policyHistoryQuery.data?.items ?? [])
    .map((log) => {
      return extractCuratedThresholdHistoryEntry(log)
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-50">정책 설정</h1>
      {loading ? <div className="h-24 animate-pulse rounded-xl bg-slate-800" /> : null}

      <article className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-5">
        <h2 className="text-lg font-medium text-slate-100">콘텐츠 정책</h2>
        <textarea
          value={blockedKeywordsInput}
          onChange={(event) => setBlockedKeywordsInput(event.target.value)}
          rows={5}
          placeholder="금칙어를 쉼표(,)로 구분해 입력"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        />
        <label className="block text-sm text-slate-300">
          자동 숨김 임계치
          <input
            type="number"
            min={1}
            value={autoHideThreshold}
            onChange={(event) => setAutoHideThreshold(Number(event.target.value) || 1)}
            className="mt-1 w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </label>
        <Button onClick={() => void savePolicies()} disabled={saving} className="bg-[#FF5D8F] text-white hover:bg-[#ff4a83]">
          {saving ? "저장 중..." : "정책 저장"}
        </Button>
      </article>

      <article className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-5">
        <h2 className="text-lg font-medium text-slate-100">로그 정책</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block text-sm text-slate-300">
            관리자 로그 보존 기간(일)
            <input
              type="number"
              min={30}
              value={adminLogRetentionDays}
              onChange={(event) => setAdminLogRetentionDays(Number(event.target.value) || 30)}
              className="mt-1 w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block text-sm text-slate-300">
            관리자 로그 기본 조회 기간(일)
            <input
              type="number"
              min={1}
              value={adminLogViewWindowDays}
              onChange={(event) => setAdminLogViewWindowDays(Number(event.target.value) || 1)}
              className="mt-1 w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={adminLogMaskReasons}
            onChange={(event) => setAdminLogMaskReasons(event.target.checked)}
          />
          로그 사유(reason) 마스킹 사용
        </label>
      </article>

      <article className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-5">
        <h2 className="text-lg font-medium text-slate-100">페이지 편집 롤아웃(E-1)</h2>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={pageEditorEnabled}
            onChange={(event) => setPageEditorEnabled(event.target.checked)}
          />
          페이지 편집 기능 활성화
        </label>
        <label className="block text-sm text-slate-300">
          롤아웃 단계
          <select
            aria-label="롤아웃 단계"
            value={pageEditorRolloutStage}
            onChange={(event) => setPageEditorRolloutStage(event.target.value as "qa" | "pilot" | "open")}
            className="mt-1 w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          >
            <option value="qa">내부 QA</option>
            <option value="pilot">파일럿</option>
            <option value="open">전체 오픈</option>
          </select>
        </label>
        <label className="block text-sm text-slate-300">
          파일럿 관리자 ID 목록(쉼표 구분)
          <input
            value={pageEditorPilotAdminIdsInput}
            onChange={(event) => setPageEditorPilotAdminIdsInput(event.target.value)}
            placeholder="1111..., 2222..."
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block text-sm text-slate-300">
            Publish 실패율 임계치(0~1)
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={pageEditorPublishFailRateThreshold}
              onChange={(event) => setPageEditorPublishFailRateThreshold(Number(event.target.value) || 0)}
              className="mt-1 w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Rollback 비율 임계치(0~1)
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={pageEditorRollbackRatioThreshold}
              onChange={(event) => setPageEditorRollbackRatioThreshold(Number(event.target.value) || 0)}
              className="mt-1 w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block text-sm text-slate-300">
            충돌률 임계치(0~1)
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={pageEditorConflictRateThreshold}
              onChange={(event) => setPageEditorConflictRateThreshold(Number(event.target.value) || 0)}
              className="mt-1 w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Curated 품질 검토 기준(1~100)
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={curatedReviewQualityThreshold}
              onChange={(event) => setCuratedReviewQualityThreshold(Number(event.target.value) || 1)}
              className="mt-1 w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block text-sm text-slate-300">
            추천 클릭 최소 관련성(1~100)
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={curatedRelatedClickBoostMinRelevance}
              onChange={(event) => setCuratedRelatedClickBoostMinRelevance(Number(event.target.value) || 1)}
              className="mt-1 w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block text-sm text-slate-300">
            추천 클릭 multiplier(1~200)
            <input
              type="number"
              min={1}
              max={200}
              step={1}
              value={curatedRelatedClickBoostMultiplier}
              onChange={(event) => setCuratedRelatedClickBoostMultiplier(Number(event.target.value) || 1)}
              className="mt-1 w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block text-sm text-slate-300">
            추천 클릭 cap(1~500)
            <input
              type="number"
              min={1}
              max={500}
              step={1}
              value={curatedRelatedClickBoostCap}
              onChange={(event) => setCuratedRelatedClickBoostCap(Number(event.target.value) || 1)}
              className="mt-1 w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          현재 설정 기준에서는 quality score가 <span className="font-semibold text-slate-50">{curatedReviewQualityThreshold}</span> 미만이면 `review_quality`로 분류됩니다.
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          관련 추천 클릭 boost는 최소 관련성 <span className="font-semibold text-slate-50">{curatedRelatedClickBoostMinRelevance}</span>, multiplier <span className="font-semibold text-slate-50">{curatedRelatedClickBoostMultiplier}</span>, cap <span className="font-semibold text-slate-50">{curatedRelatedClickBoostCap}</span> 기준으로 적용됩니다.
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">최근 품질 기준 변경</p>
          <div className="mt-2 space-y-2 text-sm text-slate-300">
            {policyHistoryQuery.isError ? (
              thresholdHistory.length === 0 ? (
                <p className="text-rose-300">정책 변경 이력을 불러오지 못했습니다.</p>
              ) : (
                <>
                  <p className="text-xs text-rose-300">최신 이력 새로고침에 실패해서 이전 기록을 보여주고 있습니다.</p>
                  {thresholdHistory.slice(0, 5).map((entry) => (
                    <Link
                      key={entry.id}
                      to={`/admin/logs?actionType=policy_updated&query=${encodeURIComponent("curated_quality_threshold")}&targetLogId=${encodeURIComponent(entry.id)}`}
                      className="flex items-center justify-between gap-3 rounded border border-slate-700 px-3 py-2 transition hover:border-slate-500 hover:bg-slate-950/60"
                    >
                      <span className="font-medium text-slate-100">
                        Q {entry.threshold}
                        {entry.previousThreshold !== null ? ` (${entry.previousThreshold} -> ${entry.threshold})` : ""}
                      </span>
                      <span className="text-xs text-slate-400">{entry.admin} · {entry.at}</span>
                    </Link>
                  ))}
                </>
              )
            ) : policyHistoryQuery.isLoading ? (
              <div className="space-y-2" aria-label="정책 이력 불러오는 중">
                <div className="h-10 animate-pulse rounded border border-slate-700 bg-slate-950/60" />
                <div className="h-10 animate-pulse rounded border border-slate-700 bg-slate-950/60" />
              </div>
            ) : thresholdHistory.length === 0 ? (
              <p className="text-slate-500">기록된 변경 이력이 없습니다.</p>
            ) : (
              <>
                {policyHistoryQuery.isFetching ? (
                  <p className="text-xs text-slate-500">업데이트 중...</p>
                ) : null}
                {thresholdHistory.slice(0, 5).map((entry) => (
                  <Link
                    key={entry.id}
                    to={`/admin/logs?actionType=policy_updated&query=${encodeURIComponent("curated_quality_threshold")}&targetLogId=${encodeURIComponent(entry.id)}`}
                    className="flex items-center justify-between gap-3 rounded border border-slate-700 px-3 py-2 transition hover:border-slate-500 hover:bg-slate-950/60"
                  >
                    <span className="font-medium text-slate-100">
                      Q {entry.threshold}
                      {entry.previousThreshold !== null ? ` (${entry.previousThreshold} -> ${entry.threshold})` : ""}
                    </span>
                    <span className="text-xs text-slate-400">{entry.admin} · {entry.at}</span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      </article>

      <article className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-5">
        <h2 className="text-lg font-medium text-slate-100">Google OAuth</h2>
        <p className="text-sm text-slate-400">상태: {oauthHealthText}</p>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={oauthEnabled} onChange={(event) => setOauthEnabled(event.target.checked)} />
          OAuth 활성화
        </label>
        <input
          value={oauthGoogleRedirectUri}
          onChange={(event) => setOauthGoogleRedirectUri(event.target.value)}
          placeholder="Google Redirect URI"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        />
        <input
          value={oauthFrontendRedirectUri}
          onChange={(event) => setOauthFrontendRedirectUri(event.target.value)}
          placeholder="Frontend Redirect URI"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        />
        <Button onClick={() => void saveOauth()} disabled={savingOauth} variant="outline" className="border-slate-700 text-slate-100">
          {savingOauth ? "저장 중..." : "OAuth 저장"}
        </Button>
      </article>
    </section>
  )
}
