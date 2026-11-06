import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { logger } from "../logger.ts";
import { getSession, markSessionUsed } from "../sessions.ts";
import type { RunAgentResult } from "./mini-agent.ts";

// Same as runMiniAgent, but inside a session created via sessions.ts, so the agent keeps the
// conversation context. The first run creates the session in the SDK under `sessionId` and later
// runs resume it. A successful run is recorded on the session (name, queries, saved to disk).
// Without a sessionId it runs standalone, like runMiniAgent. Throws if the session doesn't exist.
export async function runMiniAgentSession(prompt: string, model?: string, sessionId?: string): Promise<RunAgentResult> {
  const session = sessionId ? getSession(sessionId) : undefined;
  if (sessionId && !session) throw new Error(`Session not found: ${sessionId}`);

  logger.info({ prompt, model, sessionId }, "runMiniAgentSession started");
  const startTime = performance.now();

  for await (const message of query({
    prompt,
    options: {
      model,
      ...(session ? (session.queryCount > 0 ? { resume: session.id } : { sessionId: session.id }) : {}),
    },
  })) {
    if (message.type === "result" && message.subtype !== "success") {
      logger.error({ message }, "runMiniAgentSession failed");
      throw new Error(`Agent run failed: ${message.subtype}`);
    }

    if (message.type === "result") {
      const result: RunAgentResult = {
        answer: message.result,
        rounds: message.num_turns,
        duration: Math.round(performance.now() - startTime),
      };

      if (session) markSessionUsed(session.id, prompt, result.answer);

      logger.info(
        { sessionId, answerLength: result.answer.length, rounds: result.rounds, duration: result.duration },
        "runMiniAgentSession finished",
      );
      return result;
    }
  }

  throw new Error("Agent run ended without producing a result");
}
