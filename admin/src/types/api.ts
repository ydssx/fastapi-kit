export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface UserPublic {
  id: string
  email: string
  is_active: boolean
  role: string
  created_at: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface AuthResponse {
  user: UserPublic
  tokens: TokenPair
}

export interface DashboardStats {
  user_count: number
  active_user_count: number
  service_status: {
    database: string
    redis: string
  }
  metrics_summary: Record<string, number>
}

export interface CeleryWorkerInfo {
  name: string
  status: string
  active_tasks: number
  processed: number | null
}

export interface CeleryTaskInfo {
  worker: string
  task_id: string
  name: string
  args: unknown[]
}

export interface CeleryOverview {
  status: string
  workers: CeleryWorkerInfo[]
  active_tasks: CeleryTaskInfo[]
  scheduled_tasks: CeleryTaskInfo[]
  message: string | null
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  detail: Record<string, unknown> | null
  ip: string | null
  user_agent: string | null
  created_at: string
}
