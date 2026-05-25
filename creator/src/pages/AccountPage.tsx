import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { changePassword } from '../api/auth'
import { IconInput, LockIcon } from '../components/IconInput'
import { PageHeader } from '../components/PageHeader'
import shared from '../styles/shared.module.css'
import styles from './AccountPage.module.css'

export function AccountPage() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致')
      return
    }
    setSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      setSuccess('密码已更新，当前会话已刷新。')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`${shared.page} ${styles.page}`}>
      <PageHeader title="账号设置" description="管理登录邮箱与密码。" />
      <section className={styles.card}>
        <dl className={styles.meta}>
          <div>
            <dt>登录邮箱</dt>
            <dd>{user?.email}</dd>
          </div>
        </dl>
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={shared.panelTitle}>修改密码</h2>
          {error && (
            <p className={shared.error} role="alert">
              {error}
            </p>
          )}
          {success && <p className={styles.success}>{success}</p>}
          <label className={shared.fieldLabel}>
            当前密码
            <IconInput
              icon={<LockIcon />}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <label className={shared.fieldLabel}>
            新密码
            <IconInput
              icon={<LockIcon />}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className={shared.btnPrimary} disabled={submitting}>
            {submitting ? '保存中…' : '更新密码'}
          </button>
        </form>
        <p className={styles.hint}>
          忘记密码？请前往
          <Link to="/forgot-password"> 找回密码 </Link>
          或使用管理后台重置（验证期）。
        </p>
      </section>
    </div>
  )
}
