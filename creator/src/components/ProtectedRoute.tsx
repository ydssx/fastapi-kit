import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <p style={{ padding: 24 }}>加载中…</p>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
