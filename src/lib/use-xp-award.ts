import { api } from "./api"

const XP_LEVEL_NAMES = ["", "🌱 씨앗", "🌿 새싹", "🌳 나무", "🗺️ 탐험가", "🔨 건축가", "🚀 런처", "⚡ 바이브 마스터"]

const BADGE_LABELS: Record<string, string> = {
  first_step: "🌱 첫 발걸음",
  error_overcome: "🐛 에러 극복",
  fire_streak: "🔥 불꽃 스트릭",
  first_deploy: "🚀 첫 배포",
  team_player: "👥 팀플레이어",
  idea_bank: "💡 아이디어 뱅크",
}

export type XpToastCallback = (message: string, tone?: "info" | "success" | "error") => void

export async function awardXpWithNotify(
  event_type: string,
  ref_id: string | undefined,
  onToast?: XpToastCallback,
): Promise<void> {
  try {
    const result = await api.awardXp(event_type, ref_id)
    if (!result.awarded || !onToast) return

    if (result.level_up) {
      const levelName = XP_LEVEL_NAMES[result.level] || `Lv.${result.level}`
      onToast(`🎉 레벨업! ${levelName}이 되었어요! (+${result.xp_delta} XP)`, "success")
    } else if (result.new_badges.length > 0) {
      const label = BADGE_LABELS[result.new_badges[0]] ?? result.new_badges[0]
      onToast(`🏅 뱃지 획득: ${label}`, "success")
    } else {
      onToast(`+${result.xp_delta} XP 획득!`, "info")
    }
  } catch {
    // silently ignore — unauthenticated users or rate limits
  }
}
