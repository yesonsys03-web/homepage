import { useEffect, useState } from "react"

import { getLocalDateKey } from "@/lib/daily"

function getMsUntilNextLocalMidnight(now: Date = new Date()): number {
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  )
  return Math.max(1, nextMidnight.getTime() - now.getTime())
}

export function useLocalDateKey(): string {
  const [dateKey, setDateKey] = useState(() => getLocalDateKey())

  useEffect(() => {
    let timeoutId: number | null = null

    const scheduleNextSync = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
      timeoutId = window.setTimeout(syncAndReschedule, getMsUntilNextLocalMidnight())
    }

    const syncAndReschedule = () => {
      setDateKey(getLocalDateKey())
      scheduleNextSync()
    }

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "hidden") {
        return
      }
      syncAndReschedule()
    }

    scheduleNextSync()
    window.addEventListener("focus", handleVisibilityOrFocus)
    document.addEventListener("visibilitychange", handleVisibilityOrFocus)

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
      window.removeEventListener("focus", handleVisibilityOrFocus)
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus)
    }
  }, [])

  return dateKey
}
