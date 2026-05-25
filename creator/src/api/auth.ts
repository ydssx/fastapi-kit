import type { AuthResponse, UserPublic } from '../types/api'
import { apiFetch, setStoredTokens } from './client'

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await response.json()
  if (!response.ok || body.code !== 0) {
    throw new Error(body.message || '登录失败')
  }
  const data = body.data as AuthResponse
  setStoredTokens(data.tokens)
  return data
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await response.json()
  if (!response.ok || body.code !== 0) {
    throw new Error(body.message || '注册失败')
  }
  const data = body.data as AuthResponse
  setStoredTokens(data.tokens)
  return data
}

export async function fetchMe(): Promise<UserPublic> {
  return apiFetch<UserPublic>('/api/v1/auth/me')
}
