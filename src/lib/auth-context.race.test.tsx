import type { ContextType } from "react"
import { useContext } from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { getMeSpy } = vi.hoisted(() => ({
  getMeSpy: vi.fn(),
}))

vi.mock("./api", () => ({
  api: {
    getMe: getMeSpy,
  },
}))

import { AuthProvider } from "./auth-context"
import { AuthContext } from "./auth-store"

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

type AuthSnapshot = {
  id: string
  email: string
  nickname: string
  role: string
  status: string
}

let latestAuthContext: NonNullable<ContextType<typeof AuthContext>>

function Probe() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("AuthContext is unavailable")
  }
  latestAuthContext = ctx
  return <div data-testid="nickname">{ctx.user?.nickname ?? "none"}</div>
}

describe("AuthProvider restore race prevention", () => {
  beforeEach(() => {
    window.localStorage.removeItem("vibecoder_token")
    window.localStorage.removeItem("vibecoder_user")
    vi.clearAllMocks()
  })

  it("ignores stale restore result when token changed during restore", async () => {
    const staleUser: AuthSnapshot = {
      id: "old-user-id",
      email: "old@example.com",
      nickname: "old-user",
      role: "user",
      status: "active",
    }
    const freshUser: AuthSnapshot = {
      id: "new-user-id",
      email: "new@example.com",
      nickname: "new-user",
      role: "user",
      status: "active",
    }

    window.localStorage.setItem("vibecoder_token", "stale-token")
    window.localStorage.setItem("vibecoder_user", JSON.stringify(staleUser))

    const pendingGetMe = deferred<AuthSnapshot>()
    getMeSpy.mockReturnValueOnce(pendingGetMe.promise)

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(getMeSpy).toHaveBeenCalledTimes(1)
    })

    act(() => {
      latestAuthContext.login("fresh-token", freshUser)
    })

    await act(async () => {
      pendingGetMe.resolve(staleUser)
      await pendingGetMe.promise
    })

    await waitFor(() => {
      expect(screen.getByTestId("nickname")).toHaveTextContent("new-user")
    })
    expect(window.localStorage.getItem("vibecoder_token")).toBe("fresh-token")
    expect(window.localStorage.getItem("vibecoder_user")).toContain("new-user")
  })
})
