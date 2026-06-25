import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { IconInput, LockIcon, MailIcon } from '../components/IconInput'
import shared from '../styles/shared.module.css'
import styles from './LoginPage.module.css'

const PIPELINE_STEPS = [
  { label: '选题', desc: '锁定方向，明确受众与切入点' },
  { label: '脚本', desc: '结构化大纲，品牌语气贯穿全文' },
  { label: '发布', desc: '多平台 checklist，一步不漏' },
]

export function LoginPage() {
  const { user, loading, login, register } = useAuth()
  const location = useLocation()
  const resetSuccess = (location.state as { resetSuccess?: boolean } | null)?.resetSuccess
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
        <h1 className={styles.heroTitle}>
          把选题到发布
          <br />
          串成一条流水线
        </h1>
        <ol className={styles.pipeline}>
          {PIPELINE_STEPS.map((step, i) => (
            <li key={step.label}>
              <span className={styles.pipelineStep}>{String(i + 1).padStart(2, '0')}</span>
              <div className={styles.pipelineBody}>
                <strong>{step.label}</strong>
                <span>{step.desc}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.cardWrap}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{mode === 'login' ? '欢迎回来' : '创建账号'}</h2>
            <p className={styles.cardSubtitle}>进入创作者工作台</p>
          </div>

          <div className={styles.modeTabs} role="tablist" aria-label="登录或注册">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? styles.modeTabActive : styles.modeTab}
              onClick={() => setMode('login')}
            >
              登录
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? styles.modeTabActive : styles.modeTab}
              onClick={() => setMode('register')}
            >
              注册
            </button>
          </div>

          {resetSuccess && (
            <p className={styles.successBanner}>密码已重置，请使用新密码登录。</p>
          )}
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
          <label className={shared.fieldLabel}>
            密码
            <IconInput
              icon={<LockIcon />}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="请输入密码"
            />
          </label>
          <button type="submit" className={shared.btnPrimary} disabled={submitting}>
            {submitting ? '处理中…' : mode === 'login' ? '登录' : '创建账号'}
          </button>
          {mode === 'login' && (
            <p className={styles.forgotRow}>
              <Link to="/forgot-password" className={styles.switchLink}>
                忘记密码？
              </Link>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
