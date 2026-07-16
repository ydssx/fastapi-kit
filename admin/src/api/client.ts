import { ApiError, createApiClient, type StoredTokens } from './createApiClient'

const client = createApiClient({
  storageKey: 'fastapi_kit_admin_tokens',
  allowNullData: false,
})

export { ApiError }
export type { StoredTokens }
export const {
  apiFetch,
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} = client
