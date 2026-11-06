import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatJsonAnswer } from '../lib/json'

type Props = {
  answer: unknown
  markdownOn: boolean
}

// Renders an agent answer: JSON output is shown as a pretty-printed string with a "JSON" label,
// anything else as markdown or plain text.
export function AnswerBody({ answer, markdownOn }: Props) {
  const json = formatJsonAnswer(answer)
  if (json !== null) {
    return (
      <div>
        <span className="mb-1.5 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          JSON output
        </span>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm text-slate-800 dark:text-slate-100">
          {json}
        </pre>
      </div>
    )
  }

  const text = String(answer)
  return markdownOn ? (
    <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  ) : (
    <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-100">{text}</p>
  )
}
