import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type HeadingTag = "h1" | "h2"

interface LogoSplitHeadingProps {
  as?: HeadingTag
  className?: string
  line1: string
  line2?: string
  line2ClassName?: string
  threshold?: number
}

export function LogoSplitHeading({
  as = "h2",
  className,
  line1,
  line2,
  line2ClassName,
  threshold = 0.32,
}: LogoSplitHeadingProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const [isInView, setIsInView] = useState(false)
  const headingLabel = line2 ? `${line1} ${line2}` : line1
  const HeadingTag = as

  useEffect(() => {
    const target = headingRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIsInView(true)
        observer.disconnect()
      },
      { threshold }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [threshold])

  useEffect(() => {
    if (!isInView) return

    const target = headingRef.current
    if (!target) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return
    }

    const splitTargets = target.querySelectorAll<HTMLElement>("[data-split-line]")
    if (!splitTargets.length) {
      return
    }

    let cancelled = false
    let killTimeline: (() => void) | null = null
    let splits: Array<{ chars: Element[]; revert: () => void }> = []

    const initializeAnimation = async () => {
      const [{ default: gsap }, { SplitText }] = await Promise.all([import("gsap"), import("gsap/SplitText")])
      if (cancelled) return

      gsap.registerPlugin(SplitText)
      splits = Array.from(splitTargets, (line) =>
        new SplitText(line, {
          type: "chars",
          charsClass: "logo-split-char",
          aria: "auto",
        })
      )

      const timeline = gsap.timeline()
      splits.forEach((split, index) => {
        timeline.from(
          split.chars,
          {
            xPercent: () => gsap.utils.random(-180, 180),
            yPercent: () => gsap.utils.random(-220, 220),
            rotation: () => gsap.utils.random(-75, 75),
            scale: () => gsap.utils.random(0.45, 1.6),
            autoAlpha: 0,
            duration: 0.84,
            ease: "power3.out",
            stagger: {
              each: 0.026,
              from: "random",
            },
            clearProps: "transform,opacity,visibility",
          },
          index * 0.14
        )
      })
      killTimeline = () => timeline.kill()
    }

    void initializeAnimation()

    return () => {
      cancelled = true
      killTimeline?.()
      splits.forEach((split) => split.revert())
    }
  }, [isInView])

  return (
    <HeadingTag
      ref={headingRef}
      className={cn("logo-title-fallback", className)}
      aria-label={headingLabel}
      data-in-view={isInView ? "true" : "false"}
    >
      <span data-split-line>{line1}</span>
      {line2 ? (
        <>
          <br />
          <span data-split-line className={line2ClassName}>
            {line2}
          </span>
        </>
      ) : null}
    </HeadingTag>
  )
}
