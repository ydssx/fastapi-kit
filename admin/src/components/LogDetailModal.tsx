import { CopyJsonButton } from './CopyJsonButton'
import { CopyTextButton } from './CopyTextButton'
import { JsonPreview } from './JsonPreview'
import { Modal } from './Modal'
import { ModalFooter } from './ModalFooter'
import { StatusBadge } from './StatusBadge'
import type { LogEntry } from '../types/api'
import {
  extractLogExtraFields,
  formatLogTimestamp,
  logLevelVariant,
  type LogLevelVariant,
} from '../lib/logDisplay'
import shared from '../styles/shared.module.css'
import styles from './LogDetailModal.module.css'

type LogDetailModalProps = {
  entry: LogEntry
  onClose: () => void
  onFilterByRequestId?: (requestId: string) => void
}

const LEVEL_CLASS: Record<LogLevelVariant, string> = {
  error: styles.levelError,
  warn: styles.levelWarn,
  ok: styles.levelOk,
  neutral: styles.levelNeutral,
}

export function LogDetailModal({ entry, onClose, onFilterByRequestId }: LogDetailModalProps) {
  const variant = logLevelVariant(entry.level)
  const levelClass = LEVEL_CLASS[variant]
  const time = formatLogTimestamp(entry.timestamp)
  const extraFields = extractLogExtraFields(entry.raw)
  const message = entry.message ?? '（无消息文本）'

  return (
    <Modal
      title="日志详情"
      titleId="log-detail-title"
      wide
      onClose={onClose}
      headerActions={<CopyJsonButton key={entry.timestamp} value={entry.raw} />}
    >
      <article className={`${styles.hero} ${levelClass}`} aria-labelledby="log-detail-message">
        <div className={styles.heroMeta}>
          {entry.level ? (
            <StatusBadge status={entry.level.toUpperCase()} variant={variant} />
          ) : (
            <span className={styles.levelUnknown}>未知级别</span>
          )}
          <time className={styles.heroTime} dateTime={entry.timestamp} title={time.utc}>
            {time.local}
          </time>
        </div>
        <p id="log-detail-message" className={styles.message}>
          {message}
        </p>
      </article>

      {entry.request_id ? (
        <section className={styles.traceSection} aria-label="追踪标识">
          <span className={styles.sectionEyebrow}>Request ID</span>
          <div className={styles.traceChip}>
            <code className={styles.traceId}>{entry.request_id}</code>
            <CopyTextButton value={entry.request_id} label="复制 Request ID" compact />
          </div>
        </section>
      ) : null}

      {extraFields.length > 0 ? (
        <section className={styles.fieldsSection} aria-label="附加字段">
          <span className={styles.sectionEyebrow}>上下文</span>
          <dl className={styles.fieldsGrid}>
            {extraFields.map((field) => (
              <div key={field.key} className={styles.fieldRow}>
                <dt>{field.label}</dt>
                <dd className={field.key === 'exc_info' ? styles.fieldMono : undefined}>
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <details className={styles.rawDetails}>
        <summary className={styles.rawSummary}>原始 JSON</summary>
        <JsonPreview value={entry.raw} />
      </details>

      <ModalFooter>
        {entry.request_id && onFilterByRequestId ? (
          <button
            type="button"
            className={shared.btnPrimary}
            onClick={() => onFilterByRequestId(entry.request_id!)}
          >
            按 Request ID 筛选
          </button>
        ) : null}
        <button type="button" className={shared.btnSecondary} onClick={onClose}>
          关闭
        </button>
      </ModalFooter>
    </Modal>
  )
}
