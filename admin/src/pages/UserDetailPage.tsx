import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchUser,
  fetchUserAuditLogs,
  resetUserPassword,
  updateUser,
} from '../api/users'
import { useAuth } from '../auth/useAuth'
import { DataTable, TABLE_SCROLL_MAX_HEIGHT, type Column } from '../components/DataTable'
import { LoadingBlock } from '../components/LoadingBlock'
import { PageHeader } from '../components/PageHeader'
import { PasswordResetResultModal } from '../components/PasswordResetResultModal'
import { StatusBadge } from '../components/StatusBadge'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import type { AuditLog } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './UserDetailPage.module.css'

const auditColumns: Column<AuditLog>[] = [
  {
    key: 'time',
    header: '时间',
    mono: true,
    render: (l) => new Date(l.created_at).toLocaleString('zh-CN'),
  },
  { key: 'action', header: '操作', render: (l) => l.action },
  { key: 'detail', header: '详情', render: (l) => (l.detail ? JSON.stringify(l.detail) : '—') },
]

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [resetResult, setResetResult] = useState<{ email: string; temporaryPassword: string } | null>(
    null,
  )
  const { confirm, dialog } = useConfirmDialog()

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id!),
    enabled: Boolean(id),
  })

  const { data: audits } = useQuery({
    queryKey: ['user-audits', id],
    queryFn: () => fetchUserAuditLogs(id!),
    enabled: Boolean(id),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { is_active?: boolean; role?: string }) =>
      updateUser(id!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user', id] })
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const resetMutation = useMutation({
    mutationFn: (email: string) =>
      resetUserPassword(id!).then((result) => ({ ...result, email })),
    onSuccess: (result) => {
      setResetResult({
        email: result.email,
        temporaryPassword: result.temporary_password,
      })
      void queryClient.invalidateQueries({ queryKey: ['user-audits', id] })
    },
  })

  const isSelf = currentUser?.id === user?.id

  if (!id) return <p className={shared.muted}>无效用户 ID</p>
  if (isLoading) {
    return (
      <div className={shared.page}>
        <PageHeader description="加载中…" />
        <LoadingBlock />
      </div>
    )
  }
  if (error || !user) {
    return (
      <div className={shared.page}>
        <p className={shared.errorText}>加载失败</p>
        <Link to="/users" className={shared.link}>
          返回用户列表
        </Link>
      </div>
    )
  }

  return (
    <div className={shared.page}>
      <PageHeader
        title={user.email}
        description={`注册于 ${new Date(user.created_at).toLocaleString('zh-CN')}`}
        actions={
          <Link to="/users" className={shared.link}>
            ← 返回列表
          </Link>
        }
      />

      <section className={`${shared.panel} ${styles.card}`}>
        <dl className={styles.meta}>
          <div>
            <dt>角色</dt>
            <dd>
              <select
                className={styles.select}
                value={user.role}
                onChange={async (e) => {
                  const next = e.target.value
                  const demoting = next === 'user'
                  const message = demoting
                    ? `将 ${user.email} 降为普通用户？若其为最后一名管理员将被拒绝。`
                    : `将 ${user.email} 设为管理员？`
                  if (
                    await confirm({
                      title: demoting ? '降级用户' : '设为管理员',
                      message,
                      confirmLabel: demoting ? '降级' : '设为管理员',
                      variant: demoting ? 'danger' : 'default',
                    })
                  ) {
                    updateMutation.mutate({ role: next })
                  }
                }}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={user.is_active}
                  onChange={async () => {
                    const next = !user.is_active
                    const action = next ? '启用' : '禁用'
                    if (
                      await confirm({
                        title: `${action}用户`,
                        message: `${action}用户 ${user.email}？禁用最后一名管理员将被拒绝。`,
                        confirmLabel: action,
                        variant: next ? 'default' : 'danger',
                      })
                    ) {
                      updateMutation.mutate({ is_active: next })
                    }
                  }}
                />
                <StatusBadge status={user.is_active ? 'active' : 'offline'} />
              </label>
            </dd>
          </div>
        </dl>
        <div className={styles.resetSection}>
          {isSelf ? (
            <p className={shared.muted}>
              不能在此重置自己的密码；请使用账号设置或让其他管理员操作。
            </p>
          ) : (
            <>
              <p className={shared.muted}>
                生成随机临时密码并立即作废旧密码。新密码仅显示一次，请复制后安全告知用户。
              </p>
              {resetMutation.isError ? (
                <p className={shared.errorText} role="alert">
                  重置失败：{(resetMutation.error as Error).message}
                </p>
              ) : null}
              <button
                type="button"
                className={shared.btnDanger}
                disabled={resetMutation.isPending}
                onClick={async () => {
                  if (
                    await confirm({
                      title: '重置密码',
                      message: `为 ${user.email} 生成新的临时密码？\n\n旧密码将立即失效，新密码仅显示一次。`,
                      confirmLabel: '生成临时密码',
                      variant: 'danger',
                    })
                  ) {
                    resetMutation.mutate(user.email)
                  }
                }}
              >
                {resetMutation.isPending ? '生成中…' : '重置密码'}
              </button>
            </>
          )}
        </div>
      </section>

      {resetResult ? (
        <PasswordResetResultModal
          email={resetResult.email}
          temporaryPassword={resetResult.temporaryPassword}
          onClose={() => setResetResult(null)}
        />
      ) : null}

      {dialog}

      <section className={shared.section}>
        <h3 className={shared.sectionTitle}>相关审计</h3>
        <DataTable
          columns={auditColumns}
          rows={audits ?? []}
          rowKey={(l) => l.id}
          emptyMessage="暂无审计记录"
          scrollMaxHeight={TABLE_SCROLL_MAX_HEIGHT}
        />
      </section>
    </div>
  )
}
