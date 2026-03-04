import type { ReactNode } from "react"
import { render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { loginSpy, logoutSpy, getMeWithTokenSpy, exchangeGoogleOAuthCodeSpy } = vi.hoisted(() => ({
  loginSpy: vi.fn(),
  logoutSpy: vi.fn(),
  getMeWithTokenSpy: vi.fn(),
  exchangeGoogleOAuthCodeSpy: vi.fn(),
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

vi.mock("./components/screens/ExploreScreen", () => ({
  ExploreScreen: () => <div>explore</div>,
}))

vi.mock("./components/screens/ChallengesScreen", () => ({
  ChallengesScreen: () => <div>challenges</div>,
}))

vi.mock("./components/screens/AboutScreen", () => ({
  AboutScreen: () => <div>about</div>,
}))

vi.mock("./components/screens/admin/AdminLayout", () => ({
  AdminLayout: () => <div>admin</div>,
}))

vi.mock("./components/screens/admin/pages/AdminDashboard", () => ({
  AdminDashboard: () => <div>admin-dashboard</div>,
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
    user: null,
    login: loginSpy,
    logout: logoutSpy,
    isLoading: false,
  }),
}))

vi.mock("./lib/api", () => ({
  api: {
    getMeWithToken: getMeWithTokenSpy,
    exchangeGoogleOAuthCode: exchangeGoogleOAuthCodeSpy,
  },
}))

import App from "./App"

describe("App OAuth regression", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "http://localhost/")
    vi.clearAllMocks()
    vi.spyOn(window, "alert").mockImplementation(() => undefined)
  })

  it("clears pending oauth status query and shows message", async () => {
    window.history.replaceState({}, "", "http://localhost/?oauth_status=pending")

    render(<App />)

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Google 가입이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.",
      )
    })

    const currentUrl = new URL(window.location.href)
    expect(currentUrl.searchParams.get("oauth_status")).toBeNull()
  })

  it("restores session from oauth code and clears query", async () => {
    const user = {
      id: "user-1",
      email: "oauth@example.com",
      nickname: "oauth-user",
      role: "user",
      status: "active",
    }
    exchangeGoogleOAuthCodeSpy.mockResolvedValueOnce({ access_token: "issued-access-token", user })
    window.history.replaceState({}, "", "http://localhost/?oauth_code=test-oauth-code")

    render(<App />)

    await waitFor(() => {
      expect(exchangeGoogleOAuthCodeSpy).toHaveBeenCalledWith("test-oauth-code")
      expect(loginSpy).toHaveBeenCalledWith("issued-access-token", user)
    })

    const currentUrl = new URL(window.location.href)
    expect(currentUrl.searchParams.get("oauth_code")).toBeNull()
  })
})
