import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: (args: unknown) => queryMock(args),
}));

const { runMiniAgent } = await import("../agent/mini-agent.ts");

const success = { type: "result", subtype: "success", result: "ok", num_turns: 1 };

function respondWith(...messages: object[]) {
  queryMock.mockImplementation(async function* () {
    yield* messages;
  });
}

beforeEach(() => {
  queryMock.mockReset();
});

describe("runMiniAgent", () => {
  it("returns the answer, rounds and duration", async () => {
    respondWith(success);

    const result = await runMiniAgent("hi");

    expect(result).toEqual({ answer: "ok", rounds: 1, duration: expect.any(Number) });
  });

  it("sends the prompt with the model override and no session options", async () => {
    respondWith(success);

    await runMiniAgent("hi", "claude-sonnet-5");

    expect(queryMock.mock.calls[0][0]).toEqual({ prompt: "hi", options: { model: "claude-sonnet-5" } });
  });

  it("throws when the run does not succeed", async () => {
    respondWith({ type: "result", subtype: "error_during_execution" });

    await expect(runMiniAgent("hi")).rejects.toThrow(/Agent run failed: error_during_execution/);
  });

  it("throws when the run ends without a result", async () => {
    respondWith({ type: "assistant" });

    await expect(runMiniAgent("hi")).rejects.toThrow(/without producing a result/);
  });
});
