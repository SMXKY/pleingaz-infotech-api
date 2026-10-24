import request from "supertest";
import { AddressInfo } from "net";
import * as jwt from "jsonwebtoken";
import { createPrismaMock } from "./helpers/prismaMock";

const mockPrisma = createPrismaMock();

jest.mock("@models/index.model", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("src", () => ({ prisma: mockPrisma }));

import { app } from "src/app";

describe("HTTP app", () => {
  beforeAll(() => {
    // The error controller and 404 handler log every rejected request.
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  it("responds on the health route", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
  });

  // Uses fetch: supertest's client stalls on the `Content-Disposition: attachment` header.
  it("serves the OpenAPI spec", async () => {
    const server = app.listen(0);
    try {
      const { port } = server.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${port}/docs.json`);
      expect(res.status).toBe(200);
      expect((await res.json()).openapi).toMatch(/^3\./);
    } finally {
      server.close();
    }
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ ok: false, status: "fail" });
  });

  describe("protected routes", () => {
    it("reject requests without a token", async () => {
      const res = await request(app).get("/api/v1/suppliers");
      expect(res.status).toBe(401);
    });

    it("reject tokens signed with the wrong secret", async () => {
      const token = jwt.sign({ id: "user-1" }, "not-the-secret");
      const res = await request(app)
        .get("/api/v1/suppliers")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it("reject expired tokens", async () => {
      const token = jwt.sign({ id: "user-1" }, process.env.JWT_SECRET!, { expiresIn: -10 });
      const res = await request(app)
        .get("/api/v1/suppliers")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });
});
