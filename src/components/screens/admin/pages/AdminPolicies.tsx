import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

export function AdminPolicies() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingOauth, setSavingOauth] = useState(false)

  const [blockedKeywordsInput, setBlockedKeywordsInput] = useState("")
  const [autoHideThreshold, setAutoHideThreshold] = useState(3)
  const [adminLogRetentionDays, setAdminLogRetentionDays] = useState(365)
  const [adminLogViewWindowDays, setAdminLogViewWindowDays] = useState(30)
  const [adminLogMaskReasons, setAdminLogMaskReasons] = useState(true)
  const [oauthEnabled, setOauthEnabled] = useState(false)
  const [oauthGoogleRedirectUri, setOauthGoogleRedirectUri] = useState("")
  const [oauthFrontendRedirectUri, setOauthFrontendRedirectUri] = useState("")
  const [oauthHealthText, setOauthHealthText] = useState("확인 중")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [policy, oauthSettings, oauthHealth] = await Promise.all([
          api.getAdminPolicies(),
          api.getAdminOAuthSettings(),
          api.getAdminOAuthHealth(),
        ])

        setBlockedKeywordsInput((policy.custom_blocked_keywords || []).join(", "))
        setAutoHideThreshold(policy.auto_hide_report_threshold || 3)
        setAdminLogRetentionDays(policy.admin_log_retention_days || 365)
        setAdminLogViewWindowDays(policy.admin_log_view_window_days || 30)
        setAdminLogMaskReasons(
          policy.admin_log_mask_reasons ?? true,
        )

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

    setSaving(true)
    try {
      await api.updateAdminPolicies(
        keywords,
        autoHideThreshold,
        undefined,
        undefined,
        adminLogRetentionDays,
        adminLogViewWindowDays,
        adminLogMaskReasons,
      )
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
