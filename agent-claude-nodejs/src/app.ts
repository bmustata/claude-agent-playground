import express, { type Request, type Response, type NextFunction } from "express";
import { getAllowedModels } from "./utils.ts";
import { healthHandler } from "./handlers/health.ts";
import { queryHandler } from "./handlers/query.ts";
import { createSessionHandler, deleteSessionHandler, getSessionHandler, listSessionsHandler } from "./handlers/sessions.ts";
import { createAssetHandler, deleteAssetHandler, getAssetHandler, listAssetsHandler } from "./handlers/assets.ts";
import { IMAGE_TYPES, MAX_ASSET_BYTES } from "./assets.ts";
import { logger } from "./logger.ts";

export type Param = { name: string; in: "body" | "query" | "param" | "header"; type: string; required: boolean; description: string };

export const routes = [
  {
    method: "GET",
    section: "Health",
    path: "/health",
    description: "Liveness check, returns service status.",
    params: [] as Param[],
  },
  {
    method: "POST",
    section: "Query",
    path: "/query",
    description: "Runs the agent against a prompt.",
    params: [
      { name: "prompt", in: "body", type: "string", required: true, description: "the question or instruction to send to the agent." },
      { name: "model", in: "body", type: "string", required: false, description: `overrides the default model used to run the agent. Allowed: ${getAllowedModels().join(", ") || "any"}.` },
      { name: "sessionId", in: "body", type: "string", required: false, description: "runs the prompt inside this session so the agent keeps the conversation context." },
      { name: "assets", in: "body", type: "string[]", required: false, description: "ids of uploaded images (see /assets) to send to the agent along with the prompt." },
    ] as Param[],
  },
  {
    method: "POST",
    section: "Sessions",
    path: "/sessions",
    description: "Creates a session.",
    params: [
      { name: "model", in: "body", type: "string", required: false, description: "default model for queries in this session." },
    ] as Param[],
  },
  {
    method: "GET",
    section: "Sessions",
    path: "/sessions",
    description: "Lists sessions.",
    params: [] as Param[],
  },
  {
    method: "GET",
    section: "Sessions",
    path: "/sessions/:id",
    description: "Returns a session's metadata.",
    params: [
      { name: "id", in: "param", type: "string", required: true, description: "the session id." },
    ] as Param[],
  },
  {
    method: "DELETE",
    section: "Sessions",
    path: "/sessions/:id",
    description: "Forgets a session.",
    params: [
      { name: "id", in: "param", type: "string", required: true, description: "the session id." },
    ] as Param[],
  },
  {
    method: "POST",
    section: "Assets",
    path: "/assets",
    description: "Uploads an image (jpeg, png, gif or webp, max 10 MB) and returns its id.",
    params: [
      { name: "Content-Type", in: "header", type: "string", required: true, description: "image/jpeg, image/png, image/gif or image/webp." },
      { name: "(body)", in: "body", type: "binary", required: true, description: "the raw image bytes." },
    ] as Param[],
  },
  {
    method: "GET",
    section: "Assets",
    path: "/assets",
    description: "Lists uploaded images.",
    params: [] as Param[],
  },
  {
    method: "GET",
    section: "Assets",
    path: "/assets/:id",
    description: "Returns the image itself.",
    params: [
      { name: "id", in: "param", type: "string", required: true, description: "the asset id." },
    ] as Param[],
  },
  {
    method: "DELETE",
    section: "Assets",
    path: "/assets/:id",
    description: "Deletes an image.",
    params: [
      { name: "id", in: "param", type: "string", required: true, description: "the asset id." },
    ] as Param[],
  },
];

export const app = express();
app.use(express.json());
app.use("/assets", express.raw({ type: Object.keys(IMAGE_TYPES), limit: MAX_ASSET_BYTES }));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.on("finish", () => {
    logger.info(`${req.method} ${req.path} -> ${res.statusCode}`);
  });
  next();
});

app.get("/health", healthHandler);
app.post("/query", queryHandler);
app.post("/sessions", createSessionHandler);
app.get("/sessions", listSessionsHandler);
app.get("/sessions/:id", getSessionHandler);
app.delete("/sessions/:id", deleteSessionHandler);
app.post("/assets", createAssetHandler);
app.get("/assets", listAssetsHandler);
app.get("/assets/:id", getAssetHandler);
app.delete("/assets/:id", deleteAssetHandler);

// Body-parser failures (e.g. an upload over the size limit) carry their own status.
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? 500;
  if (status >= 500) logger.error({ err }, "unhandled error");
  res.status(status).json({ error: status >= 500 ? "Internal server error" : err.message });
});
