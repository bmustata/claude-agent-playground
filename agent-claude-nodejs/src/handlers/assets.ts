import type { Request, Response } from "express";
import { logger } from "../logger.ts";
import { createAsset, deleteAsset, detectImageType, getAsset, listAssets } from "../assets.ts";

export function createAssetHandler(req: Request, res: Response) {
  const data = req.body;
  if (!Buffer.isBuffer(data) || data.length === 0) {
    logger.warn({ contentType: req.headers["content-type"] }, "asset upload rejected: empty or non-image body");
    res.status(400).json({ error: "Send the image bytes as the request body with an image/* Content-Type (jpeg, png, gif or webp)" });
    return;
  }

  const mediaType = detectImageType(data);
  if (!mediaType) {
    logger.warn({ contentType: req.headers["content-type"], size: data.length }, "asset upload rejected: unsupported image");
    res.status(415).json({ error: "Unsupported image: must be jpeg, png, gif or webp" });
    return;
  }

  res.status(201).json(createAsset(data, mediaType));
}

export function listAssetsHandler(_req: Request, res: Response) {
  res.json({ assets: listAssets() });
}

// Returns the image itself; the metadata is in the list.
export function getAssetHandler(req: Request, res: Response) {
  const asset = getAsset(String(req.params.id));
  if (!asset) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  res.type(asset.mediaType).send(asset.data);
}

export function deleteAssetHandler(req: Request, res: Response) {
  if (!deleteAsset(String(req.params.id))) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  res.status(204).end();
}
