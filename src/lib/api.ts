import { getAccessToken, setAccessToken, clearAccessToken } from './auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

type ApiErrorBody = {
  error?: { message?: string; code?: string }
}

export class ApiError extends Error {
  code: string
  status: number

  constructor(message: string, status: number, code = 'API_ERROR') {
    super(message)
    this.status = status
    this.code = code
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody = {}
  try {
    body = await res.json()
  } catch {
  }
  return new ApiError(
    body.error?.message || res.statusText || 'Request failed',
    res.status,
    body.error?.code || 'API_ERROR',
  )
}

export async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (
    res.status === 401 &&
    retry &&
    !path.includes('/auth/refresh') &&
    !path.includes('/auth/login')
  ) {
    const ok = await refreshAccessToken()
    if (ok) return request<T>(path, options, false)
  }

  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const data = await request<{ accessToken: string }>(
      '/api/auth/refresh',
      { method: 'POST', body: '{}' },
      false,
    )
    if (data?.accessToken) {
      setAccessToken(data.accessToken)
      return true
    }
  } catch {
    clearAccessToken()
  }
  return false
}

export type LookupResult = {
  accountType: 'student' | 'candidate'
  email: string
  existsInLms: boolean
  firstTime: boolean
  hasPassword: boolean
  profile: AuthUser
}

export type AuthUser = {
  id: string
  email: string
  role: string
  name: string
  fullName?: string
  photoUrl?: string | null
  cohortId?: string | null
  cohortName?: string | null
  campus?: string | null
  programName?: string | null
}

export type AuthResult = {
  accessToken: string
  role: string
  user: AuthUser
  redirectTo: string
}

export const authApi = {
  lookup: (email: string) =>
    request<LookupResult>('/api/auth/lookup', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  sendOtp: (email: string, purpose: 'login' | 'set-password' | 'reset-password') =>
    request<{ expiresInMinutes: number }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, purpose }),
    }),

  loginPassword: (email: string, password: string) =>
    request<AuthResult>('/api/auth/login/password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  loginOtp: (email: string, code: string) =>
    request<AuthResult>('/api/auth/login/otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  setPassword: (email: string, password: string, otp: string) =>
    request<AuthResult>('/api/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ email, password, otp }),
    }),

  resetPassword: (email: string, password: string, otp: string) =>
    request<{ passwordReset: boolean }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, password, otp }),
    }),

  /**
   * Redeems the one-time code from an `upgradexam://launch` deep link for a session here, so a
   * student who clicked their exam in the LMS never signs in twice. Single-use and short-lived —
   * a failure means the link expired or was already spent, and the student must click again.
   */
  ssoExchange: (code: string) =>
    request<AuthResult & { examId: string | null }>('/api/auth/sso/exchange', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  me: () => request<{ user: AuthUser; role: string }>('/api/auth/me'),

  logout: () =>
    request<{ loggedOut: boolean }>('/api/auth/logout', {
      method: 'POST',
      body: '{}',
    }),
}
