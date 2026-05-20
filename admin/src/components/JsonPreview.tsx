import codeBlock from '../styles/codeBlock.module.css'

type JsonPreviewProps = {
  value: unknown
}

export function JsonPreview({ value }: JsonPreviewProps) {
  return <pre className={codeBlock.block}>{JSON.stringify(value, null, 2)}</pre>
}
