import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  apiFetch,
  getStoredTokens,
  setStoredTokens,
} from './client'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('admin api client contract', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends JSON requests and unwraps successful envelopes', async () => {
    setStoredTokens({ access_token: 'access-old', refresh_token: 'refresh-old' })
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: 0, message: 'ok', data: { id: 7 } }),
    )

    await expect(
      apiFetch<{ id: number }>('/api/v1/admin/example', {
        method: 'POST',
        body: JSON.stringify({ enabled: true }),
      }),
    ).resolves.toEqual({ id: 7 })

    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers)
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('Authorization')).toBe('Bearer access-old')
  })

  it('does not set Content-Type for FormData', async () => {
    const form = new FormData()
    form.append('file', new Blob(['content']), 'sample.txt')
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: 0, message: 'ok', data: { uploaded: true } }),
    )

    await apiFetch('/api/v1/admin/upload', { method: 'POST', body: form })

    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers)
    expect(headers.has('Content-Type')).toBe(false)
  })

  it('refreshes once before parsing a 401 response and retries the request', async () => {
    setStoredTokens({ access_token: 'access-old', refresh_token: 'refresh-old' })
    fetchMock
      .mockResolvedValueOnce(new Response('not-json', { status: 401 }))
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          message: 'ok',
          data: { access_token: 'access-new', refresh_token: 'refresh-new' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ code: 0, message: 'ok', data: { id: 8 } }),
      )

    await expect(apiFetch<{ id: number }>('/api/v1/admin/example')).resolves.toEqual({
      id: 8,
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/refresh')
    const retryHeaders = new Headers(fetchMock.mock.calls[2][1]?.headers)
    expect(retryHeaders.get('Authorization')).toBe('Bearer access-new')
    expect(getStoredTokens()).toEqual({
      access_token: 'access-new',
      refresh_token: 'refresh-new',
    })
  })

  it('clears tokens when refresh fails without recursively refreshing', async () => {
    setStoredTokens({ access_token: 'access-old', refresh_token: 'refresh-old' })
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        jsonResponse({ code: 40101, message: 'Invalid refresh token', data: null }, 401),
      )

    await expect(apiFetch('/api/v1/admin/example')).rejects.toMatchObject({
      name: 'ApiError',
      code: 40100,
      status: 401,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(getStoredTokens()).toBeNull()
  })

  it('returns undefined for 204 responses', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(
      apiFetch<void>('/api/v1/admin/example', { method: 'DELETE' }),
    ).resolves.toBeUndefined()
  })

  it('throws ApiError for error envelopes', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: 42201, message: 'Invalid input', data: null }, 422),
    )

    const request = apiFetch('/api/v1/admin/example')
    await expect(request).rejects.toBeInstanceOf(ApiError)
    await expect(request).rejects.toMatchObject({
      message: 'Invalid input',
      code: 42201,
      status: 422,
    })
  })

  it('rejects null data under the strict admin policy', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: 0, message: 'ok', data: null }),
    )

    await expect(apiFetch('/api/v1/admin/example')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Empty response',
      code: 0,
      status: 200,
    })
  })
})
