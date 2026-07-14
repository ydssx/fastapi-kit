import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AdminBrandMark } from '../components/AdminBrandMark'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <aside className={styles.hero}>
        <div className={styles.heroInner}>
          <AdminBrandMark size={48} />
          <h1 className={styles.heroTitle}>fastapi-kit</h1>
          <p className={styles.heroLead}>运维控制台</p>
          <p className={styles.heroDesc}>
            查看服务健康、检索日志、管理用户与后台任务。登录后进入信号监控视图。
          </p>
          <div className={styles.tracePanel} aria-hidden>
            <span className={styles.traceLine} />
            <span className={styles.traceLine} />
            <span className={styles.traceLine} />
            <span className={styles.traceBeam} />
          </div>
        </div>
      </aside>

      <div className={styles.formCol}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <h1 className={styles.formProductTitle}>fastapi-kit 运维控制台</h1>
          <div className={styles.cardHead}>
            <AdminBrandMark size={36} />
            <div>
              <h2 className={styles.title}>登录</h2>
              <p className={styles.subtitle}>使用管理员账号进入控制台</p>
            </div>
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <label className={styles.label}>
            邮箱
            <span className={styles.inputWrap}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoComplete="email"
              />
              <span className={styles.inputIcon} aria-hidden>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <path d="m22 6-10 7L2 6" />
                </svg>
              </span>
            </span>
          </label>

          <label className={styles.label}>
            密码
            <span className={styles.inputWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
                autoComplete="current-password"
              />
              <span className={styles.inputIcon}>
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <path d="M1 1l22 22" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </span>
            </span>
          </label>

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? '登录中…' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
