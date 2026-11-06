import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { logger } from "./logger.ts";

const DEFAULT_ASSETS_DIR = "data/assets";
const ASSET_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Image types Claude accepts, and the extension each is saved with.
export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
} as const;

export type ImageType = keyof typeof IMAGE_TYPES;

// Upload limit per image.
export const MAX_ASSET_BYTES = 10 * 1024 * 1024;

export type Asset = {
  id: string; // also the file name (without extension) inside the assets dir
  mediaType: ImageType; // e.g. "image/png"
  size: number; // bytes
  createdAt: string; // ISO timestamp
};

// Detects the image type from the file's leading bytes, so a wrong Content-Type header can't sneak
// a non-image in. Returns undefined when the bytes aren't a supported image.
export function detectImageType(buf: Buffer): ImageType | undefined {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 6 && ["GIF87a", "GIF89a"].includes(buf.subarray(0, 6).toString("latin1"))) return "image/gif";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return undefined;
}

export function createAsset(data: Buffer, mediaType: ImageType): Asset {
  const id = randomUUID();
  mkdirSync(assetsDir(), { recursive: true });
  writeFileSync(join(assetsDir(), `${id}.${IMAGE_TYPES[mediaType]}`), data);
  logger.info({ assetId: id, mediaType, size: data.length }, "asset created");
  return { id, mediaType, size: data.length, createdAt: new Date().toISOString() };
}

export function listAssets(): Asset[] {
  let files: string[];
  try {
    files = readdirSync(assetsDir());
  } catch {
    logger.info({ dir: assetsDir() }, "no assets to list");
    return [];
  }
  const assets = files
    .map((file) => findAsset(file.split(".")[0]))
    .filter((asset): asset is Asset => asset !== undefined)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  logger.info({ dir: assetsDir(), total: assets.length }, "assets listed");
  return assets;
}

export function getAsset(id: string): (Asset & { data: Buffer }) | undefined {
  const asset = findAsset(id);
  if (!asset) {
    logger.warn({ assetId: id }, "asset get failed: not found");
    return undefined;
  }
  logger.info({ assetId: id, mediaType: asset.mediaType, size: asset.size }, "asset read");
  return { ...asset, data: readFileSync(assetPath(asset)) };
}

// Returns false if the asset didn't exist.
export function deleteAsset(id: string): boolean {
  const asset = findAsset(id);
  if (!asset) {
    logger.warn({ assetId: id }, "asset delete failed: not found");
    return false;
  }
  rmSync(assetPath(asset), { force: true });
  logger.info({ assetId: id }, "asset deleted");
  return true;
}

// --- Helpers ---------------------------------------------------------------------------------

// Read lazily so tests can point it at a temp directory.
function assetsDir(): string {
  return process.env.ASSETS_DIR || DEFAULT_ASSETS_DIR;
}

function assetPath(asset: Asset): string {
  return join(assetsDir(), `${asset.id}.${IMAGE_TYPES[asset.mediaType]}`);
}

// The id is validated as a UUID before touching the disk, so it can't escape the assets dir.
function findAsset(id: string): Asset | undefined {
  if (!ASSET_ID_PATTERN.test(id)) return undefined;
  for (const [mediaType, ext] of Object.entries(IMAGE_TYPES) as [ImageType, string][]) {
    try {
      const stat = statSync(join(assetsDir(), `${id}.${ext}`));
      return { id, mediaType, size: stat.size, createdAt: stat.birthtime.toISOString() };
    } catch {
      // not this extension
    }
  }
  return undefined;
}
