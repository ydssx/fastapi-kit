import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  fetchUser,
  fetchUserAuditLogs,
  resetUserPassword,
  updateUser,
} from '../api/users'
import { DataTable, type Column } from '../components/DataTable'
import { LoadingBlock } from '../components/LoadingBlock'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
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
    mutationFn: () => resetUserPassword(id!),
    onSuccess: (result) => {
      alert(`临时密码（仅显示一次）：\n${result.temporary_password}`)
      void queryClient.invalidateQueries({ queryKey: ['user-audits', id] })
    },
  })

  if (!id) return <p className={shared.muted}>无效用户 ID</p>
  if (isLoading) {
    return (
      <div className={shared.page}>
        <LoadingBlock />
      </div>
    )
  }
  if (error || !user) {
    return (
      <div className={shared.page}>
        <p className={shared.errorText}>加载失败</p>
        <Link to="/users" className={styles.back}>
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
          <Link to="/users" className={styles.back}>
            ← 返回列表
          </Link>
        }
      />

      <section className={styles.card}>
        <dl className={styles.meta}>
          <div>
            <dt>角色</dt>
            <dd>
              <select
                className={styles.select}
                value={user.role}
                onChange={(e) => {
                  const next = e.target.value
                  const msg =
                    next === 'user'
                      ? `将 ${user.email} 降为普通用户？若其为最后一名管理员将被拒绝。`
                      : `将 ${user.email} 设为管理员？`
                  if (confirm(msg)) {
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
                  onChange={() => {
                    const next = !user.is_active
                    const action = next ? '启用' : '禁用'
                    if (
                      confirm(
                        `${action}用户 ${user.email}？禁用最后一名管理员将被拒绝。`,
                      )
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
        <button
          type="button"
          className={styles.dangerBtn}
          onClick={() => {
            if (
              confirm(`为 ${user.email} 生成新的临时密码？旧密码将立即失效。`)
            ) {
              resetMutation.mutate()
            }
          }}
        >
          重置密码
        </button>
      </section>

      <section className={shared.section}>
        <h3 className={shared.sectionTitle}>相关审计</h3>
        <DataTable
          columns={auditColumns}
          rows={audits ?? []}
          rowKey={(l) => l.id}
          emptyMessage="暂无审计记录"
        />
      </section>
    </div>
  )
}
