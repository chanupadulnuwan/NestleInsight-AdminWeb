import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { changePortalPassword } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import { AdminPortalShell } from '../components/AdminPortalShell'
import { useAuth } from '../context/AuthContext'

const surfaceClass =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

export default function AdminSettingsPage() {
  const { user, isAuthLoading } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isAuthLoading && (!user || user.role !== 'ADMIN')) {
    return <Navigate to="/" replace />
  }

  if (!user) return null

  const handlePasswordSave = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError('Fill in all password fields before saving.')
      return
    }

    setSaving(true)
    setError(null)
    setFeedback(null)

    try {
      const response = await changePortalPassword({ currentPassword, newPassword, confirmNewPassword })
      setFeedback(response.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPortalShell
      user={user}
      breadcrumb="Admin · Settings"
      title="Settings"
      description="Manage security for your admin account."
    >
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className={`${surfaceClass} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
            Security
          </p>
          <h2 className="mt-3 text-[1.75rem] font-bold tracking-[-0.04em] text-[#4d3020]">
            Change your password
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#7f6657]">
            Use your current password plus a stronger replacement to keep the admin portal secure.
          </p>

          <div className="mt-6 grid gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">
                Current password
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">
                New password
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">
                Confirm new password
              </span>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
              />
            </label>
          </div>

          {feedback ? (
            <div className="mt-4 rounded-[1rem] border border-[#d7c5b6] bg-[#fff8f2] px-4 py-3 text-sm text-[#6e5647]">
              {feedback}
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">
              {error}
            </div>
          ) : null}

          <div className="mt-5">
            <button
              type="button"
              onClick={() => void handlePasswordSave()}
              disabled={saving}
              className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save password'}
            </button>
          </div>
        </article>

        <article className={`${surfaceClass} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
            Password requirements
          </p>
          <div className="mt-5 space-y-3 text-sm leading-7 text-[#7f6657]">
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              Use at least 8 characters for a strong password.
            </div>
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              Mix letters, numbers, and symbols for better security.
            </div>
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              Do not reuse recent passwords.
            </div>
          </div>
        </article>
      </section>
    </AdminPortalShell>
  )
}
