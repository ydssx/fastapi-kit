import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AssetLibraryPage } from './AssetLibraryPage'

const fetchMedia = vi.fn()

vi.mock('../api/creator', () => ({
  fetchMedia: (...args: unknown[]) => fetchMedia(...args),
  uploadMedia: vi.fn(),
  importMedia: vi.fn(),
  generateMedia: vi.fn(),
  updateMedia: vi.fn(),
  deleteMedia: vi.fn(),
  fetchMediaPreview: vi.fn(),
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AssetLibraryPage />
    </QueryClientProvider>,
  )
}

describe('AssetLibraryPage', () => {
  it('显示空态，并只在提交筛选后请求新结果', async () => {
    fetchMedia.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 })
    renderPage()

    expect(await screen.findByText('还没有图片素材')).toBeInTheDocument()
    expect(fetchMedia).toHaveBeenCalledWith({
      keyword: undefined,
      category: undefined,
      tags: [],
    })

    fireEvent.change(screen.getByLabelText('关键词'), { target: { value: '夏日通勤' } })
    expect(fetchMedia).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '筛选素材' }))

    await waitFor(() => {
      expect(fetchMedia).toHaveBeenLastCalledWith({
        keyword: '夏日通勤',
        category: undefined,
        tags: [],
      })
    })
  })
})
