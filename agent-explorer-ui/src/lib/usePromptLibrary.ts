import { useCallback, useState } from 'react'

export type SavedPrompt = { id: string; text: string }

const STORAGE_KEY = 'agent-explorer:prompt-library'

function load(): SavedPrompt[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((p): p is SavedPrompt => typeof p?.id === 'string' && typeof p?.text === 'string')
  } catch {
    return []
  }
}

function persist(prompts: SavedPrompt[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts))
  } catch (err) {
    console.error('Could not save prompt library:', err)
  }
}

// Prompts live only in this browser's localStorage.
export function usePromptLibrary() {
  const [prompts, setPrompts] = useState<SavedPrompt[]>(load)

  const savePrompt = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setPrompts((current) => {
      if (current.some((p) => p.text === trimmed)) return current
      const next = [{ id: crypto.randomUUID(), text: trimmed }, ...current]
      persist(next)
      return next
    })
  }, [])

  const removePrompt = useCallback((id: string) => {
    setPrompts((current) => {
      const next = current.filter((p) => p.id !== id)
      persist(next)
      return next
    })
  }, [])

  return { prompts, savePrompt, removePrompt }
}
