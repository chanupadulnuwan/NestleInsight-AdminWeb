import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { forwardRef, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import {
  isPortalUserRole,
  loginPortalAccount,
  registerPortalAccount,
  resendPortalOtp,
  verifyPortalOtp,
  type WebPortalRole,
} from '../api/auth'
import { getApiErrorCode, getApiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'

type AuthView = 'login' | 'signup' | 'otp' | 'pending'
type FeedbackTone = 'error' | 'success' | 'info'

interface LoginFormValues {
  identifier: string
  password: string
}

interface SignupFormValues {
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  employeeId: string
  username: string
  role: WebPortalRole
  territory: string
  password: string
  confirmPassword: string
}

interface OtpFormValues {
  otp: string
}

interface OtpState {
  identifier: string
  password: string
  debugOtpCode?: string
  otpDeliveryMethod?: string
  title: string
  subtitle: string
}

interface AuthModalProps {
  isOpen: boolean
  initialView?: Extract<AuthView, 'login' | 'signup'>
  onClose: () => void
}

function Icon({ kind }: { kind: 'shield' | 'user' | 'mail' | 'phone' | 'badge' | 'hash' | 'map' | 'lock' | 'otp' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="none" stroke="currentColor" strokeWidth="1.8">
      {kind === 'shield' ? <path d="M12 3l7 3v6c0 4.5-2.7 7.9-7 9-4.3-1.1-7-4.5-7-9V6l7-3z" /> : null}
      {kind === 'user' ? (
        <>
          <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" />
          <path d="M4 20c1.8-3 4.5-4.5 8-4.5s6.2 1.5 8 4.5" />
        </>
      ) : null}
      {kind === 'mail' ? (
        <>
          <path d="M4 6h16v12H4z" />
          <path d="M4 8l8 6 8-6" />
        </>
      ) : null}
      {kind === 'phone' ? <path d="M6.5 4.5h3l1.5 4-2 1.5a14 14 0 006 6l1.5-2 4 1.5v3c0 .8-.6 1.5-1.5 1.5C10.4 20 4 13.6 4 6c0-.8.7-1.5 1.5-1.5z" /> : null}
      {kind === 'badge' ? (
        <>
          <rect x="5" y="4" width="14" height="16" rx="2.5" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </>
      ) : null}
      {kind === 'hash' ? <path d="M9 4L7 20M17 4l-2 16M4 9h16M3 15h16" /> : null}
      {kind === 'map' ? (
        <>
          <path d="M12 21s6-5.4 6-11a6 6 0 10-12 0c0 5.6 6 11 6 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </>
      ) : null}
      {kind === 'lock' ? (
        <>
          <rect x="5" y="10" width="14" height="10" rx="2.4" />
          <path d="M8.5 10V7.8a3.5 3.5 0 017 0V10" />
        </>
      ) : null}
      {kind === 'otp' ? (
        <>
          <path d="M7 10V7.8a5 5 0 0110 0V10" />
          <rect x="4" y="10" width="16" height="10" rx="2.5" />
          <path d="M10 15h4" />
        </>
      ) : null}
    </svg>
  )
}

function AuthCardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      {/* Website auth update: reuse the mobile app illustration inside the website modal so both surfaces feel connected. */}
      <img
        src="/images/auth-portal-illustration.png"
        alt="Nestle Insight portal illustration"
        className="mx-auto h-auto w-[13.5rem] max-w-full sm:w-[15rem]"
      />
      <h2 id="portal-auth-title" className="mt-2 text-[2.2rem] font-[700] leading-tight tracking-[-0.04em] text-[#5b4334] sm:text-[2.5rem]">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-[28rem] text-[0.99rem] leading-7 text-[#9c806d] sm:text-[1.03rem]">{subtitle}</p>
    </div>
  )
}

function NoticeCard({ kind, children }: { kind: 'shield' | 'otp' | 'lock'; children: ReactNode }) {
  return (
    <div className="rounded-[1.45rem] border border-[#e5ccb6] bg-[#f8ecdf] px-5 py-4 shadow-[0_14px_32px_rgba(125,83,42,0.08)]">
      <div className="flex items-start gap-3 text-[#876b56]">
        <span className="mt-0.5 shrink-0"><Icon kind={kind} /></span>
        <div className="text-[0.98rem] font-medium leading-7 text-[#6e5647]">{children}</div>
      </div>
    </div>
  )
}

function FeedbackBanner({ tone, message }: { tone: FeedbackTone; message: string }) {
  const toneClasses =
    tone === 'error'
      ? 'border-[#ebc0bb] bg-[#fff2f1] text-[#92524b]'
      : tone === 'success'
        ? 'border-[#cfe2c8] bg-[#f3fbef] text-[#4d6c45]'
        : 'border-[#e5ccb6] bg-[#f8ecdf] text-[#6e5647]'

  return <div className={`rounded-[1.1rem] border px-4 py-3 text-sm leading-6 ${toneClasses}`}>{message}</div>
}

function FieldShell({
  label,
  icon,
  error,
  helperText,
  children,
}: {
  label: string
  icon: ReactNode
  error?: string
  helperText?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="text-[0.95rem] font-semibold tracking-[0.01em] text-[#6a5244]">{label}</span>
      <span className={`mt-2 flex items-center gap-3 rounded-[1.15rem] border bg-white px-4 py-3.5 shadow-[0_14px_30px_rgba(88,49,18,0.04)] transition duration-300 focus-within:border-[#cf9566] focus-within:shadow-[0_16px_36px_rgba(153,103,52,0.12)] ${error ? 'border-[#dca6a1]' : 'border-[#e6ccb8]'}`}>
        <span className="shrink-0 text-[#9d7e68]">{icon}</span>
        {children}
      </span>
      {helperText ? <p className="mt-2 text-xs leading-5 text-[#a28371]">{helperText}</p> : null}
      {error ? <p className="mt-2 text-xs font-medium leading-5 text-[#ba6057]">{error}</p> : null}
    </label>
  )
}

const PortalInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label: string
    icon: ReactNode
    error?: string
    helperText?: string
    trailing?: ReactNode
  }
>(function PortalInput({ label, icon, error, helperText, trailing, ...inputProps }, ref) {
  return (
    <FieldShell label={label} icon={icon} error={error} helperText={helperText}>
      <input ref={ref} {...inputProps} className="w-full border-none bg-transparent text-[1rem] font-medium text-[#5a4435] outline-none placeholder:text-[#b79884]" />
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </FieldShell>
  )
})

const PortalSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & {
    label: string
    icon: ReactNode
    error?: string
    children: ReactNode
  }
>(function PortalSelect({ label, icon, error, children, ...selectProps }, ref) {
  return (
    <FieldShell label={label} icon={icon} error={error}>
      <select ref={ref} {...selectProps} className="w-full border-none bg-transparent text-[1rem] font-medium text-[#5a4435] outline-none">
        {children}
      </select>
    </FieldShell>
  )
})

PortalInput.displayName = 'PortalInput'
PortalSelect.displayName = 'PortalSelect'

function PasswordToggle({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full p-1 text-[#9d7e68] transition duration-300 hover:bg-[#f2e1d3] hover:text-[#6a5244]" aria-label={visible ? 'Hide password' : 'Show password'}>
      <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="none" stroke="currentColor" strokeWidth="1.8">
        {visible ? (
          <>
            <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z" />
            <circle cx="12" cy="12" r="2.5" />
          </>
        ) : (
          <>
            <path d="M4 4l16 16" />
            <path d="M3 12s3.5-5 9-5c2 0 3.8.6 5.2 1.4M21 12s-3.5 5-9 5c-2 0-3.8-.6-5.2-1.4" />
          </>
        )}
      </svg>
    </button>
  )
}

export default function AuthModal({ isOpen, initialView = 'login', onClose }: AuthModalProps) {
  const navigate = useNavigate()
  const { completeSession } = useAuth()
  const [activeView, setActiveView] = useState<AuthView>(initialView)
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null)
  const [otpState, setOtpState] = useState<OtpState | null>(null)
  const [pendingMessage, setPendingMessage] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false)
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false)
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false)
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false)
  const [isOtpResending, setIsOtpResending] = useState(false)

  const loginForm = useForm<LoginFormValues>({ defaultValues: { identifier: '', password: '' } })
  const signupForm = useForm<SignupFormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      email: '',
      employeeId: '',
      username: '',
      role: 'ADMIN',
      territory: '',
      password: '',
      confirmPassword: '',
    },
  })
  const otpForm = useForm<OtpFormValues>({ defaultValues: { otp: '' } })

  const selectedRole = signupForm.watch('role')
  const signupPassword = signupForm.watch('password')

  useEffect(() => {
    if (!isOpen) return
    setActiveView(initialView)
    setFeedback(null)
    setOtpState(null)
    setPendingMessage('')
    otpForm.reset({ otp: '' })
  }, [initialView, isOpen, otpForm])

  useEffect(() => {
    if (selectedRole !== 'REGIONAL_MANAGER') {
      signupForm.setValue('territory', '')
    }
  }, [selectedRole, signupForm])

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const goToLogin = () => {
    setFeedback(null)
    setActiveView('login')
  }

  const goToSignup = () => {
    setFeedback(null)
    setActiveView('signup')
  }

  const handlePortalLogin = loginForm.handleSubmit(async (values) => {
    setFeedback(null)
    setIsLoginSubmitting(true)
    try {
      const result = await loginPortalAccount(values)
      if (!result.accessToken || !result.user) throw new Error('Login completed without a valid session.')
      if (!isPortalUserRole(result.user.role)) throw new Error('This website is available only for Admins and Territory Managers.')
      completeSession(result.accessToken, result.user)
      onClose()
      navigate('/admin/dashboard')
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to log in right now.')
      const code = getApiErrorCode(error)
      if (code === 'OTP_REQUIRED' || message.toLowerCase().includes('otp')) {
        // Website auth update: keep OTP verification inside the same centered portal box.
        setOtpState({
          identifier: values.identifier.trim(),
          password: values.password,
          title: 'Verify your account',
          subtitle: `Enter the 6-digit OTP for ${values.identifier.trim()} to continue into the admin portal.`,
        })
        otpForm.reset({ otp: '' })
        setFeedback({ tone: 'info', message: 'Your account needs OTP verification before it can enter the web portal.' })
        setActiveView('otp')
      } else {
        setFeedback({ tone: 'error', message })
      }
    } finally {
      setIsLoginSubmitting(false)
    }
  })

  const handlePortalSignup = signupForm.handleSubmit(async (values) => {
    setFeedback(null)
    setIsSignupSubmitting(true)
    try {
      const result = await registerPortalAccount({
        ...values,
        territory: values.role === 'REGIONAL_MANAGER' ? values.territory : undefined,
      })

      if (result.otpRequired) {
        // Website auth update: admin signup now flows directly from register to OTP to the dummy dashboard.
        setOtpState({
          identifier: values.email.trim(),
          password: values.password,
          debugOtpCode: result.debugOtpCode,
          otpDeliveryMethod: result.otpDeliveryMethod,
          title: 'Verify your account',
          subtitle: `Enter the 6-digit OTP for ${values.email.trim()} to finish creating your admin portal account.`,
        })
        otpForm.reset({ otp: '' })
        setFeedback({ tone: 'info', message: result.message })
        setActiveView('otp')
      } else {
        setPendingMessage(`${result.message} Once an admin approves the request, log in here and complete OTP verification.`)
        setActiveView('pending')
      }
    } catch (error) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(error, 'Unable to create the account right now.') })
    } finally {
      setIsSignupSubmitting(false)
    }
  })

  const handleOtpVerification = otpForm.handleSubmit(async (values) => {
    if (!otpState) return
    setFeedback(null)
    setIsOtpSubmitting(true)
    try {
      await verifyPortalOtp({ identifier: otpState.identifier, otp: values.otp })
      const loginResult = await loginPortalAccount({ identifier: otpState.identifier, password: otpState.password })
      if (!loginResult.accessToken || !loginResult.user) throw new Error('Your OTP was verified, but login could not be completed yet.')
      if (!isPortalUserRole(loginResult.user.role)) throw new Error('This website is available only for Admins and Territory Managers.')
      completeSession(loginResult.accessToken, loginResult.user)
      onClose()
      navigate('/admin/dashboard')
    } catch (error) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(error, 'Unable to verify OTP right now.') })
    } finally {
      setIsOtpSubmitting(false)
    }
  })

  const handleResendOtp = async () => {
    if (!otpState) return
    setFeedback(null)
    setIsOtpResending(true)
    try {
      const result = await resendPortalOtp(otpState.identifier)
      setOtpState((current) => (current ? { ...current, debugOtpCode: result.debugOtpCode, otpDeliveryMethod: result.otpDeliveryMethod } : current))
      setFeedback({ tone: 'success', message: result.message })
    } catch (error) {
      setFeedback({ tone: 'error', message: getApiErrorMessage(error, 'Unable to resend the OTP right now.') })
    } finally {
      setIsOtpResending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6 sm:px-6">
      {/* Website auth update: blur the background page whenever the Login button opens the portal modal. */}
      <button type="button" onClick={onClose} className="absolute inset-0 bg-[#140704]/58 backdrop-blur-[11px]" aria-label="Close admin portal" />

      {/* Animation layer: keep the portal entrance subtle with the same smooth rise motion style used on the homepage hero. */}
      <div className="animate-rise relative z-10 w-full max-w-[38rem] overflow-hidden rounded-[2rem] border border-[#ead6c6] bg-[#fffaf5] shadow-[0_38px_120px_rgba(48,22,10,0.34)]">
        <div className="max-h-[90vh] overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
          <div className="mb-3 flex justify-end">
            <button type="button" onClick={onClose} className="rounded-full border border-[#ead6c6] bg-white px-3 py-1.5 text-sm font-semibold text-[#7c6352] transition duration-300 hover:border-[#c9966c] hover:text-[#5b4334]">
              Close
            </button>
          </div>

          <div className="mx-auto flex max-w-[31rem] flex-col gap-6">
            {activeView === 'login' ? (
              <>
                <AuthCardHeader title="Admin Portal" subtitle="Secure web access for distribution administrators and territory managers." />
                <NoticeCard kind="shield">Signup and login for this site are available only for Admins and Territory Managers.</NoticeCard>
                {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}
                <form className="space-y-4" onSubmit={handlePortalLogin}>
                  <PortalInput
                    label="Email / Username"
                    icon={<Icon kind="user" />}
                    placeholder="Enter your email, username, or telephone number"
                    autoComplete="username"
                    error={loginForm.formState.errors.identifier?.message}
                    {...loginForm.register('identifier', { required: 'Email, username, or telephone number is required.' })}
                  />
                  <PortalInput
                    label="Password"
                    icon={<Icon kind="lock" />}
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    error={loginForm.formState.errors.password?.message}
                    trailing={<PasswordToggle visible={showLoginPassword} onClick={() => setShowLoginPassword((value) => !value)} />}
                    {...loginForm.register('password', { required: 'Password is required.' })}
                  />
                  <button type="submit" disabled={isLoginSubmitting} className="mt-2 inline-flex w-full items-center justify-center rounded-[1.2rem] bg-[#9a785f] px-5 py-4 text-[1.06rem] font-semibold text-white transition duration-300 hover:bg-[#876750] disabled:cursor-not-allowed disabled:opacity-70">
                    {isLoginSubmitting ? 'Logging in...' : 'Log in'}
                  </button>
                </form>
                <div className="text-center text-[0.98rem] text-[#9b7e6b]">
                  Don&apos;t have an account?{' '}
                  <button type="button" onClick={goToSignup} className="font-semibold text-[#6a4f3d] transition duration-300 hover:text-[#9a785f]">
                    Create an account
                  </button>
                </div>
              </>
            ) : null}

            {activeView === 'signup' ? (
              <>
                <AuthCardHeader title="Create your account" subtitle="Fill in your details, verify OTP, and start using the INSIGHT admin portal." />
                <NoticeCard kind="shield">If you are Shop owner or Territory Distributor, use the Nestle Insight mobile app.</NoticeCard>
                {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}
                <form className="space-y-5" onSubmit={handlePortalSignup}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PortalInput label="First name" icon={<Icon kind="user" />} placeholder="Enter your first name" autoComplete="given-name" error={signupForm.formState.errors.firstName?.message} {...signupForm.register('firstName', { required: 'First name is required.' })} />
                    <PortalInput label="Last name" icon={<Icon kind="user" />} placeholder="Enter your last name" autoComplete="family-name" error={signupForm.formState.errors.lastName?.message} {...signupForm.register('lastName', { required: 'Last name is required.' })} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PortalInput label="Telephone number" icon={<Icon kind="phone" />} placeholder="+94XXXXXXXXX" autoComplete="tel" error={signupForm.formState.errors.phoneNumber?.message} {...signupForm.register('phoneNumber', { required: 'Telephone number is required.', pattern: { value: /^\+?[0-9]{10,15}$/, message: 'Use a valid telephone number.' } })} />
                    <PortalInput label="Email" icon={<Icon kind="mail" />} placeholder="name@example.com" autoComplete="email" error={signupForm.formState.errors.email?.message} {...signupForm.register('email', { required: 'Email is required.', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Use a valid email address.' } })} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PortalInput label="Employee ID" icon={<Icon kind="badge" />} placeholder="Enter your employee ID" error={signupForm.formState.errors.employeeId?.message} {...signupForm.register('employeeId', { required: 'Employee ID is required.' })} />
                    <PortalInput label="User name" icon={<Icon kind="hash" />} placeholder="Choose a user name" autoComplete="username" helperText="Letters, numbers, and underscores only." error={signupForm.formState.errors.username?.message} {...signupForm.register('username', { required: 'User name is required.', minLength: { value: 4, message: 'User name must be at least 4 characters.' }, pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Use only letters, numbers, and underscores.' } })} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PortalSelect label="Role" icon={<Icon kind="shield" />} error={signupForm.formState.errors.role?.message} {...signupForm.register('role', { required: 'Role is required.' })}>
                      <option value="ADMIN">Admin</option>
                      <option value="REGIONAL_MANAGER">Territory Manager</option>
                    </PortalSelect>
                    {selectedRole === 'REGIONAL_MANAGER' ? (
                      <PortalInput label="Territory" icon={<Icon kind="map" />} placeholder="Enter the assigned territory" error={signupForm.formState.errors.territory?.message} {...signupForm.register('territory', { validate: (value) => selectedRole !== 'REGIONAL_MANAGER' || value.trim() ? true : 'Territory is required for Territory Managers.' })} />
                    ) : (
                      <div className="rounded-[1.3rem] border border-dashed border-[#e6ccb8] bg-[#fffdfb] px-4 py-5 text-sm leading-6 text-[#a48673]">Admin accounts go straight to OTP verification after signup.</div>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PortalInput label="Password" icon={<Icon kind="lock" />} type={showSignupPassword ? 'text' : 'password'} placeholder="Create a strong password" autoComplete="new-password" helperText="At least 8 characters with uppercase, lowercase, and a number." error={signupForm.formState.errors.password?.message} trailing={<PasswordToggle visible={showSignupPassword} onClick={() => setShowSignupPassword((value) => !value)} />} {...signupForm.register('password', { required: 'Password is required.', minLength: { value: 8, message: 'Password must be at least 8 characters.' }, pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, message: 'Use uppercase, lowercase, and a number.' } })} />
                    <PortalInput label="Confirm password" icon={<Icon kind="lock" />} type={showSignupConfirmPassword ? 'text' : 'password'} placeholder="Enter the password again" autoComplete="new-password" error={signupForm.formState.errors.confirmPassword?.message} trailing={<PasswordToggle visible={showSignupConfirmPassword} onClick={() => setShowSignupConfirmPassword((value) => !value)} />} {...signupForm.register('confirmPassword', { required: 'Please confirm the password.', validate: (value) => value === signupPassword ? true : 'Passwords do not match.' })} />
                  </div>
                  <button type="submit" disabled={isSignupSubmitting} className="inline-flex w-full items-center justify-center rounded-[1.2rem] bg-[#9a785f] px-5 py-4 text-[1.06rem] font-semibold text-white transition duration-300 hover:bg-[#876750] disabled:cursor-not-allowed disabled:opacity-70">
                    {isSignupSubmitting ? 'Creating account...' : 'Create account'}
                  </button>
                </form>
                <div className="text-center text-[0.98rem] text-[#9b7e6b]">
                  Already have an account?{' '}
                  <button type="button" onClick={goToLogin} className="font-semibold text-[#6a4f3d] transition duration-300 hover:text-[#9a785f]">
                    Log in
                  </button>
                </div>
              </>
            ) : null}

            {activeView === 'otp' && otpState ? (
              <>
                <AuthCardHeader title={otpState.title} subtitle={otpState.subtitle} />
                <NoticeCard kind="otp">
                  {otpState.otpDeliveryMethod === 'debug' || otpState.debugOtpCode
                    ? 'This backend is using a development OTP right now. Use the code shown below, or connect SMTP on the backend to send real OTP emails.'
                    : `We sent a 6-digit OTP for ${otpState.identifier}. Enter it here to continue.`}
                </NoticeCard>
                {otpState.debugOtpCode ? <NoticeCard kind="lock">Development OTP: {otpState.debugOtpCode}</NoticeCard> : null}
                {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}
                <form className="space-y-4" onSubmit={handleOtpVerification}>
                  <PortalInput label="OTP code" icon={<Icon kind="otp" />} placeholder="Enter 6 digits" inputMode="numeric" error={otpForm.formState.errors.otp?.message} {...otpForm.register('otp', { required: 'OTP code is required.', pattern: { value: /^\d{6}$/, message: 'Enter the 6-digit OTP.' } })} />
                  <button type="submit" disabled={isOtpSubmitting} className="inline-flex w-full items-center justify-center rounded-[1.2rem] bg-[#9a785f] px-5 py-4 text-[1.06rem] font-semibold text-white transition duration-300 hover:bg-[#876750] disabled:cursor-not-allowed disabled:opacity-70">
                    {isOtpSubmitting ? 'Verifying OTP...' : 'Verify OTP'}
                  </button>
                  <button type="button" onClick={handleResendOtp} disabled={isOtpResending} className="inline-flex w-full items-center justify-center rounded-[1.2rem] border border-[#dcb89b] bg-white px-5 py-4 text-[1rem] font-semibold text-[#7a5e4c] transition duration-300 hover:border-[#c9966c] hover:text-[#5b4334] disabled:cursor-not-allowed disabled:opacity-70">
                    {isOtpResending ? 'Resending OTP...' : 'Resend OTP'}
                  </button>
                </form>
                <div className="text-center">
                  <button type="button" onClick={goToLogin} className="text-[0.98rem] font-semibold text-[#6a4f3d] transition duration-300 hover:text-[#9a785f]">
                    Back to log in
                  </button>
                </div>
              </>
            ) : null}

            {activeView === 'pending' ? (
              <>
                <AuthCardHeader title="Request submitted" subtitle="Your website account request is now waiting for an administrator review." />
                <NoticeCard kind="shield">{pendingMessage}</NoticeCard>
                <div className="rounded-[1.45rem] border border-dashed border-[#e4cbb7] bg-white px-5 py-4 text-[0.98rem] leading-7 text-[#876b56]">If you are a Shop owner or Territory Distributor, continue through the Nestle Insight mobile app instead of this website.</div>
                <button type="button" onClick={goToLogin} className="inline-flex w-full items-center justify-center rounded-[1.2rem] bg-[#9a785f] px-5 py-4 text-[1.06rem] font-semibold text-white transition duration-300 hover:bg-[#876750]">
                  Back to log in
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
