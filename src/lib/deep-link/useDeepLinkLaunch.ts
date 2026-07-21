import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { DeepLinkPayload } from './types'

/**
 * Signs the student in from an LMS deep link and takes them straight to the exam.
 *
 * The LMS "Start exam" button opens `upgradexam://launch?code=…&examId=…`; the main process routes
 * it here. We trade the one-time code for this app's session and land on the pre-exam gate, which
 * is where the system checks and proctoring consent live — never directly into the paper.
 *
 * The code is single-use, so an arriving link is redeemed exactly once: `redeeming` guards against
 * a second delivery (macOS can emit `open-url` again on focus) racing the first and burning a code
 * that has already produced a session.
 */
export function useDeepLinkLaunch() {
  const navigate = useNavigate()
  const { completeLogin } = useAuth()
  const redeeming = useRef(false)
  const seenCodes = useRef(new Set<string>())

  useEffect(() => {
    const launcher = window.examLauncher
    if (!launcher?.onDeepLink) return

    const handle = async (payload: DeepLinkPayload) => {
      const code = payload?.code
      if (!code || redeeming.current || seenCodes.current.has(code)) return
      redeeming.current = true
      seenCodes.current.add(code)

      try {
        const result = await authApi.ssoExchange(code)
        completeLogin(result)
        const examId = payload.examId || result.examId
        navigate(examId ? `/exams/${examId}/start` : '/home', { replace: true })
      } catch (error) {
        console.error('[deep-link] SSO exchange failed', error)
        // A dead or spent code just drops the student at sign-in rather than a blank screen.
        navigate('/login', { replace: true })
      } finally {
        redeeming.current = false
      }
    }

    return launcher.onDeepLink((payload) => {
      void handle(payload)
    })
  }, [completeLogin, navigate])
}
