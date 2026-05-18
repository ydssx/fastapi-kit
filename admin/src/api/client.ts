import type { ApiResponse } from '../types/api'

const STORAGE_KEY = 'fastapi_kit_admin_tokens'

export interface StoredTokens {
  access_token: string
  refresh_token: string
}

export function getStoredTokens(): StoredTokens | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredTokens
  } catch {
    return null
  }
}

export function setStoredTokens(tokens: StoredTokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function clearStoredTokens(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export class ApiError extends Error {
  code: number
  status: number

  constructor(message: string, code: number, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  const body = (await response.json()) as ApiResponse<{ access_token: string; refresh_token: string }>
  if (!response.ok || body.code !== 0 || !body.data) {
    throw new ApiError(body.message || 'Session expired', body.code, response.status)
  }
  const stored = getStoredTokens()
  if (stored) {
    setStoredTokens({
      access_token: body.data.access_token,
      refresh_token: body.data.refresh_token,
    })
  }
  return body.data.access_token
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const tokens = getStoredTokens()
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (tokens?.access_token) {
    headers.set('Authorization', `Bearer ${tokens.access_token}`)
  }

  const response = await fetch(path, { ...options, headers })
  const body = (await response.json()) as ApiResponse<T>

  if (response.status === 401 && retry && tokens?.refresh_token) {
    const newAccess = await refreshAccessToken(tokens.refresh_token)
    headers.set('Authorization', `Bearer ${newAccess}`)
    const retryResponse = await fetch(path, { ...options, headers })
    const retryBody = (await retryResponse.json()) as ApiResponse<T>
    if (!retryResponse.ok || retryBody.code !== 0) {
      throw new ApiError(retryBody.message, retryBody.code, retryResponse.status)
    }
    if (retryBody.data === null) {
      throw new ApiError('Empty response', retryBody.code, retryResponse.status)
    }
    return retryBody.data
  }

  if (!response.ok || body.code !== 0) {
    throw new ApiError(body.message, body.code, response.status)
  }
  if (body.data === null) {
    throw new ApiError('Empty response', body.code, response.status)
  }
  return body.data
}
