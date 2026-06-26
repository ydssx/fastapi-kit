import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchMe, login as apiLogin } from '../api/auth'
import { clearStoredTokens, getStoredTokens } from '../api/client'
import type { UserPublic } from '../types/api'
import { AuthContext } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState(() => getStoredTokens() !== null)

  useEffect(() => {
    if (!getStoredTokens()) return

    let cancelled = false

    async function loadUser() {
      try {
        const me = await fetchMe()
        if (cancelled) return
        if (me.role !== 'admin') {
          clearStoredTokens()
          setUser(null)
        } else {
          setUser(me)
        }
      } catch {
        if (!cancelled) {
          clearStoredTokens()
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadUser()

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password)
    if (result.user.role !== 'admin') {
      clearStoredTokens()
      throw new Error('需要管理员账号才能登录后台')
    }
    setUser(result.user)
  }, [])

  const logout = useCallback(() => {
    clearStoredTokens()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
