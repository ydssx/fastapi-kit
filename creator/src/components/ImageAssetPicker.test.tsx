import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageAssetPicker } from './ImageAssetPicker'

const fetchMedia = vi.fn()

vi.mock('../api/creator', () => ({
  fetchMedia: (...args: unknown[]) => fetchMedia(...args),
  fetchMediaPreview: vi.fn().mockResolvedValue({ url: 'https://example.test/cover.png' }),
}))

describe('ImageAssetPicker', () => {
  it('搜索就绪素材并选择它', async () => {
    const onSelect = vi.fn()
    fetchMedia.mockResolvedValue({
      items: [
        {
          id: 'ready-asset',
          original_filename: 'cover.png',
          category: '封面',
          tags: ['夏日'],
          status: 'ready',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <ImageAssetPicker open onClose={vi.fn()} onSelect={onSelect} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('cover.png')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('搜索图片素材'), { target: { value: '夏日' } })
    fireEvent.click(screen.getByRole('button', { name: '搜索' }))
    await waitFor(() => {
      expect(fetchMedia).toHaveBeenLastCalledWith({ keyword: '夏日' })
    })
    fireEvent.click(await screen.findByRole('button', { name: '添加' }))

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'ready-asset' }))
  })
})
