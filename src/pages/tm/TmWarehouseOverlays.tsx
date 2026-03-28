import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import {
  addInventoryItem,
  createTmVehicle,
  fetchWarehouseUserDetail,
  type TmInventoryItem,
  type TmWarehouseProductOption,
  type TmWarehouseUser,
  type TmWarehouseVehicle,
} from '../../api/tm'
import { getApiErrorMessage, resolveMediaUrl } from '../../api/client'
import { formatCurrency } from '../productsPage.helpers'

export const fieldClass =
  'w-full min-w-0 rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]'

export const primaryButtonClass =
  'rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70'

export const secondaryButtonClass =
  'rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020] disabled:cursor-not-allowed disabled:opacity-60'

export function roleLabel(role: TmWarehouseUser['role']) {
  return role === 'TERRITORY_DISTRIBUTOR' ? 'Territory Distributor' : 'Shop Owner'
}

export function Pill({
  value,
  kind = 'neutral',
}: {
  value: string
  kind?: 'neutral' | 'warn' | 'bad'
}) {
  const styles =
    kind === 'warn'
      ? 'border border-[#f0c96d] bg-[#fff2c8] text-[#8c5d0d]'
      : kind === 'bad'
        ? 'border border-[#e0a7a3] bg-[#fff0ef] text-[#9b4b46]'
        : 'border border-[#d7c5b6] bg-[#fff8f2] text-[#8b5a3a]'

  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>{value}</span>
}

function Overlay({
  title,
  subtitle,
  onClose,
  children,
  width = 'max-w-4xl',
}: {
  title: string
  subtitle: string
  onClose: () => void
  children: ReactNode
  width?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full ${width} overflow-hidden rounded-[2rem] border border-[#ebdfd5] bg-white shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#eee2d7] px-6 py-6 sm:px-8">
          <div>
            <h2 className="text-xl font-bold text-[#4d3020]">{title}</h2>
            <p className="mt-2 text-sm text-[#7f6657]">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[#ead9cc] px-3 py-2 text-sm font-semibold text-[#8a6c58] transition duration-200 hover:border-[#c99267] hover:text-[#4d3020]"
          >
            Close
          </button>
        </div>
        <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-6 sm:px-8">{children}</div>
      </div>
    </div>
  )
}

export function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [user, setUser] = useState<
    (TmWarehouseUser & { nic?: string; employeeId?: string; createdAt: string }) | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWarehouseUserDetail(userId)
      .then((response) => setUser(response.user as typeof user))
      .catch((requestError) => setError(getApiErrorMessage(requestError)))
      .finally(() => setLoading(false))
  }, [userId])

  const details = useMemo(() => {
    if (!user) return []
    return [
      ['Name', `${user.firstName} ${user.lastName}`],
      ['Role', roleLabel(user.role)],
      ['Public ID', user.publicUserCode ?? '-'],
      ['Username', user.username],
      ['Email', user.email],
      ['Phone', user.phoneNumber],
      ['Shop', user.shopName ?? '-'],
      ['Address', user.address ?? '-'],
      ['Employee ID', user.employeeId ?? '-'],
      ['NIC', user.nic ?? '-'],
      ['Approval', user.approvalStatus],
      ['Account', user.accountStatus],
      ['Joined', new Date(user.createdAt).toLocaleDateString()],
    ]
  }, [user])

  return (
    <Overlay
      title="Profile details"
      subtitle="Review the warehouse-linked account information for this person."
      onClose={onClose}
      width="max-w-2xl"
    >
      {loading ? <p className="text-sm text-[#7f6657]">Loading details...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {user ? (
        <div className="rounded-[1.5rem] border border-[#eee2d7] bg-[#fffaf7] p-5">
          <div className="flex flex-col gap-2 border-b border-[#eaded4] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-[#4d3020]">{user.firstName} {user.lastName}</p>
              <p className="mt-1 text-sm text-[#8a6c58]">{roleLabel(user.role)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill value={user.approvalStatus} kind={user.approvalStatus === 'APPROVED' ? 'neutral' : 'warn'} />
              <Pill value={user.accountStatus} kind={user.accountStatus === 'ACTIVE' ? 'neutral' : 'bad'} />
            </div>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-[1.1rem] bg-white px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">{label}</dt>
                <dd className="mt-1 break-words text-sm font-medium text-[#4d3020]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </Overlay>
  )
}

export function AddInventoryModal({
  productOptions,
  inventoryItems,
  onClose,
  onSaved,
}: {
  productOptions: TmWarehouseProductOption[]
  inventoryItems: TmInventoryItem[]
  onClose: () => void
  onSaved: () => void
}) {
  const [productId, setProductId] = useState('')
  const [quantityOnHand, setQuantityOnHand] = useState('0')
  const [reorderLevel, setReorderLevel] = useState('10')
  const [maxCapacityCases, setMaxCapacityCases] = useState('100')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProduct = useMemo(
    () => productOptions.find((product) => product.id === productId) ?? null,
    [productId, productOptions],
  )
  const existingInventoryItem = useMemo(
    () => inventoryItems.find((item) => item.productId === productId) ?? null,
    [inventoryItems, productId],
  )

  useEffect(() => {
    if (!productId) {
      return
    }

    if (existingInventoryItem) {
      setQuantityOnHand(existingInventoryItem.quantityOnHand.toString())
      setReorderLevel(existingInventoryItem.reorderLevel.toString())
      setMaxCapacityCases(existingInventoryItem.maxCapacityCases.toString())
      return
    }

    setQuantityOnHand('1')
    setReorderLevel('10')
    setMaxCapacityCases('100')
  }, [existingInventoryItem, productId])

  const save = async () => {
    if (!productId) {
      setError('Select a product before saving inventory.')
      return
    }
    if (!existingInventoryItem && Number(quantityOnHand) <= 0) {
      setError('Set cases on hand above 0 when adding a new product to inventory.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await addInventoryItem({
        productId,
        quantityOnHand: Number(quantityOnHand),
        reorderLevel: Number(reorderLevel),
        maxCapacityCases: Number(maxCapacityCases),
      })
      onSaved()
      onClose()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay
      title="Add or update inventory stock"
      subtitle="Choose a product from the catalog and set the warehouse stock levels."
      onClose={onClose}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.85fr)]">
        <div className="space-y-5">
          {existingInventoryItem ? (
            <div className="rounded-[1.2rem] border border-[#eadfd5] bg-[#fff8f2] px-4 py-3 text-sm text-[#8b5a3a]">
              This product is already tracked in the warehouse. Saving here will update its current stock levels.
            </div>
          ) : null}
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">Product</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)} className={`${fieldClass} mt-2`}>
              <option value="">Select a product...</option>
              {productOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {`${product.productName} - ${product.sku} - ${product.packSize}`}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              ['Cases on hand', quantityOnHand, setQuantityOnHand, 'Current stock inside this warehouse.'],
              ['Refill level', reorderLevel, setReorderLevel, 'Trigger level for warehouse refilling.'],
              ['Max capacity', maxCapacityCases, setMaxCapacityCases, 'Maximum number of cases allowed.'],
            ] as Array<[string, string, Dispatch<SetStateAction<string>>, string]>).map(([label, value, setter, hint], index) => (
              <label key={String(label)} className="rounded-[1.3rem] border border-[#eee2d7] bg-[#fffaf7] p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">{label}</span>
                <input
                  type="number"
                  min={index === 2 ? '1' : '0'}
                  value={value}
                  onChange={(event) => setter(event.target.value)}
                  className={`${fieldClass} mt-3`}
                />
                <p className="mt-2 text-xs text-[#8a6c58]">{hint}</p>
              </label>
            ))}
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <aside className="rounded-[1.5rem] border border-[#eadfd5] bg-[#fff8f2] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a37d63]">Product summary</p>
          {selectedProduct ? (
            <div className="mt-4 space-y-4">
              {selectedProduct.imageUrl ? (
                <div className="overflow-hidden rounded-[1.2rem] border border-[#eadfd5] bg-white">
                  <img src={resolveMediaUrl(selectedProduct.imageUrl)} alt={selectedProduct.productName} className="h-40 w-full object-cover" />
                </div>
              ) : null}
              <div className="rounded-[1.2rem] border border-[#eadfd5] bg-white px-4 py-4 text-sm text-[#6f5648]">
                <p className="text-lg font-semibold text-[#4d3020]">{selectedProduct.productName}</p>
                <p className="mt-3"><span className="font-semibold text-[#8a6c58]">SKU:</span> {selectedProduct.sku}</p>
                <p className="mt-2"><span className="font-semibold text-[#8a6c58]">Pack size:</span> {selectedProduct.packSize}</p>
                <p className="mt-2"><span className="font-semibold text-[#8a6c58]">Case price:</span> {formatCurrency(selectedProduct.casePrice)}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[1.2rem] border border-dashed border-[#d9c9bb] bg-white px-4 py-6 text-sm leading-6 text-[#7f6657]">
              Select a catalog product to preview its details before saving the inventory setup.
            </div>
          )}
        </aside>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#eee2d7] pt-5 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={secondaryButtonClass}>Cancel</button>
        <button type="button" onClick={() => void save()} disabled={saving} className={primaryButtonClass}>
          {saving
            ? 'Saving...'
            : existingInventoryItem
              ? 'Update stock levels'
              : 'Add to inventory'}
        </button>
      </div>
    </Overlay>
  )
}

export function AddVehicleModal({
  vehicles,
  assigningVehicleId,
  message,
  onAssign,
  onSaved,
  onClose,
}: {
  vehicles: TmWarehouseVehicle[]
  assigningVehicleId: string | null
  message: string | null
  onAssign: (vehicleId: string) => Promise<void>
  onSaved: () => void
  onClose: () => void
}) {
  const [label, setLabel] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [vehicleCode, setVehicleCode] = useState('')
  const [type, setType] = useState('VAN')
  const [capacityCases, setCapacityCases] = useState('120')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const createVehicle = async () => {
    if (!label.trim() || !registrationNumber.trim()) {
      setCreateError('Vehicle label and registration number are required.')
      return
    }

    setCreating(true)
    setCreateError(null)

    try {
      await createTmVehicle({
        label: label.trim(),
        registrationNumber: registrationNumber.trim(),
        vehicleCode: vehicleCode.trim() || undefined,
        type: type.trim() || undefined,
        capacityCases: Number(capacityCases),
      })
      onSaved()
      onClose()
    } catch (requestError) {
      setCreateError(getApiErrorMessage(requestError))
    } finally {
      setCreating(false)
    }
  }

  return (
    <Overlay
      title="Add vehicle to warehouse"
      subtitle="Create a new vehicle for this warehouse or assign one from the territory pool."
      onClose={onClose}
      width="max-w-3xl"
    >
      {message ? <div className="mb-5 rounded-[1.2rem] border border-[#eadfd5] bg-[#fff8f2] px-4 py-3 text-sm text-[#8b5a3a]">{message}</div> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-[1.5rem] border border-[#eee2d7] bg-[#fffaf7] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a37d63]">Create new vehicle</p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">Label</span>
              <input value={label} onChange={(event) => setLabel(event.target.value)} className={`${fieldClass} mt-2`} placeholder="Colombo A Delivery Van" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">Registration number</span>
              <input value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value.toUpperCase())} className={`${fieldClass} mt-2`} placeholder="CAB-1103" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">Vehicle code</span>
                <input value={vehicleCode} onChange={(event) => setVehicleCode(event.target.value.toUpperCase())} className={`${fieldClass} mt-2`} placeholder="Optional" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">Type</span>
                <select value={type} onChange={(event) => setType(event.target.value)} className={`${fieldClass} mt-2`}>
                  <option value="VAN">Van</option>
                  <option value="TRUCK">Truck</option>
                  <option value="LORRY">Lorry</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">Capacity in cases</span>
              <input type="number" min="1" value={capacityCases} onChange={(event) => setCapacityCases(event.target.value)} className={`${fieldClass} mt-2`} />
            </label>
            {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
            <button type="button" onClick={() => void createVehicle()} disabled={creating} className={primaryButtonClass}>
              {creating ? 'Creating...' : 'Create vehicle'}
            </button>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-[#eee2d7] bg-[#fffaf7] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a37d63]">Assign existing vehicle</p>
          <div className="mt-4 space-y-3">
            {vehicles.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-[#d9c9bb] bg-white px-4 py-6 text-sm leading-6 text-[#7f6657]">
                No unassigned territory vehicles are available right now. You can still create a new vehicle for this warehouse on the left.
              </div>
            ) : (
              vehicles.map((vehicle) => (
                <div key={vehicle.id} className="rounded-[1.3rem] border border-[#eee2d7] bg-white px-4 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-base font-semibold text-[#4d3020]">{vehicle.label}</p>
                      <p className="mt-1 text-sm text-[#866958]">{vehicle.registrationNumber} - {vehicle.type}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#8a6c58]">
                        <span className="rounded-full bg-[#fff8f2] px-3 py-1">Code: {vehicle.vehicleCode}</span>
                        <span className="rounded-full bg-[#fff8f2] px-3 py-1">Capacity: {vehicle.capacityCases} cases</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => void onAssign(vehicle.id)} disabled={assigningVehicleId === vehicle.id} className={primaryButtonClass}>
                      {assigningVehicleId === vehicle.id ? 'Assigning...' : 'Assign vehicle'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </Overlay>
  )
}
