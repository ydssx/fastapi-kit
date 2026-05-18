import { apiFetch } from './client'
import type { Paginated, UserPublic } from '../types/api'

export interface UserListParams {
  page?: number
  page_size?: number
  email?: string
  is_active?: boolean
  role?: string
}

export function fetchUsers(params: UserListParams = {}): Promise<Paginated<UserPublic>> {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.page_size) search.set('page_size', String(params.page_size))
  if (params.email) search.set('email', params.email)
  if (params.is_active !== undefined) search.set('is_active', String(params.is_active))
  if (params.role) search.set('role', params.role)
  const qs = search.toString()
  return apiFetch<Paginated<UserPublic>>(`/api/v1/admin/users${qs ? `?${qs}` : ''}`)
}

export function updateUser(
  id: string,
  payload: { is_active?: boolean; role?: string },
): Promise<UserPublic> {
  return apiFetch<UserPublic>(`/api/v1/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
