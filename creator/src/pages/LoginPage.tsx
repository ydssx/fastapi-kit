import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import shared from '../styles/shared.module.css'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const { user, loading, login, register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.kicker}>多平台创作</p>
        <h1 className={styles.heroTitle}>把选题到发布<br />串成一条流水线</h1>
        <ul className={styles.features}>
          <li>短视频 / 长图文固定流程</li>
          <li>品牌记忆注入 AI 步骤</li>
          <li>发布 checklist，不漏平台</li>
        </ul>
      </div>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h2 className={styles.cardTitle}>{mode === 'login' ? '登录' : '注册'}</h2>
        <p className={styles.cardSubtitle}>进入创作者工作台</p>
        {error && (
          <p className={shared.error} role="alert">
            {error}
          </p>
        )}
        <label className={shared.fieldLabel}>
          邮箱
          <input
            className={shared.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label className={shared.fieldLabel}>
          密码
          <input
            className={shared.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="至少 8 位"
          />
        </label>
        <button type="submit" className={shared.btnPrimary} disabled={submitting}>
          {submitting ? '处理中…' : mode === 'login' ? '登录' : '创建账号'}
        </button>
        <button
          type="button"
          className={styles.switch}
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? '没有账号？注册' : '已有账号？登录'}
        </button>
      </form>
    </div>
  )
}
