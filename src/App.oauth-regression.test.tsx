import type { ReactNode } from "react"
import { render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { loginSpy, logoutSpy, getMeWithTokenSpy } = vi.hoisted(() => ({
  loginSpy: vi.fn(),
  logoutSpy: vi.fn(),
  getMeWithTokenSpy: vi.fn(),
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
    user: null,
    login: loginSpy,
    logout: logoutSpy,
    isLoading: false,
  }),
}))

vi.mock("./lib/api", () => ({
  api: {
    getMeWithToken: getMeWithTokenSpy,
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

  it("restores session from oauth token and clears query", async () => {
    const user = {
      id: "user-1",
      email: "oauth@example.com",
      nickname: "oauth-user",
      role: "user",
      status: "active",
    }
    getMeWithTokenSpy.mockResolvedValueOnce(user)
    window.history.replaceState({}, "", "http://localhost/?oauth_token=test-oauth-token")

    render(<App />)

    await waitFor(() => {
      expect(getMeWithTokenSpy).toHaveBeenCalledWith("test-oauth-token")
      expect(loginSpy).toHaveBeenCalledWith("test-oauth-token", user)
    })

    const currentUrl = new URL(window.location.href)
    expect(currentUrl.searchParams.get("oauth_token")).toBeNull()
  })
})
