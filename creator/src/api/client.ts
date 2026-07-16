import { ApiError, createApiClient, type StoredTokens } from './createApiClient'

const client = createApiClient({
  storageKey: 'fastapi_kit_creator_tokens',
  allowNullData: true,
})

export { ApiError }
export type { StoredTokens }
export const {
  apiFetch,
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} = client
