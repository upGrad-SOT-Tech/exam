const ACCESS_TOKEN_KEY = 'accessToken'

type AuthClearedListener = () => void
let onAuthCleared: AuthClearedListener | null = null


export function setAuthClearedListener(listener: AuthClearedListener | null) {
  onAuthCleared = listener
}

function migrateFromSessionStorage() {
  try {
    const fromSession = sessionStorage.getItem(ACCESS_TOKEN_KEY)
    if (fromSession && !localStorage.getItem(ACCESS_TOKEN_KEY)) {
      localStorage.setItem(ACCESS_TOKEN_KEY, fromSession)
    }
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  } catch {
    // Ignore storage access errors.
  }
}

migrateFromSessionStorage()

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function clearAccessToken(options?: { silent?: boolean }) {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  if (!options?.silent) onAuthCleared?.()
}
