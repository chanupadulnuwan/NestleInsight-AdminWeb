import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { createTerritory, fetchTerritories, type TerritoryRecord } from '../api/territories'
import { getApiErrorCode, getApiErrorMessage } from '../api/client'
import { AdminPortalShell } from '../components/AdminPortalShell'
import { useAuth } from '../context/AuthContext'
import { formatPortalDate, surfaceClassName } from './productsPage.helpers'

type TerritoryFormState = {
  name: string
  latitude: string
  longitude: string
}

type TerritoryFormErrors = {
  name?: string
  location?: string
}

const defaultPosition: [number, number] = [6.9271, 79.8612]

function formatCoordinate(value: number) {
  return value.toFixed(6)
}

function validateTerritoryForm(form: TerritoryFormState) {
  const errors: TerritoryFormErrors = {}
  const latitude = Number(form.latitude)
  const longitude = Number(form.longitude)

  if (!form.name.trim()) {
    errors.name = 'Territory name is required.'
  }

  if (
    !form.latitude.trim() ||
    !form.longitude.trim() ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    errors.location = 'Select a valid map location for the territory.'
  }

  return errors
}

function TerritoryMapSync({ position }: { position: [number, number] | null }) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.setView(position, 12)
    }
  }, [map, position])

  return null
}

function TerritoryMapPicker({
  position,
  onChange,
}: {
  position: [number, number] | null
  onChange: (latitude: number, longitude: number) => void
}) {
  useMapEvents({
    click: (event) => {
      onChange(event.latlng.lat, event.latlng.lng)
    },
  })

  return (
    <>
      <TerritoryMapSync position={position} />
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

export default function TerritoriesPage() {
  const navigate = useNavigate()
  const { user, isAuthLoading, logout } = useAuth()
  const [territories, setTerritories] = useState<TerritoryRecord[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false)
  const [form, setForm] = useState<TerritoryFormState>({
    name: '',
    latitude: formatCoordinate(defaultPosition[0]),
    longitude: formatCoordinate(defaultPosition[1]),
  })
  const [formErrors, setFormErrors] = useState<TerritoryFormErrors>({})

  const isAdmin = user?.role === 'ADMIN'
  const canViewTerritories =
    isAdmin || (user?.role === 'REGIONAL_MANAGER' && user?.approvalStatus === 'APPROVED')

  const loadTerritories = async () => {
    setIsLoading(true)
    setPageError(null)

    try {
      const response = await fetchTerritories()
      setTerritories(response.territories)
    } catch (requestError) {
      setPageError(
        getApiErrorMessage(
          requestError,
          'Unable to load territory controls right now.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (canViewTerritories) {
      void loadTerritories()
    }
  }, [canViewTerritories])

  useEffect(() => {
    if (!feedback && !pageError) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null)
      setPageError(null)
    }, 4500)

    return () => window.clearTimeout(timeoutId)
  }, [feedback, pageError])

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[#6e5647]">
        Loading territory controls...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (!canViewTerritories) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const totalWarehouses = territories.reduce(
    (sum, territory) => sum + territory.warehouseCount,
    0,
  )
  const filteredTerritories = territories.filter((territory) => {
    const normalizedSearch = searchValue.trim().toLowerCase()
    if (!normalizedSearch) {
      return true
    }

    return [
      territory.name,
      ...territory.warehouses.map((warehouse) => warehouse.name),
      ...territory.managers.map((manager) => manager.fullName),
      ...territory.distributors.map((distributor) => distributor.fullName),
      ...territory.shopOwners.map((shopOwner) => shopOwner.shopName),
      ...territory.vehicles.map((vehicle) => vehicle.label),
    ].some((value) => value.toLowerCase().includes(normalizedSearch))
  })

  const mapPosition: [number, number] | null =
    form.latitude.trim() && form.longitude.trim()
      ? [Number(form.latitude), Number(form.longitude)]
      : null

  const handleMapSelection = (latitude: number, longitude: number) => {
    setForm((current) => ({
      ...current,
      latitude: formatCoordinate(latitude),
      longitude: formatCoordinate(longitude),
    }))

    if (formErrors.location) {
      setFormErrors((current) => ({ ...current, location: undefined }))
    }
  }

  const resetForm = () => {
    setForm({
      name: '',
      latitude: formatCoordinate(defaultPosition[0]),
      longitude: formatCoordinate(defaultPosition[1]),
    })
    setFormErrors({})
  }

  const handleCreateTerritory = async () => {
    const validationErrors = validateTerritoryForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      return
    }

    setIsCreating(true)
    setFeedback(null)
    setPageError(null)

    try {
      const response = await createTerritory({
        name: form.name.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      })
      setFeedback(response.message)
      setIsCreatePanelOpen(false)
      resetForm()
      await loadTerritories()
    } catch (requestError) {
      if (getApiErrorCode(requestError) === 'TERRITORY_NAME_NOT_UNIQUE') {
        setFormErrors((current) => ({
          ...current,
          name: 'This territory name already exists.',
        }))
      }
      setPageError(
        getApiErrorMessage(
          requestError,
          'Unable to create the territory right now.',
        ),
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <AdminPortalShell
      user={user}
      breadcrumb="Portal / Dashboard / Territories"
      title="Territory Controls"
      description="Create territory areas with a pinned map location, review the warehouse coverage inside each territory, and move directly into the warehouse workspace from one place."
      actions={
        <>
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="rounded-[1rem] bg-[#879f33] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(115,141,44,0.18)] transition duration-300 hover:bg-[#74892d]"
          >
            Back to dashboard
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
      {feedback ? (
        <div className="rounded-[1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3 text-sm text-[#4d6c45]">
          {feedback}
        </div>
      ) : null}
      {pageError ? (
        <div className="rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">
          {pageError}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
            Territory Summary
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              <p className="text-sm font-semibold text-[#8a6c58]">Territories</p>
              <p className="mt-2 text-[1.55rem] font-bold text-[#4d3020]">
                {territories.length}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              <p className="text-sm font-semibold text-[#8a6c58]">Warehouses</p>
              <p className="mt-2 text-[1.55rem] font-bold text-[#4d3020]">
                {totalWarehouses}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              <p className="text-sm font-semibold text-[#8a6c58]">Coverage</p>
              <p className="mt-2 text-[1.2rem] font-bold text-[#4d3020]">
                Colombo A + B
              </p>
            </div>
          </div>
        </article>

        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                Search Territories
              </p>
              <h2 className="mt-2 text-[1.45rem] font-bold tracking-[-0.04em] text-[#4d3020]">
                Find territory coverage quickly
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#7f6657]">
                Search by territory name, warehouse, manager, distributor, shop,
                or vehicle.
              </p>
            </div>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setIsCreatePanelOpen((current) => !current)
                  if (isCreatePanelOpen) {
                    resetForm()
                  }
                }}
                className="rounded-[1rem] border border-[#d7baa3] bg-[#fff7f0] px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
              >
                {isCreatePanelOpen ? 'Hide form' : 'Create territory'}
              </button>
            ) : null}
          </div>
          <div className="mt-5">
            <label
              htmlFor="territory-search"
              className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]"
            >
              Search
            </label>
            <input
              id="territory-search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search territories, warehouses, managers, shops, or vehicles"
              className="mt-2 w-full rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
            />
          </div>
        </article>
      </section>

      {isAdmin && isCreatePanelOpen ? (
        <section className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="territory-name"
                  className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]"
                >
                  Territory Name *
                </label>
                <input
                  id="territory-name"
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, name: event.target.value }))
                    if (formErrors.name) {
                      setFormErrors((current) => ({ ...current, name: undefined }))
                    }
                  }}
                  placeholder="e.g. Colombo C"
                  className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9] ${formErrors.name ? 'border-[#e1aaa3] bg-[#fff7f6]' : 'border-[#e5d3c6] bg-[#fffdfb]'}`}
                />
                {formErrors.name ? (
                  <p className="mt-2 text-xs text-[#b7625e]">{formErrors.name}</p>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-[#8a6c58]">
                    Keep the territory name business-friendly and easy to assign.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="territory-latitude"
                    className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]"
                  >
                    Latitude
                  </label>
                  <input
                    id="territory-latitude"
                    value={form.latitude}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        latitude: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="territory-longitude"
                    className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]"
                  >
                    Longitude
                  </label>
                  <input
                    id="territory-longitude"
                    value={form.longitude}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        longitude: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
                  />
                </div>
              </div>
              {formErrors.location ? (
                <p className="text-xs text-[#b7625e]">{formErrors.location}</p>
              ) : (
                <p className="text-xs leading-5 text-[#8a6c58]">
                  Click on the map to pin the territory location, or fine-tune the
                  coordinates here.
                </p>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void handleCreateTerritory()}
                  disabled={isCreating}
                  className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreating ? 'Saving...' : 'Save territory'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm()
                    setIsCreatePanelOpen(false)
                  }}
                  className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-[#e5d3c6] bg-[#fffaf7]">
              <div className="border-b border-[#efe0d3] px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">
                  Territory Area Location
                </p>
                <p className="mt-2 text-sm leading-6 text-[#7f6657]">
                  Click anywhere on the map to set the territory area location.
                </p>
              </div>
              <div className="h-[21rem]">
                <MapContainer
                  center={mapPosition ?? defaultPosition}
                  zoom={12}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <TerritoryMapPicker
                    position={mapPosition}
                    onChange={handleMapSelection}
                  />
                </MapContainer>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
        {isLoading ? (
          <div className={`${surfaceClassName} px-6 py-6 text-sm text-[#7f6657] xl:col-span-2`}>
            Loading territories...
          </div>
        ) : filteredTerritories.length === 0 ? (
          <div className={`${surfaceClassName} px-6 py-6 text-sm text-[#7f6657] xl:col-span-2`}>
            No territories matched the current search.
          </div>
        ) : (
          filteredTerritories.map((territory) => (
            <article
              key={territory.id}
              className={`${surfaceClassName} px-6 py-6 sm:px-7`}
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                      Territory
                    </p>
                    <h2 className="mt-2 text-[1.6rem] font-bold tracking-[-0.04em] text-[#4d3020]">
                      {territory.name}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#7f6657]">
                      Coordinates: {formatCoordinate(territory.latitude)},{' '}
                      {formatCoordinate(territory.longitude)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${territory.latitude}&mlon=${territory.longitude}#map=12/${territory.latitude}/${territory.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[1rem] border border-[#d7baa3] bg-[#fff7f0] px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
                    >
                      Open map
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/admin/warehouses?territoryId=${territory.id}`)
                      }
                      className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f]"
                    >
                      View warehouses
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold text-[#8a6c58]">Warehouses</p>
                    <p className="mt-2 text-[1.45rem] font-bold text-[#4d3020]">
                      {territory.warehouseCount}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold text-[#8a6c58]">Created</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#4d3020]">
                      {formatPortalDate(territory.createdAt)}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold text-[#8a6c58]">Updated</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#4d3020]">
                      {formatPortalDate(territory.updatedAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">
                    Linked Warehouses
                  </p>
                  {territory.warehouses.length === 0 ? (
                    <div className="mt-4 rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-sm text-[#7f6657]">
                      No warehouses are linked to this territory yet.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {territory.warehouses.map((warehouse) => (
                        <button
                          key={warehouse.id}
                          type="button"
                          onClick={() =>
                            navigate(
                              `/admin/warehouses?territoryId=${territory.id}&warehouseId=${warehouse.id}`,
                            )
                          }
                          className="flex w-full flex-col gap-3 rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-left transition duration-300 hover:border-[#d2b8a4] hover:bg-[#fff6ef]"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-base font-semibold text-[#4d3020]">
                                {warehouse.name}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-[#7f6657]">
                                {warehouse.address}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#f2e2d4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a5f43]">
                              {warehouse.inventoryItemCount} inventory lines
                            </span>
                          </div>
                          <div className="grid gap-2 text-sm text-[#6f5648] sm:grid-cols-2">
                            <p>
                              <span className="font-semibold text-[#5c4030]">Phone:</span>{' '}
                              {warehouse.phoneNumber}
                            </p>
                            <p>
                              <span className="font-semibold text-[#5c4030]">Manager:</span>{' '}
                              {warehouse.managerName}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">
                      Territory Managers
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-[#6f5648]">
                      {territory.managers.length === 0 ? (
                        <p>No territory managers assigned yet.</p>
                      ) : (
                        territory.managers.map((manager) => (
                          <div key={manager.id} className="rounded-[1rem] bg-white px-3 py-3">
                            <p className="font-semibold text-[#4d3020]">{manager.fullName}</p>
                            <p className="mt-1 text-xs text-[#8a6c58]">
                              {manager.username} • {manager.warehouseName ?? 'No warehouse'}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">
                      Territory Distributors
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-[#6f5648]">
                      {territory.distributors.length === 0 ? (
                        <p>No territory distributors assigned yet.</p>
                      ) : (
                        territory.distributors.map((distributor) => (
                          <div key={distributor.id} className="rounded-[1rem] bg-white px-3 py-3">
                            <p className="font-semibold text-[#4d3020]">{distributor.fullName}</p>
                            <p className="mt-1 text-xs text-[#8a6c58]">
                              {distributor.username} • {distributor.warehouseName ?? 'No warehouse'}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">
                      Shop Owners
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-[#6f5648]">
                      {territory.shopOwners.length === 0 ? (
                        <p>No shop owners linked yet.</p>
                      ) : (
                        territory.shopOwners.map((shopOwner) => (
                          <div key={shopOwner.id} className="rounded-[1rem] bg-white px-3 py-3">
                            <p className="font-semibold text-[#4d3020]">{shopOwner.shopName}</p>
                            <p className="mt-1 text-xs text-[#8a6c58]">
                              {shopOwner.ownerName} • {shopOwner.warehouseName ?? 'No warehouse'}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">
                      Vehicles
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-[#6f5648]">
                      {territory.vehicles.length === 0 ? (
                        <p>No vehicles linked yet.</p>
                      ) : (
                        territory.vehicles.map((vehicle) => (
                          <div key={vehicle.id} className="rounded-[1rem] bg-white px-3 py-3">
                            <p className="font-semibold text-[#4d3020]">{vehicle.label}</p>
                            <p className="mt-1 text-xs text-[#8a6c58]">
                              {vehicle.registrationNumber} • {vehicle.warehouseName ?? 'Territory pool'}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </AdminPortalShell>
  )
}
