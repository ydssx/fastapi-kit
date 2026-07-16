import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProjectDetailPage } from './ProjectDetailPage'

const associateMedia = vi.fn()
const fetchProjectMediaAssociations = vi.fn().mockResolvedValue([])

vi.mock('../api/creator', () => ({
  aiSuggest: vi.fn(),
  associateMedia: (...args: unknown[]) => associateMedia(...args),
  completeProject: vi.fn(),
  confirmStep: vi.fn(),
  deleteProject: vi.fn(),
  disassociateMedia: vi.fn(),
  fetchBrand: vi.fn().mockResolvedValue({ tone: '', audience: '', taboos: '', structure_notes: '' }),
  fetchMediaPreview: vi.fn().mockResolvedValue({ url: 'https://example.test/cover.png' }),
  fetchProjectMediaAssociations: (...args: unknown[]) => fetchProjectMediaAssociations(...args),
  fetchPipelines: vi.fn().mockResolvedValue([
    { id: 'pipeline', title: '流程', description: '', steps: [{ key: 'outline', title: '大纲', description: '', ai_enabled: false }] },
  ]),
  fetchProject: vi.fn().mockResolvedValue({
    id: 'project-1',
    pipeline_id: 'pipeline',
    title: '测试项目',
    status: 'in_progress',
    current_step_key: 'outline',
    target_platforms: [],
    primary_platform_key: null,
    draft_content: { outline: '原始文本' },
    publish_checklist_state: {},
    created_at: '2026-07-10T00:00:00Z',
    updated_at: '2026-07-10T00:00:00Z',
    completed_at: null,
    artifacts: [],
    publish_progress: null,
  }),
  fetchPublishChecklist: vi.fn(),
  openStep: vi.fn(),
  saveDraft: vi.fn(),
  updateProject: vi.fn(),
  updatePublishChecklist: vi.fn(),
}))

vi.mock('../components/ImageAssetPicker', () => ({
  ImageAssetPicker: ({ open, onSelect }: { open: boolean; onSelect: (asset: object) => void }) =>
    open ? <button type="button" onClick={() => onSelect({ id: 'asset-1', original_filename: '封面.png', status: 'ready' })}>选择测试素材</button> : null,
}))

describe('ProjectDetailPage', () => {
  it('加载项目时恢复当前步骤的已关联素材', async () => {
    fetchProjectMediaAssociations.mockResolvedValue([
      {
        id: 'association-1',
        media_asset_id: 'asset-1',
        project_id: 'project-1',
        step_key: 'outline',
        reference_position: 'append',
        asset_reference: 'asset://asset-1',
        created_at: '2026-07-10T00:00:00Z',
        asset: {
          id: 'asset-1',
          original_filename: '封面.png',
          mime_type: 'image/png',
          byte_size: 20,
          width: null,
          height: null,
          source: 'upload',
          category: 'cover',
          tags: [],
          status: 'ready',
          created_at: '2026-07-10T00:00:00Z',
        },
        is_invalid: false,
      },
    ])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/projects/project-1']}>
          <Routes><Route path="/projects/:id" element={<ProjectDetailPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('封面.png')).toBeInTheDocument()
    expect(fetchProjectMediaAssociations).toHaveBeenCalledWith('project-1')
  })

  it('关联素材后在无选区时追加稳定引用', async () => {
    associateMedia.mockResolvedValue({
      id: 'association-1',
      media_asset_id: 'asset-1',
      project_id: 'project-1',
      step_key: 'outline',
      reference_position: 'append',
      asset_reference: 'asset://asset-1',
      created_at: '2026-07-10T00:00:00Z',
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/projects/project-1']}>
          <Routes><Route path="/projects/:id" element={<ProjectDetailPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: '从素材库添加图片' }))
    fireEvent.click(screen.getByRole('button', { name: '选择测试素材' }))

    await waitFor(() => {
      expect(associateMedia).toHaveBeenCalledWith('asset-1', expect.objectContaining({ reference_position: 'append' }))
    })
    expect(
      (screen.getByPlaceholderText(/撰写/) as HTMLTextAreaElement).value,
    ).toContain('asset://asset-1')
  })
})
