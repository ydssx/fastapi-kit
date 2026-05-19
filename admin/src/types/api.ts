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

export interface SystemOverview {
  ready_status: string
  ready_message: string | null
  migration_at_head: boolean
  migration_revision: string | null
  migration_head_revision: string | null
  beat_status: string
  beat_last_seen: string | null
  api_replicas_reported: number | null
  api_replicas_note: string | null
}

export interface DashboardStats {
  user_count: number
  active_user_count: number
  service_status: {
    database: string
    redis: string
  }
  metrics_summary: Record<string, number>
  system: SystemOverview
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

export interface BeatScheduleEntry {
  name: string
  task: string
  schedule: string
}

export interface CeleryOverview {
  status: string
  workers: CeleryWorkerInfo[]
  active_tasks: CeleryTaskInfo[]
  scheduled_tasks: CeleryTaskInfo[]
  reserved_tasks: CeleryTaskInfo[]
  beat_schedule: BeatScheduleEntry[]
  flower_url: string | null
  message: string | null
}

export interface PasswordResetResult {
  temporary_password: string
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

export interface AlertSettings {
  webhook_url: string | null
  webhook_secret_configured: boolean
  recovery_notifications_enabled: boolean
  webhook_enabled: boolean
}

export interface AlertDelivery {
  id: string
  event_type: string
  success: boolean
  http_status: number | null
  created_at: string
}

export interface AlertTestResult {
  sent: boolean
  http_status: number | null
  message: string
}

export interface LogEntry {
  timestamp: string
  level: string | null
  message: string | null
  request_id: string | null
  raw: Record<string, unknown>
}

export interface LogQueryResult {
  items: LogEntry[]
  total: number
  page: number
  page_size: number
  loki_available: boolean
}
