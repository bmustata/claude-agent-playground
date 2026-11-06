import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { logger } from "../logger.ts";
import { getSession, markSessionUsed } from "../sessions.ts";
import type { RunAgentResult } from "./mini-agent.ts";

// Shape of the JSON the agent must reply with.
const OUTPUT_SCHEMA = z.object({
  answer: z.string(), // direct answer to the prompt, e.g. "Paris is the capital of France."
  key_points: z.array(z.string()), // short supporting facts, e.g. ["Located on the Seine"]
});

export type StructuredOutput = z.infer<typeof OUTPUT_SCHEMA>;

// `answer` is `data` as a JSON string, so clients that only read `answer` (like the UI) get the output.
export type RunStructuredResult = RunAgentResult & {
  data: StructuredOutput; // agent's reply parsed and validated against OUTPUT_SCHEMA
};

// Same as runMiniAgentSession, but the reply is JSON matching OUTPUT_SCHEMA instead of free text.
// The SDK enforces the JSON schema and the result is validated with zod again, so `data` is typed.
// When a sessionId is given it runs inside that session and the JSON is recorded as the answer.
// Throws if the session doesn't exist or the output doesn't match the schema.
export async function runMiniAgentStructured(
  prompt: string,
  model?: string,
  sessionId?: string,
): Promise<RunStructuredResult> {
  const session = sessionId ? getSession(sessionId) : undefined;
  if (sessionId && !session) throw new Error(`Session not found: ${sessionId}`);

  // The CLI doesn't know the draft zod declares in "$schema", so leave it out.
  const { $schema: _draft, ...jsonSchema } = z.toJSONSchema(OUTPUT_SCHEMA);

  logger.info({ prompt, model, sessionId }, "runMiniAgentStructured started");
  const startTime = performance.now();

  for await (const message of query({
    prompt,
    options: {
      model,
      outputFormat: { type: "json_schema", schema: jsonSchema },
      ...(session ? (session.queryCount > 0 ? { resume: session.id } : { sessionId: session.id }) : {}),
    },
  })) {
    if (message.type === "result" && message.subtype !== "success") {
      logger.error({ message }, "runMiniAgentStructured failed");
      throw new Error(`Agent run failed: ${message.subtype}`);
    }

    if (message.type === "result") {
      const parsed = OUTPUT_SCHEMA.safeParse(message.structured_output);
      if (!parsed.success) {
        logger.error({ output: message.structured_output, issues: parsed.error.issues }, "runMiniAgentStructured invalid output");
        throw new Error(`Agent output does not match the schema: ${parsed.error.message}`);
      }

      const result: RunStructuredResult = {
        answer: JSON.stringify(parsed.data),
        data: parsed.data,
        rounds: message.num_turns,
        duration: Math.round(performance.now() - startTime),
      };

      if (session) markSessionUsed(session.id, prompt, result.answer);

      logger.info({ sessionId, rounds: result.rounds, duration: result.duration }, "runMiniAgentStructured finished");
      return result;
    }
  }

  throw new Error("Agent run ended without producing a result");
}
