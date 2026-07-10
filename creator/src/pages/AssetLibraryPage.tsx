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
import { EmptyState } from '../components/EmptyState'
import { LoadingBlock } from '../components/LoadingBlock'
import { PageHeader } from '../components/PageHeader'
import { useMediaPreview } from '../hooks/useMediaPreview'
import type { MediaAsset } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './AssetLibraryPage.module.css'

type SourceMode = 'upload' | 'import' | 'generate'

const SOURCE_LABELS: Record<SourceMode, string> = {
  upload: '本地上传',
  import: '链接导入',
  generate: 'AI 生成',
}

function splitTags(value: string): string[] {
  return [...new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))]
}

function MediaThumbnail({ asset }: { asset: MediaAsset }) {
  const { data, isLoading, isError } = useMediaPreview(asset)

  if (asset.status !== 'ready') {
    return <div className={styles.thumbnailPlaceholder}>{asset.status === 'failed' ? '生成失败' : '处理中'}</div>
  }
  if (isLoading) return <div className={styles.thumbnailPlaceholder}>加载预览…</div>
  if (isError || !data) return <div className={styles.thumbnailPlaceholder}>预览不可用</div>

  return <img className={styles.thumbnail} src={data.url} alt={`素材：${asset.original_filename}`} />
}

export function AssetLibraryPage() {
  const queryClient = useQueryClient()
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

  const createError = uploadMutation.error || importMutation.error || generateMutation.error
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

  function handleDelete() {
    if (!selectedAsset || !window.confirm(`确定删除「${selectedAsset.original_filename}」？`)) return
    deleteMutation.mutate(selectedAsset.id)
  }

  return (
    <div className={`${shared.page} ${styles.page}`}>
      <PageHeader
        title="图片素材库"
        description="把上传、导入与 AI 生成的图片集中管理，随时为下一次创作准备。"
      />

      <form className={`${shared.panel} ${styles.filters}`} onSubmit={handleFilterSubmit}>
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
          <span className={styles.resultCount}>{resultCount} 项结果</span>
        </div>
      </form>

      <section className={styles.workspace} aria-label="图片素材管理">
        <aside className={`${shared.panel} ${styles.createPanel}`}>
          <div>
            <p className={styles.kicker}>添加图片</p>
            <h2 className={shared.panelTitle}>归档新素材</h2>
          </div>
          <div className={styles.sourceTabs} role="tablist" aria-label="素材来源">
            {(Object.keys(SOURCE_LABELS) as SourceMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={sourceMode === mode}
                className={sourceMode === mode ? styles.sourceTabActive : styles.sourceTab}
                onClick={() => setSourceMode(mode)}
              >
                {SOURCE_LABELS[mode]}
              </button>
            ))}
          </div>

          {sourceMode === 'upload' && (
            <form className={styles.createForm} onSubmit={handleUpload}>
              <label className={shared.fieldLabel}>
                图片文件
                <input
                  className={styles.fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <label className={shared.fieldLabel}>
                分类
                <input className={shared.input} value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)} />
              </label>
              <label className={shared.fieldLabel}>
                标签
                <input className={shared.input} value={uploadTags} onChange={(event) => setUploadTags(event.target.value)} placeholder="例如：通勤，夏日" />
              </label>
              <button type="submit" className={shared.btnPrimary} disabled={!file || !uploadCategory.trim() || isCreating}>
                {uploadMutation.isPending ? '上传中…' : '上传图片'}
              </button>
            </form>
          )}

          {sourceMode === 'import' && (
            <form className={styles.createForm} onSubmit={handleImport}>
              <label className={shared.fieldLabel}>
                图片链接
                <input className={shared.input} type="url" value={importUrl} onChange={(event) => setImportUrl(event.target.value)} placeholder="https://…" />
              </label>
              <label className={shared.fieldLabel}>
                文件名
                <input className={shared.input} value={importFilename} onChange={(event) => setImportFilename(event.target.value)} placeholder="summer-cover.jpg" />
              </label>
              <label className={shared.fieldLabel}>
                分类
                <input className={shared.input} value={importCategory} onChange={(event) => setImportCategory(event.target.value)} />
              </label>
              <label className={shared.fieldLabel}>
                标签
                <input className={shared.input} value={importTags} onChange={(event) => setImportTags(event.target.value)} placeholder="用逗号分隔" />
              </label>
              <button type="submit" className={shared.btnPrimary} disabled={!importUrl.trim() || !importFilename.trim() || !importCategory.trim() || isCreating}>
                {importMutation.isPending ? '导入中…' : '导入链接图片'}
              </button>
            </form>
          )}

          {sourceMode === 'generate' && (
            <form className={styles.createForm} onSubmit={handleGenerate}>
              <label className={shared.fieldLabel}>
                生成提示词
                <textarea className={shared.textarea} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="描述你要生成的画面…" />
              </label>
              <label className={shared.fieldLabel}>
                图片比例
                <select className={shared.select} value={size} onChange={(event) => setSize(event.target.value as typeof size)}>
                  <option value="1024x1024">正方形</option>
                  <option value="1024x1536">竖版</option>
                  <option value="1536x1024">横版</option>
                </select>
              </label>
              <label className={shared.fieldLabel}>
                分类
                <input className={shared.input} value={generateCategory} onChange={(event) => setGenerateCategory(event.target.value)} />
              </label>
              <label className={shared.fieldLabel}>
                标签
                <input className={shared.input} value={generateTags} onChange={(event) => setGenerateTags(event.target.value)} placeholder="用逗号分隔" />
              </label>
              <button type="submit" className={styles.aiButton} disabled={!prompt.trim() || !generateCategory.trim() || isCreating}>
                {generateMutation.isPending ? '正在提交生成…' : '用 AI 生成图片'}
              </button>
            </form>
          )}
          {createError && <p className={shared.error}>{(createError as Error).message}</p>}
        </aside>

        <section className={styles.library} aria-live="polite">
          {mediaQuery.isLoading && <LoadingBlock label="加载图片素材…" />}
          {mediaQuery.isError && <p className={shared.error}>{(mediaQuery.error as Error).message}</p>}
          {!mediaQuery.isLoading && !mediaQuery.isError && mediaQuery.data?.items.length === 0 && (
            <EmptyState title="还没有图片素材" description="上传一张图片、导入可信链接，或让 AI 为你生成第一张素材。" />
          )}
          {mediaQuery.data && mediaQuery.data.items.length > 0 && (
            <div className={styles.grid}>
              {mediaQuery.data.items.map((asset) => (
                <article key={asset.id} className={styles.assetCard}>
                  <button type="button" className={styles.assetOpen} onClick={() => openAsset(asset)} aria-label={`查看素材：${asset.original_filename}`}>
                    <MediaThumbnail asset={asset} />
                    <span className={styles.assetInfo}>
                      <strong>{asset.original_filename}</strong>
                      <span>{asset.category}</span>
                    </span>
                  </button>
                  <div className={styles.tagList}>
                    {asset.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      {selectedAsset && (
        <section className={`${shared.panel} ${styles.detailPanel}`} aria-label="编辑素材">
          <div className={styles.detailHeader}>
            <div>
              <p className={styles.kicker}>素材详情</p>
              <h2 className={shared.panelTitle}>编辑图片信息</h2>
            </div>
            <button type="button" className={styles.closeButton} onClick={() => setSelectedAsset(null)} aria-label="关闭编辑">×</button>
          </div>
          <div className={styles.detailContent}>
            <MediaThumbnail asset={selectedAsset} />
            <form className={styles.editForm} onSubmit={handleUpdate}>
              <label className={shared.fieldLabel}>
                文件名
                <input className={shared.input} value={editFilename} onChange={(event) => setEditFilename(event.target.value)} />
              </label>
              <label className={shared.fieldLabel}>
                分类
                <input className={shared.input} value={editCategory} onChange={(event) => setEditCategory(event.target.value)} />
              </label>
              <label className={shared.fieldLabel}>
                标签
                <input className={shared.input} value={editTags} onChange={(event) => setEditTags(event.target.value)} />
              </label>
              <p className={styles.assetMeta}>{selectedAsset.source} · {selectedAsset.mime_type} · {selectedAsset.width ?? '?'} × {selectedAsset.height ?? '?'}</p>
              {updateMutation.error && <p className={shared.error}>{(updateMutation.error as Error).message}</p>}
              <div className={shared.btnRow}>
                <button type="submit" className={shared.btnPrimary} disabled={updateMutation.isPending || !editFilename.trim() || !editCategory.trim()}>
                  {updateMutation.isPending ? '保存中…' : '保存信息'}
                </button>
                <button type="button" className={styles.deleteButton} onClick={handleDelete} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? '删除中…' : '删除素材'}
                </button>
              </div>
              {deleteMutation.error && <p className={shared.error}>{(deleteMutation.error as Error).message}</p>}
            </form>
          </div>
        </section>
      )}
    </div>
  )
}
