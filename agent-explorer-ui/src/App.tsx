import { useCallback, useEffect, useState } from 'react'
import { AgentBar } from './components/AgentBar'
import { Header } from './components/Header'
import { ChatThread } from './components/ChatThread'
import type { UploadedImage } from './components/ImageStrip'
import { ModelSelect } from './components/ModelSelect'
import { OutputPanel } from './components/OutputPanel'
import { PromptPanel } from './components/PromptPanel'
import { SessionButton } from './components/SessionButton'
import { SessionList } from './components/SessionList'
import {
  ApiError,
  assetUrl,
  checkHealth,
  createSession,
  deleteAsset,
  deleteSession,
  listSessions,
  queryAgent,
  uploadAsset,
  type Asset,
  type QueryResult,
  type Session,
} from './lib/api'
import { getAgents } from './lib/agents'
import { withGfmInstruction } from './lib/markdown'
import { useTheme } from './lib/useTheme'
import { usePromptLibrary } from './lib/usePromptLibrary'
import { PromptLibrary } from './components/PromptLibrary'

const agents = getAgents()
// Must match ALLOWED_MODELS on the backend (agent-claude-nodejs/.env.example).
const MODEL_OPTIONS = ((import.meta.env.VITE_ALLOWED_MODELS as string | undefined) ?? '')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean)

function App() {
  const [theme, toggleTheme] = useTheme()
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking')
  const [markdownOn, setMarkdownOn] = useState(true)
  const [model, setModel] = useState(MODEL_OPTIONS[0] ?? agents[0].defaultModel)
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Question already sent in the active session but not answered yet, shown in the chat meanwhile.
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  // Images uploaded for the next prompt; their ids are sent with it as `assets`.
  const [images, setImages] = useState<UploadedImage[]>([])
  const [uploading, setUploading] = useState(false)
  const { prompts: savedPrompts, savePrompt, removePrompt } = usePromptLibrary()
  const [sessions, setSessions] = useState<Session[]>([])
  // Without an active session, every send is a standalone query with no shared context.
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const pollHealth = useCallback(async () => {
    const ok = await checkHealth()
    setHealth(ok ? 'online' : 'offline')
  }, [])

  useEffect(() => {
    pollHealth()
    const interval = setInterval(pollHealth, 60000)
    return () => clearInterval(interval)
  }, [pollHealth])

  // Reloads the session list; also drops the active session if the server no longer knows it
  // (e.g. the backend restarted, since sessions are in memory there).
  const refreshSessions = useCallback(async () => {
    try {
      const loaded = await listSessions()
      setSessions(loaded)
      setActiveSessionId((current) => (current && loaded.some((s) => s.id === current) ? current : null))
    } catch (err) {
      console.error('refreshSessions failed:', err)
    }
  }, [])

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  const activeSession = sessions.find((session) => session.id === activeSessionId)

  const activeAgentId = agents.find((agent) => agent.defaultModel === model)?.id ?? agents[0].id

  const handleSend = async () => {
    const trimmed = prompt.trim()
    if (!trimmed) return

    setIsLoading(true)
    setError(null)
    pollHealth()

    const outgoingPrompt = markdownOn ? withGfmInstruction(trimmed) : trimmed

    // In a session the chat shows the question right away and the input empties, like a messenger.
    if (activeSessionId) {
      setPendingPrompt(trimmed)
      setPrompt('')
    }

    try {
      const response = await queryAgent(
        outgoingPrompt,
        model || undefined,
        activeSessionId ?? undefined,
        images.map((image) => image.id),
      )
      setResult(response)
      forgetImages()
      if (activeSessionId) await refreshSessions()
    } catch (err) {
      console.error('handleSend failed:', err)
      setResult(null)
      // Put the question back in the input so it can be retried.
      if (activeSessionId) setPrompt(trimmed)
      setError(err instanceof ApiError ? err.message : "Could not reach the agent. Is the server running?")
      if (activeSessionId) refreshSessions()
    } finally {
      setPendingPrompt(null)
      setIsLoading(false)
    }
  }

  // Uploads the picked files one after another; a failed file is reported but doesn't stop the rest.
  const handleUpload = async (files: File[]) => {
    setUploading(true)
    setError(null)
    for (const file of files) {
      try {
        const asset = await uploadAsset(file)
        setImages((current) => [...current, { id: asset.id, name: file.name, previewUrl: URL.createObjectURL(file) }])
      } catch (err) {
        console.error('handleUpload failed:', err)
        const reason = err instanceof ApiError ? err.message : 'Could not reach the server.'
        setError(`${file.name}: ${reason}`)
      }
    }
    setUploading(false)
  }

  // Attaches images that were uploaded earlier; they're previewed straight from the server.
  const handlePickAssets = (assets: Asset[]) => {
    setImages((current) => [
      ...current,
      ...assets
        .filter((asset) => !current.some((image) => image.id === asset.id))
        .map((asset) => ({ id: asset.id, name: asset.id.slice(0, 8), previewUrl: assetUrl(asset.id) })),
    ])
  }

  // Deletes the image on the server too. A 404 means it's already gone, so it's dropped anyway.
  const handleRemoveImage = async (image: UploadedImage) => {
    try {
      await deleteAsset(image.id)
    } catch (err) {
      if (!(err instanceof ApiError)) {
        console.error('handleRemoveImage failed:', err)
        setError('Could not remove the image. Is the server running?')
        return
      }
    }
    URL.revokeObjectURL(image.previewUrl)
    setImages((current) => current.filter((item) => item.id !== image.id))
  }

  // Drops the images from the UI only, leaving them on the server (used once they've been sent).
  const forgetImages = () => {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    setImages([])
  }

  const resetConversation = () => {
    setPrompt('')
    setResult(null)
    setError(null)
    setPendingPrompt(null)
  }

  const handleNewSession = async () => {
    try {
      const session = await createSession(model || undefined)
      setSessions((current) => [...current, session])
      setActiveSessionId(session.id)
      resetConversation()
    } catch (err) {
      console.error('handleNewSession failed:', err)
      setError(err instanceof ApiError ? err.message : 'Could not create a session. Is the server running?')
    }
  }

  // Leaves session mode without deleting the session, so the next send is a standalone query.
  const handleCloseSession = () => {
    setActiveSessionId(null)
    resetConversation()
  }

  // Selecting the active session again closes it.
  const handleSelectSession = (session: Session) => {
    if (session.id === activeSessionId) {
      handleCloseSession()
      return
    }
    setActiveSessionId(session.id)
    resetConversation()
  }

  const handleDeleteSession = async (session: Session) => {
    try {
      await deleteSession(session.id)
    } catch (err) {
      // A 404 means it's already gone on the server, so the refresh below cleans it up.
      if (!(err instanceof ApiError)) console.error('handleDeleteSession failed:', err)
    }
    if (session.id === activeSessionId) resetConversation()
    refreshSessions()
  }

  const handleClear = () => {
    setPrompt('')
    setResult(null)
    setError(null)
    pollHealth()
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Header
        markdownOn={markdownOn}
        onToggleMarkdown={() => setMarkdownOn((value) => !value)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <AgentBar
        agents={agents}
        activeAgentId={activeAgentId}
        health={health}
        onSelect={(agent) => setModel(agent.defaultModel)}
        sessionId={activeSession?.id}
        onCloseSession={handleCloseSession}
      />

      <div className="relative flex flex-1 flex-col">
        {/* On wide screens the list floats in the left margin, so the centered column never shifts. */}
        <aside className="mx-auto w-full max-w-3xl space-y-4 px-5 pt-5 xl:absolute xl:left-4 xl:top-5 xl:mx-0 xl:w-56 xl:max-w-none xl:p-0">
          <PromptLibrary prompts={savedPrompts} onPick={(p) => setPrompt(p.text)} onDelete={(p) => removePrompt(p.id)} />
          {sessions.length > 0 && (
            <SessionList
              sessions={[...sessions].reverse()}
              activeSessionId={activeSessionId}
              onSelect={handleSelectSession}
              onDelete={handleDeleteSession}
            />
          )}
        </aside>

        <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-5">
          <div className="flex items-end gap-3">
            <SessionButton onClick={handleNewSession} disabled={isLoading} />
            <ModelSelect model={model} options={MODEL_OPTIONS} onChange={setModel} />
          </div>
          {activeSession ? (
            <>
              <ChatThread
                queries={activeSession.queries}
                pendingPrompt={pendingPrompt}
                isLoading={isLoading}
                error={error}
                markdownOn={markdownOn}
              />
              {/* Floats at the bottom of the viewport so the input stays reachable while the thread scrolls. */}
              <div className="sticky bottom-0 z-10 -mx-2 bg-slate-50/95 px-2 py-2 backdrop-blur dark:bg-slate-950/95">
                <PromptPanel prompt={prompt} onPromptChange={setPrompt} onSend={handleSend} onClear={handleClear} images={images} uploading={uploading} onUpload={handleUpload} onRemoveImage={handleRemoveImage} onPickAssets={handlePickAssets} onSaveToLibrary={() => savePrompt(prompt)} disabled={isLoading} />
              </div>
            </>
          ) : (
            <>
              <PromptPanel prompt={prompt} onPromptChange={setPrompt} onSend={handleSend} onClear={handleClear} images={images} uploading={uploading} onUpload={handleUpload} onRemoveImage={handleRemoveImage} onPickAssets={handlePickAssets} onSaveToLibrary={() => savePrompt(prompt)} disabled={isLoading} />
              <OutputPanel isLoading={isLoading} error={error} result={result} markdownOn={markdownOn} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
