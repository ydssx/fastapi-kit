import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { fetchBrand, updateBrand } from '../api/creator'
import type { BrandProfile } from '../types/api'
import { BrandField } from '../components/BrandField'
import { PageHeader } from '../components/PageHeader'
import shared from '../styles/shared.module.css'
import styles from './BrandPage.module.css'

const empty: BrandProfile = {
  tone: '',
  audience: '',
  taboos: '',
  structure_notes: '',
}

const FIELDS: { key: keyof BrandProfile; label: string; hint: string; rows: number }[] = [
  { key: 'tone', label: '语气', hint: '例如：专业、友好、简洁、有鼓励感', rows: 3 },
  { key: 'audience', label: '受众', hint: '例如：职场新人、内容创作者、学生群体', rows: 3 },
  { key: 'taboos', label: '禁忌表述', hint: '例如：避免绝对化用语、避免涉及政治话题', rows: 3 },
  { key: 'structure_notes', label: '结构偏好', hint: '例如：总-分-总结构、分点论述、结尾行动建议', rows: 3 },
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
    <div className={`${shared.page} ${styles.page}`}>
      <PageHeader
        title="品牌档案"
        description="完善品牌档案，帮助 AI 更好理解你的创作边界与表达偏好。"
      />

      <section className={shared.panel}>
        <div className={styles.grid}>
          {FIELDS.map((field) => (
            <BrandField
              key={field.key}
              label={field.label}
              hint={field.hint}
              rows={field.rows}
              value={form[field.key]}
              onChange={(value) => setForm({ ...form, [field.key]: value })}
            />
          ))}
        </div>
      </section>

      <p className={styles.footerNote}>保存后，AI 将基于此档案生成内容与建议。</p>

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
