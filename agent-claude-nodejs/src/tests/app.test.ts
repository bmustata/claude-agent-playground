import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Keep test sessions out of the real data directory.
process.env.SESSIONS_DIR = mkdtempSync(join(tmpdir(), "sessions-test-"));

const ALLOWED_MODELS = ["claude-sonnet-5", "claude-haiku-4-5-20251001"];
const runAgentMock = vi.fn();

vi.mock("../agent/mini-agent.ts", () => ({
  runMiniAgent: (prompt: string, model?: string) => runAgentMock(prompt, model, undefined),
}));

vi.mock("../agent/mini-agent-session.ts", () => ({
  runMiniAgentSession: (prompt: string, model?: string, sessionId?: string) => runAgentMock(prompt, model, sessionId),
}));

vi.mock("../agent/mini-agent-subagents.ts", () => ({
  runMiniAgentSubagents: (prompt: string, model?: string, sessionId?: string) => runAgentMock(prompt, model, sessionId),
}));

vi.mock("../utils.ts", () => ({
  getAllowedModels: () => ALLOWED_MODELS,
  isModelAllowed: (model: string) => ALLOWED_MODELS.includes(model),
  checkAgentConfig: () => ({ authMethod: "api-key" as const }),
}));

const { app } = await import("../app.ts");
const { clearSessions } = await import("../sessions.ts");

beforeEach(() => {
  runAgentMock.mockReset();
  clearSessions();
});

describe("GET /health", () => {
  it("returns healthy status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "Ok", service: "agent-claude-nodejs", timestamp: expect.any(String) });
  });
});

describe("POST /query validation", () => {
  it("rejects a missing prompt", async () => {
    const res = await request(app).post("/query").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/prompt/i);
    expect(runAgentMock).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only prompt", async () => {
    const res = await request(app).post("/query").send({ prompt: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/prompt/i);
    expect(runAgentMock).not.toHaveBeenCalled();
  });

  it("rejects a non-string model", async () => {
    const res = await request(app).post("/query").send({ prompt: "hi", model: 42 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/model/i);
    expect(runAgentMock).not.toHaveBeenCalled();
  });

  it("rejects a model that is not in the allow-list", async () => {
    const res = await request(app).post("/query").send({ prompt: "hi", model: "not-a-real-model" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/must be one of/i);
    expect(runAgentMock).not.toHaveBeenCalled();
  });
});

describe("POST /query with a mocked agent", () => {
  const agentResult = { answer: "4", rounds: 1, duration: 123 };

  it("returns the agent's result for a valid prompt", async () => {
    runAgentMock.mockResolvedValue(agentResult);

    const res = await request(app).post("/query").send({ prompt: "What is 2+2?" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(agentResult);
    expect(runAgentMock).toHaveBeenCalledWith("What is 2+2?", undefined, undefined);
  });

  it("forwards an allowed model override to the agent", async () => {
    runAgentMock.mockResolvedValue(agentResult);

    const res = await request(app).post("/query").send({ prompt: "Say OK", model: "claude-haiku-4-5-20251001" });

    expect(res.status).toBe(200);
    expect(runAgentMock).toHaveBeenCalledWith("Say OK", "claude-haiku-4-5-20251001", undefined);
  });

  it("returns 500 with the error details when the agent throws", async () => {
    runAgentMock.mockRejectedValue(new Error("boom"));

    const res = await request(app).post("/query").send({ prompt: "Say OK" });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/agent execution failed/i);
    expect(res.body.details).toBe("boom");
  });

  it("returns a response body with the expected shape and types", async () => {
    runAgentMock.mockResolvedValue(agentResult);

    const res = await request(app).post("/query").send({ prompt: "Say OK" });

    expect(res.headers["content-type"]).toMatch(/json/);
    expect(Object.keys(res.body).sort()).toEqual(["answer", "duration", "rounds"]);
    expect(res.body).toEqual({ answer: expect.any(String), rounds: expect.any(Number), duration: expect.any(Number) });
  });
});

describe("sessions", () => {
  it("creates a session, optionally with a model", async () => {
    const res = await request(app).post("/sessions").send({ model: "claude-sonnet-5" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      model: "claude-sonnet-5",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      queryCount: 0,
      queries: [],
    });
  });

  it("creates a session without a body", async () => {
    const res = await request(app).post("/sessions");
    expect(res.status).toBe(201);
    expect(res.body.model).toBeUndefined();
  });

  it("rejects a non-string or disallowed model", async () => {
    expect((await request(app).post("/sessions").send({ model: 42 })).status).toBe(400);
    expect((await request(app).post("/sessions").send({ model: "nope" })).status).toBe(400);
  });

  it("lists sessions", async () => {
    expect((await request(app).get("/sessions")).body).toEqual({ sessions: [] });

    const { body: created } = await request(app).post("/sessions");
    const res = await request(app).get("/sessions");

    expect(res.status).toBe(200);
    expect(res.body.sessions.map((s: { id: string }) => s.id)).toEqual([created.id]);
  });

  it("returns a session's metadata, or 404 if unknown", async () => {
    const { body: created } = await request(app).post("/sessions");

    const found = await request(app).get(`/sessions/${created.id}`);
    expect(found.status).toBe(200);
    expect(found.body).toEqual(created);

    expect((await request(app).get("/sessions/unknown")).status).toBe(404);
  });

  it("forgets a session, then 404s", async () => {
    const { body: created } = await request(app).post("/sessions");

    expect((await request(app).delete(`/sessions/${created.id}`)).status).toBe(204);
    expect((await request(app).get(`/sessions/${created.id}`)).status).toBe(404);
    expect((await request(app).delete(`/sessions/${created.id}`)).status).toBe(404);
  });

  it("passes the session id and its default model to the agent", async () => {
    runAgentMock.mockResolvedValue({ answer: "ok", rounds: 1, duration: 1 });
    const { body: created } = await request(app).post("/sessions").send({ model: "claude-sonnet-5" });

    await request(app).post("/query").send({ prompt: "hi", sessionId: created.id });
    await request(app).post("/query").send({ prompt: "hi", sessionId: created.id, model: "claude-haiku-4-5-20251001" });

    expect(runAgentMock).toHaveBeenNthCalledWith(1, "hi", "claude-sonnet-5", created.id);
    expect(runAgentMock).toHaveBeenNthCalledWith(2, "hi", "claude-haiku-4-5-20251001", created.id);
  });

  it("rejects an unknown or non-string sessionId on /query", async () => {
    expect((await request(app).post("/query").send({ prompt: "hi", sessionId: "unknown" })).status).toBe(404);
    expect((await request(app).post("/query").send({ prompt: "hi", sessionId: 1 })).status).toBe(400);
    expect(runAgentMock).not.toHaveBeenCalled();
  });
});
