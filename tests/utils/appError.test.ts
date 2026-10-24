import { AppError } from "@utils/AppError.util";

describe("AppError", () => {
  it("marks 4xx errors as 'fail' and 5xx errors as 'error'", () => {
    expect(new AppError("x", 404).status).toBe("fail");
    expect(new AppError("x", 503).status).toBe("error");
  });

  describe("from()", () => {
    it("returns AppError instances unchanged", () => {
      const original = new AppError("error.custom", 418);
      expect(AppError.from(original)).toBe(original);
    });

    it.each([
      ["P2002", { target: ["email"] }, 409, "error.db.duplicate"],
      ["P2025", undefined, 404, "error.db.not_found"],
      ["P2003", { field_name: "supplierId" }, 400, "error.db.invalid_reference"],
      ["P2011", { constraint: "name" }, 400, "error.db.missing_field"],
      ["P2000", { column_name: "notes" }, 400, "error.db.value_too_long"],
    ])(
      "maps Prisma error %s to HTTP %i",
      (code, meta, statusCode, messageKey) => {
        const err = AppError.from({ code, meta, message: "" });
        expect(err).toMatchObject({ statusCode, messageKey, isOperational: true });
      }
    );

    it("includes the offending fields for unique constraint violations", () => {
      const err = AppError.from({ code: "P2002", meta: { target: ["email", "username"] } });
      expect(err.meta).toEqual({ fields: "email, username" });
    });

    it.each([
      ["JsonWebTokenError", "error.auth.invalid_token"],
      ["TokenExpiredError", "error.auth.token_expired"],
    ])("maps %s to 401", (name, messageKey) => {
      expect(AppError.from({ name, message: "" })).toMatchObject({
        statusCode: 401,
        messageKey,
      });
    });

    it("maps an oversized request body to 413", () => {
      expect(AppError.from({ type: "entity.too.large", message: "" }).statusCode).toBe(413);
    });
  });
});
