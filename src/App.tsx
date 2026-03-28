import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import AdminDashboard from './pages/AdminDashboard'
import ProductsPage from './pages/ProductsPage'
import TerritoriesPage from './pages/TerritoriesPage'
import UserManagement from './pages/UserManagement'
import WarehousesPage from './pages/WarehousesPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/products" element={<ProductsPage />} />
      <Route path="/admin/territories" element={<TerritoriesPage />} />
      <Route path="/admin/users" element={<UserManagement />} />
      <Route path="/admin/warehouses" element={<WarehousesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
