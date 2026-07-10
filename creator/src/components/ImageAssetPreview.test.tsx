import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageAssetPreview } from './ImageAssetPreview'
import type { UsedImageAsset } from './ImageAssetPreview'

vi.mock('../api/creator', () => ({ fetchMediaPreview: vi.fn() }))

describe('ImageAssetPreview', () => {
  it('显示失效引用且允许解除当前步骤关联', () => {
    const onRemove = vi.fn()
    const item: UsedImageAsset = {
      asset: {
        id: 'asset-1',
        original_filename: 'removed.png',
        mime_type: 'image/png',
        byte_size: 20,
        width: null,
        height: null,
        source: 'upload',
        category: '封面',
        tags: [],
        status: 'deleted',
        created_at: '2026-07-10T00:00:00Z',
      },
      association: {
        id: 'association-1',
        project_id: 'project-1',
        media_asset_id: 'asset-1',
        step_key: 'outline',
        reference_position: 'append',
        asset_reference: 'asset://asset-1',
        created_at: '2026-07-10T00:00:00Z',
      },
    }
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <ImageAssetPreview assets={[item]} currentStepKey="outline" onRemove={onRemove} />
      </QueryClientProvider>,
    )

    expect(screen.getByText('素材已失效，历史正文中的引用保持不变。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '解除关联' }))
    expect(onRemove).toHaveBeenCalledWith(item)
  })
})
