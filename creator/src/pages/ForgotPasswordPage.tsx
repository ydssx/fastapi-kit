import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth'
import { IconInput, MailIcon } from '../components/IconInput'
import shared from '../styles/shared.module.css'
import styles from './LoginPage.module.css'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)
    try {
      const text = await forgotPassword(email)
      setMessage(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h2 className={styles.cardTitle}>找回密码</h2>
        <p className={styles.cardSubtitle}>输入注册邮箱，我们将发送重置链接（需已配置邮件服务）。</p>
        {message && <p className={styles.successBanner}>{message}</p>}
        {error && (
          <p className={shared.error} role="alert">
            {error}
          </p>
        )}
        <label className={shared.fieldLabel}>
          邮箱
          <IconInput
            icon={<MailIcon />}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="请输入邮箱地址"
          />
        </label>
        <button type="submit" className={shared.btnPrimary} disabled={submitting}>
          {submitting ? '发送中…' : '发送重置邮件'}
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
