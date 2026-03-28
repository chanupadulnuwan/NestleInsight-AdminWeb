import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { assignVehicleToWarehouse, fetchMyWarehouse, type TmWarehouse } from '../../api/tm'
import { getApiErrorMessage } from '../../api/client'
import { TerritoryManagerPortalShell } from '../../components/TerritoryManagerPortalShell'
import { useAuth } from '../../context/AuthContext'
import {
  AddInventoryModal,
  AddVehicleModal,
  primaryButtonClass,
  UserDetailModal,
} from './TmWarehouseOverlays'
import {
  InventorySection,
  PeopleTable,
  VehiclesSection,
} from './TmWarehouseSections'

type WarehouseTab = 'inventory' | 'vehicles' | 'employees' | 'shops'

export default function TmWarehousePage() {
  const { user, isAuthLoading } = useAuth()
  const [warehouse, setWarehouse] = useState<TmWarehouse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showAddInventory, setShowAddInventory] = useState(false)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [assigningVehicleId, setAssigningVehicleId] = useState<string | null>(null)
  const [vehicleAssignMessage, setVehicleAssignMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<WarehouseTab>('inventory')

  if (!isAuthLoading && (!user || user.role !== 'REGIONAL_MANAGER')) {
    return <Navigate to="/" replace />
  }

  const load = () => {
    setLoading(true)
    setError(null)
    fetchMyWarehouse()
      .then((response) => setWarehouse(response.warehouse))
      .catch((requestError) => setError(getApiErrorMessage(requestError)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const employees = useMemo(
    () => warehouse?.users.filter((item) => item.role === 'TERRITORY_DISTRIBUTOR') ?? [],
    [warehouse],
  )
  const shops = useMemo(
    () => warehouse?.users.filter((item) => item.role === 'SHOP_OWNER') ?? [],
    [warehouse],
  )

  const handleAssignVehicle = async (vehicleId: string) => {
    setAssigningVehicleId(vehicleId)
    setVehicleAssignMessage(null)
    try {
      const response = await assignVehicleToWarehouse(vehicleId)
      setVehicleAssignMessage(response.message)
      setShowAddVehicle(false)
      load()
    } catch (requestError) {
      setVehicleAssignMessage(getApiErrorMessage(requestError))
    } finally {
      setAssigningVehicleId(null)
    }
  }

  if (!user) return null

  const action =
    activeTab === 'inventory' ? (
      <button type="button" onClick={() => setShowAddInventory(true)} className={primaryButtonClass}>
        Add or update stock
      </button>
    ) : activeTab === 'vehicles' ? (
      <button
        type="button"
        onClick={() => setShowAddVehicle(true)}
        className={primaryButtonClass}
      >
        Add vehicle to warehouse
      </button>
    ) : undefined

  return (
    <TerritoryManagerPortalShell
      user={user}
      breadcrumb="Territory Manager - Warehouse"
      title={warehouse?.name ?? 'My Warehouse'}
      description={warehouse?.address ?? 'Review your assigned warehouse, inventory, vehicles, employees, and shops.'}
      actions={action}
    >
      {loading ? <p className="py-12 text-center text-sm text-[#7f6657]">Loading warehouse...</p> : null}
      {error ? <p className="py-12 text-center text-sm text-red-600">{error}</p> : null}

      {warehouse ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['Tracked products', warehouse.inventory.length],
              ['Needs refill', warehouse.inventory.filter((item) => item.status === 'LOW_STOCK').length],
              ['Assigned vehicles', warehouse.vehicles.length],
              ['Employees', employees.length],
              ['Shops', shops.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                <p className="text-sm font-semibold text-[#8a6c58]">{label}</p>
                <p className="mt-2 text-[1.4rem] font-bold text-[#4d3020]">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 border-b border-[#ebdfd5] pb-1">
            {([
              ['inventory', 'Inventory', warehouse.inventory.length],
              ['vehicles', 'Vehicles', warehouse.vehicles.length + warehouse.availableVehicles.length],
              ['employees', 'Employees', employees.length],
              ['shops', 'Shops', shops.length],
            ] as Array<[WarehouseTab, string, number]>).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={[
                  'rounded-t-xl px-5 py-2.5 text-sm font-semibold transition duration-150',
                  activeTab === key ? 'border-b-2 border-[#8b5a3a] text-[#4d3020]' : 'text-[#8a6c58] hover:text-[#4d3020]',
                ].join(' ')}
              >
                {label}
                <span className="ml-2 rounded-full bg-[#f2e2d4] px-2 py-0.5 text-xs text-[#8b5a3a]">{count}</span>
              </button>
            ))}
          </div>

          {activeTab === 'inventory' ? <InventorySection inventory={warehouse.inventory} /> : null}
          {activeTab === 'vehicles' ? (
            <VehiclesSection
              vehicles={warehouse.vehicles}
              availableVehicles={warehouse.availableVehicles}
              message={vehicleAssignMessage}
              onAdd={() => setShowAddVehicle(true)}
            />
          ) : null}
          {activeTab === 'employees' ? (
            <PeopleTable
              title="Employees"
              description="Only territory distributors assigned under this warehouse are shown here."
              users={employees}
              emptyMessage="No territory distributors are assigned to this warehouse yet."
              onSelect={setSelectedUserId}
            />
          ) : null}
          {activeTab === 'shops' ? (
            <PeopleTable
              title="Shops"
              description="Review shop details, address, telephone, owner, and linked ID for shops under this warehouse."
              users={shops}
              emptyMessage="No shop owners are assigned to this warehouse yet."
              shopMode
              onSelect={setSelectedUserId}
            />
          ) : null}
        </>
      ) : null}

      {selectedUserId ? <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} /> : null}
      {showAddInventory && warehouse ? (
        <AddInventoryModal
          productOptions={warehouse.catalog}
          inventoryItems={warehouse.inventory}
          onClose={() => setShowAddInventory(false)}
          onSaved={load}
        />
      ) : null}
      {showAddVehicle && warehouse ? (
        <AddVehicleModal
          vehicles={warehouse.availableVehicles}
          assigningVehicleId={assigningVehicleId}
          message={vehicleAssignMessage}
          onAssign={handleAssignVehicle}
          onSaved={load}
          onClose={() => setShowAddVehicle(false)}
        />
      ) : null}
    </TerritoryManagerPortalShell>
  )
}
