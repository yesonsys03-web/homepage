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

vi.mock("./components/screens/HomeScreen", () => ({
  HomeScreen: () => <div>home</div>,
}))

vi.mock("./components/screens/ProjectDetailScreen", () => ({
  ProjectDetailScreen: () => <div>detail</div>,
}))

vi.mock("./components/screens/SubmitScreen", () => ({
  SubmitScreen: () => <div>submit</div>,
}))

vi.mock("./components/screens/ProfileScreen", () => ({
  ProfileScreen: () => <div>profile</div>,
}))

vi.mock("./components/screens/admin/AdminLayout", () => ({
  AdminLayout: () => <div>admin</div>,
}))

vi.mock("./components/screens/admin/pages/AdminDashboard", () => ({
  AdminDashboard: () => <div>admin-dashboard</div>,
}))

vi.mock("./components/screens/admin/pages/AdminUsers", () => ({
  AdminUsers: () => <div>admin-users</div>,
}))

vi.mock("./components/screens/admin/pages/AdminContent", () => ({
  AdminContent: () => <div>admin-content</div>,
}))

vi.mock("./components/screens/admin/pages/AdminReports", () => ({
  AdminReports: () => <div>admin-reports</div>,
}))

vi.mock("./components/screens/admin/pages/AdminPages", () => ({
  AdminPages: () => <div>admin-pages</div>,
}))

vi.mock("./components/screens/admin/pages/AdminPolicies", () => ({
  AdminPolicies: () => <div>admin-policies</div>,
}))

vi.mock("./components/screens/admin/pages/AdminLogs", () => ({
  AdminLogs: () => <div>admin-logs</div>,
}))

vi.mock("./components/screens/ExploreScreen", () => ({
  ExploreScreen: () => <div>explore</div>,
}))

vi.mock("./components/screens/ChallengesScreen", () => ({
  ChallengesScreen: () => <div>challenges</div>,
}))

vi.mock("./components/screens/AboutScreen", () => ({
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

  it("redirects anonymous user to login when admin navigation is clicked", async () => {
    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: "Admin" }))
    expect(await screen.findByText("login")).toBeInTheDocument()
  })

  it("keeps non-admin user out of admin screen", async () => {
    state.user = {
      id: "u-1",
      email: "user@example.com",
      nickname: "user",
      role: "user",
      status: "active",
    }

    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: "Admin" }))
    expect(await screen.findByText("home")).toBeInTheDocument()
  })

  it("allows admin user to open admin screen", async () => {
    state.user = {
      id: "a-1",
      email: "admin@example.com",
      nickname: "admin",
      role: "admin",
      status: "active",
    }

    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: "Admin" }))
    expect(await screen.findByText("admin")).toBeInTheDocument()
  })

  it("allows super admin user to open admin screen", async () => {
    state.user = {
      id: "sa-1",
      email: "superadmin@example.com",
      nickname: "superadmin",
      role: "super_admin",
      status: "active",
    }

    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: "Admin" }))
    expect(await screen.findByText("admin")).toBeInTheDocument()
  })
})
