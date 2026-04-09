import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import { fetchPortalActivities, getMyTerritoryFeedback, type OrderFeedbackEntry, type PortalActivityEntry } from '../../api/activity'
import { getApiErrorMessage } from '../../api/client'
import { TerritoryManagerPortalShell } from '../../components/TerritoryManagerPortalShell'
import { useTmGuard } from '../../hooks/useTmGuard'

const surfaceClass =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

function activityTone(type: string) {
  if (type === 'ORDER_FEEDBACK') {
    return 'border-[#f0d070] bg-[#fffbec] text-[#7a5a00]'
  }
  if (type.includes('LOW_STOCK') || type.includes('REFILL')) {
    return 'border-[#f0c96d] bg-[#fff7df] text-[#8c5d0d]'
  }
  if (type.includes('COMPLETE')) {
    return 'border-[#cfe2c8] bg-[#f3fbef] text-[#4d6c45]'
  }
  if (type.includes('FEEDBACK')) {
    return 'border-[#b8d4e8] bg-[#f0f7fc] text-[#2e6b99]'
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

function StarRatingDark({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={18}
          strokeWidth={i < rating ? 0 : 1.5}
          className={i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}
        />
      ))}
    </div>
  )
}

export default function TmActivityCenterPage() {
  // ── FIXED: use useTmGuard instead of inline role check ──────────────────────
  const { user, isUnauthorized } = useTmGuard()
  const [activities, setActivities] = useState<PortalActivityEntry[]>([])
  const [feedbacks, setFeedbacks] = useState<OrderFeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  if (isUnauthorized) return <Navigate to="/" replace />

  useEffect(() => {
    Promise.all([
      fetchPortalActivities(),
      getMyTerritoryFeedback()
    ])
      .then(([activitiesResponse, feedbackResponse]) => {
        setActivities(activitiesResponse.activities)
        setFeedbacks(feedbackResponse)
      })
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

  const filteredActivities = useMemo(() =>
    activities.filter(a => a.type !== 'ORDER_FEEDBACK'),
  [activities])

  if (!user) return null

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

      {/* ── Shop Feedback Cards ─────────────────────────────────────────────── */}
      {feedbacks.length > 0 && (
        <div className="mt-8 mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#4d3020]">Shop Owner Feedback</h2>
            <span className="rounded-full bg-[#f0d070] px-3 py-1 text-sm font-bold text-[#7a5a00]">
              {feedbacks.length} Total
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {feedbacks.map((f) => (
              <div key={f.id} className="flex flex-col gap-3 rounded-2xl bg-slate-800 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-100">
                      {f.shopOwner.firstName} {f.shopOwner.lastName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Order #{f.order.id.substring(0, 8)}
                    </p>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    {formatTimestamp(f.createdAt)}
                  </p>
                </div>
                <div className="mt-1">
                  <StarRatingDark rating={f.rating} />
                </div>
                {f.comment && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-300 italic">
                    "{f.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-4 mt-8 text-xl font-bold text-[#4d3020]">General Activity</h2>
      <div className={surfaceClass}>
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-[#7f6657]">Loading activity...</p>
        ) : null}
        {error ? (
          <p className="px-5 py-10 text-center text-sm text-red-600">{error}</p>
        ) : null}
        {!loading && !error ? (
          <div className="flex flex-col gap-4 px-5 py-5">
            {filteredActivities.length === 0 ? (
              <div className="rounded-[1.3rem] border border-dashed border-[#d9c9bb] bg-[#fffaf7] px-5 py-8 text-center text-sm text-[#7f6657]">
                No activity recorded yet.
              </div>
            ) : null}
            {filteredActivities.map((activity) => (
              <article
                key={activity.id}
                className="rounded-[1.3rem] border px-5 py-4 border-[#eee2d7] bg-[#fffaf7]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-[#4d3020]">{activity.title}</p>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7f6657]">
                      {activity.message}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${activityTone(activity.type)}`}>
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
