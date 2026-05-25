import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import { IconInput, LockIcon } from '../components/IconInput'
import shared from '../styles/shared.module.css'
import styles from './LoginPage.module.css'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError('重置链接无效，请重新申请。')
      return
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword(token, password)
      navigate('/login', { replace: true, state: { resetSuccess: true } })
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h2 className={styles.cardTitle}>设置新密码</h2>
        <p className={styles.cardSubtitle}>为你的账号设置一个新密码。</p>
        {error && (
          <p className={shared.error} role="alert">
            {error}
          </p>
        )}
        <label className={shared.fieldLabel}>
          新密码
          <IconInput
            icon={<LockIcon />}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <label className={shared.fieldLabel}>
          确认新密码
          <IconInput
            icon={<LockIcon />}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className={shared.btnPrimary} disabled={submitting || !token}>
          {submitting ? '保存中…' : '更新密码'}
        </button>
        <p className={styles.switchRow}>
          <Link to="/login" className={styles.switchLink}>
            返回登录
          </Link>
        </p>
      </form>
    </div>
  )
}
