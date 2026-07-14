import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, type AuthResult, type AuthUser } from '@/lib/api'
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  setAuthClearedListener,
} from '@/lib/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'guest'

type AuthState = {
  status: AuthStatus
  user: AuthUser | null
  role: string | null
  hydrated: boolean
  completeLogin: (result: AuthResult) => void
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

async function bootstrapSession() {
  const token = getAccessToken()
  if (!token) {
    useAuthStore.setState({ status: 'guest', user: null, role: null })
    return
  }

  try {
    const data = await authApi.me()
    useAuthStore.setState({
      user: data.user,
      role: data.role,
      status: 'authenticated',
    })
  } catch {
    clearAccessToken({ silent: true })
    useAuthStore.setState({
      user: null,
      role: null,
      status: 'guest',
    })
  }
}

function finishHydration() {
  if (useAuthStore.getState().hydrated) return

  if (!getAccessToken()) {
    useAuthStore.setState({
      hydrated: true,
      status: 'guest',
      user: null,
      role: null,
    })
    return
  }

  const current = useAuthStore.getState()
  useAuthStore.setState({
    hydrated: true,
    status: current.user ? 'authenticated' : 'authenticated',
  })
  void bootstrapSession()
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: 'loading',
      user: null,
      role: null,
      hydrated: false,

      completeLogin: (result) => {
        setAccessToken(result.accessToken)
        set({
          user: result.user,
          role: result.role,
          status: 'authenticated',
          hydrated: true,
        })
      },

      logout: async () => {
        try {
          await authApi.logout()
        } catch {
        }
        clearAccessToken({ silent: true })
        set({
          user: null,
          role: null,
          status: 'guest',
          hydrated: true,
        })
      },

      refreshMe: async () => {
        await bootstrapSession()
      },
    }),
    {
      name: 'exam-app-auth',
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        status: state.status === 'authenticated' ? 'authenticated' : 'guest',
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.error('auth rehydrate failed', error)
        finishHydration()
      },
    },
  ),
)

setAuthClearedListener(() => {
  useAuthStore.setState({
    user: null,
    role: null,
    status: 'guest',
    hydrated: true,
  })
})

if (useAuthStore.persist.hasHydrated()) {
  finishHydration()
} else {
  useAuthStore.persist.onFinishHydration(() => {
    finishHydration()
  })
}

window.setTimeout(() => {
  finishHydration()
}, 500)

export function useAuth() {
  const status = useAuthStore((s) => (s.hydrated ? s.status : 'loading'))
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const completeLogin = useAuthStore((s) => s.completeLogin)
  const logout = useAuthStore((s) => s.logout)
  const refreshMe = useAuthStore((s) => s.refreshMe)

  return { status, user, role, completeLogin, logout, refreshMe }
}
