import type { ReactNode } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type MockUser = {
  id: string
  email: string
  nickname: string
  role: string
  status: string
}

const state = vi.hoisted(() => ({
  user: null as MockUser | null,
}))

vi.mock("./components/screens", () => ({
  HomeScreen: () => <div>home</div>,
  ProjectDetailScreen: () => <div>detail</div>,
  SubmitScreen: () => <div>submit</div>,
  ProfileScreen: () => <div>profile</div>,
  AdminScreen: () => <div>admin</div>,
  ExploreScreen: () => <div>explore</div>,
  ChallengesScreen: () => <div>challenges</div>,
  AboutScreen: () => <div>about</div>,
}))

vi.mock("./components/screens/LoginScreen", () => ({
  LoginScreen: () => <div>login</div>,
}))

vi.mock("./components/screens/RegisterScreen", () => ({
  RegisterScreen: () => <div>register</div>,
}))

vi.mock("./lib/auth-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("./lib/use-auth", () => ({
  useAuth: () => ({
    user: state.user,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  }),
}))

vi.mock("./lib/api", () => ({
  api: {
    getMeWithToken: vi.fn(),
  },
}))

import App from "./App"

describe("App admin guard smoke", () => {
  beforeEach(() => {
    state.user = null
    window.history.replaceState({}, "", "http://localhost/")
  })

  afterEach(() => {
    cleanup()
  })

  it("redirects anonymous user to login when admin navigation is clicked", () => {
    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: "Admin" }))
    expect(screen.getByText("login")).toBeInTheDocument()
  })

  it("keeps non-admin user out of admin screen", () => {
    state.user = {
      id: "u-1",
      email: "user@example.com",
      nickname: "user",
      role: "user",
      status: "active",
    }

    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: "Admin" }))
    expect(screen.getByText("home")).toBeInTheDocument()
  })

  it("allows admin user to open admin screen", () => {
    state.user = {
      id: "a-1",
      email: "admin@example.com",
      nickname: "admin",
      role: "admin",
      status: "active",
    }

    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: "Admin" }))
    expect(screen.getByText("admin")).toBeInTheDocument()
  })
})
