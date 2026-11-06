import { useEffect, useRef } from 'react'
import type { SessionQuery } from '../lib/api'
import { stripGfmInstruction } from '../lib/markdown'
import { AnswerBody } from './AnswerBody'

type Props = {
  queries: SessionQuery[]
  pendingPrompt: string | null // question already sent but not answered yet
  isLoading: boolean
  error: string | null
  markdownOn: boolean
}

function Question({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-indigo-600 px-3.5 py-2 text-white">{text}</p>
    </div>
  )
}

function Answer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
        {children}
      </div>
    </div>
  )
}

// Chat view of one session: questions on the right, the agent's answers on the left.
export function ChatThread({ queries, pendingPrompt, isLoading, error, markdownOn }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [queries.length, pendingPrompt, isLoading, error])

  const isEmpty = queries.length === 0 && !pendingPrompt && !error

  return (
    <div className="space-y-3">
      {isEmpty && <p className="text-slate-400 dark:text-slate-500">Ask something to start the conversation.</p>}

      {queries.map((query) => (
        <div key={query.createdAt + query.prompt} className="space-y-3">
          <Question text={stripGfmInstruction(query.prompt)} />
          <Answer>
            <AnswerBody answer={query.answer} markdownOn={markdownOn} />
          </Answer>
        </div>
      ))}

      {pendingPrompt && <Question text={pendingPrompt} />}
      {isLoading && (
        <Answer>
          <p className="text-slate-400 dark:text-slate-500">Thinking…</p>
        </Answer>
      )}
      {error && <p className="whitespace-pre-wrap text-red-600 dark:text-red-400">{error}</p>}

      {/* scroll margin keeps the newest message clear of the floating input below the thread */}
      <div ref={endRef} className="scroll-mb-48" />
    </div>
  )
}
