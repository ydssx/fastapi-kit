import type { AuthResponse, TokenPair, UserPublic } from '../types/api'
import { ApiError, apiFetch, setStoredTokens } from './client'

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

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<TokenPair> {
  const tokens = await apiFetch<TokenPair>('/api/v1/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  })
  setStoredTokens(tokens)
  return tokens
}

export async function forgotPassword(email: string): Promise<string> {
  const response = await fetch('/api/v1/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const body = await response.json()
  if (response.status === 503 && body.code === 50301) {
    throw new ApiError(
      '邮件重置尚未配置。请联系运营通过管理后台重置密码。',
      body.code,
      response.status,
    )
  }
  if (!response.ok || body.code !== 0) {
    throw new ApiError(body.message || '请求失败', body.code, response.status)
  }
  return body.data.message as string
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
  const response = await fetch('/api/v1/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword }),
  })
  const body = await response.json()
  if (!response.ok || body.code !== 0) {
    throw new ApiError(body.message || '重置失败', body.code, response.status)
  }
  return body.data.message as string
}
