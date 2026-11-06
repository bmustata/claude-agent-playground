import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.SESSIONS_DIR = mkdtempSync(join(tmpdir(), "sessions-test-"));
process.env.ASSETS_DIR = mkdtempSync(join(tmpdir(), "assets-test-"));

const queryMock = vi.fn();

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: (args: unknown) => queryMock(args),
}));

const { runMiniAgentSesImages } = await import("../agent/mini-agent-ses-images.ts");
const { createAsset } = await import("../assets.ts");
const { clearSessions, createSession, getSession } = await import("../sessions.ts");

const success = { type: "result", subtype: "success", result: "a cat", num_turns: 1 };
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("rest")]);

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockImplementation(async function* () {
    yield success;
  });
  clearSessions();
});

describe("runMiniAgentSesImages", () => {
  it("sends the images as base64 blocks ahead of the prompt text", async () => {
    const asset = createAsset(PNG, "image/png");

    const result = await runMiniAgentSesImages("what is this?", undefined, undefined, [asset.id]);

    expect(result.answer).toBe("a cat");
    const sent = [];
    for await (const m of queryMock.mock.calls[0][0].prompt) sent.push(m);
    expect(sent[0].message.content).toEqual([
      { type: "image", source: { type: "base64", media_type: "image/png", data: PNG.toString("base64") } },
      { type: "text", text: "what is this?" },
    ]);
  });

  it("records the prompt on the session", async () => {
    const asset = createAsset(PNG, "image/png");
    const { id } = createSession();

    await runMiniAgentSesImages("describe", undefined, id, [asset.id]);

    expect(getSession(id)?.queryCount).toBe(1);
    expect(queryMock.mock.calls[0][0].options).toEqual({ model: undefined, sessionId: id });
  });

  it("throws for an unknown asset without calling the SDK", async () => {
    await expect(runMiniAgentSesImages("hi", undefined, undefined, ["00000000-0000-4000-8000-000000000000"])).rejects.toThrow("Asset not found");
    expect(queryMock).not.toHaveBeenCalled();
  });
});
