import type { CSSProperties, ReactNode } from "react"

type HeroBannerProps = {
  title: ReactNode
  description?: ReactNode
  cta?: ReactNode
  background?: ReactNode
  className?: string
}

export function HeroBanner({ title, description, cta, background, className }: HeroBannerProps) {
  return (
    <section className={`relative py-20 px-4 overflow-hidden ${className ?? ""}`}>
      {background}
      <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center">
        <div
          className="w-full font-display text-5xl md:text-6xl font-bold text-[#F4F7FF] mb-6 text-left reveal-up"
          style={{ "--reveal-delay": "0ms" } as CSSProperties}
        >
          {title}
        </div>
        {cta}
        {description ? (
          <p
            className="reveal-up text-xl text-[#B8C3E6] mt-8 max-w-2xl text-center"
            style={{ "--reveal-delay": "80ms" } as CSSProperties}
          >
            {description}
          </p>
        ) : null}
      </div>
    </section>
  )
}
