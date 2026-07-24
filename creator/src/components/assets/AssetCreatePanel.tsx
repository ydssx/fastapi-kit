import { type FormEvent } from 'react'
import shared from '../../styles/shared.module.css'
import pageStyles from '../../pages/AssetLibraryPage.module.css'
import { SOURCE_LABELS, type SourceMode } from './mediaUtils'

interface AssetCreatePanelProps {
  sourceMode: SourceMode
  onSourceModeChange: (mode: SourceMode) => void
  file: File | null
  onFileChange: (file: File | null) => void
  uploadCategory: string
  onUploadCategoryChange: (value: string) => void
  uploadTags: string
  onUploadTagsChange: (value: string) => void
  onUpload: (event: FormEvent<HTMLFormElement>) => void
  uploadPending: boolean
  importUrl: string
  onImportUrlChange: (value: string) => void
  importFilename: string
  onImportFilenameChange: (value: string) => void
  importCategory: string
  onImportCategoryChange: (value: string) => void
  importTags: string
  onImportTagsChange: (value: string) => void
  onImport: (event: FormEvent<HTMLFormElement>) => void
  importPending: boolean
  prompt: string
  onPromptChange: (value: string) => void
  size: '1024x1024' | '1024x1536' | '1536x1024'
  onSizeChange: (value: '1024x1024' | '1024x1536' | '1536x1024') => void
  generateCategory: string
  onGenerateCategoryChange: (value: string) => void
  generateTags: string
  onGenerateTagsChange: (value: string) => void
  onGenerate: (event: FormEvent<HTMLFormElement>) => void
  generatePending: boolean
  isCreating: boolean
  createError: Error | null
}

export function AssetCreatePanel({
  sourceMode,
  onSourceModeChange,
  file,
  onFileChange,
  uploadCategory,
  onUploadCategoryChange,
  uploadTags,
  onUploadTagsChange,
  onUpload,
  uploadPending,
  importUrl,
  onImportUrlChange,
  importFilename,
  onImportFilenameChange,
  importCategory,
  onImportCategoryChange,
  importTags,
  onImportTagsChange,
  onImport,
  importPending,
  prompt,
  onPromptChange,
  size,
  onSizeChange,
  generateCategory,
  onGenerateCategoryChange,
  generateTags,
  onGenerateTagsChange,
  onGenerate,
  generatePending,
  isCreating,
  createError,
}: AssetCreatePanelProps) {
  return (
    <aside className={`${shared.panel} ${pageStyles.createPanel}`}>
      <div>
        <p className={pageStyles.kicker}>入库</p>
        <h2 className={shared.panelTitle}>归档新素材</h2>
        <p className={pageStyles.createLead}>本地文件、外链或 AI 生成，都会进入同一张素材台。</p>
      </div>
      <div className={pageStyles.sourceTabs} role="tablist" aria-label="素材来源">
        {(Object.keys(SOURCE_LABELS) as SourceMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={sourceMode === mode}
            className={sourceMode === mode ? pageStyles.sourceTabActive : pageStyles.sourceTab}
            onClick={() => onSourceModeChange(mode)}
          >
            {SOURCE_LABELS[mode]}
          </button>
        ))}
      </div>

      {sourceMode === 'upload' && (
        <form className={pageStyles.createForm} onSubmit={onUpload}>
          <label className={pageStyles.dropZone}>
            <span className={pageStyles.dropZoneStrong}>{file ? file.name : '选择图片文件'}</span>
            <span>{file ? '可重新选择 JPEG / PNG / WebP' : '支持 JPEG、PNG、WebP'}</span>
            <input
              className={pageStyles.fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="图片文件"
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className={shared.fieldLabel}>
            分类
            <input
              className={shared.input}
              value={uploadCategory}
              onChange={(event) => onUploadCategoryChange(event.target.value)}
            />
          </label>
          <label className={shared.fieldLabel}>
            标签
            <input
              className={shared.input}
              value={uploadTags}
              onChange={(event) => onUploadTagsChange(event.target.value)}
              placeholder="例如：通勤，夏日"
            />
          </label>
          <button
            type="submit"
            className={shared.btnPrimary}
            disabled={!file || !uploadCategory.trim() || isCreating}
          >
            {uploadPending ? '上传中…' : '上传图片'}
          </button>
        </form>
      )}

      {sourceMode === 'import' && (
        <form className={pageStyles.createForm} onSubmit={onImport}>
          <label className={shared.fieldLabel}>
            图片链接
            <input
              className={shared.input}
              type="url"
              value={importUrl}
              onChange={(event) => onImportUrlChange(event.target.value)}
              placeholder="https://…"
            />
          </label>
          <label className={shared.fieldLabel}>
            文件名
            <input
              className={shared.input}
              value={importFilename}
              onChange={(event) => onImportFilenameChange(event.target.value)}
              placeholder="summer-cover.jpg"
            />
          </label>
          <label className={shared.fieldLabel}>
            分类
            <input
              className={shared.input}
              value={importCategory}
              onChange={(event) => onImportCategoryChange(event.target.value)}
            />
          </label>
          <label className={shared.fieldLabel}>
            标签
            <input
              className={shared.input}
              value={importTags}
              onChange={(event) => onImportTagsChange(event.target.value)}
              placeholder="用逗号分隔"
            />
          </label>
          <button
            type="submit"
            className={shared.btnPrimary}
            disabled={
              !importUrl.trim() || !importFilename.trim() || !importCategory.trim() || isCreating
            }
          >
            {importPending ? '导入中…' : '导入链接图片'}
          </button>
        </form>
      )}

      {sourceMode === 'generate' && (
        <form className={pageStyles.createForm} onSubmit={onGenerate}>
          <label className={shared.fieldLabel}>
            生成提示词
            <textarea
              className={shared.textarea}
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder="描述你要生成的画面…"
            />
          </label>
          <label className={shared.fieldLabel}>
            图片比例
            <select
              className={shared.select}
              value={size}
              onChange={(event) =>
                onSizeChange(event.target.value as '1024x1024' | '1024x1536' | '1536x1024')
              }
            >
              <option value="1024x1024">正方形</option>
              <option value="1024x1536">竖版</option>
              <option value="1536x1024">横版</option>
            </select>
          </label>
          <label className={shared.fieldLabel}>
            分类
            <input
              className={shared.input}
              value={generateCategory}
              onChange={(event) => onGenerateCategoryChange(event.target.value)}
            />
          </label>
          <label className={shared.fieldLabel}>
            标签
            <input
              className={shared.input}
              value={generateTags}
              onChange={(event) => onGenerateTagsChange(event.target.value)}
              placeholder="用逗号分隔"
            />
          </label>
          <button
            type="submit"
            className={pageStyles.aiButton}
            disabled={!prompt.trim() || !generateCategory.trim() || isCreating}
          >
            {generatePending ? '正在提交生成…' : '用 AI 生成图片'}
          </button>
        </form>
      )}
      {createError && <p className={shared.error}>{createError.message}</p>}
    </aside>
  )
}
