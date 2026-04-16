import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import {
  createPromotion,
  fetchPromotions,
  updatePromotion,
  type DiscountType,
  type PromotionPayload,
  type PromotionRecord,
  type PromotionStatus,
  type PromotionType,
} from '../api/promotions'
import { fetchProducts, type ProductRecord } from '../api/products'
import { fetchTerritories, type TerritoryRecord } from '../api/territories'
import { useAuth } from '../context/AuthContext'

// ─── helpers ────────────────────────────────────────────────────────────────

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatPromoType(t: string) {
  return t
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ─── status badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-[#f0f0f0] text-[#6b6b6b] border-[#d8d8d8]',
  scheduled: 'bg-[#e8f0fe] text-[#1a56db] border-[#bed3fc]',
  active: 'bg-[#e6f9ef] text-[#1a6b3c] border-[#a3e4bc]',
  expired: 'bg-[#fff4e5] text-[#b45309] border-[#fad5a5]',
  disabled: 'bg-[#fef2f2] text-[#b91c1c] border-[#fca5a5]',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? STATUS_STYLES.draft
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── toast ───────────────────────────────────────────────────────────────────

interface ToastState {
  message: string
  type: 'success' | 'error'
}

// ─── empty form ──────────────────────────────────────────────────────────────

const EMPTY_FORM: PromotionPayload = {
  name: '',
  code: '',
  description: '',
  startDate: '',
  endDate: '',
  status: 'draft',
  promotionType: 'auto_applied',
  discountType: 'percentage',
  discountValue: 0,
  minQuantity: null,
  minOrderValue: null,
  usageLimit: null,
  perShopLimit: null,
  eligibleProductIds: [],
  eligibleTerritoryIds: [],
}

// ─── multi-select pill component ─────────────────────────────────────────────

interface MultiSelectProps {
  label: string
  items: Array<{ id: string; label: string }>
  selected: string[]
  onChange: (ids: string[]) => void
  id: string
}

function MultiSelect({ label, items, selected, onChange, id }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  const selectedLabels = items.filter((i) => selected.includes(i.id)).map((i) => i.label)

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">
        {label}
      </label>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-[0.85rem] border border-[#e6ccb8] bg-[#fffdfb] px-3 py-2.5 text-left text-sm text-[#5a4435] outline-none transition duration-200 focus:border-[#cf9566]"
      >
        {selectedLabels.length === 0 ? (
          <span className="text-[#b8a090]">None selected</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {selectedLabels.map((l) => (
              <span
                key={l}
                className="rounded-full bg-[#f3b539]/20 px-2 py-0.5 text-xs font-medium text-[#7a4f1a]"
              >
                {l}
              </span>
            ))}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-[0.85rem] border border-[#e6ccb8] bg-white py-1 shadow-[0_12px_24px_rgba(59,31,15,0.12)]">
          {items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[#b8a090]">No items available</p>
          ) : (
            items.map((item) => {
              const checked = selected.includes(item.id)
              return (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-[#fff4e8]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item.id)}
                    className="h-3.5 w-3.5 rounded accent-[#8b5a3a]"
                  />
                  <span className="text-[#5a4435]">{item.label}</span>
                </label>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ─── field helpers ───────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  id: string
  required?: boolean
  children: React.ReactNode
}

function Field({ label, id, required, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6c58]"
      >
        {label}
        {required && <span className="ml-1 text-[#b91c1c]">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-[0.85rem] border border-[#e6ccb8] bg-[#fffdfb] px-3 py-2.5 text-sm text-[#5a4435] outline-none transition duration-200 focus:border-[#cf9566] placeholder:text-[#c4ada0]'

// ─── main component ───────────────────────────────────────────────────────────

export default function PromotionManagement() {
  const navigate = useNavigate()
  const { user, isAuthLoading } = useAuth()

  // table state
  const [promotions, setPromotions] = useState<PromotionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tableError, setTableError] = useState<string | null>(null)

  // reference data
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [territories, setTerritories] = useState<TerritoryRecord[]>([])

  // modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PromotionRecord | null>(null)
  const [form, setForm] = useState<PromotionPayload>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // status action
  const [statusActionId, setStatusActionId] = useState<string | null>(null)

  // toast
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  // ── data fetching ──────────────────────────────────────────────────────────

  async function loadPromotions() {
    setIsLoading(true)
    setTableError(null)
    try {
      const data = await fetchPromotions()
      setPromotions(Array.isArray(data) ? data : [])
    } catch (err) {
      setTableError(getApiErrorMessage(err, 'Failed to load promotions.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPromotions()

    // pre-fetch reference data for the form
    fetchProducts()
      .then((r) => setProducts(r.products ?? []))
      .catch(() => setProducts([]))

    fetchTerritories()
      .then((r) => setTerritories(r.territories ?? []))
      .catch(() => setTerritories([]))
  }, [])

  // ── modal helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setModalError(null)
    setIsModalOpen(true)
  }

  function openEdit(promotion: PromotionRecord) {
    setEditTarget(promotion)
    setForm({
      name: promotion.name,
      code: promotion.code ?? '',
      description: promotion.description ?? '',
      startDate: toDateInputValue(promotion.startDate),
      endDate: toDateInputValue(promotion.endDate),
      status: promotion.status as PromotionStatus,
      promotionType: promotion.promotionType as PromotionType,
      discountType: promotion.discountType as DiscountType,
      discountValue: Number(promotion.discountValue),
      minQuantity: promotion.minQuantity,
      minOrderValue: promotion.minOrderValue != null ? Number(promotion.minOrderValue) : null,
      usageLimit: promotion.usageLimit,
      perShopLimit: promotion.perShopLimit,
      eligibleProductIds: [],
      eligibleTerritoryIds: [],
    })
    setModalError(null)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setModalError(null)
  }

  function setField<K extends keyof PromotionPayload>(key: K, value: PromotionPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // ── submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setModalError(null)

    const payload: PromotionPayload = {
      ...form,
      code: form.code?.trim() || undefined,
      description: form.description?.trim() || undefined,
      discountValue: Number(form.discountValue),
      minQuantity: form.minQuantity ? Number(form.minQuantity) : null,
      minOrderValue: form.minOrderValue != null ? Number(form.minOrderValue) : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      perShopLimit: form.perShopLimit ? Number(form.perShopLimit) : null,
    }

    try {
      if (editTarget) {
        await updatePromotion(editTarget.id, payload)
        showToast('Promotion updated successfully.')
      } else {
        await createPromotion(payload)
        showToast('Promotion created successfully.')
      }
      closeModal()
      await loadPromotions()
    } catch (err) {
      setModalError(getApiErrorMessage(err, 'Failed to save promotion.'))
    } finally {
      setIsSaving(false)
    }
  }

  // ── status actions ─────────────────────────────────────────────────────────

  async function handleStatusChange(id: string, newStatus: PromotionStatus) {
    setStatusActionId(id)
    try {
      await updatePromotion(id, { status: newStatus })
      showToast(`Promotion ${newStatus === 'active' ? 'activated' : 'disabled'}.`)
      await loadPromotions()
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Status update failed.'), 'error')
    } finally {
      setStatusActionId(null)
    }
  }

  // ── guard ──────────────────────────────────────────────────────────────────

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[#6e5647]">
        Loading…
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    navigate('/admin/dashboard', { replace: true })
    return null
  }

  // ─── render ─────────────────────────────────────────────────────────────────

  const productItems = products.map((p) => ({ id: p.id, label: p.productName }))
  const territoryItems = territories.map((t) => ({ id: t.id, label: t.name }))

  return (
    <div className="min-h-screen bg-white text-[#1e130c]">
      {/* ── toast ── */}
      {toast && (
        <div
          role="alert"
          className={`fixed right-5 top-5 z-[200] max-w-xs rounded-[1rem] border px-4 py-3 text-sm font-medium shadow-[0_16px_40px_rgba(59,31,15,0.18)] transition-all ${
            toast.type === 'success'
              ? 'border-[#a3e4bc] bg-[#e6f9ef] text-[#1a6b3c]'
              : 'border-[#fca5a5] bg-[#fef2f2] text-[#b91c1c]'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ── page shell ── */}
      <div className="flex min-h-screen flex-col">
        {/* header bar */}
        <header className="sticky top-0 z-10 border-b border-[#ebdfd5] bg-white/90 backdrop-blur-sm px-5 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              id="pm-back-btn"
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-1.5 rounded-[0.85rem] border border-[#e6ccb8] bg-white px-3 py-2 text-sm font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f] hover:text-[#4d3020]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Dashboard
            </button>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#a37d63]">
                Portal / Promotion Management
              </p>
              <h1 className="text-xl font-bold tracking-[-0.04em] text-[#342015]">
                Promotion Management
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-7 sm:px-8 lg:px-10">
          {/* ── controls row ── */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[1.55rem] font-bold tracking-[-0.04em] text-[#342015]">
                All Promotions
              </h2>
              <p className="mt-1 text-sm text-[#7f6657]">
                Create and manage discount campaigns, promo codes, and auto-applied offers.
              </p>
            </div>
            <button
              id="pm-create-btn"
              type="button"
              onClick={openCreate}
              className="flex shrink-0 items-center gap-2 rounded-[1rem] bg-[#8b5a3a] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(139,90,58,0.22)] transition duration-300 hover:bg-[#73492f]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create Promotion
            </button>
          </div>

          {/* ── table area ── */}
          <div className="rounded-[1.5rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.07)] overflow-hidden">
            {/* error */}
            {tableError && (
              <div className="border-b border-[#ebc0bb] bg-[#fff2f1] px-6 py-4 text-sm text-[#92524b]">
                {tableError}
              </div>
            )}

            {/* loading skeleton */}
            {isLoading && (
              <div className="flex items-center justify-center py-16 text-sm text-[#a37d63]">
                <svg
                  className="mr-2.5 h-5 w-5 animate-spin text-[#cf9566]"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Loading promotions…
              </div>
            )}

            {/* empty state */}
            {!isLoading && !tableError && promotions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fff4e8]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-7 w-7 text-[#cf9566]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 14l6-6M9 10h.01M15 14h.01" />
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-[#4d3020]">No promotions yet</p>
                <p className="mt-1.5 text-sm text-[#a37d63]">
                  Create your first promotion to get started.
                </p>
              </div>
            )}

            {/* table */}
            {!isLoading && promotions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-[#f0e6de] bg-[#fdf8f4]">
                      {[
                        'Name',
                        'Code',
                        'Type',
                        'Discount',
                        'Start Date',
                        'End Date',
                        'Status',
                        'Actions',
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-[#a37d63]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.map((promo, idx) => {
                      const isWorking = statusActionId === promo.id
                      const isActive = promo.status === 'active'
                      return (
                        <tr
                          key={promo.id}
                          className={`border-b border-[#f5ede6] transition-colors hover:bg-[#fffaf6] ${
                            idx % 2 === 0 ? '' : 'bg-[#fdfaf7]'
                          }`}
                        >
                          <td className="px-4 py-3.5 font-semibold text-[#4d3020]">
                            {promo.name}
                          </td>
                          <td className="px-4 py-3.5">
                            {promo.code ? (
                              <span className="rounded-md bg-[#f3f3f3] px-2 py-0.5 font-mono text-xs text-[#5a4435]">
                                {promo.code}
                              </span>
                            ) : (
                              <span className="text-[#c4ada0]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-[#6e5647]">
                            {formatPromoType(promo.promotionType)}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-[#4d3020]">
                            {promo.discountType === 'percentage'
                              ? `${Number(promo.discountValue)}%`
                              : `₦${Number(promo.discountValue).toLocaleString()}`}
                          </td>
                          <td className="px-4 py-3.5 text-[#6e5647]">
                            {formatDate(promo.startDate)}
                          </td>
                          <td className="px-4 py-3.5 text-[#6e5647]">
                            {formatDate(promo.endDate)}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={promo.status} />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                id={`pm-edit-${promo.id}`}
                                type="button"
                                onClick={() => openEdit(promo)}
                                className="rounded-[0.65rem] border border-[#d7baa3] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f] hover:text-[#4d3020]"
                              >
                                Edit
                              </button>
                              {!['expired', 'disabled'].includes(promo.status) && (
                                <button
                                  id={`pm-toggle-${promo.id}`}
                                  type="button"
                                  disabled={isWorking}
                                  onClick={() =>
                                    void handleStatusChange(
                                      promo.id,
                                      isActive ? 'disabled' : 'active',
                                    )
                                  }
                                  className={`rounded-[0.65rem] px-2.5 py-1.5 text-xs font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                                    isActive
                                      ? 'bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fee2e2]'
                                      : 'bg-[#e6f9ef] text-[#1a6b3c] hover:bg-[#d1f5e4]'
                                  }`}
                                >
                                  {isWorking ? '…' : isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════
          MODAL
      ═══════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pm-modal-title"
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-2xl rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_40px_80px_rgba(59,31,15,0.2)]">
            {/* modal header */}
            <div className="flex items-center justify-between border-b border-[#f0e6de] px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                  {editTarget ? 'Edit Promotion' : 'New Promotion'}
                </p>
                <h2
                  id="pm-modal-title"
                  className="mt-1 text-[1.35rem] font-bold tracking-[-0.04em] text-[#342015]"
                >
                  {editTarget ? editTarget.name : 'Create a Promotion'}
                </h2>
              </div>
              <button
                id="pm-modal-close"
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e6ccb8] text-[#8a6c58] transition duration-200 hover:bg-[#fdf1e7]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* modal body */}
            <form id="pm-form" onSubmit={(e) => void handleSubmit(e)}>
              <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
                {/* name */}
                <div className="sm:col-span-2">
                  <Field label="Promotion Name" id="pm-name" required>
                    <input
                      id="pm-name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      placeholder="e.g. Ramadan Flash Deal"
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* code */}
                <Field label="Promo Code" id="pm-code">
                  <input
                    id="pm-code"
                    type="text"
                    value={form.code ?? ''}
                    onChange={(e) => setField('code', e.target.value)}
                    placeholder="e.g. SAVE20 (optional)"
                    className={inputCls}
                  />
                </Field>

                {/* promotion type */}
                <Field label="Promotion Type" id="pm-promo-type" required>
                  <select
                    id="pm-promo-type"
                    required
                    value={form.promotionType}
                    onChange={(e) => setField('promotionType', e.target.value as PromotionType)}
                    className={inputCls}
                  >
                    <option value="code_based_product">Code Based – Product</option>
                    <option value="code_based_order">Code Based – Order</option>
                    <option value="auto_applied">Auto Applied</option>
                  </select>
                </Field>

                {/* discount type */}
                <Field label="Discount Type" id="pm-discount-type" required>
                  <select
                    id="pm-discount-type"
                    required
                    value={form.discountType}
                    onChange={(e) => setField('discountType', e.target.value as DiscountType)}
                    className={inputCls}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </Field>

                {/* discount value */}
                <Field label="Discount Value" id="pm-discount-value" required>
                  <input
                    id="pm-discount-value"
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={form.discountValue}
                    onChange={(e) => setField('discountValue', Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>

                {/* start date */}
                <Field label="Start Date" id="pm-start-date" required>
                  <input
                    id="pm-start-date"
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setField('startDate', e.target.value)}
                    className={inputCls}
                  />
                </Field>

                {/* end date */}
                <Field label="End Date" id="pm-end-date" required>
                  <input
                    id="pm-end-date"
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setField('endDate', e.target.value)}
                    className={inputCls}
                  />
                </Field>

                {/* status */}
                <Field label="Status" id="pm-status">
                  <select
                    id="pm-status"
                    value={form.status ?? 'draft'}
                    onChange={(e) => setField('status', e.target.value as PromotionStatus)}
                    className={inputCls}
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </Field>

                {/* min quantity */}
                <Field label="Min Quantity (optional)" id="pm-min-qty">
                  <input
                    id="pm-min-qty"
                    type="number"
                    min={1}
                    value={form.minQuantity ?? ''}
                    onChange={(e) =>
                      setField('minQuantity', e.target.value ? Number(e.target.value) : null)
                    }
                    placeholder="—"
                    className={inputCls}
                  />
                </Field>

                {/* min order value */}
                <Field label="Min Order Value (optional)" id="pm-min-order">
                  <input
                    id="pm-min-order"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.minOrderValue ?? ''}
                    onChange={(e) =>
                      setField('minOrderValue', e.target.value ? Number(e.target.value) : null)
                    }
                    placeholder="—"
                    className={inputCls}
                  />
                </Field>

                {/* usage limit */}
                <Field label="Usage Limit (optional)" id="pm-usage-limit">
                  <input
                    id="pm-usage-limit"
                    type="number"
                    min={1}
                    value={form.usageLimit ?? ''}
                    onChange={(e) =>
                      setField('usageLimit', e.target.value ? Number(e.target.value) : null)
                    }
                    placeholder="—"
                    className={inputCls}
                  />
                </Field>

                {/* per shop limit */}
                <Field label="Per Shop Limit (optional)" id="pm-per-shop">
                  <input
                    id="pm-per-shop"
                    type="number"
                    min={1}
                    value={form.perShopLimit ?? ''}
                    onChange={(e) =>
                      setField('perShopLimit', e.target.value ? Number(e.target.value) : null)
                    }
                    placeholder="—"
                    className={inputCls}
                  />
                </Field>

                {/* description */}
                <div className="sm:col-span-2">
                  <Field label="Description (optional)" id="pm-description">
                    <textarea
                      id="pm-description"
                      rows={3}
                      value={form.description ?? ''}
                      onChange={(e) => setField('description', e.target.value)}
                      placeholder="Internal notes about this promotion…"
                      className={`${inputCls} resize-none`}
                    />
                  </Field>
                </div>

                {/* eligible products */}
                <div className="sm:col-span-2">
                  <MultiSelect
                    id="pm-products"
                    label="Eligible Products (optional)"
                    items={productItems}
                    selected={form.eligibleProductIds ?? []}
                    onChange={(ids) => setField('eligibleProductIds', ids)}
                  />
                </div>

                {/* eligible territories */}
                <div className="sm:col-span-2">
                  <MultiSelect
                    id="pm-territories"
                    label="Eligible Territories (optional)"
                    items={territoryItems}
                    selected={form.eligibleTerritoryIds ?? []}
                    onChange={(ids) => setField('eligibleTerritoryIds', ids)}
                  />
                </div>
              </div>

              {/* modal error */}
              {modalError && (
                <div className="mx-6 mb-3 rounded-[0.85rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">
                  {modalError}
                </div>
              )}

              {/* modal footer */}
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#f0e6de] px-6 py-5">
                <button
                  id="pm-modal-cancel"
                  type="button"
                  onClick={closeModal}
                  className="rounded-[1rem] border border-[#d7baa3] bg-white px-5 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f] hover:text-[#4d3020]"
                >
                  Cancel
                </button>
                <button
                  id="pm-modal-submit"
                  type="submit"
                  disabled={isSaving}
                  className="rounded-[1rem] bg-[#8b5a3a] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(139,90,58,0.22)] transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving
                    ? 'Saving…'
                    : editTarget
                      ? 'Save Changes'
                      : 'Create Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
