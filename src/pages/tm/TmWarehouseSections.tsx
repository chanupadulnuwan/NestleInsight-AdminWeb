import { type TmInventoryItem, type TmWarehouseUser, type TmWarehouseVehicle } from '../../api/tm'
import { Pill } from './TmWarehouseOverlays'

export const surfaceClass =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

export function InventoryStatusBadge({ status }: { status: TmInventoryItem['status'] }) {
  const styles =
    status === 'LOW_STOCK'
      ? 'border border-[#f0c96d] bg-[#fff2c8] text-[#8c5d0d]'
      : status === 'INACTIVE_PRODUCT'
        ? 'border border-[#e0a7a3] bg-[#fff0ef] text-[#9b4b46]'
        : 'border border-[#d7c5b6] bg-[#fff8f2] text-[#8b5a3a]'

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {status === 'LOW_STOCK'
        ? 'Low stock'
        : status === 'INACTIVE_PRODUCT'
          ? 'Inactive'
          : 'Healthy'}
    </span>
  )
}

export function InventorySection({ inventory }: { inventory: TmInventoryItem[] }) {
  const sortedInventory = [...inventory].sort((left, right) => {
    if (right.quantityOnHand !== left.quantityOnHand) {
      return right.quantityOnHand - left.quantityOnHand
    }

    return (left.productName ?? '').localeCompare(right.productName ?? '')
  })

  return (
    <div className={`${surfaceClass} overflow-hidden`}>
      <div className="overflow-x-auto rounded-[1.8rem]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#ebdfd5] bg-[#fff8f2] text-xs uppercase tracking-wide text-[#8a6c58]">
              <th className="px-5 py-3 text-left">Product</th>
              <th className="px-5 py-3 text-left">SKU</th>
              <th className="px-5 py-3 text-right">On hand</th>
              <th className="px-5 py-3 text-right">Refill at</th>
              <th className="px-5 py-3 text-right">Capacity</th>
              <th className="px-5 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedInventory.map((item) => (
              <tr key={item.id} className="border-b border-[#f1e5db] last:border-0 hover:bg-[#fffaf7]">
                <td className="px-5 py-3.5 font-medium text-[#4d3020]">
                  <div className="flex min-w-0 items-center gap-3">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.productName ?? 'Product'} className="h-10 w-10 rounded-xl object-cover" /> : null}
                    <div className="min-w-0">
                      <p className="truncate">{item.productName ?? '-'}</p>
                      {item.packSize ? <p className="mt-1 text-xs text-[#8a6c58]">{item.packSize}</p> : null}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-[#7f6657]">{item.sku ?? '-'}</td>
                <td className="px-5 py-3.5 text-right font-bold text-[#4d3020]">{item.quantityOnHand}</td>
                <td className="px-5 py-3.5 text-right text-[#7f6657]">{item.reorderLevel}</td>
                <td className="px-5 py-3.5 text-right text-[#7f6657]">{item.maxCapacityCases}</td>
                <td className="px-5 py-3.5"><InventoryStatusBadge status={item.status} /></td>
              </tr>
            ))}
            {inventory.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-[#7f6657]">No inventory items yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function VehiclesSection({
  vehicles,
  availableVehicles,
  message,
  onAdd,
}: {
  vehicles: TmWarehouseVehicle[]
  availableVehicles: TmWarehouseVehicle[]
  message: string | null
  onAdd: () => void
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className={`${surfaceClass} overflow-hidden`}>
        {message ? <p className="border-b border-[#ebdfd5] px-5 py-3 text-sm text-[#8b5a3a]">{message}</p> : null}
        <div className="border-b border-[#ebdfd5] px-5 py-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">Assigned vehicles</p>
          <p className="mt-2 text-sm leading-6 text-[#7f6657]">Vehicles already linked to this warehouse.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ebdfd5] bg-[#fff8f2] text-xs uppercase tracking-wide text-[#8a6c58]">
                <th className="px-5 py-3 text-left">Vehicle</th>
                <th className="px-5 py-3 text-left">Code</th>
                <th className="px-5 py-3 text-left">Registration</th>
                <th className="px-5 py-3 text-right">Capacity</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b border-[#f1e5db] last:border-0 hover:bg-[#fffaf7]">
                  <td className="px-5 py-3.5 font-medium text-[#4d3020]"><div><p>{vehicle.label}</p><p className="mt-1 text-xs text-[#8a6c58]">{vehicle.type}</p></div></td>
                  <td className="px-5 py-3.5 text-[#7f6657]">{vehicle.vehicleCode}</td>
                  <td className="px-5 py-3.5 text-[#7f6657]">{vehicle.registrationNumber}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-[#4d3020]">{vehicle.capacityCases}</td>
                </tr>
              ))}
              {vehicles.length === 0 ? <tr><td colSpan={4} className="px-5 py-10 text-center text-[#7f6657]">No vehicles are currently assigned to this warehouse.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-5">
        <section className={`${surfaceClass} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Vehicle assignment</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">Assigned now</p><p className="mt-2 text-2xl font-bold text-[#4d3020]">{vehicles.length}</p></div>
            <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">Available to add</p><p className="mt-2 text-2xl font-bold text-[#4d3020]">{availableVehicles.length}</p></div>
          </div>
          <p className="mt-5 text-sm leading-7 text-[#7f6657]">Use the add vehicle action to pull an unassigned territory vehicle into this warehouse.</p>
          <button type="button" onClick={onAdd} className="mt-5 w-full rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f]">
            Add vehicle to warehouse
          </button>
        </section>

        <section className={`${surfaceClass} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Available vehicles preview</p>
          <div className="mt-4 space-y-3">
            {availableVehicles.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-[#d9c9bb] bg-[#fffaf7] px-4 py-4 text-sm text-[#7f6657]">No unassigned territory vehicles are available right now.</div>
            ) : (
              availableVehicles.slice(0, 3).map((vehicle) => (
                <div key={vehicle.id} className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                  <p className="font-semibold text-[#4d3020]">{vehicle.label}</p>
                  <p className="mt-1 text-sm text-[#866958]">{vehicle.registrationNumber} - {vehicle.type}</p>
                  <p className="mt-2 text-sm text-[#6f5648]">{vehicle.capacityCases} case capacity</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export function PeopleTable({
  title,
  description,
  users,
  emptyMessage,
  shopMode,
  onSelect,
}: {
  title: string
  description: string
  users: TmWarehouseUser[]
  emptyMessage: string
  shopMode?: boolean
  onSelect: (userId: string) => void
}) {
  return (
    <div className={`${surfaceClass} overflow-hidden`}>
      <div className="border-b border-[#ebdfd5] px-5 py-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">{title}</p>
        <p className="mt-2 text-sm leading-6 text-[#7f6657]">{description}</p>
      </div>
      <div className="overflow-x-auto rounded-[1.8rem]">
        <table className="w-full text-sm">
          <thead>
            {shopMode ? (
              <tr className="border-b border-[#ebdfd5] bg-[#fff8f2] text-xs uppercase tracking-wide text-[#8a6c58]">
                <th className="px-5 py-3 text-left">Shop</th>
                <th className="px-5 py-3 text-left">Owner</th>
                <th className="px-5 py-3 text-left">Telephone</th>
                <th className="px-5 py-3 text-left">Address</th>
                <th className="px-5 py-3 text-left">Account</th>
              </tr>
            ) : (
              <tr className="border-b border-[#ebdfd5] bg-[#fff8f2] text-xs uppercase tracking-wide text-[#8a6c58]">
                <th className="px-5 py-3 text-left">Employee</th>
                <th className="px-5 py-3 text-left">Public ID</th>
                <th className="px-5 py-3 text-left">Contact</th>
                <th className="px-5 py-3 text-left">Approval</th>
                <th className="px-5 py-3 text-left">Account</th>
              </tr>
            )}
          </thead>
          <tbody>
            {users.map((person) =>
              shopMode ? (
                <tr key={person.id} className="border-b border-[#f1e5db] last:border-0 hover:bg-[#fffaf7]">
                  <td className="px-5 py-3.5"><p className="font-semibold text-[#4d3020]">{person.shopName ?? 'Unnamed shop'}</p><p className="mt-1 text-xs text-[#8a6c58]">ID: {person.publicUserCode ?? person.id}</p></td>
                  <td className="px-5 py-3.5"><button type="button" onClick={() => onSelect(person.id)} className="font-semibold text-[#8b5a3a] underline underline-offset-2 transition duration-200 hover:text-[#4d3020]">{person.firstName} {person.lastName}</button><p className="mt-1 text-xs text-[#8a6c58]">{person.username}</p></td>
                  <td className="px-5 py-3.5 text-[#7f6657]">{person.phoneNumber}</td>
                  <td className="px-5 py-3.5 text-[#7f6657]">{person.address ?? '-'}</td>
                  <td className="px-5 py-3.5"><Pill value={person.accountStatus} kind={person.accountStatus === 'ACTIVE' ? 'neutral' : 'bad'} /></td>
                </tr>
              ) : (
                <tr key={person.id} className="border-b border-[#f1e5db] last:border-0 hover:bg-[#fffaf7]">
                  <td className="px-5 py-3.5"><button type="button" onClick={() => onSelect(person.id)} className="font-semibold text-[#8b5a3a] underline underline-offset-2 transition duration-200 hover:text-[#4d3020]">{person.firstName} {person.lastName}</button><p className="mt-1 text-xs text-[#8a6c58]">{person.username}</p></td>
                  <td className="px-5 py-3.5 text-[#7f6657]">{person.publicUserCode ?? '-'}</td>
                  <td className="px-5 py-3.5 text-[#7f6657]"><p>{person.phoneNumber}</p><p className="mt-1 text-xs text-[#8a6c58]">{person.email}</p></td>
                  <td className="px-5 py-3.5"><Pill value={person.approvalStatus} kind={person.approvalStatus === 'APPROVED' ? 'neutral' : 'warn'} /></td>
                  <td className="px-5 py-3.5"><Pill value={person.accountStatus} kind={person.accountStatus === 'ACTIVE' ? 'neutral' : 'bad'} /></td>
                </tr>
              ),
            )}
            {users.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-[#7f6657]">{emptyMessage}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
