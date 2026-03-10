export function safeLocalStorageGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeLocalStorageSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    return
  }
}

export function safeLocalStorageRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    return
  }
}

export function safeSessionStorageGetItem(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSessionStorageSetItem(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    return
  }
}

export function safeSessionStorageRemoveItem(key: string): void {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    return
  }
}
