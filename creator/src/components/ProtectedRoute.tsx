import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import styles from './ProtectedRoute.module.css'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <ProtectedRouteLoading />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function ProtectedRouteLoading() {
  return (
    <div className={styles.loading}>
      <span className={styles.spinner} aria-hidden />
      加载中…
    </div>
  )
}
