import { useMutation, useQuery, type QueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  associateMedia,
  disassociateMedia,
  fetchProjectMediaAssociations,
} from '../api/creator'
import type { UsedImageAsset } from '../components/ImageAssetPreview'
import {
  applySelectionInsertion,
  hasActiveSelection,
  type TextSelection,
} from '../lib/editorSelection'
import type { MediaAsset, ProjectMediaAssociation } from '../types/api'

interface UseProjectMediaAssociationsArgs {
  projectId: string | undefined
  projectStepKey: string | undefined
  content: string
  setContent: (value: string | ((current: string) => string)) => void
  editorSelection: TextSelection | null
  setEditorSelection: (value: TextSelection | null) => void
  handleApiError: (err: unknown) => void
  setActionError: (value: string | null) => void
  queryClient: QueryClient
}

export function useProjectMediaAssociations({
  projectId,
  projectStepKey,
  content,
  setContent,
  editorSelection,
  setEditorSelection,
  handleApiError,
  setActionError,
  queryClient,
}: UseProjectMediaAssociationsArgs) {
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)

  const { data: projectMediaAssociations = [] } = useQuery({
    queryKey: ['project-media-associations', projectId],
    queryFn: () => fetchProjectMediaAssociations(projectId!),
    enabled: !!projectId,
  })

  const usedImageAssets = useMemo(
    () =>
      projectMediaAssociations.map((association: ProjectMediaAssociation) => ({
        asset: association.asset,
        association,
      })),
    [projectMediaAssociations],
  )

  const associateMediaMut = useMutation({
    mutationFn: (asset: MediaAsset) =>
      associateMedia(asset.id, {
        project_id: projectId!,
        step_key: projectStepKey!,
        reference_position: editorSelection
          ? `${editorSelection.start}:${editorSelection.end}`
          : 'append',
      }).then((association) => ({ asset, association })),
    onSuccess: ({ asset, association }) => {
      const reference = association.asset_reference
      if (hasActiveSelection(editorSelection, content) && editorSelection !== null) {
        const result = applySelectionInsertion(content, editorSelection, reference)
        setContent(result.content)
        setEditorSelection(result.selection)
      } else {
        setContent((current) => (current ? `${current}\n\n${reference}` : reference))
        setEditorSelection(null)
      }
      queryClient.setQueryData<ProjectMediaAssociation[]>(
        ['project-media-associations', projectId],
        (items = []) => [...items, { ...association, asset, is_invalid: false }],
      )
      setAssetPickerOpen(false)
      setActionError(null)
      void queryClient.invalidateQueries({ queryKey: ['media-assets'] })
      void queryClient.invalidateQueries({ queryKey: ['project-media-associations', projectId] })
    },
    onError: handleApiError,
  })

  const disassociateMediaMut = useMutation({
    mutationFn: (item: UsedImageAsset) =>
      disassociateMedia(item.asset.id, item.association.id).then(() => item.association.id),
    onSuccess: (associationId) => {
      queryClient.setQueryData<ProjectMediaAssociation[]>(
        ['project-media-associations', projectId],
        (items) => items?.filter((item) => item.id !== associationId),
      )
      setActionError(null)
      void queryClient.invalidateQueries({ queryKey: ['media-assets'] })
      void queryClient.invalidateQueries({ queryKey: ['project-media-associations', projectId] })
    },
    onError: handleApiError,
  })

  return {
    usedImageAssets,
    assetPickerOpen,
    setAssetPickerOpen,
    associateMediaMut,
    disassociateMediaMut,
  }
}
