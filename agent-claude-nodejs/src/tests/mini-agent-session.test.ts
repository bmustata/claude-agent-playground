import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Keep test sessions out of the real data directory.
process.env.SESSIONS_DIR = mkdtempSync(join(tmpdir(), "sessions-test-"));

const queryMock = vi.fn();

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: (args: unknown) => queryMock(args),
}));

const { runMiniAgentSession } = await import("../agent/mini-agent-session.ts");
const { clearSessions, createSession, getSession } = await import("../sessions.ts");

const success = { type: "result", subtype: "success", result: "ok", num_turns: 1 };

function respondWith(...messages: object[]) {
  queryMock.mockImplementation(async function* () {
    yield* messages;
  });
}

beforeEach(() => {
  queryMock.mockReset();
  clearSessions();
});

describe("runMiniAgentSession", () => {
  it("returns the answer, rounds and duration", async () => {
    respondWith(success);
    const { id } = createSession();

    const result = await runMiniAgentSession("hi", undefined, id);

    expect(result).toEqual({ answer: "ok", rounds: 1, duration: expect.any(Number) });
  });

  it("creates the SDK session on the first run and resumes it afterwards", async () => {
    respondWith(success);
    const { id } = createSession();

    await runMiniAgentSession("first", undefined, id);
    await runMiniAgentSession("second", undefined, id);

    expect(queryMock.mock.calls[0][0].options).toEqual({ model: undefined, sessionId: id });
    expect(queryMock.mock.calls[1][0].options).toEqual({ model: undefined, resume: id });
    expect(getSession(id)?.queryCount).toBe(2);
  });

  it("passes the model override", async () => {
    respondWith(success);
    const { id } = createSession();

    await runMiniAgentSession("hi", "claude-sonnet-5", id);

    expect(queryMock.mock.calls[0][0].options).toMatchObject({ model: "claude-sonnet-5" });
  });

  it("does not count a failed run, so the next one still creates the session", async () => {
    const { id } = createSession();

    respondWith({ type: "result", subtype: "error_during_execution" });
    await expect(runMiniAgentSession("a", undefined, id)).rejects.toThrow(/Agent run failed/);
    respondWith(success);
    await runMiniAgentSession("b", undefined, id);

    expect(queryMock.mock.calls[1][0].options).toMatchObject({ sessionId: id });
  });

  it("records every completed query with its full prompt and answer", async () => {
    respondWith(success);
    const { id } = createSession();

    await runMiniAgentSession("first\n\nwith more lines", undefined, id);
    await runMiniAgentSession("second", undefined, id);

    expect(getSession(id)?.queries).toEqual([
      { prompt: "first\n\nwith more lines", answer: "ok", createdAt: expect.any(String) },
      { prompt: "second", answer: "ok", createdAt: expect.any(String) },
    ]);
  });

  it("names the session after the first line of its first prompt only", async () => {
    respondWith(success);
    const { id } = createSession();

    await runMiniAgentSession("  What is 2+2?\n\nReturn the final answer as GFM.", undefined, id);
    await runMiniAgentSession("second prompt", undefined, id);

    expect(getSession(id)?.name).toBe("What is 2+2?");
  });

  it("truncates a long first prompt in the session name", async () => {
    respondWith(success);
    const { id } = createSession();

    await runMiniAgentSession("x".repeat(100), undefined, id);

    expect(getSession(id)?.name).toBe(`${"x".repeat(60)}…`);
  });

  it("throws for an unknown session id", async () => {
    await expect(runMiniAgentSession("hi", undefined, "unknown")).rejects.toThrow(/Session not found/);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
