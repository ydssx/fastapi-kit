import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { fetchBrand, updateBrand } from '../api/creator'
import type { BrandProfile } from '../types/api'
import styles from './BrandPage.module.css'

const empty: BrandProfile = {
  tone: '',
  audience: '',
  taboos: '',
  structure_notes: '',
}

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
    <div className={styles.page}>
      <h1>品牌 / 人设档案</h1>
      <p className={styles.hint}>AI 生成各步骤时会自动引用以下约束。</p>
      <label>
        语气
        <textarea
          rows={2}
          value={form.tone}
          onChange={(e) => setForm({ ...form, tone: e.target.value })}
        />
      </label>
      <label>
        受众
        <textarea
          rows={2}
          value={form.audience}
          onChange={(e) => setForm({ ...form, audience: e.target.value })}
        />
      </label>
      <label>
        禁忌（不要出现的表述）
        <textarea
          rows={2}
          value={form.taboos}
          onChange={(e) => setForm({ ...form, taboos: e.target.value })}
        />
      </label>
      <label>
        结构偏好
        <textarea
          rows={2}
          value={form.structure_notes}
          onChange={(e) => setForm({ ...form, structure_notes: e.target.value })}
        />
      </label>
      <button
        type="button"
        className={styles.save}
        disabled={saveMut.isPending}
        onClick={() => saveMut.mutate()}
      >
        保存
      </button>
      {saveMut.isSuccess && <p className={styles.ok}>已保存</p>}
    </div>
  )
}
