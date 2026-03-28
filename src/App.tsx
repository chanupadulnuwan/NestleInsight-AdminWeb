import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Home from './pages/Home'
import AdminDashboard from './pages/AdminDashboard'
import ProductsPage from './pages/ProductsPage'
import TerritoriesPage from './pages/TerritoriesPage'
import UserManagement from './pages/UserManagement'
import WarehousesPage from './pages/WarehousesPage'
import TmWarehousePage from './pages/tm/TmWarehousePage'
import TmApprovalsPage from './pages/tm/TmApprovalsPage'
import TmActivityCenterPage from './pages/tm/TmActivityCenterPage'
import TmOrdersPage from './pages/tm/TmOrdersPage'
import TmStockPage from './pages/tm/TmStockPage'
import TmSettingsPage from './pages/tm/TmSettingsPage'
import TmProfilePage from './pages/tm/TmProfilePage'

function RoleBasedRedirect() {
  const { user, isAuthLoading } = useAuth()

  if (isAuthLoading) return null

  if (!user) return <Navigate to="/" replace />

  if (user.role === 'REGIONAL_MANAGER') return <Navigate to="/tm/warehouse" replace />

  return <Navigate to="/admin/dashboard" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* Admin routes */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/products" element={<ProductsPage />} />
      <Route path="/admin/territories" element={<TerritoriesPage />} />
      <Route path="/admin/users" element={<UserManagement />} />
      <Route path="/admin/warehouses" element={<WarehousesPage />} />

      {/* Territory Manager routes */}
      <Route path="/tm/warehouse" element={<TmWarehousePage />} />
      <Route path="/tm/approvals" element={<TmApprovalsPage />} />
      <Route path="/tm/activity-center" element={<TmActivityCenterPage />} />
      <Route path="/tm/orders" element={<TmOrdersPage />} />
      <Route path="/tm/stock" element={<TmStockPage />} />
      <Route path="/tm/settings" element={<TmSettingsPage />} />
      <Route path="/tm/profile" element={<TmProfilePage />} />

      {/* Role-based entry point */}
      <Route path="/portal" element={<RoleBasedRedirect />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
