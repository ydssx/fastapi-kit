export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

export interface UserPublic {
  id: string
  email: string
  role: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
}

export interface AuthResponse {
  user: UserPublic
  tokens: TokenPair
}

export interface PipelineStep {
  key: string
  title: string
  description: string
  ai_enabled: boolean
}

export interface Pipeline {
  id: string
  title: string
  description: string
  steps: PipelineStep[]
}

export interface StepArtifact {
  step_key: string
  content: string
  version: number
  confirmed_at: string
}

export type ProjectStatus = 'in_progress' | 'completed'

export interface Project {
  id: string
  pipeline_id: string
  title: string
  status: ProjectStatus
  current_step_key: string
  target_platforms: string[]
  primary_platform_key: string | null
  draft_content: Record<string, string>
  publish_checklist_state: Record<string, boolean>
  created_at: string
  updated_at: string
  completed_at: string | null
  artifacts: StepArtifact[]
  publish_progress: PublishProgress | null
}

export interface PublishProgress {
  platforms_total: number
  platforms_published: number
  summary_label: string
}

export interface PublishChecklistItem {
  platform: string
  platform_label: string
  item_key: string
  label: string
  checked: boolean
}

export interface Usage {
  year_month: string
  completed_projects: number
  completed_projects_limit: number
  ai_calls: number
  ai_calls_limit: number
  playground_calls: number
  playground_calls_limit: number
  plan: string
}

export interface PlaygroundTopic {
  title: string
  reason: string
}

export interface PlaygroundMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface PlaygroundTopicsResponse {
  topics: PlaygroundTopic[]
  brand_empty: boolean
}

export interface PlaygroundRefineResponse {
  reply: string
  understanding: string | null
}

export interface PlaygroundOutlineSection {
  title: string
  summary: string
}

export interface PlaygroundOutline {
  central_claim: string
  opening_hook: string
  sections: PlaygroundOutlineSection[]
  closing_cta: string
}

export interface PlaygroundOutlineGenerateResponse {
  outline: PlaygroundOutline
  brand_empty: boolean
}

export interface PlaygroundOutlineRefineResponse {
  outline: PlaygroundOutline
}

export interface PlaygroundHandoffResponse {
  project_id: string
}

export interface AiVariant {
  label: string
  content: string
}

export interface AiSuggestResponse {
  suggestion: string
  variants: AiVariant[]
}

export interface BrandProfile {
  tone: string
  audience: string
  taboos: string
  structure_notes: string
}

export type MediaAssetStatus = 'processing' | 'ready' | 'failed' | 'deleted'

export interface MediaAsset {
  id: string
  original_filename: string
  mime_type: string
  byte_size: number
  width: number | null
  height: number | null
  source: string
  category: string
  tags: string[]
  status: MediaAssetStatus
  created_at: string
}

export interface MediaAssetList {
  items: MediaAsset[]
  total: number
  page: number
  page_size: number
}

export interface MediaPreview {
  url: string
}

export interface MediaAssociation {
  id: string
  project_id: string
  media_asset_id: string
  step_key: string
  reference_position: string
  asset_reference: string
  created_at: string
}

export interface ProjectMediaAssociation extends MediaAssociation {
  asset: MediaAsset
  is_invalid: boolean
}
