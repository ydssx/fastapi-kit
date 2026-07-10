import { useQuery } from '@tanstack/react-query'
import { fetchMediaPreview } from '../api/creator'
import type { MediaAsset } from '../types/api'

export function useMediaPreview(asset: MediaAsset) {
  return useQuery({
    queryKey: ['media-preview', asset.id],
    queryFn: () => fetchMediaPreview(asset.id),
    enabled: asset.status === 'ready',
    staleTime: 5 * 60 * 1000,
  })
}
