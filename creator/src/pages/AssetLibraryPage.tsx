import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import {
  deleteMedia,
  fetchMedia,
  generateMedia,
  importMedia,
  updateMedia,
  uploadMedia,
  type MediaFilters,
} from '../api/creator'
import { AssetCreatePanel } from '../components/assets/AssetCreatePanel'
import { AssetGrid } from '../components/assets/AssetGrid'
import { AssetLightbox } from '../components/assets/AssetLightbox'
import { splitTags, type SourceMode } from '../components/assets/mediaUtils'
import { PageHeader } from '../components/PageHeader'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import type { MediaAsset } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './AssetLibraryPage.module.css'

export function AssetLibraryPage() {
  const queryClient = useQueryClient()
  const { confirm, dialog } = useConfirmDialog()
  const [filters, setFilters] = useState<MediaFilters>({ tags: [] })
  const [keywordDraft, setKeywordDraft] = useState('')
  const [categoryDraft, setCategoryDraft] = useState('')
  const [tagsDraft, setTagsDraft] = useState('')
  const [sourceMode, setSourceMode] = useState<SourceMode>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState('未分类')
  const [uploadTags, setUploadTags] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [importFilename, setImportFilename] = useState('')
  const [importCategory, setImportCategory] = useState('未分类')
  const [importTags, setImportTags] = useState('')
  const [prompt, setPrompt] = useState('')
  const [generateCategory, setGenerateCategory] = useState('未分类')
  const [generateTags, setGenerateTags] = useState('')
  const [size, setSize] = useState<'1024x1024' | '1024x1536' | '1536x1024'>('1024x1024')
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const [editFilename, setEditFilename] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editTags, setEditTags] = useState('')

  const mediaQuery = useQuery({
    queryKey: ['media-assets', filters],
    queryFn: () => fetchMedia(filters),
  })

  function refreshAssets() {
    return queryClient.invalidateQueries({ queryKey: ['media-assets'] })
  }

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('请选择要上传的图片。')
      return uploadMedia(file, { category: uploadCategory.trim(), tags: splitTags(uploadTags) })
    },
    onSuccess: () => {
      setFile(null)
      setUploadTags('')
      void refreshAssets()
    },
  })
  const importMutation = useMutation({
    mutationFn: () =>
      importMedia({
        url: importUrl.trim(),
        filename: importFilename.trim(),
        category: importCategory.trim(),
        tags: splitTags(importTags),
      }),
    onSuccess: () => {
      setImportUrl('')
      setImportFilename('')
      setImportTags('')
      void refreshAssets()
    },
  })
  const generateMutation = useMutation({
    mutationFn: () =>
      generateMedia({
        prompt: prompt.trim(),
        category: generateCategory.trim(),
        tags: splitTags(generateTags),
        size,
      }),
    onSuccess: () => {
      setPrompt('')
      setGenerateTags('')
      void refreshAssets()
    },
  })
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selectedAsset) throw new Error('请选择要编辑的素材。')
      return updateMedia(selectedAsset.id, {
        filename: editFilename.trim(),
        category: editCategory.trim(),
        tags: splitTags(editTags),
      })
    },
    onSuccess: (asset) => {
      setSelectedAsset(asset)
      void refreshAssets()
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteMedia,
    onSuccess: () => {
      setSelectedAsset(null)
      void refreshAssets()
    },
  })

  const createError = (uploadMutation.error || importMutation.error || generateMutation.error) as
    | Error
    | null
  const isCreating =
    uploadMutation.isPending || importMutation.isPending || generateMutation.isPending
  const resultCount = useMemo(() => mediaQuery.data?.total ?? 0, [mediaQuery.data?.total])

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilters({
      keyword: keywordDraft.trim() || undefined,
      category: categoryDraft.trim() || undefined,
      tags: splitTags(tagsDraft),
    })
  }

  function openAsset(asset: MediaAsset) {
    setSelectedAsset(asset)
    setEditFilename(asset.original_filename)
    setEditCategory(asset.category)
    setEditTags(asset.tags.join(', '))
  }

  function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (file && uploadCategory.trim()) uploadMutation.mutate()
  }

  function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (importUrl.trim() && importFilename.trim() && importCategory.trim()) importMutation.mutate()
  }

  function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (prompt.trim() && generateCategory.trim()) generateMutation.mutate()
  }

  function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editFilename.trim() && editCategory.trim()) updateMutation.mutate()
  }

  async function handleDelete() {
    if (!selectedAsset) return
    const ok = await confirm({
      title: '删除素材',
      message: `确定删除「${selectedAsset.original_filename}」？此操作不可恢复。`,
      confirmLabel: '删除素材',
      cancelLabel: '取消',
      variant: 'danger',
    })
    if (!ok) return
    deleteMutation.mutate(selectedAsset.id)
  }

  return (
    <div className={`${shared.page} ${styles.page}`}>
      {dialog}
      <PageHeader
        title="图片素材库"
        description="浏览、上传、导入或生成图片，随时插入创作步骤。"
      />

      <form className={styles.toolbar} onSubmit={handleFilterSubmit}>
        <label className={shared.fieldLabel}>
          关键词
          <input
            className={shared.input}
            value={keywordDraft}
            onChange={(event) => setKeywordDraft(event.target.value)}
            placeholder="按文件名搜索"
          />
        </label>
        <label className={shared.fieldLabel}>
          分类
          <input
            className={shared.input}
            value={categoryDraft}
            onChange={(event) => setCategoryDraft(event.target.value)}
            placeholder="例如：封面"
          />
        </label>
        <label className={shared.fieldLabel}>
          标签
          <input
            className={shared.input}
            value={tagsDraft}
            onChange={(event) => setTagsDraft(event.target.value)}
            placeholder="用逗号分隔"
          />
        </label>
        <div className={styles.filterActions}>
          <button type="submit" className={shared.btnPrimary}>
            筛选素材
          </button>
          <span className={styles.resultCount}>{resultCount} 张</span>
        </div>
      </form>

      <section className={styles.workspace} aria-label="图片素材管理">
        <AssetGrid
          loading={mediaQuery.isLoading}
          error={mediaQuery.isError ? (mediaQuery.error as Error) : null}
          items={mediaQuery.data?.items ?? []}
          onOpen={openAsset}
          onEmptyUpload={() => setSourceMode('upload')}
          onEmptyGenerate={() => setSourceMode('generate')}
        />
        <AssetCreatePanel
          sourceMode={sourceMode}
          onSourceModeChange={setSourceMode}
          file={file}
          onFileChange={setFile}
          uploadCategory={uploadCategory}
          onUploadCategoryChange={setUploadCategory}
          uploadTags={uploadTags}
          onUploadTagsChange={setUploadTags}
          onUpload={handleUpload}
          uploadPending={uploadMutation.isPending}
          importUrl={importUrl}
          onImportUrlChange={setImportUrl}
          importFilename={importFilename}
          onImportFilenameChange={setImportFilename}
          importCategory={importCategory}
          onImportCategoryChange={setImportCategory}
          importTags={importTags}
          onImportTagsChange={setImportTags}
          onImport={handleImport}
          importPending={importMutation.isPending}
          prompt={prompt}
          onPromptChange={setPrompt}
          size={size}
          onSizeChange={setSize}
          generateCategory={generateCategory}
          onGenerateCategoryChange={setGenerateCategory}
          generateTags={generateTags}
          onGenerateTagsChange={setGenerateTags}
          onGenerate={handleGenerate}
          generatePending={generateMutation.isPending}
          isCreating={isCreating}
          createError={createError}
        />
      </section>

      {selectedAsset && (
        <AssetLightbox
          asset={selectedAsset}
          editFilename={editFilename}
          onEditFilenameChange={setEditFilename}
          editCategory={editCategory}
          onEditCategoryChange={setEditCategory}
          editTags={editTags}
          onEditTagsChange={setEditTags}
          onClose={() => setSelectedAsset(null)}
          onUpdate={handleUpdate}
          onDelete={() => void handleDelete()}
          updatePending={updateMutation.isPending}
          deletePending={deleteMutation.isPending}
          updateError={updateMutation.error as Error | null}
          deleteError={deleteMutation.error as Error | null}
        />
      )}
    </div>
  )
}
