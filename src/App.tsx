import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <Routes>
      {/* Website auth update: add the dummy admin dashboard route for successful portal sign-ins. */}
      <Route path="/" element={<Home />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
