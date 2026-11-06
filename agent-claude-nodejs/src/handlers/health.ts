import type { Request, Response } from "express";

export function healthHandler(_req: Request, res: Response) {
  res.json({ status: "Ok", service: "agent-claude-nodejs", timestamp: new Date().toISOString() });
}
