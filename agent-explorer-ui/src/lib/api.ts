export type TokenUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

export type QueryResult = {
  answer: string
  // Optional fields may be absent from the /query response, depending on the backend agent.
  model?: string
  rounds?: number
  toolsUsed?: string[]
  usage?: TokenUsage
  duration?: number
}

export type SessionQuery = {
  prompt: string
  answer: string
  createdAt: string
}

export type Session = {
  id: string
  name?: string // first line of the first prompt; unset until the first query
  model?: string
  createdAt: string
  updatedAt: string
  queryCount: number
  queries: SessionQuery[] // every completed query, oldest first
}

export type Asset = {
  id: string
  mediaType: string
  size: number
  createdAt: string
}

export class ApiError extends Error {}

// Absolute base URL for the backend API. Left unset for local dev, so requests stay relative
// (/api/*) and go through vite.config.ts's dev proxy to agents.yml's baseUrl instead.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

// Sends a request and returns the parsed JSON body (null for an empty body such as a 204),
// throwing an ApiError with the server's message on a non-2xx status.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, init)
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(body?.error ?? `Request failed with status ${response.status}`)
  }

  return body as T
}

function postJson(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export function queryAgent(prompt: string, model?: string, sessionId?: string, assets?: string[]): Promise<QueryResult> {
  return request(
    '/query',
    postJson({ prompt, ...(model && { model }), ...(sessionId && { sessionId }), ...(assets?.length && { assets }) }),
  )
}

export function createSession(model?: string): Promise<Session> {
  return request('/sessions', postJson(model ? { model } : {}))
}

export async function listSessions(): Promise<Session[]> {
  const body = await request<{ sessions: Session[] }>('/sessions')
  return body.sessions
}

export async function deleteSession(id: string): Promise<void> {
  await request(`/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// Uploads an image as the raw request body; the server checks the actual bytes, not the type.
export function uploadAsset(file: File): Promise<Asset> {
  return request('/assets', { method: 'POST', headers: { 'Content-Type': file.type }, body: file })
}

export async function listAssets(): Promise<Asset[]> {
  const body = await request<{ assets: Asset[] }>('/assets')
  return body.assets
}

// URL that serves the image itself, usable as an <img> src.
export function assetUrl(id: string): string {
  return `${API_BASE_URL}/api/assets/${encodeURIComponent(id)}`
}

export async function deleteAsset(id: string): Promise<void> {
  await request(`/assets/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`)
    return response.ok
  } catch {
    return false
  }
}
