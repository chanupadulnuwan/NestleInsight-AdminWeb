import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { fetchPortalActivities, type PortalActivityEntry } from '../../api/activity'
import { getApiErrorMessage } from '../../api/client'
import { TerritoryManagerPortalShell } from '../../components/TerritoryManagerPortalShell'
import { useAuth } from '../../context/AuthContext'

const surfaceClass =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

function activityTone(type: string) {
  if (type.includes('LOW_STOCK') || type.includes('REFILL')) {
    return 'border-[#f0c96d] bg-[#fff7df] text-[#8c5d0d]'
  }

  if (type.includes('COMPLETE')) {
    return 'border-[#cfe2c8] bg-[#f3fbef] text-[#4d6c45]'
  }

  if (type.includes('LOGOUT')) {
    return 'border-[#d7c5b6] bg-[#fff8f2] text-[#8b5a3a]'
  }

  if (type.includes('LOGIN')) {
    return 'border-[#d9d0f0] bg-[#f7f3ff] text-[#6b4ca0]'
  }

  if (type.includes('PENDING') || type.includes('APPROVED') || type.includes('ORDER_')) {
    return 'border-[#d7baa3] bg-[#fff8f2] text-[#8b5a3a]'
  }

  return 'border-[#ebdfd5] bg-[#fff9f5] text-[#7f6657]'
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString()
}

export default function TmActivityCenterPage() {
  const { user, isAuthLoading } = useAuth()
  const [activities, setActivities] = useState<PortalActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  if (!isAuthLoading && (!user || user.role !== 'REGIONAL_MANAGER')) {
    return <Navigate to="/" replace />
  }

  useEffect(() => {
    fetchPortalActivities()
      .then((response) => setActivities(response.activities))
      .catch((requestError) => setError(getApiErrorMessage(requestError)))
      .finally(() => setLoading(false))
  }, [])

  const groupedHighlights = useMemo(() => {
    return {
      total: activities.length,
      stockAlerts: activities.filter(
        (item) => item.type.includes('LOW_STOCK') || item.type.includes('REFILL'),
      ).length,
      completedOrders: activities.filter((item) => item.type.includes('ORDER_COMPLETED')).length,
      signIns: activities.filter((item) => item.type === 'LOGIN').length,
    }
  }, [activities])

  if (!user) {
    return null
  }

  return (
    <TerritoryManagerPortalShell
      user={user}
      breadcrumb="Territory Manager / Activity Center"
      title="Activity Center"
      description="Track warehouse alerts, account updates, completed orders, and your own sign-in and sign-out activity in one place."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['All activity', groupedHighlights.total],
          ['Refill alerts', groupedHighlights.stockAlerts],
          ['Completed orders', groupedHighlights.completedOrders],
          ['Sign-ins', groupedHighlights.signIns],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
            <p className="text-sm font-semibold text-[#8a6c58]">{label}</p>
            <p className="mt-2 text-[1.4rem] font-bold text-[#4d3020]">{value}</p>
          </div>
        ))}
      </div>

      <div className={surfaceClass}>
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-[#7f6657]">Loading activity...</p>
        ) : null}
        {error ? (
          <p className="px-5 py-10 text-center text-sm text-red-600">{error}</p>
        ) : null}
        {!loading && !error ? (
          <div className="flex flex-col gap-4 px-5 py-5">
            {activities.length === 0 ? (
              <div className="rounded-[1.3rem] border border-dashed border-[#d9c9bb] bg-[#fffaf7] px-5 py-8 text-center text-sm text-[#7f6657]">
                No activity has been recorded yet.
              </div>
            ) : null}

            {activities.map((activity) => (
              <article
                key={activity.id}
                className="rounded-[1.3rem] border border-[#eee2d7] bg-[#fffaf7] px-5 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[#4d3020]">{activity.title}</p>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7f6657]">
                      {activity.message}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${activityTone(activity.type)}`}
                  >
                    {activity.type.replaceAll('_', ' ')}
                  </span>
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-[#a37d63]">
                  {formatTimestamp(activity.createdAt)}
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </TerritoryManagerPortalShell>
  )
}
