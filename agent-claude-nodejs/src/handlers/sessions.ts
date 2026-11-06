import type { Request, Response } from "express";
import { createSession, deleteSession, getSession, listSessions } from "../sessions.ts";
import { getAllowedModels, isModelAllowed } from "../utils.ts";

export function createSessionHandler(req: Request, res: Response) {
  const { model } = req.body ?? {};

  if (model !== undefined && typeof model !== "string") {
    res.status(400).json({ error: "'model' must be a string when provided" });
    return;
  }

  if (model !== undefined && !isModelAllowed(model)) {
    res.status(400).json({ error: `'model' must be one of: ${getAllowedModels().join(", ")}` });
    return;
  }

  res.status(201).json(createSession(model));
}

export function listSessionsHandler(_req: Request, res: Response) {
  res.json({ sessions: listSessions() });
}

export function getSessionHandler(req: Request, res: Response) {
  const session = getSession(String(req.params.id));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
}

export function deleteSessionHandler(req: Request, res: Response) {
  if (!deleteSession(String(req.params.id))) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.status(204).end();
}
