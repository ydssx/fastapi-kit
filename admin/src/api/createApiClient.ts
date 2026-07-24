import type { ApiResponse } from '../types/api'

// Keep this module structurally identical in both SPAs for now. Physical sharing is
// deferred until the repository adopts a frontend workspace and shared build boundary.

export interface StoredTokens {
  access_token: string
  refresh_token: string
}

interface ApiClientConfig {
  storageKey: string
  allowNullData: boolean
  refreshPath?: string
}

export class ApiError extends Error {
  code: number
  status: number

  constructor(message: string, code: number, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export function createApiClient({
  storageKey,
  allowNullData,
  refreshPath = '/api/v1/auth/refresh',
}: ApiClientConfig) {
  function getStoredTokens(): StoredTokens | null {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    try {
      return JSON.parse(raw) as StoredTokens
    } catch {
      return null
    }
  }

  function setStoredTokens(tokens: StoredTokens): void {
    localStorage.setItem(storageKey, JSON.stringify(tokens))
  }

  function clearStoredTokens(): void {
    localStorage.removeItem(storageKey)
  }

  async function parseResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T
    }

    const body = (await response.json()) as ApiResponse<T>
    if (!response.ok || body.code !== 0) {
      throw new ApiError(body.message || 'Request failed', body.code, response.status)
    }
    if (body.data === null && !allowNullData) {
      throw new ApiError('Empty response', body.code, response.status)
    }
    return body.data as T
  }

  async function refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await fetch(refreshPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    const body = (await response.json()) as ApiResponse<StoredTokens>
    if (!response.ok || body.code !== 0 || !body.data) {
      throw new ApiError(body.message || 'Session expired', body.code, response.status)
    }
    setStoredTokens(body.data)
    return body.data.access_token
  }

  async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
    retry = true,
  ): Promise<T> {
    const tokens = getStoredTokens()
    const headers = new Headers(options.headers)
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
    if (!headers.has('Content-Type') && options.body && !isFormData) {
      headers.set('Content-Type', 'application/json')
    }
    if (tokens?.access_token) {
      headers.set('Authorization', `Bearer ${tokens.access_token}`)
    }

    let response = await fetch(path, { ...options, headers })
    if (
      response.status === 401 &&
      retry &&
      path !== refreshPath &&
      tokens?.refresh_token
    ) {
      let accessToken: string
      try {
        accessToken = await refreshAccessToken(tokens.refresh_token)
      } catch {
        clearStoredTokens()
        throw new ApiError('Session expired', 40100, 401)
      }
      headers.set('Authorization', `Bearer ${accessToken}`)
      response = await fetch(path, { ...options, headers })
    }

    return parseResponse<T>(response)
  }

  return {
    apiFetch,
    clearStoredTokens,
    getStoredTokens,
    setStoredTokens,
  }
}
