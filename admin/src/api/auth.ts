import { apiFetch, setStoredTokens } from './client'
import type { AuthResponse, UserPublic } from '../types/api'

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await response.json()
  if (!response.ok || body.code !== 0) {
    throw new Error(body.message || 'Login failed')
  }
  const data = body.data as AuthResponse
  setStoredTokens({
    access_token: data.tokens.access_token,
    refresh_token: data.tokens.refresh_token,
  })
  return data
}

export function fetchMe(): Promise<UserPublic> {
  return apiFetch<UserPublic>('/api/v1/auth/me')
}
