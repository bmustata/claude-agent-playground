import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import request from "supertest";

process.env.ASSETS_DIR = mkdtempSync(join(tmpdir(), "assets-test-"));
process.env.SESSIONS_DIR = mkdtempSync(join(tmpdir(), "sessions-test-"));

const { app } = await import("../app.ts");

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("rest")]);
const MISSING = "00000000-0000-4000-8000-000000000000";

describe("assets", () => {
  it("uploads, lists, gets and deletes an image", async () => {
    const created = await request(app).post("/assets").set("Content-Type", "image/png").send(PNG);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ mediaType: "image/png", size: PNG.length });
    const { id } = created.body;

    const list = await request(app).get("/assets");
    expect(list.body.assets.map((a: { id: string }) => a.id)).toContain(id);

    const got = await request(app).get(`/assets/${id}`).buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(got.status).toBe(200);
    expect(got.headers["content-type"]).toContain("image/png");
    expect(got.body.equals(PNG)).toBe(true);

    expect((await request(app).delete(`/assets/${id}`)).status).toBe(204);
    expect((await request(app).get(`/assets/${id}`)).status).toBe(404);
    expect((await request(app).delete(`/assets/${id}`)).status).toBe(404);
  });

  it("rejects bytes that are not a supported image", async () => {
    const res = await request(app).post("/assets").set("Content-Type", "image/png").send(Buffer.from("not an image"));
    expect(res.status).toBe(415);
  });

  it("rejects an empty or non-image upload", async () => {
    const res = await request(app).post("/assets").set("Content-Type", "text/plain").send("hello");
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown or malformed ids", async () => {
    expect((await request(app).get(`/assets/${MISSING}`)).status).toBe(404);
    expect((await request(app).get("/assets/..%2Fsecret")).status).toBe(404);
  });
});
