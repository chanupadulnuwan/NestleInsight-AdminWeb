import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { fetchTerritories, resolveLocationAssignment, type TerritoryRecord } from '../api/territories'
import {
  createWarehouse,
  fetchWarehouseDetails,
  fetchWarehouses,
  updateWarehouseInventory,
  type WarehouseDetailRecord,
  type WarehouseOrderWindow,
  type WarehouseSummaryRecord,
} from '../api/warehouses'
import { getApiErrorCode, getApiErrorMessage } from '../api/client'
import { AdminPortalShell } from '../components/AdminPortalShell'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatPortalDate, surfaceClassName } from './productsPage.helpers'

type WarehouseFormState = {
  territoryId: string
  name: string
  address: string
  phoneNumber: string
  managerUserId: string
  latitude: string
  longitude: string
}

type WarehouseFormErrors = Partial<Record<keyof WarehouseFormState, string>>
type TerritoryManagerOption = TerritoryRecord['managers'][number]

const defaultWarehousePosition: [number, number] = [6.9271, 79.8612]

function formatCoordinate(value: number) {
  return value.toFixed(6)
}

function validateWarehouseForm(form: WarehouseFormState) {
  const errors: WarehouseFormErrors = {}
  if (!form.territoryId) errors.territoryId = 'Select a territory for the warehouse.'
  if (!form.name.trim()) errors.name = 'Warehouse name is required.'
  if (!form.address.trim()) errors.address = 'Warehouse address is required.'
  if (!form.phoneNumber.trim()) errors.phoneNumber = 'Warehouse telephone number is required.'
  return errors
}

function getManagerSearchLabel(manager: TerritoryManagerOption) {
  return manager.fullName
}

function getManagerSearchIndex(manager: TerritoryManagerOption) {
  return [manager.fullName, manager.username, manager.phoneNumber].join(' ').toLowerCase()
}

function getInventoryBadgeClass(status: WarehouseDetailRecord['inventory'][number]['status']) {
  if (status === 'LOW_STOCK') return 'border border-[#f0c96d] bg-[#fff2c8] text-[#8c5d0d]'
  if (status === 'INACTIVE_PRODUCT') return 'border border-[#e0a7a3] bg-[#fff0ef] text-[#9b4b46]'
  return 'border border-[#b6d6a5] bg-[#eef9e7] text-[#47712d]'
}

function formatInventoryStatus(status: WarehouseDetailRecord['inventory'][number]['status']) {
  if (status === 'LOW_STOCK') return 'Low stock'
  if (status === 'INACTIVE_PRODUCT') return 'Inactive product'
  return 'Healthy'
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
      <p className="text-sm font-semibold text-[#8a6c58]">{label}</p>
      <p className="mt-2 text-[1.35rem] font-bold text-[#4d3020]">{value}</p>
    </div>
  )
}

function RelatedCard({
  title,
  emptyMessage,
  items,
}: {
  title: string
  emptyMessage: string
  items: Array<{ id: string; primary: string; secondary: string }>
}) {
  return (
    <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">
        {title}
      </p>
      <div className="mt-3 space-y-2 text-sm text-[#6f5648]">
        {items.length === 0 ? (
          <p>{emptyMessage}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-[1rem] bg-white px-3 py-3">
              <p className="font-semibold text-[#4d3020]">{item.primary}</p>
              <p className="mt-1 text-xs text-[#8a6c58]">{item.secondary}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function WarehouseMapSync({ position }: { position: [number, number] | null }) {
  const map = useMap()

  useEffect(() => {
    if (position) map.setView(position, 12)
  }, [map, position])

  return null
}

function WarehouseMapPicker({
  position,
  onChange,
}: {
  position: [number, number] | null
  onChange: (latitude: number, longitude: number) => void
}) {
  useMapEvents({
    click: (event) => onChange(event.latlng.lat, event.latlng.lng),
  })

  return (
    <>
      <WarehouseMapSync position={position} />
      {position ? (
        <CircleMarker
          center={position}
          radius={12}
          pathOptions={{
            color: '#8b5a3a',
            fillColor: '#d7965f',
            fillOpacity: 0.95,
            weight: 3,
          }}
        />
      ) : null}
    </>
  )
}

async function reverseGeocode(latitude: number, longitude: number) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
    { headers: { Accept: 'application/json' } },
  )

  if (!response.ok) throw new Error('Unable to read the map address right now.')
  const payload = (await response.json()) as { display_name?: string }
  return payload.display_name?.trim() ?? ''
}

export default function WarehousesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, isAuthLoading, logout } = useAuth()
  const [territories, setTerritories] = useState<TerritoryRecord[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseSummaryRecord[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseDetailRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSavingInventory, setIsSavingInventory] = useState(false)
  const [isResolvingLocation, setIsResolvingLocation] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false)
  const [selectedTerritoryId, setSelectedTerritoryId] = useState(searchParams.get('territoryId') ?? 'ALL')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(searchParams.get('warehouseId') ?? '')
  const [searchValue, setSearchValue] = useState('')
  const [managerSearchValue, setManagerSearchValue] = useState('')
  const [isManagerSuggestionOpen, setIsManagerSuggestionOpen] = useState(false)
  const [orderWindow, setOrderWindow] = useState<WarehouseOrderWindow>(
    (searchParams.get('orderWindow')?.toUpperCase() as WarehouseOrderWindow) || 'MONTHLY',
  )
  const [form, setForm] = useState<WarehouseFormState>({
    territoryId: '',
    name: '',
    address: '',
    phoneNumber: '',
    managerUserId: '',
    latitude: '',
    longitude: '',
  })
  const [formErrors, setFormErrors] = useState<WarehouseFormErrors>({})
  const [isInventoryEditMode, setIsInventoryEditMode] = useState(false)
  const [inventoryDraft, setInventoryDraft] = useState<
    Array<{ id: string; quantityOnHand: string; reorderLevel: string; maxCapacityCases: string }>
  >([])

  const isAdmin = user?.role === 'ADMIN'
  const isRegionalManager = user?.role === 'REGIONAL_MANAGER'
  const canViewWarehouses =
    isAdmin || (isRegionalManager && user?.approvalStatus === 'APPROVED')

  const syncSearchParams = (territoryId: string, warehouseId: string, nextOrderWindow: WarehouseOrderWindow) => {
    const nextParams = new URLSearchParams()
    if (territoryId && territoryId !== 'ALL') nextParams.set('territoryId', territoryId)
    if (warehouseId) nextParams.set('warehouseId', warehouseId)
    nextParams.set('orderWindow', nextOrderWindow)
    setSearchParams(nextParams)
  }

  const loadWarehouseDetails = async (warehouseId: string, nextOrderWindow = orderWindow) => {
    setIsLoadingDetails(true)
    try {
      const response = await fetchWarehouseDetails(warehouseId, nextOrderWindow)
      setSelectedWarehouse(response.warehouse)
      setInventoryDraft(
        response.warehouse.inventory.map((item) => ({
          id: item.id,
          quantityOnHand: item.casesOnHand.toString(),
          reorderLevel: item.reorderLevel.toString(),
          maxCapacityCases: item.maxCapacityCases.toString(),
        })),
      )
    } catch (requestError) {
      setPageError(getApiErrorMessage(requestError, 'Unable to load the selected warehouse right now.'))
      setSelectedWarehouse(null)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const loadPageData = async (territoryId: string, preferredWarehouseId = selectedWarehouseId) => {
    setIsLoading(true)
    setPageError(null)
    try {
      const territoryFilter = territoryId === 'ALL' ? undefined : territoryId
      const [territoriesResponse, warehousesResponse] = await Promise.all([
        fetchTerritories(),
        fetchWarehouses(territoryFilter),
      ])
      setTerritories(territoriesResponse.territories)
      setWarehouses(warehousesResponse.warehouses)
      const nextWarehouseId =
        warehousesResponse.warehouses.find((warehouse) => warehouse.id === preferredWarehouseId)?.id ??
        warehousesResponse.warehouses[0]?.id ??
        ''
      setSelectedWarehouseId(nextWarehouseId)
      syncSearchParams(territoryId, nextWarehouseId, orderWindow)
      if (nextWarehouseId) {
        await loadWarehouseDetails(nextWarehouseId, orderWindow)
      } else {
        setSelectedWarehouse(null)
      }
    } catch (requestError) {
      setPageError(getApiErrorMessage(requestError, 'Unable to load warehouse controls right now.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (canViewWarehouses) void loadPageData(selectedTerritoryId, selectedWarehouseId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewWarehouses, selectedTerritoryId])

  useEffect(() => {
    if (!selectedWarehouseId || !canViewWarehouses) return
    syncSearchParams(selectedTerritoryId, selectedWarehouseId, orderWindow)
    void loadWarehouseDetails(selectedWarehouseId, orderWindow)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewWarehouses, orderWindow])

  useEffect(() => {
    if (!feedback && !pageError) return
    const timeoutId = window.setTimeout(() => {
      setFeedback(null)
      setPageError(null)
    }, 4500)
    return () => window.clearTimeout(timeoutId)
  }, [feedback, pageError])

  if (isAuthLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-[#6e5647]">Loading warehouse controls...</div>
  }

  if (!user) return <Navigate to="/" replace />
  if (!canViewWarehouses) return <Navigate to="/admin/dashboard" replace />

  const filteredWarehouses = warehouses.filter((warehouse) => {
    const normalizedSearch = searchValue.trim().toLowerCase()
    if (!normalizedSearch) return true
    return [warehouse.name, warehouse.territoryName, warehouse.address, warehouse.managerName].some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    )
  })

  const totalInventoryCases = warehouses.reduce((sum, warehouse) => sum + warehouse.inventoryCases, 0)
  const selectedTerritoryRecord = territories.find((territory) => territory.id === form.territoryId)
  const managerOptions = [...(selectedTerritoryRecord?.managers ?? [])].sort((left, right) => {
    const leftAssigned = left.warehouseId ? 1 : 0
    const rightAssigned = right.warehouseId ? 1 : 0
    return leftAssigned - rightAssigned || left.fullName.localeCompare(right.fullName)
  })
  const selectedManager =
    managerOptions.find((manager) => manager.id === form.managerUserId) ?? null
  const filteredManagerOptions = managerOptions.filter((manager) => {
    const normalizedSearch = managerSearchValue.trim().toLowerCase()
    if (!normalizedSearch) {
      return true
    }

    return getManagerSearchIndex(manager).includes(normalizedSearch)
  })
  const mapPosition: [number, number] | null =
    form.latitude.trim() && form.longitude.trim() ? [Number(form.latitude), Number(form.longitude)] : null

  const resolveManagerSelection = (territoryId: string, requestedManagerUserId = '') => {
    const nextManagerOptions =
      territories.find((territory) => territory.id === territoryId)?.managers ?? []
    const matchedManager = nextManagerOptions.find(
      (manager) => manager.id === requestedManagerUserId && !manager.warehouseId,
    )

    return {
      managerUserId: matchedManager?.id ?? '',
      managerSearchValue: matchedManager ? getManagerSearchLabel(matchedManager) : '',
    }
  }

  const selectManager = (manager: TerritoryManagerOption) => {
    if (manager.warehouseId) {
      return
    }

    setForm((current) => ({ ...current, managerUserId: manager.id }))
    setManagerSearchValue(getManagerSearchLabel(manager))
    setIsManagerSuggestionOpen(false)
    if (formErrors.managerUserId) {
      setFormErrors((current) => ({ ...current, managerUserId: undefined }))
    }
  }

  const clearManagerSelection = () => {
    setForm((current) => ({ ...current, managerUserId: '' }))
    setManagerSearchValue('')
    setIsManagerSuggestionOpen(false)
    if (formErrors.managerUserId) {
      setFormErrors((current) => ({ ...current, managerUserId: undefined }))
    }
  }

  const resetForm = (territoryId = selectedTerritoryId) => {
    const nextTerritoryId = territoryId !== 'ALL' ? territoryId : territories[0]?.id ?? ''
    const nextManagerSelection = resolveManagerSelection(nextTerritoryId)
    setForm({
      territoryId: nextTerritoryId,
      name: '',
      address: '',
      phoneNumber: '',
      managerUserId: nextManagerSelection.managerUserId,
      latitude: '',
      longitude: '',
    })
    setManagerSearchValue(nextManagerSelection.managerSearchValue)
    setIsManagerSuggestionOpen(false)
    setFormErrors({})
  }

  const handleSelectWarehouse = async (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId)
    syncSearchParams(selectedTerritoryId, warehouseId, orderWindow)
    setIsInventoryEditMode(false)
    await loadWarehouseDetails(warehouseId, orderWindow)
  }

  const handleCreateWarehouse = async () => {
    const validationErrors = validateWarehouseForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      return
    }

    setIsCreating(true)
    setFeedback(null)
    setPageError(null)

    try {
      const response = await createWarehouse({
        territoryId: form.territoryId,
        name: form.name.trim(),
        address: form.address.trim(),
        phoneNumber: form.phoneNumber.trim(),
        ...(form.managerUserId ? { managerUserId: form.managerUserId } : {}),
        ...(form.latitude.trim() && form.longitude.trim()
          ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
          : {}),
      })
      setFeedback(response.message)
      setIsCreatePanelOpen(false)
      resetForm(response.warehouse.territoryId)
      setSelectedTerritoryId(response.warehouse.territoryId)
      await loadPageData(response.warehouse.territoryId, response.warehouse.id)
    } catch (requestError) {
      const errorCode = getApiErrorCode(requestError)
      if (errorCode === 'WAREHOUSE_NAME_NOT_UNIQUE') {
        setFormErrors((current) => ({ ...current, name: 'A warehouse with this name already exists in the territory.' }))
      }
      if (errorCode === 'WAREHOUSE_TERRITORY_NOT_FOUND') {
        setFormErrors((current) => ({ ...current, territoryId: 'Select a valid territory.' }))
      }
      if (errorCode === 'WAREHOUSE_MANAGER_NOT_FOUND') {
        setFormErrors((current) => ({ ...current, managerUserId: 'Select a registered territory manager.' }))
      }
      if (errorCode === 'WAREHOUSE_MANAGER_TERRITORY_MISMATCH') {
        setFormErrors((current) => ({ ...current, managerUserId: 'This manager belongs to a different territory.' }))
      }
      if (errorCode === 'WAREHOUSE_MANAGER_ALREADY_ASSIGNED') {
        setFormErrors((current) => ({ ...current, managerUserId: 'This territory manager already handles another warehouse.' }))
      }
      setPageError(getApiErrorMessage(requestError, 'Unable to create the warehouse right now.'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleMapSelection = async (latitude: number, longitude: number) => {
    setForm((current) => ({ ...current, latitude: formatCoordinate(latitude), longitude: formatCoordinate(longitude) }))
    setIsResolvingLocation(true)

    try {
      const [assignment, address] = await Promise.all([
        resolveLocationAssignment(latitude, longitude),
        reverseGeocode(latitude, longitude).catch(() => ''),
      ])

      const nextTerritoryId = assignment.territory?.id ?? form.territoryId
      const nextManagerSelection = resolveManagerSelection(
        nextTerritoryId,
        form.managerUserId,
      )

      setForm((current) => {
        return {
          ...current,
          territoryId: nextTerritoryId,
          managerUserId: nextManagerSelection.managerUserId,
          address: address || current.address,
        }
      })
      setManagerSearchValue(nextManagerSelection.managerSearchValue)
      setFeedback(
        assignment.territory
          ? `Territory auto-filled as ${assignment.territory.name}.`
          : 'Location selected, but no matching territory was found.',
      )
      setFormErrors((current) => ({ ...current, territoryId: undefined, address: undefined, managerUserId: undefined }))
    } catch (requestError) {
      setPageError(getApiErrorMessage(requestError, 'Unable to resolve the selected location right now.'))
    } finally {
      setIsResolvingLocation(false)
    }
  }

  const handleInventoryDraftChange = (
    itemId: string,
    field: 'quantityOnHand' | 'reorderLevel' | 'maxCapacityCases',
    value: string,
  ) => {
    setInventoryDraft((current) =>
      current.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    )
  }

  const handleSaveInventory = async () => {
    if (!selectedWarehouse) return

    setIsSavingInventory(true)
    setPageError(null)
    setFeedback(null)

    try {
      const response = await updateWarehouseInventory(
        selectedWarehouse.id,
        inventoryDraft.map((item) => ({
          id: item.id,
          quantityOnHand: Number(item.quantityOnHand),
          reorderLevel: Number(item.reorderLevel),
          maxCapacityCases: Number(item.maxCapacityCases),
        })),
      )
      setSelectedWarehouse(response.warehouse)
      setInventoryDraft(
        response.warehouse.inventory.map((item) => ({
          id: item.id,
          quantityOnHand: item.casesOnHand.toString(),
          reorderLevel: item.reorderLevel.toString(),
          maxCapacityCases: item.maxCapacityCases.toString(),
        })),
      )
      setIsInventoryEditMode(false)
      setFeedback('Warehouse inventory updated successfully.')
      await loadPageData(selectedTerritoryId, selectedWarehouse.id)
    } catch (requestError) {
      setPageError(getApiErrorMessage(requestError, 'Unable to update the warehouse inventory right now.'))
    } finally {
      setIsSavingInventory(false)
    }
  }

  const inventoryDraftById = useMemo(
    () =>
      new Map(
        inventoryDraft.map((item) => [
          item.id,
          {
            quantityOnHand: item.quantityOnHand,
            reorderLevel: item.reorderLevel,
            maxCapacityCases: item.maxCapacityCases,
          },
        ]),
      ),
    [inventoryDraft],
  )

  return (
    <AdminPortalShell
      user={user}
      breadcrumb="Portal / Dashboard / Warehouses"
      title="Warehouse Overview"
      description="Search warehouse records, assign the location by map, auto-fill the matching territory, and review inventory, linked people, vehicles, and handled orders in one place."
      actions={
        <>
          <button
            type="button"
            onClick={() => navigate('/admin/territories')}
            className="rounded-[1rem] bg-[#879f33] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(115,141,44,0.18)] transition duration-300 hover:bg-[#74892d]"
          >
            Back to territories
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f]"
          >
            Log out
          </button>
        </>
      }
    >
      {feedback ? <div className="rounded-[1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3 text-sm text-[#4d6c45]">{feedback}</div> : null}
      {pageError ? <div className="rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">{pageError}</div> : null}

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Warehouse Summary</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <MetricCard label="Warehouses" value={warehouses.length} />
            <MetricCard label="Territories" value={territories.length} />
            <MetricCard label="Cases on hand" value={totalInventoryCases} />
          </div>
        </article>

        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Search Warehouses</p>
              <h2 className="mt-2 text-[1.45rem] font-bold tracking-[-0.04em] text-[#4d3020]">Search and filter by territory</h2>
              <p className="mt-3 text-sm leading-7 text-[#7f6657]">Search by warehouse name, territory, address, or assigned territory manager.</p>
            </div>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setIsCreatePanelOpen((current) => !current)
                  if (!isCreatePanelOpen) resetForm()
                }}
                className="rounded-[1rem] border border-[#d7baa3] bg-[#fff7f0] px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
              >
                {isCreatePanelOpen ? 'Hide form' : 'Add warehouse'}
              </button>
            ) : null}
          </div>
          <div className="mt-5">
            <label htmlFor="warehouse-search" className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">
              Search
            </label>
            <input
              id="warehouse-search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search warehouses, addresses, or managers"
              className="mt-2 w-full rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
            />
          </div>
        </article>
      </section>

      {isAdmin && isCreatePanelOpen ? (
        <section className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="warehouse-territory" className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">Territory *</label>
                  <select
                    id="warehouse-territory"
                    value={form.territoryId}
                    onChange={(event) => {
                      const nextTerritoryId = event.target.value
                      const nextManagerSelection = resolveManagerSelection(nextTerritoryId)
                      setForm((current) => ({
                        ...current,
                        territoryId: nextTerritoryId,
                        managerUserId: nextManagerSelection.managerUserId,
                      }))
                      setManagerSearchValue(nextManagerSelection.managerSearchValue)
                      setIsManagerSuggestionOpen(false)
                    }}
                    className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9] ${formErrors.territoryId ? 'border-[#e1aaa3] bg-[#fff7f6]' : 'border-[#e5d3c6] bg-[#fffdfb]'}`}
                  >
                    <option value="">Select territory</option>
                    {territories.map((territory) => (
                      <option key={territory.id} value={territory.id}>{territory.name}</option>
                    ))}
                  </select>
                  {formErrors.territoryId ? <p className="mt-2 text-xs text-[#b7625e]">{formErrors.territoryId}</p> : <p className="mt-2 text-xs leading-5 text-[#8a6c58]">Pick from the registered territory master.</p>}
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="warehouse-manager-search" className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">Territory Manager</label>
                    {form.managerUserId ? (
                      <button
                        type="button"
                        onClick={clearManagerSelection}
                        className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b5a3a] transition duration-300 hover:text-[#73492f]"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <input
                    id="warehouse-manager-search"
                    value={managerSearchValue}
                    onChange={(event) => {
                      setManagerSearchValue(event.target.value)
                      setIsManagerSuggestionOpen(true)
                      setForm((current) => ({ ...current, managerUserId: '' }))
                      if (formErrors.managerUserId) {
                        setFormErrors((current) => ({ ...current, managerUserId: undefined }))
                      }
                    }}
                    onFocus={() => setIsManagerSuggestionOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setIsManagerSuggestionOpen(false)
                      }, 120)
                    }}
                    disabled={!form.territoryId}
                    placeholder={
                      form.territoryId
                        ? 'Search by manager name, username, or telephone number'
                        : 'Select a territory first'
                    }
                    className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9] disabled:cursor-not-allowed disabled:bg-[#fff9f5] disabled:text-[#8a6c58] ${formErrors.managerUserId ? 'border-[#e1aaa3] bg-[#fff7f6]' : 'border-[#e5d3c6] bg-[#fffdfb]'}`}
                  />
                  {isManagerSuggestionOpen && form.territoryId ? (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-[1rem] border border-[#e5d3c6] bg-white shadow-[0_18px_40px_rgba(73,39,17,0.12)]">
                      {filteredManagerOptions.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-[#7f6657]">
                          No territory managers matched the current search.
                        </div>
                      ) : (
                        filteredManagerOptions.map((manager) => {
                          const isAssigned = Boolean(manager.warehouseId)
                          const isSelectable = !isAssigned

                          return (
                            <button
                              key={manager.id}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                if (isSelectable) {
                                  selectManager(manager)
                                }
                              }}
                              className={`flex w-full flex-col gap-1 border-b border-[#f2e6dc] px-4 py-3 text-left last:border-b-0 ${isSelectable ? 'transition duration-300 hover:bg-[#fff6ef]' : 'cursor-not-allowed bg-[#fffaf7] text-[#9b7d6b]'}`}
                            >
                              <span className="font-semibold text-[#4d3020]">{manager.fullName}</span>
                              <span className="text-xs text-[#8a6c58]">{manager.username} | {manager.phoneNumber}</span>
                              <span className={`text-xs font-semibold ${isSelectable ? 'text-[#5f7c2f]' : 'text-[#b46a53]'}`}>
                                {isAssigned
                                  ? `Already assigned to ${manager.warehouseName ?? 'another warehouse'}`
                                  : 'Available to assign'}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  ) : null}
                  {formErrors.managerUserId ? (
                    <p className="mt-2 text-xs text-[#b7625e]">{formErrors.managerUserId}</p>
                  ) : selectedManager ? (
                    <p className="mt-2 text-xs leading-5 text-[#5f7c2f]">
                      Manager selected: {selectedManager.fullName} ({selectedManager.username}).
                    </p>
                  ) : (
                    <p className="mt-2 text-xs leading-5 text-[#8a6c58]">
                      Optional. Search active territory managers by name, username, or telephone number. Already assigned managers stay unavailable.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="warehouse-name" className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">Warehouse Name *</label>
                  <input
                    id="warehouse-name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="e.g. Colombo A Distribution Hub"
                    className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9] ${formErrors.name ? 'border-[#e1aaa3] bg-[#fff7f6]' : 'border-[#e5d3c6] bg-[#fffdfb]'}`}
                  />
                  {formErrors.name ? <p className="mt-2 text-xs text-[#b7625e]">{formErrors.name}</p> : null}
                </div>

                <div>
                  <label htmlFor="warehouse-phone" className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">Telephone *</label>
                  <input
                    id="warehouse-phone"
                    value={form.phoneNumber}
                    onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                    placeholder="e.g. +94 11 244 1180"
                    className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9] ${formErrors.phoneNumber ? 'border-[#e1aaa3] bg-[#fff7f6]' : 'border-[#e5d3c6] bg-[#fffdfb]'}`}
                  />
                  {formErrors.phoneNumber ? <p className="mt-2 text-xs text-[#b7625e]">{formErrors.phoneNumber}</p> : null}
                </div>
              </div>

              <div>
                <label htmlFor="warehouse-address" className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">Warehouse Address *</label>
                <textarea
                  id="warehouse-address"
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  rows={3}
                  placeholder="Pick the warehouse location on the map or type the full address"
                  className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9] ${formErrors.address ? 'border-[#e1aaa3] bg-[#fff7f6]' : 'border-[#e5d3c6] bg-[#fffdfb]'}`}
                />
                {formErrors.address ? <p className="mt-2 text-xs text-[#b7625e]">{formErrors.address}</p> : <p className="mt-2 text-xs leading-5 text-[#8a6c58]">Selecting a point on the map will try to auto-fill the address and nearest territory.</p>}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">Latitude</label>
                  <input value={form.latitude} readOnly placeholder="Auto-filled from the map" className="mt-2 w-full rounded-[1rem] border border-[#e5d3c6] bg-[#fff9f5] px-4 py-3 text-sm text-[#6e5647] outline-none" />
                </div>
                <div>
                  <label className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">Longitude</label>
                  <input value={form.longitude} readOnly placeholder="Auto-filled from the map" className="mt-2 w-full rounded-[1rem] border border-[#e5d3c6] bg-[#fff9f5] px-4 py-3 text-sm text-[#6e5647] outline-none" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="button" onClick={() => void handleCreateWarehouse()} disabled={isCreating} className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70">
                  {isCreating ? 'Saving...' : 'Save warehouse'}
                </button>
                <button type="button" onClick={() => { setIsCreatePanelOpen(false); resetForm() }} className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]">
                  Cancel
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-[#e5d3c6] bg-[#fffaf7]">
              <div className="border-b border-[#efe0d3] px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">Warehouse Address Map</p>
                <p className="mt-2 text-sm leading-6 text-[#7f6657]">Click on the map to capture the warehouse location and auto-fill the nearest territory.</p>
                {isResolvingLocation ? <p className="mt-2 text-xs font-semibold text-[#8b5a3a]">Resolving territory and address...</p> : null}
              </div>
              <div className="h-[24rem]">
                <MapContainer center={mapPosition ?? defaultWarehousePosition} zoom={12} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <WarehouseMapPicker position={mapPosition} onChange={(latitude, longitude) => { void handleMapSelection(latitude, longitude) }} />
                </MapContainer>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Warehouse List</p>
              <h2 className="mt-2 text-[1.45rem] font-bold tracking-[-0.04em] text-[#4d3020]">Browse by territory</h2>
            </div>
            <div className="min-w-[15rem]">
              <label htmlFor="warehouse-filter" className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">Territory Filter</label>
              <select
                id="warehouse-filter"
                value={selectedTerritoryId}
                onChange={(event) => {
                  const nextTerritoryId = event.target.value
                  setSelectedTerritoryId(nextTerritoryId)
                  setSelectedWarehouseId('')
                  setSelectedWarehouse(null)
                }}
                className="mt-2 w-full rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
              >
                <option value="ALL">All territories</option>
                {territories.map((territory) => (
                  <option key={territory.id} value={territory.id}>{territory.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {isLoading ? (
              <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-sm text-[#7f6657]">Loading warehouses...</div>
            ) : filteredWarehouses.length === 0 ? (
              <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-sm text-[#7f6657]">No warehouses matched the current filter or search.</div>
            ) : (
              filteredWarehouses.map((warehouse) => {
                const isSelected = warehouse.id === selectedWarehouseId
                return (
                  <button
                    key={warehouse.id}
                    type="button"
                    onClick={() => void handleSelectWarehouse(warehouse.id)}
                    className={`flex w-full flex-col gap-3 rounded-[1.2rem] border px-4 py-4 text-left transition duration-300 ${isSelected ? 'border-[#ca9a72] bg-[#fff7ef] shadow-[0_16px_28px_rgba(139,90,58,0.08)]' : 'border-[#eee2d7] bg-[#fff9f5] hover:border-[#d2b8a4] hover:bg-[#fff6ef]'}`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-[#4d3020]">{warehouse.name}</p>
                        <p className="mt-1 text-sm text-[#866958]">{warehouse.territoryName}</p>
                      </div>
                      <span className="rounded-full bg-[#f2e2d4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a5f43]">{warehouse.inventoryItemCount} products</span>
                    </div>
                    <p className="text-sm leading-6 text-[#7f6657]">{warehouse.address}</p>
                    <div className="grid gap-2 text-sm text-[#6f5648] sm:grid-cols-2">
                      <p><span className="font-semibold text-[#5c4030]">Manager:</span> {warehouse.managerName}</p>
                      <p><span className="font-semibold text-[#5c4030]">Cases:</span> {warehouse.inventoryCases}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </article>

        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          {isLoadingDetails ? (
            <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-sm text-[#7f6657]">Loading selected warehouse...</div>
          ) : !selectedWarehouse ? (
            <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-sm text-[#7f6657]">Select a warehouse to view details, linked people, vehicles, stock, and handled orders.</div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Selected Warehouse</p>
                  <h2 className="mt-2 text-[1.6rem] font-bold tracking-[-0.04em] text-[#4d3020]">{selectedWarehouse.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#7f6657]">{selectedWarehouse.territoryName}</p>
                </div>
                <button type="button" onClick={() => navigate(`/admin/territories?territoryId=${selectedWarehouse.territoryId}`)} className="rounded-[1rem] border border-[#d7baa3] bg-[#fff7f0] px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]">
                  Open territory
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <RelatedCard title="Address" emptyMessage="No address available." items={[{ id: 'address', primary: selectedWarehouse.address, secondary: `Updated ${formatPortalDate(selectedWarehouse.updatedAt)}` }]} />
                <RelatedCard title="Warehouse Contact" emptyMessage="No contact details available." items={[{ id: 'contact', primary: selectedWarehouse.managerName, secondary: `${selectedWarehouse.phoneNumber} • ${selectedWarehouse.territoryName}` }]} />
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <MetricCard label="Tracked Products" value={selectedWarehouse.inventorySummary.trackedProducts} />
                <MetricCard label="Cases On Hand" value={selectedWarehouse.inventorySummary.totalCasesOnHand} />
                <MetricCard label="Stock Value" value={formatCurrency(selectedWarehouse.inventorySummary.totalStockValue)} />
                <MetricCard label="Low Stock" value={selectedWarehouse.inventorySummary.lowStockProducts} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <RelatedCard title="Territory Managers" emptyMessage="No territory managers registered yet." items={selectedWarehouse.managers.map((manager) => ({ id: manager.id, primary: manager.fullName, secondary: `${manager.username} • ${manager.warehouseName ?? 'No warehouse'}` }))} />
                <RelatedCard title="Territory Distributors" emptyMessage="No territory distributors linked yet." items={selectedWarehouse.distributors.map((distributor) => ({ id: distributor.id, primary: distributor.fullName, secondary: `${distributor.username} • ${distributor.phoneNumber}` }))} />
                <RelatedCard title="Shop Owners" emptyMessage="No shop owners linked yet." items={selectedWarehouse.shopOwners.map((shopOwner) => ({ id: shopOwner.id, primary: shopOwner.shopName, secondary: `${shopOwner.ownerName} • ${shopOwner.address ?? 'No address'}` }))} />
                <RelatedCard title="Vehicles" emptyMessage="No vehicles linked yet." items={selectedWarehouse.vehicles.map((vehicle) => ({ id: vehicle.id, primary: vehicle.label, secondary: `${vehicle.registrationNumber} • ${vehicle.capacityCases} case capacity` }))} />
              </div>

              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Inventory</p>
                    <p className="mt-2 text-sm leading-6 text-[#7f6657]">Current cases on hand, max capacity, and stock money value for each product.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {isAdmin && isInventoryEditMode ? (
                      <>
                        <button type="button" onClick={() => void handleSaveInventory()} disabled={isSavingInventory} className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70">
                          {isSavingInventory ? 'Saving...' : 'Save inventory'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsInventoryEditMode(false)
                            setInventoryDraft(
                              selectedWarehouse.inventory.map((item) => ({
                                id: item.id,
                                quantityOnHand: item.casesOnHand.toString(),
                                reorderLevel: item.reorderLevel.toString(),
                                maxCapacityCases: item.maxCapacityCases.toString(),
                              })),
                            )
                          }}
                          className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
                        >
                          Cancel edits
                        </button>
                      </>
                    ) : null}
                    {isAdmin && !isInventoryEditMode ? (
                      <button type="button" onClick={() => setIsInventoryEditMode(true)} className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]">
                        Edit inventory
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-[1.2rem] border border-[#eee2d7]">
                  <table className="min-w-full divide-y divide-[#efe1d5] bg-white text-sm">
                    <thead className="bg-[#fff8f2] text-left text-[#8a6c58]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Product</th>
                        <th className="px-4 py-3 font-semibold">Cases</th>
                        <th className="px-4 py-3 font-semibold">Reorder</th>
                        <th className="px-4 py-3 font-semibold">Capacity</th>
                        <th className="px-4 py-3 font-semibold">Value</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1e5db] text-[#5a4334]">
                      {selectedWarehouse.inventory.map((item) => {
                        const draft = inventoryDraftById.get(item.id)
                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <p className="font-semibold">{item.productName}</p>
                              <p className="mt-1 text-xs text-[#8a6c58]">{item.sku} • {item.packSize} • {item.unitsOnHand} units</p>
                            </td>
                            <td className="px-4 py-3">{isInventoryEditMode ? <input type="number" min="0" value={draft?.quantityOnHand ?? item.casesOnHand.toString()} onChange={(event) => handleInventoryDraftChange(item.id, 'quantityOnHand', event.target.value)} className="w-24 rounded-[0.9rem] border border-[#e5d3c6] bg-[#fffdfb] px-3 py-2 text-sm outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]" /> : item.casesOnHand}</td>
                            <td className="px-4 py-3">{isInventoryEditMode ? <input type="number" min="0" value={draft?.reorderLevel ?? item.reorderLevel.toString()} onChange={(event) => handleInventoryDraftChange(item.id, 'reorderLevel', event.target.value)} className="w-24 rounded-[0.9rem] border border-[#e5d3c6] bg-[#fffdfb] px-3 py-2 text-sm outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]" /> : item.reorderLevel}</td>
                            <td className="px-4 py-3">{isInventoryEditMode ? <input type="number" min="1" value={draft?.maxCapacityCases ?? item.maxCapacityCases.toString()} onChange={(event) => handleInventoryDraftChange(item.id, 'maxCapacityCases', event.target.value)} className="w-24 rounded-[0.9rem] border border-[#e5d3c6] bg-[#fffdfb] px-3 py-2 text-sm outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]" /> : item.maxCapacityCases}</td>
                            <td className="px-4 py-3">{formatCurrency(item.stockValue)}</td>
                            <td className="px-4 py-3"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getInventoryBadgeClass(item.status)}`}>{formatInventoryStatus(item.status)}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Orders Handled By This Warehouse</p>
                    <p className="mt-2 text-sm leading-6 text-[#7f6657]">Filter the handled order records by daily, weekly, monthly, or annual windows.</p>
                  </div>
                  <div className="min-w-[12rem]">
                    <label htmlFor="warehouse-order-window" className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">Order Window</label>
                    <select id="warehouse-order-window" value={orderWindow} onChange={(event) => setOrderWindow(event.target.value as WarehouseOrderWindow)} className="mt-2 w-full rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]">
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="ANNUALLY">Annually</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <MetricCard label="Orders" value={selectedWarehouse.orders.summary.totalOrders} />
                  <MetricCard label="Total Cases" value={selectedWarehouse.orders.summary.totalCases} />
                  <MetricCard label="Order Value" value={formatCurrency(selectedWarehouse.orders.summary.totalAmount)} />
                </div>

                <div className="mt-4 space-y-3">
                  {selectedWarehouse.orders.records.length === 0 ? (
                    <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-sm text-[#7f6657]">No handled orders were found for the selected period.</div>
                  ) : (
                    selectedWarehouse.orders.records.map((order) => (
                      <div key={order.id} className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-base font-semibold text-[#4d3020]">{order.orderCode}</p>
                            <p className="mt-1 text-sm text-[#866958]">{order.shopName}</p>
                          </div>
                          <div className="text-sm text-[#6f5648]">
                            <p>{formatPortalDate(order.placedAt)}</p>
                            <p className="mt-1 font-semibold text-[#4d3020]">{formatCurrency(order.totalAmount)}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-[#6f5648] sm:grid-cols-3">
                          <p><span className="font-semibold text-[#5c4030]">Status:</span> {order.status}</p>
                          <p><span className="font-semibold text-[#5c4030]">Items:</span> {order.itemCount}</p>
                          <p><span className="font-semibold text-[#5c4030]">Cases:</span> {order.totalCases}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </article>
      </section>
    </AdminPortalShell>
  )
}
