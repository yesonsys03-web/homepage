import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

interface CoverSplitTitleProps {
  text: string
  className?: string
  seed: number
  enabled?: boolean
  mood?: "hot" | "new" | "ai" | "game" | "tool" | "wip" | "play"
}

type MotionPreset = "scatter" | "left-burst" | "right-burst" | "top-drop" | "bottom-pop" | "spin-chaos"

interface MotionProfile {
  preset: MotionPreset
  xRange: number
  yRange: number
  rotationRange: number
  scaleMin: number
  scaleMax: number
  staggerEach: number
  staggerFrom: "start" | "center" | "random"
  duration: number
  ease: string
  repeatRefresh: boolean
}

interface RhythmProfile {
  repeatGap: number
  durationMultiplier: number
  initialDelay: number
}

function applyMoodIntensity(profile: MotionProfile, mood: "hot" | "new" | "ai" | "game" | "tool" | "wip" | "play"): MotionProfile {
  if (mood === "hot") {
    return {
      ...profile,
      xRange: Math.round(profile.xRange * 1.14),
      yRange: Math.round(profile.yRange * 1.12),
      rotationRange: Math.round(profile.rotationRange * 1.18),
      scaleMin: Math.max(0.35, profile.scaleMin - 0.08),
      scaleMax: profile.scaleMax + 0.08,
      staggerEach: Math.max(0.012, profile.staggerEach - 0.002),
      staggerFrom: "random",
      duration: Math.max(0.52, profile.duration - 0.08),
      repeatRefresh: true,
    }
  }

  if (mood === "wip") {
    return {
      ...profile,
      xRange: Math.round(profile.xRange * 0.46),
      yRange: Math.round(profile.yRange * 0.44),
      rotationRange: Math.round(profile.rotationRange * 0.42),
      scaleMin: Math.min(0.82, profile.scaleMin + 0.26),
      scaleMax: Math.max(1.08, Math.min(1.22, profile.scaleMax - 0.3)),
      staggerEach: profile.staggerEach + 0.01,
      staggerFrom: "center",
      duration: profile.duration + 0.14,
      ease: "power2.out",
      repeatRefresh: false,
    }
  }

  if (mood === "ai") {
    return {
      ...profile,
      xRange: Math.round(profile.xRange * 0.34),
      yRange: Math.round(profile.yRange * 0.32),
      rotationRange: Math.round(profile.rotationRange * 0.26),
      scaleMin: Math.max(0.72, profile.scaleMin + 0.18),
      scaleMax: Math.min(1.16, profile.scaleMax - 0.22),
      staggerEach: 0.014,
      staggerFrom: "start",
      duration: 0.72,
      ease: "power1.out",
      repeatRefresh: false,
    }
  }

  if (mood === "new") {
    return {
      ...profile,
      xRange: Math.round(profile.xRange * 0.78),
      yRange: Math.round(profile.yRange * 0.74),
      rotationRange: Math.round(profile.rotationRange * 0.66),
      scaleMin: Math.max(0.58, profile.scaleMin + 0.08),
      scaleMax: Math.min(1.34, profile.scaleMax - 0.06),
      staggerEach: Math.max(0.012, profile.staggerEach - 0.002),
      staggerFrom: "center",
      duration: Math.max(0.58, profile.duration - 0.06),
      ease: "back.out(1.4)",
      repeatRefresh: true,
    }
  }

  if (mood === "game") {
    return {
      ...profile,
      xRange: Math.round(profile.xRange * 0.92),
      yRange: Math.round(profile.yRange * 1.06),
      rotationRange: Math.round(profile.rotationRange * 0.88),
      scaleMin: Math.max(0.5, profile.scaleMin + 0.02),
      scaleMax: Math.min(1.46, profile.scaleMax + 0.02),
      staggerEach: Math.max(0.012, profile.staggerEach - 0.001),
      staggerFrom: "random",
      duration: Math.max(0.56, profile.duration - 0.04),
      ease: "elastic.out(1, 0.55)",
      repeatRefresh: true,
    }
  }

  if (mood === "play") {
    return {
      ...profile,
      xRange: Math.round(profile.xRange * 1.26),
      yRange: Math.round(profile.yRange * 1.24),
      rotationRange: Math.round(profile.rotationRange * 1.22),
      scaleMin: Math.max(0.3, profile.scaleMin - 0.14),
      scaleMax: Math.min(1.9, profile.scaleMax + 0.16),
      staggerEach: Math.max(0.01, profile.staggerEach - 0.003),
      staggerFrom: "random",
      duration: Math.max(0.54, profile.duration - 0.04),
      ease: "power4.out",
      repeatRefresh: true,
    }
  }

  if (mood === "tool") {
    return {
      ...profile,
      xRange: Math.round(profile.xRange * 0.28),
      yRange: Math.round(profile.yRange * 0.28),
      rotationRange: Math.round(profile.rotationRange * 0.22),
      scaleMin: Math.max(0.78, profile.scaleMin + 0.22),
      scaleMax: Math.min(1.12, profile.scaleMax - 0.28),
      staggerEach: 0.02,
      staggerFrom: "center",
      duration: 0.86,
      ease: "power2.out",
      repeatRefresh: false,
    }
  }

  return profile
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildMotionProfile(
  seed: number,
  mood: "hot" | "new" | "ai" | "game" | "tool" | "wip" | "play"
): MotionProfile {
  const moodSelectorMap: Record<typeof mood, number[]> = {
    hot: [5, 1, 2],
    new: [3, 0, 4],
    ai: [5, 0, 2],
    game: [4, 1, 5],
    tool: [2, 3, 0],
    wip: [3, 4, 1],
    play: [0, 1, 2, 3, 4, 5],
  }
  const selectors = moodSelectorMap[mood]
  const selector = selectors[seed % selectors.length]

  switch (selector) {
    case 1:
      return {
        preset: "left-burst",
        xRange: 360,
        yRange: 190,
        rotationRange: 70,
        scaleMin: 0.5,
        scaleMax: 1.35,
        staggerEach: 0.02,
        staggerFrom: "random",
        duration: 0.78,
        ease: "power3.out",
        repeatRefresh: true,
      }
    case 2:
      return {
        preset: "right-burst",
        xRange: 360,
        yRange: 190,
        rotationRange: 78,
        scaleMin: 0.52,
        scaleMax: 1.4,
        staggerEach: 0.022,
        staggerFrom: "random",
        duration: 0.82,
        ease: "power3.out",
        repeatRefresh: true,
      }
    case 3:
      return {
        preset: "top-drop",
        xRange: 170,
        yRange: 390,
        rotationRange: 62,
        scaleMin: 0.58,
        scaleMax: 1.28,
        staggerEach: 0.018,
        staggerFrom: "random",
        duration: 0.74,
        ease: "expo.out",
        repeatRefresh: true,
      }
    case 4:
      return {
        preset: "bottom-pop",
        xRange: 180,
        yRange: 360,
        rotationRange: 66,
        scaleMin: 0.48,
        scaleMax: 1.42,
        staggerEach: 0.019,
        staggerFrom: "random",
        duration: 0.8,
        ease: "back.out(1.6)",
        repeatRefresh: true,
      }
    case 5:
      return {
        preset: "spin-chaos",
        xRange: 300,
        yRange: 300,
        rotationRange: 180,
        scaleMin: 0.4,
        scaleMax: 1.6,
        staggerEach: 0.024,
        staggerFrom: "random",
        duration: 0.88,
        ease: "power4.out",
        repeatRefresh: true,
      }
    default:
      return {
        preset: "scatter",
        xRange: 260,
        yRange: 320,
        rotationRange: 110,
        scaleMin: 0.45,
        scaleMax: 1.65,
        staggerEach: 0.02,
        staggerFrom: "random",
        duration: 0.76,
        ease: "power3.out",
        repeatRefresh: true,
      }
  }
}

function buildRhythmProfile(
  seed: number,
  mood: "hot" | "new" | "ai" | "game" | "tool" | "wip" | "play"
): RhythmProfile {
  const rand = seededRandom(seed ^ 0x41f6c1d5)

  switch (mood) {
    case "hot":
      return {
        repeatGap: 1.15 + rand() * 1.05,
        durationMultiplier: 0.84,
        initialDelay: 0.08 + rand() * 0.26,
      }
    case "new":
      return {
        repeatGap: 2.05 + rand() * 1.05,
        durationMultiplier: 0.9,
        initialDelay: 0.08 + rand() * 0.22,
      }
    case "ai":
      return {
        repeatGap: 2.2 + rand() * 0.35,
        durationMultiplier: 0.98,
        initialDelay: 0.12 + rand() * 0.12,
      }
    case "game":
      return {
        repeatGap: 1.85 + rand() * 0.95,
        durationMultiplier: 0.88,
        initialDelay: 0.06 + rand() * 0.18,
      }
    case "tool":
      return {
        repeatGap: 3.9 + rand() * 0.55,
        durationMultiplier: 1.04,
        initialDelay: 0.2 + rand() * 0.14,
      }
    case "wip":
      return {
        repeatGap: 4.9 + rand() * 2.2,
        durationMultiplier: 1.14,
        initialDelay: 0.24 + rand() * 0.38,
      }
    default:
      return {
        repeatGap: 1.7 + rand() * 1.2,
        durationMultiplier: 0.86,
        initialDelay: 0.04 + rand() * 0.24,
      }
  }
}

export function CoverSplitTitle({ text, className, seed, enabled = true, mood = "play" }: CoverSplitTitleProps) {
  const titleRef = useRef<HTMLParagraphElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const variant = useMemo(() => seed % 4, [seed])
  const motion = useMemo(() => applyMoodIntensity(buildMotionProfile(seed, mood), mood), [mood, seed])
  const rhythm = useMemo(() => buildRhythmProfile(seed, mood), [mood, seed])
  const titleStyle = useMemo<CSSProperties>(() => {
    const rand = seededRandom(seed ^ 0x2a2f3a41)
    return {
      ["--cover-card-title-tilt" as string]: `${Math.round((rand() - 0.5) * 10)}deg`,
      ["--cover-card-title-jitter" as string]: `${Math.round((rand() - 0.5) * 8)}px`,
      ["--cover-card-title-scale" as string]: (0.98 + rand() * 0.1).toFixed(3),
    }
  }, [seed])

  useEffect(() => {
    if (!enabled) return

    const target = titleRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.3, rootMargin: "0px 0px -10% 0px" }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [enabled])

  useEffect(() => {
    if (!enabled || !isVisible) return

    const target = titleRef.current
    if (!target) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let cancelled = false
    let killTimeline: (() => void) | null = null
    let split: { revert: () => void; chars: Element[] } | null = null

    const rand = seededRandom(seed ^ 0x9e3779b9)

    const initializeAnimation = async () => {
      const [{ default: gsap }, { SplitText }] = await Promise.all([import("gsap"), import("gsap/SplitText")])
      if (cancelled) return

      gsap.registerPlugin(SplitText)
      split = new SplitText(target, {
        type: "chars",
        charsClass: "cover-title-char",
        aria: "none",
      })

      const fromX = () => {
        const swing = (rand() - 0.5) * motion.xRange
        if (motion.preset === "left-burst") return -Math.abs(swing) - motion.xRange * 0.5
        if (motion.preset === "right-burst") return Math.abs(swing) + motion.xRange * 0.5
        return Math.round(swing)
      }

      const fromY = () => {
        const swing = (rand() - 0.5) * motion.yRange
        if (motion.preset === "top-drop") return -Math.abs(swing) - motion.yRange * 0.45
        if (motion.preset === "bottom-pop") return Math.abs(swing) + motion.yRange * 0.4
        return Math.round(swing)
      }

      const timeline = gsap.timeline({ delay: rhythm.initialDelay })
      timeline.fromTo(
        split.chars,
        {
          xPercent: fromX,
          yPercent: fromY,
          rotation: () => Math.round((rand() - 0.5) * motion.rotationRange),
          scale: () => motion.scaleMin + rand() * (motion.scaleMax - motion.scaleMin),
          autoAlpha: 0,
        },
        {
          xPercent: 0,
          yPercent: 0,
          rotation: 0,
          scale: 1,
          autoAlpha: 1,
          duration: (motion.duration + rand() * 0.26) * rhythm.durationMultiplier,
          ease: motion.ease,
          stagger: {
            each: motion.staggerEach + rand() * 0.016,
            from: motion.staggerFrom,
          },
          repeat: -1,
          repeatDelay: rhythm.repeatGap,
          repeatRefresh: motion.repeatRefresh,
        }
      )
      killTimeline = () => timeline.kill()
    }

    void initializeAnimation()

    return () => {
      cancelled = true
      killTimeline?.()
      split?.revert()
    }
  }, [enabled, isVisible, motion, rhythm, seed, text])

  return (
    <>
      {enabled ? <span className="sr-only">{text}</span> : null}
      <p
        ref={titleRef}
        className={cn(className, `cover-card-title-variant-${variant}`)}
        style={titleStyle}
        aria-hidden={enabled ? "true" : undefined}
      >
        {text}
      </p>
    </>
  )
}
