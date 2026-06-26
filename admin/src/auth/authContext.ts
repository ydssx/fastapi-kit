import { createContext } from 'react'
import type { UserPublic } from '../types/api'

export interface AuthContextValue {
  user: UserPublic | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
