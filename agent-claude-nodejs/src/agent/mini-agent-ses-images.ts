import "dotenv/config";
import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { getAsset } from "../assets.ts";
import { logger } from "../logger.ts";
import { getSession, markSessionUsed } from "../sessions.ts";
import type { RunAgentResult } from "./mini-agent.ts";

// Same as runMiniAgentSession, but the prompt can come with images: `assetIds` are ids of images
// uploaded via assets.ts, sent to the model ahead of the prompt text. Throws if the session or
// any asset doesn't exist. The session records the prompt text only, not the image bytes.
export async function runMiniAgentSesImages(
  prompt: string,
  model?: string,
  sessionId?: string,
  assetIds: string[] = [],
): Promise<RunAgentResult> {
  const session = sessionId ? getSession(sessionId) : undefined;
  if (sessionId && !session) throw new Error(`Session not found: ${sessionId}`);

  const images = assetIds.map((id) => {
    const asset = getAsset(id);
    if (!asset) throw new Error(`Asset not found: ${id}`);
    return {
      type: "image" as const,
      source: { type: "base64" as const, media_type: asset.mediaType, data: asset.data.toString("base64") },
    };
  });

  logger.info({ prompt, assetIds, model, sessionId }, "runMiniAgentSesImages started");
  const startTime = performance.now();

  // Image blocks can't go in a plain string prompt, so the SDK gets the message as a one-item stream.
  async function* userMessage(): AsyncGenerator<SDKUserMessage> {
    yield {
      type: "user",
      message: { role: "user", content: [...images, { type: "text", text: prompt }] },
      parent_tool_use_id: null,
    };
  }

  for await (const message of query({
    prompt: userMessage(),
    options: {
      model,
      ...(session ? (session.queryCount > 0 ? { resume: session.id } : { sessionId: session.id }) : {}),
    },
  })) {
    if (message.type === "result" && message.subtype !== "success") {
      logger.error({ message }, "runMiniAgentSesImages failed");
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
        { sessionId, images: images.length, answerLength: result.answer.length, rounds: result.rounds, duration: result.duration },
        "runMiniAgentSesImages finished",
      );
      return result;
    }
  }

  throw new Error("Agent run ended without producing a result");
}
