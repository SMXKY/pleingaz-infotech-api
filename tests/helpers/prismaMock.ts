/**
 * A stand-in for PrismaClient: any `prisma.<model>.<method>` is lazily created
 * as a jest.fn(), and `$transaction(fn)` runs `fn` with the mock itself as `tx`.
 */
export type PrismaMock = Record<string, any>;

export const createPrismaMock = (): PrismaMock => {
  const models: Record<string, Record<string, jest.Mock>> = {};

  const mock: PrismaMock = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "$transaction") {
          return jest.fn((fn: (tx: PrismaMock) => unknown) => fn(mock));
        }
        if (prop === "then") return undefined; // not a thenable
        models[prop] ??= new Proxy({} as Record<string, jest.Mock>, {
          get(methods, method: string) {
            methods[method] ??= jest.fn().mockResolvedValue(undefined);
            return methods[method];
          },
        });
        return models[prop];
      },
    }
  );

  return mock;
};
