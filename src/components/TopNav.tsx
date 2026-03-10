import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

export type NavScreen =
  | "home"
  | "detail"
  | "submit"
  | "profile"
  | "admin"
  | "login"
  | "register"
  | "explore"
  | "showcase"
  | "challenges"
  | "about"
  | "playground"
  | "glossary"
  | "curated"

type TopNavProps = {
  active: "home" | "explore" | "showcase" | "challenges" | "about" | "playground" | "glossary" | "curated"
  onNavigate?: (screen: NavScreen) => void
  titleSuffix?: ReactNode
  rightSlot?: ReactNode
}

export function TopNav({ active, onNavigate, titleSuffix, rightSlot }: TopNavProps) {
  const linkClass = (screen: TopNavProps["active"]) =>
    active === screen
      ? "text-[#23D5AB] font-medium"
      : "text-[#B8C3E6] hover:text-[#F4F7FF] transition-colors duration-100"

  return (
    <header className="sticky top-0 z-50 bg-[#0B1020]/95 backdrop-blur-sm border-b border-[#111936]">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">
          VibeCoder{titleSuffix ? <> {titleSuffix}</> : null}
        </h1>
        <nav className="flex gap-6">
          <button onClick={() => onNavigate?.("home")} className={linkClass("home")}>Home</button>
          <button onClick={() => onNavigate?.("explore")} className={linkClass("explore")}>Explore</button>
          <button onClick={() => onNavigate?.("showcase")} className={linkClass("showcase")}>Showcase</button>
          <button onClick={() => onNavigate?.("curated")} className={linkClass("curated")}>Curated</button>
          <button onClick={() => onNavigate?.("playground")} className={linkClass("playground")}>Playground</button>
          <button onClick={() => onNavigate?.("glossary")} className={linkClass("glossary")}>Glossary</button>
          <button onClick={() => onNavigate?.("challenges")} className={linkClass("challenges")}>Challenges</button>
          <button onClick={() => onNavigate?.("about")} className={linkClass("about")}>About</button>
        </nav>
        {rightSlot ? (
          rightSlot
        ) : (
          <Button
            onClick={() => onNavigate?.("submit")}
            className="bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] font-semibold duration-100"
          >
            작품 올리기
          </Button>
        )}
      </div>
    </header>
  )
}
