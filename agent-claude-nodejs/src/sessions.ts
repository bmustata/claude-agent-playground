import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { logger } from "./logger.ts";

const MAX_NAME_LENGTH = 60;
const DEFAULT_SESSIONS_DIR = "data/session";
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Source of truth while the server runs; every change is also written to disk (see the helpers at the bottom).
const sessions = new Map<string, Session>();

export type SessionQuery = {
  prompt: string; // full prompt as sent, e.g. "What is the capital of France?"
  answer: string; // the agent's full reply, e.g. "Paris is the capital of France."
  createdAt: string; // ISO timestamp of when the query completed
};

export type Session = {
  id: string; // also used as the Claude Agent SDK session id, so follow-up queries can resume it
  name?: string; // first line of the first prompt, e.g. "What is the capital of France?" (unset until the first query)
  model?: string; // default model for queries in this session, e.g. "claude-sonnet-5-5"
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp of the last completed query (or creation)
  queryCount: number; // completed queries so far; 0 means the SDK session doesn't exist yet
  queries: SessionQuery[]; // every completed query, oldest first
};

export function createSession(model?: string): Session {
  const now = new Date().toISOString();
  const session: Session = { id: randomUUID(), model, createdAt: now, updatedAt: now, queryCount: 0, queries: [] };
  sessions.set(session.id, session);
  saveSession(session);
  logger.info({ sessionId: session.id, model, total: sessions.size }, "session created");
  return session;
}

export function listSessions(): Session[] {
  return [...sessions.values()];
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

// Forgets a session and its saved file; returns false if it didn't exist. The SDK's own session
// files (managed by Claude Code) are left alone.
export function deleteSession(id: string): boolean {
  const deleted = sessions.delete(id);
  if (deleted) {
    removeSessionFile(id);
    logger.info({ sessionId: id, total: sessions.size }, "session deleted");
  } else {
    logger.warn({ sessionId: id }, "session delete failed: not found");
  }
  return deleted;
}

// Records a completed query so the next one resumes the conversation instead of starting it.
// The first line of the first prompt becomes the session's name (so text a client appends on
// later lines, like formatting instructions, stays out of it).
export function markSessionUsed(id: string, prompt: string, answer: string): void {
  const session = sessions.get(id);
  if (!session) {
    logger.warn({ sessionId: id }, "session update skipped: not found");
    return;
  }
  const firstLine = prompt.trim().split("\n")[0].trim();
  session.name ??= firstLine.length > MAX_NAME_LENGTH ? `${firstLine.slice(0, MAX_NAME_LENGTH).trimEnd()}…` : firstLine;
  const now = new Date().toISOString();
  session.queries.push({ prompt, answer, createdAt: now });
  session.queryCount += 1;
  session.updatedAt = now;
  saveSession(session);
  logger.info(
    { sessionId: id, name: session.name, queryCount: session.queryCount, answerLength: answer.length },
    "session query recorded",
  );
}

// Loads the saved sessions into memory; call once at startup. Files that are unreadable or
// don't look like a session are skipped with a warning.
export function loadSessions(): void {
  let files: string[];
  try {
    files = readdirSync(sessionsDir()).filter((file) => file.endsWith(".json"));
  } catch {
    logger.info({ dir: sessionsDir() }, "no saved sessions to load");
    return;
  }

  for (const file of files) {
    try {
      const session = JSON.parse(readFileSync(join(sessionsDir(), file), "utf-8")) as Session;
      if (!SESSION_ID_PATTERN.test(session.id) || file !== `${session.id}.json` || !Array.isArray(session.queries)) {
        throw new Error("not a valid session");
      }
      sessions.set(session.id, session);
    } catch (err) {
      logger.warn({ err, file }, "skipped invalid session file");
    }
  }
  logger.info({ dir: sessionsDir(), loaded: sessions.size }, "sessions loaded");
}

export type SessionStats = {
  dir: string; // where sessions are saved
  total: number; // sessions in memory
  empty: number; // sessions with no completed query yet
  queries: number; // completed queries across all sessions
  lastActivity?: string; // ISO timestamp of the most recent update, unset when there are no sessions
};

export function getSessionStats(): SessionStats {
  const all = listSessions();
  return {
    dir: sessionsDir(),
    total: all.length,
    empty: all.filter((session) => session.queryCount === 0).length,
    queries: all.reduce((sum, session) => sum + session.queryCount, 0),
    lastActivity: all.map((session) => session.updatedAt).sort().at(-1),
  };
}

// Empties the in-memory map only (used by tests); saved files are left in place.
export function clearSessions(): void {
  sessions.clear();
}

// --- Persistence helpers ---------------------------------------------------------------------

// Sessions are saved as one JSON file per session, <dir>/<id>.json, where <dir> is SESSIONS_DIR
// (default "data/session", relative to the working directory). Read lazily so tests can point it
// at a temp directory.
function sessionsDir(): string {
  return process.env.SESSIONS_DIR || DEFAULT_SESSIONS_DIR;
}

function sessionFile(id: string): string {
  return join(sessionsDir(), `${id}.json`);
}

// Writes via a temp file + rename so a crash mid-write never leaves a half-written session.
// A failure is logged and swallowed: losing persistence must not fail the request itself.
function saveSession(session: Session): void {
  try {
    mkdirSync(sessionsDir(), { recursive: true });
    const file = sessionFile(session.id);
    writeFileSync(`${file}.tmp`, JSON.stringify(session, null, 2));
    renameSync(`${file}.tmp`, file);
  } catch (err) {
    logger.error({ err, sessionId: session.id }, "session save failed");
  }
}

function removeSessionFile(id: string): void {
  try {
    rmSync(sessionFile(id), { force: true });
  } catch (err) {
    logger.error({ err, sessionId: id }, "session file delete failed");
  }
}
