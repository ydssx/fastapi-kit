import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchMe, login as apiLogin } from '../api/auth'
import { clearStoredTokens, getStoredTokens } from '../api/client'
import type { UserPublic } from '../types/api'

interface AuthContextValue {
  user: UserPublic | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const tokens = getStoredTokens()
    if (!tokens) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await fetchMe()
      if (me.role !== 'admin') {
        clearStoredTokens()
        setUser(null)
      } else {
        setUser(me)
      }
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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
