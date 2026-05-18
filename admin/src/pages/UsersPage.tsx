import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUsers, updateUser } from '../api/users'
import { DataTable, type Column } from '../components/DataTable'
import { LoadingBlock } from '../components/LoadingBlock'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import type { UserPublic } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './UsersPage.module.css'

export function UsersPage() {
  const [page, setPage] = useState(1)
  const [email, setEmail] = useState('')
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => fetchUsers({ page, page_size: 20, email: search || undefined }),
  })

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { is_active?: boolean; role?: string } }) =>
      updateUser(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const columns: Column<UserPublic>[] = [
    {
      key: 'email',
      header: '邮箱',
      render: (u) => (
        <Link to={`/users/${u.id}`} className={styles.emailLink}>
          {u.email}
        </Link>
      ),
    },
    {
      key: 'role',
      header: '角色',
      render: (u) => (
        <select
          className={styles.select}
          value={u.role}
          onChange={(e) => {
            const next = e.target.value
            const warn =
              next === 'user'
                ? `将 ${u.email} 降为普通用户？若其为最后一名管理员将被拒绝。`
                : `将 ${u.email} 设为管理员？`
            if (confirm(warn)) {
              mutation.mutate({ id: u.id, payload: { role: next } })
            }
          }}
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      ),
    },
    {
      key: 'active',
      header: '状态',
      render: (u) => (
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={u.is_active}
            onChange={() => {
              const next = !u.is_active
              const action = next ? '启用' : '禁用'
              if (confirm(`${action}用户 ${u.email}？禁用最后一名管理员将被拒绝。`)) {
                mutation.mutate({ id: u.id, payload: { is_active: next } })
              }
            }}
          />
          <StatusBadge status={u.is_active ? 'active' : 'offline'} />
        </label>
      ),
    },
    {
      key: 'created',
      header: '注册时间',
      mono: true,
      render: (u) => new Date(u.created_at).toLocaleString('zh-CN'),
    },
  ]

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1

  return (
    <div className={shared.page}>
      <PageHeader
        title="用户管理"
        description="点击邮箱查看详情与审计记录"
        actions={
          <form
            className={shared.toolbar}
            onSubmit={(e) => {
              e.preventDefault()
              setSearch(email)
              setPage(1)
            }}
          >
            <input
              type="search"
              className={shared.input}
              placeholder="按邮箱搜索"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className={shared.btnPrimary}>
              搜索
            </button>
          </form>
        }
      />
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <>
          <DataTable columns={columns} rows={data?.items ?? []} rowKey={(u) => u.id} />
          <div className={shared.pagination}>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              上一页
            </button>
            <span>
              第 {page} / {totalPages} 页（共 {data?.total ?? 0} 条）
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  )
}
