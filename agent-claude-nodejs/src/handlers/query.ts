import type { Request, Response } from "express";
import { getAsset } from "../assets.ts";
import { getSession } from "../sessions.ts";
import { getAllowedModels, isModelAllowed } from "../utils.ts";
import { logger } from "../logger.ts";

// --- Agents Import Section ---
import { runAgent } from "../agent/agent.ts";
import { runMiniAgent } from "../agent/mini-agent.ts";
import { runMiniAgentSesImages } from "../agent/mini-agent-ses-images.ts";
import { runMiniAgentSession } from "../agent/mini-agent-session.ts";
import { runMiniAgentSubagents } from "../agent/mini-agent-subagents.ts";
import { runMiniAgentStructured } from "../agent/mini-agent-structured.ts";

export async function queryHandler(req: Request, res: Response) {
  const { prompt, model, sessionId, assets } = req.body ?? {};

  if (typeof prompt !== "string" || prompt.trim() === "") {
    res.status(400).json({ error: "'prompt' (non-empty string) is required in the request body" });
    return;
  }

  if (model !== undefined && typeof model !== "string") {
    res.status(400).json({ error: "'model' must be a string when provided" });
    return;
  }

  if (model !== undefined && !isModelAllowed(model)) {
    res.status(400).json({ error: `'model' must be one of: ${getAllowedModels().join(", ")}` });
    return;
  }

  if (sessionId !== undefined && typeof sessionId !== "string") {
    res.status(400).json({ error: "'sessionId' must be a string when provided" });
    return;
  }

  if (assets !== undefined && (!Array.isArray(assets) || assets.some((id) => typeof id !== "string"))) {
    res.status(400).json({ error: "'assets' must be a list of asset ids when provided" });
    return;
  }

  const missing = (assets ?? []).filter((id: string) => !getAsset(id));
  if (missing.length > 0) {
    logger.warn({ missing }, "query rejected: asset not found");
    res.status(404).json({ error: `Asset not found: ${missing.join(", ")}` });
    return;
  }

  const session = sessionId !== undefined ? getSession(sessionId) : undefined;
  if (sessionId !== undefined && !session) {
    logger.warn({ sessionId }, "query rejected: session not found");
    res.status(404).json({ error: "Session not found" });
    return;
  }

  try {
    const result = assets?.length
      ? await runMiniAgentSesImages(prompt, model ?? session?.model, session?.id, assets)
      : session
        ? await runMiniAgentSession(prompt, model ?? session.model, session.id)
        : await runMiniAgentSession(prompt, model);
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "agent execution failed");
    const details = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Agent execution failed", details });
  }
}
