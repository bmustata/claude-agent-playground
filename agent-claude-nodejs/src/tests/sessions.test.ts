import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "sessions-test-"));
process.env.SESSIONS_DIR = dir;

const { clearSessions, createSession, deleteSession, getSession, getSessionStats, loadSessions, markSessionUsed } = await import("../sessions.ts");

const fileOf = (id: string) => join(dir, `${id}.json`);

beforeEach(() => {
  clearSessions();
  for (const file of readdirSync(dir)) rmSync(join(dir, file));
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("getSessionStats", () => {
  it("reports empty stats when there are no sessions", () => {
    expect(getSessionStats()).toEqual({ dir, total: 0, empty: 0, queries: 0, lastActivity: undefined });
  });

  it("counts sessions, empty sessions and queries", () => {
    const a = createSession();
    createSession();
    markSessionUsed(a.id, "one", "1");
    markSessionUsed(a.id, "two", "2");

    expect(getSessionStats()).toEqual({
      dir,
      total: 2,
      empty: 1,
      queries: 2,
      lastActivity: getSession(a.id)?.updatedAt,
    });
  });
});

describe("session persistence", () => {
  it("saves a new session as <id>.json", () => {
    const session = createSession("claude-sonnet-5");

    expect(JSON.parse(readFileSync(fileOf(session.id), "utf-8"))).toEqual(session);
  });

  it("updates the file when a query is recorded", () => {
    const { id } = createSession();

    markSessionUsed(id, "hello", "hi there");

    const saved = JSON.parse(readFileSync(fileOf(id), "utf-8"));
    expect(saved.name).toBe("hello");
    expect(saved.queryCount).toBe(1);
    expect(saved.queries).toEqual([{ prompt: "hello", answer: "hi there", createdAt: expect.any(String) }]);
  });

  it("removes the file when the session is deleted", () => {
    const { id } = createSession();

    expect(deleteSession(id)).toBe(true);

    expect(existsSync(fileOf(id))).toBe(false);
  });

  it("restores saved sessions after a restart", () => {
    const { id } = createSession("claude-sonnet-5");
    markSessionUsed(id, "hello", "hi there");
    const before = getSession(id);

    clearSessions(); // simulates a restart: memory is gone, files stay
    expect(getSession(id)).toBeUndefined();
    loadSessions();

    expect(getSession(id)).toEqual(before);
  });

  it("skips files that are not valid sessions", () => {
    writeFileSync(join(dir, "broken.json"), "{ not json");
    writeFileSync(join(dir, "escape.json"), JSON.stringify({ id: "../../etc/passwd", queries: [] }));
    const { id } = createSession();
    clearSessions();

    loadSessions();

    expect(getSession(id)).toBeDefined();
    expect(getSession("../../etc/passwd")).toBeUndefined();
  });

  it("starts empty when the directory does not exist", () => {
    const original = process.env.SESSIONS_DIR;
    process.env.SESSIONS_DIR = join(dir, "missing");

    expect(() => loadSessions()).not.toThrow();

    process.env.SESSIONS_DIR = original;
  });
});
