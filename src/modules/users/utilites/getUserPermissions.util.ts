import prisma from "@models/index.model";

const permissionCache = new Map<
  string,
  { permissions: string[]; expiresAt: number }
>();
const CACHE_TTL = 5 * 60 * 1000;

const getUserPermissions = async (
  userId: string,
  skipCache = false
): Promise<string[]> => {
  if (!skipCache) {
    const cached = permissionCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roleId: true },
  });

  if (!user) {
    return [];
  }

  const [
    allPermissions,
    rolePermissions,
    roleOverrides,
    permissionOverrides,
    implications,
  ] = await Promise.all([
    prisma.permission.findMany({
      where: { deletedAt: null },
      select: { code: true },
    }),
    prisma.rolePermission.findMany({
      where: { roleId: user.roleId },
      include: { permission: { select: { code: true } } },
    }),
    prisma.roleOverride.findMany({
      where: {
        userId,
        isGranted: true,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: { select: { code: true } } },
            },
          },
        },
      },
    }),
    prisma.permissionOverride.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { permission: { select: { code: true } } },
    }),
    prisma.permissionImplies.findMany({
      include: {
        permission: { select: { code: true } },
        impliedPermission: { select: { code: true } },
      },
    }),
  ]);

  const allPermissionCodes = allPermissions.map((p) => p.code);

  const implicationMap = new Map<string, string[]>();
  for (const impl of implications) {
    const existing = implicationMap.get(impl.permission.code) || [];
    existing.push(impl.impliedPermission.code);
    implicationMap.set(impl.permission.code, existing);
  }

  const granted = new Set<string>();
  const revoked = new Set<string>();

  for (const rp of rolePermissions) {
    granted.add(rp.permission.code);
  }

  for (const override of roleOverrides) {
    for (const rp of override.role.rolePermissions) {
      granted.add(rp.permission.code);
    }
  }

  for (const override of permissionOverrides) {
    if (override.isGranted) {
      granted.add(override.permission.code);
    } else {
      revoked.add(override.permission.code);
    }
  }

  const expandWildcard = (code: string): string[] => {
    if (code === "*") {
      return allPermissionCodes;
    }
    if (code.endsWith(".*") || code.endsWith("*")) {
      const prefix = code.replace(/\*$/, "");
      return allPermissionCodes.filter((p) => p.startsWith(prefix));
    }
    return [code];
  };

  const expandImplications = (code: string, visited: Set<string>): string[] => {
    if (visited.has(code)) return [];
    visited.add(code);

    const result: string[] = [code];
    const implied = implicationMap.get(code) || [];

    for (const imp of implied) {
      result.push(...expandImplications(imp, visited));
    }

    return result;
  };

  const finalPermissions = new Set<string>();

  for (const code of granted) {
    const expanded = expandWildcard(code);
    for (const exp of expanded) {
      const withImplications = expandImplications(exp, new Set());
      for (const perm of withImplications) {
        finalPermissions.add(perm);
      }
    }
  }

  for (const code of revoked) {
    const expanded = expandWildcard(code);
    for (const exp of expanded) {
      finalPermissions.delete(exp);
    }
  }

  const permissions = Array.from(finalPermissions).sort();

  permissionCache.set(userId, {
    permissions,
    expiresAt: Date.now() + CACHE_TTL,
  });

  return permissions;
};

export const clearPermissionCache = (userId?: string) => {
  if (userId) {
    permissionCache.delete(userId);
  } else {
    permissionCache.clear();
  }
};

export default getUserPermissions;
