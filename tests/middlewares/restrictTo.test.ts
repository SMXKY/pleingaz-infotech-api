import restrictTo from "@middlewares/restrictTo.middleware";

const run = (permissions: string[], user?: Record<string, unknown>) => {
  const next = jest.fn();
  const res = { locals: { user } } as any;
  restrictTo(...permissions)({} as any, res, next);
  return next.mock.calls[0][0];
};

const activeUser = (permissions: string[]) => ({ status: "ACTIVE", permissions });

describe("restrictTo", () => {
  it("rejects unauthenticated requests with 401", () => {
    expect(run(["suppliers.can_read"])).toMatchObject({
      statusCode: 401,
      messageKey: "error.auth.not_authenticated",
    });
  });

  it("rejects suspended users with 401", () => {
    const user = { status: "SUSPENDED", permissions: ["suppliers.can_read"] };
    expect(run(["suppliers.can_read"], user)).toMatchObject({
      messageKey: "error.user.account_suspended",
    });
  });

  it("rejects users without any of the required permissions with 403", () => {
    expect(run(["payments.can_record_payment"], activeUser(["suppliers.can_read"]))).toMatchObject({
      statusCode: 403,
    });
  });

  it("allows users holding at least one of the required permissions", () => {
    const user = activeUser(["payments.can_read_payments"]);
    expect(run(["payments.can_record_payment", "payments.can_read_payments"], user)).toBeUndefined();
  });
});
