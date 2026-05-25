import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { fetchBrand, updateBrand } from '../api/creator'
import type { BrandProfile } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './BrandPage.module.css'

const empty: BrandProfile = {
  tone: '',
  audience: '',
  taboos: '',
  structure_notes: '',
}

const FIELDS: { key: keyof BrandProfile; label: string; hint: string; rows: number }[] = [
  { key: 'tone', label: '语气', hint: '例如：口语化、专业但不生硬', rows: 2 },
  { key: 'audience', label: '受众', hint: '例如：25–35 岁都市女性', rows: 2 },
  { key: 'taboos', label: '禁忌表述', hint: '不要出现的词或承诺', rows: 2 },
  { key: 'structure_notes', label: '结构偏好', hint: '例如：三段式、先结论后论证', rows: 3 },
]

export function BrandPage() {
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ['brand'], queryFn: fetchBrand })
  const [form, setForm] = useState<BrandProfile>(empty)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const saveMut = useMutation({
    mutationFn: () => updateBrand(form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['brand'] })
    },
  })

  return (
    <div className={`${styles.page} animateIn`}>
      <header className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>品牌档案</h1>
        <p className={shared.pageSubtitle}>AI 生成各步骤时会自动引用以下约束，保持内容风格一致。</p>
      </header>

      <div className={styles.grid}>
        {FIELDS.map((field) => (
          <label key={field.key} className={`${shared.fieldLabel} ${styles.field}`}>
            {field.label}
            <span className={styles.fieldHint}>{field.hint}</span>
            <textarea
              className={shared.textarea}
              rows={field.rows}
              value={form[field.key]}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            />
          </label>
        ))}
      </div>

      <div className={shared.btnRow}>
        <button
          type="button"
          className={shared.btnPrimary}
          disabled={saveMut.isPending}
          onClick={() => saveMut.mutate()}
        >
          {saveMut.isPending ? '保存中…' : '保存档案'}
        </button>
        {saveMut.isSuccess && <span className={styles.ok}>已保存</span>}
      </div>
    </div>
  )
}
