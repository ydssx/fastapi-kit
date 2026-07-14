import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LoadingBlock } from './LoadingBlock'
import styles from './ProtectedRoute.module.css'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <ProtectedRouteLoading />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function ProtectedRouteLoading() {
  return (
    <div className={styles.wrap}>
      <LoadingBlock />
    </div>
  )
}
