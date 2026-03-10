import { useState } from "react"
import { LaunchpadGuide } from "./LaunchpadGuide"
import { LaunchpadTipList } from "./LaunchpadTipList"
import { LaunchpadErrorClinic } from "./LaunchpadErrorClinic"

type LaunchpadSubTab = "guide" | "tips" | "clinic"

const SUB_TABS: { id: LaunchpadSubTab; label: string }[] = [
  { id: "guide", label: "🛠 설치 가이드" },
  { id: "tips", label: "💡 팁 & 트릭" },
  { id: "clinic", label: "🏥 에러 클리닉" },
]

export function LaunchpadTab() {
  const [activeSubTab, setActiveSubTab] = useState<LaunchpadSubTab>("guide")

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-2">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors
              ${activeSubTab === tab.id
                ? "border-[#23D5AB] bg-[#23D5AB]/15 text-[#23D5AB]"
                : "border-[#1B2854] bg-[#111936] text-[#B8C3E6] hover:border-[#23D5AB]/40"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeSubTab === "guide" && <LaunchpadGuide />}
      {activeSubTab === "tips" && <LaunchpadTipList />}
      {activeSubTab === "clinic" && <LaunchpadErrorClinic />}
    </div>
  )
}
