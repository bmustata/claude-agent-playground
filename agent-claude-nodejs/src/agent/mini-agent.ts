import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { logger } from "../logger.ts";

export type RunAgentResult = {
  answer: string; // agent's final text reply to the prompt, e.g. "Paris is the capital of France."
  rounds: number; // agent turns, e.g. 2
  duration: number; // run time in ms, e.g. 1840
};

// Runs the Claude agent (optionally with a model override) against a single prompt and returns
// its answer. Each call is standalone: no conversation context is kept (see mini-agent-session.ts
// for that).
export async function runMiniAgent(prompt: string, model?: string): Promise<RunAgentResult> {
  logger.info({ prompt, model }, "runMiniAgent started");
  const startTime = performance.now();

  for await (const message of query({ prompt, options: { model } })) {
    if (message.type === "result" && message.subtype !== "success") {
      logger.error({ message }, "runMiniAgent failed");
      throw new Error(`Agent run failed: ${message.subtype}`);
    }

    if (message.type === "result") {
      const result: RunAgentResult = {
        answer: message.result,
        rounds: message.num_turns,
        duration: Math.round(performance.now() - startTime),
      };

      logger.info(
        { answerLength: result.answer.length, rounds: result.rounds, duration: result.duration },
        "runMiniAgent finished",
      );
      return result;
    }
  }

  throw new Error("Agent run ended without producing a result");
}
