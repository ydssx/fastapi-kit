import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchMe, login as apiLogin, register as apiRegister } from '../api/auth'
import { clearStoredTokens, getStoredTokens } from '../api/client'
import type { UserPublic } from '../types/api'

interface AuthContextValue {
  user: UserPublic | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    if (!getStoredTokens()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      setUser(await fetchMe())
    } catch {
      clearStoredTokens()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password)
    setUser(result.user)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const result = await apiRegister(email, password)
    setUser(result.user)
  }, [])

  const logout = useCallback(() => {
    clearStoredTokens()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
