import "@testing-library/jest-dom/vitest"

if (
  typeof window !== "undefined"
  && (
    typeof window.localStorage !== "object"
    || typeof window.localStorage.getItem !== "function"
    || typeof window.localStorage.setItem !== "function"
    || typeof window.localStorage.removeItem !== "function"
    || typeof window.localStorage.clear !== "function"
  )
) {
  const storage = new Map<string, string>()
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, String(value))
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
      clear: () => {
        storage.clear()
      },
    },
    configurable: true,
  })
}
