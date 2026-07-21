import { FormEvent, useState } from 'react'
import { logoUrl, logoWhiteUrl, loginHeroUrl } from '@/assets/brand'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ApiError, authApi, type LookupResult } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

const emailSchema = z.string().trim().email('Enter a valid email')

const STEPS = {
  EMAIL: 'email',
  PASSWORD: 'password',
  OTP: 'otp',
  SET_PASSWORD: 'set-password',
  VERIFY_SET_PASSWORD: 'verify-set-password',
  RESET_PASSWORD: 'reset-password',
} as const

type Step = (typeof STEPS)[keyof typeof STEPS]

export default function LoginPage() {
  const navigate = useNavigate()
  const { completeLogin } = useAuth()

  const [step, setStep] = useState<Step>(STEPS.EMAIL)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [lookup, setLookup] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const inputClass =
    'mt-2 block w-full rounded-sm border-0 bg-[#f5f0f0] px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-2 focus:ring-red-500'
  const labelClass = 'block text-sm font-medium text-gray-700'
  const primaryButtonClass =
    'w-full rounded-md bg-[#df2428] py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#c91f23] disabled:cursor-not-allowed disabled:opacity-60'
  const linkButtonClass =
    'text-sm font-medium text-red-600 underline-offset-2 transition hover:text-red-700 hover:underline'

  const catchError = (err: unknown) => {
    if (err instanceof ApiError) setError(err.message)
    else if (err instanceof Error) setError(err.message)
    else setError('Something went wrong')
  }

  const resetToEmail = () => {
    setStep(STEPS.EMAIL)
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setOtp('')
    setLookup(null)
    setOtpSent(false)
    setError(null)
    setSuccessMessage(null)
  }

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setPassword('')
    setConfirmPassword('')
    setOtp('')
    setOtpSent(false)

    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message || 'Invalid email')
      return
    }

    setLoading(true)
    try {
      setEmail(parsed.data)
      const result = await authApi.lookup(parsed.data)
      setLookup(result)
      setStep(result.hasPassword ? STEPS.PASSWORD : STEPS.SET_PASSWORD)
    } catch (err) {
      catchError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async (
    purpose: 'login' | 'set-password' | 'reset-password',
    targetEmail = email,
  ) => {
    setError(null)
    setSuccessMessage(null)
    setOtpSent(false)
    setLoading(true)
    try {
      await authApi.sendOtp(targetEmail, purpose)
      setOtpSent(true)
      return true
    } catch (err) {
      catchError(err)
      return false
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const result = await authApi.loginPassword(email, password)
      completeLogin(result)
      navigate(result.redirectTo || '/home', { replace: true })
    } catch (err) {
      catchError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setLoading(true)
    try {
      const result = await authApi.loginOtp(email, otp)
      completeLogin(result)
      navigate(result.redirectTo || '/home', { replace: true })
    } catch (err) {
      catchError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePassword = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setOtp('')
    setOtpSent(false)
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    const sent = await handleSendOtp('set-password')
    if (sent) setStep(STEPS.VERIFY_SET_PASSWORD)
  }

  const handleVerifySetPassword = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    if (!otp.trim()) {
      setError('Enter the verification code sent to your email')
      return
    }
    setLoading(true)
    try {
      const result = await authApi.setPassword(email, password, otp)
      completeLogin(result)
      navigate(result.redirectTo || '/home', { replace: true })
    } catch (err) {
      catchError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setPassword('')
    setConfirmPassword('')
    setOtp('')
    setSuccessMessage(null)
    setStep(STEPS.RESET_PASSWORD)
    await handleSendOtp('reset-password')
  }

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!otp.trim()) {
      setError('Enter the verification code sent to your email')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword(email, password, otp)
      setPassword('')
      setConfirmPassword('')
      setOtp('')
      setOtpSent(false)
      setStep(STEPS.PASSWORD)
      setSuccessMessage('Password reset successfully. Please sign in with your new password.')
    } catch (err) {
      catchError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f8f9fb]">
      <div className="relative hidden flex-col overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(226,35,39,0.22),transparent_32%),linear-gradient(180deg,#120000_0%,#030303_52%,#000_100%)] lg:flex lg:w-[49%]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.9)]" />
        <div className="relative z-10 flex h-full flex-col px-8 py-7">
          <img
            src={logoWhiteUrl}
            alt="upGrad School of Technology"
            className="h-auto w-36 object-contain"
            width={144}
            height={52}
          />
          <div className="flex flex-1 items-center justify-center px-4">
            <img
              src={loginHeroUrl}
              alt="Digital learning platform illustration"
              className="h-auto w-full max-w-[520px] object-contain drop-shadow-[0_24px_80px_rgba(226,35,39,0.25)]"
              width={520}
              height={520}
            />
          </div>
          <p className="mx-auto max-w-md pb-8 text-center text-lg leading-relaxed text-white/90">
            &quot;Designing the future of technology,
            <br />
            one graduate at a time.&quot;
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-6 py-10 lg:w-[51%]">
        <div className="w-full max-w-[550px]">
          <div className="mb-10 lg:hidden">
            <img
              src={logoUrl}
              alt="upGrad School of Technology"
              className="h-auto w-44 rounded"
              width={176}
              height={64}
            />
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold leading-tight text-[#df2428] sm:text-4xl">
              Welcome to upGrad School of Technology
            </h1>
            <p className="mt-4 text-sm text-gray-700 sm:text-base">
              Continue your learning journey and build industry ready skills for the future.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          {step === STEPS.EMAIL && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email*
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  placeholder="Enter your email address"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className={primaryButtonClass}>
                {loading ? 'Checking…' : 'Sign In'}
              </button>
            </form>
          )}

          {step === STEPS.PASSWORD && (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <button type="button" className={linkButtonClass} onClick={resetToEmail}>
                Use a different email
              </button>
              <div>
                <label className={labelClass}>Email*</label>
                <input
                  type="email"
                  className={`${inputClass} cursor-not-allowed text-gray-500`}
                  value={email}
                  readOnly
                />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Enter your password"
                    className={`${inputClass} pr-12`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-3 mt-2 flex items-center text-gray-500 transition hover:text-gray-700"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className={primaryButtonClass}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <div className="text-right">
                <button
                  type="button"
                  disabled={loading}
                  className={linkButtonClass}
                  onClick={handleForgotPassword}
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          )}

          {step === STEPS.OTP && (
            <form onSubmit={handleOtpLogin} className="space-y-5">
              <button
                type="button"
                className={linkButtonClass}
                onClick={() => {
                  if (lookup?.hasPassword) {
                    setStep(STEPS.PASSWORD)
                    return
                  }
                  resetToEmail()
                }}
              >
                Back
              </button>
              {otpSent && (
                <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  Code sent to {email}.
                </p>
              )}
              <div>
                <label className={labelClass}>Verification code</label>
                <input
                  inputMode="numeric"
                  required
                  autoFocus
                  placeholder="Enter verification code"
                  className={`${inputClass} tracking-widest`}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className={primaryButtonClass}>
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>
              <button
                type="button"
                disabled={loading}
                className={linkButtonClass}
                onClick={() => handleSendOtp('login')}
              >
                Resend code
              </button>
            </form>
          )}

          {step === STEPS.SET_PASSWORD && (
            <form onSubmit={handleCreatePassword} className="space-y-5">
              <button type="button" className={linkButtonClass} onClick={resetToEmail}>
                Use a different email
              </button>
              <p className="text-sm leading-6 text-gray-700">
                First-time login detected. Create a password for your account, then we&apos;ll verify
                your email with a one-time code.
              </p>
              <div>
                <label className={labelClass}>Email*</label>
                <input
                  type="email"
                  className={`${inputClass} cursor-not-allowed text-gray-500`}
                  value={email}
                  readOnly
                />
              </div>
              <div>
                <label className={labelClass}>New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create your password"
                    className={`${inputClass} pr-12`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-3 mt-2 flex items-center text-gray-500 transition hover:text-gray-700"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Confirm password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Confirm your password"
                  className={inputClass}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className={primaryButtonClass}>
                {loading ? 'Sending code…' : 'Continue to OTP Verification'}
              </button>
            </form>
          )}

          {step === STEPS.VERIFY_SET_PASSWORD && (
            <form onSubmit={handleVerifySetPassword} className="space-y-5">
              <button
                type="button"
                className={linkButtonClass}
                onClick={() => {
                  setStep(STEPS.SET_PASSWORD)
                  setOtp('')
                  setOtpSent(false)
                }}
              >
                Back to create password
              </button>
              <p className="text-sm leading-6 text-gray-700">
                Enter the verification code sent to {email} to finish creating your account.
              </p>
              {otpSent && (
                <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  Code sent to {email}.
                </p>
              )}
              <div>
                <label className={labelClass}>Email OTP</label>
                <input
                  inputMode="numeric"
                  required
                  autoFocus
                  placeholder="Enter verification code"
                  className={`${inputClass} tracking-widest`}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={linkButtonClass}
                onClick={() => handleSendOtp('set-password')}
                disabled={loading}
              >
                Resend verification code
              </button>
              <button type="submit" disabled={loading} className={primaryButtonClass}>
                {loading ? 'Verifying…' : 'Verify & Create Account'}
              </button>
            </form>
          )}

          {step === STEPS.RESET_PASSWORD && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <button
                type="button"
                className={linkButtonClass}
                onClick={() => {
                  setStep(STEPS.PASSWORD)
                  setPassword('')
                  setConfirmPassword('')
                  setOtp('')
                  setOtpSent(false)
                }}
              >
                Back to sign in
              </button>
              <p className="text-sm leading-6 text-gray-700">
                Enter the verification code sent to {email}, then create a new password.
              </p>
              {otpSent && (
                <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  Code sent to {email}.
                </p>
              )}
              <div>
                <label className={labelClass}>New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create your new password"
                    className={`${inputClass} pr-12`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-3 mt-2 flex items-center text-gray-500 transition hover:text-gray-700"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Confirm password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Confirm your new password"
                  className={inputClass}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Email OTP</label>
                <input
                  inputMode="numeric"
                  required
                  placeholder="Enter verification code"
                  className={inputClass}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={linkButtonClass}
                onClick={() => handleSendOtp('reset-password')}
                disabled={loading}
              >
                Resend verification code
              </button>
              <button type="submit" disabled={loading} className={primaryButtonClass}>
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
