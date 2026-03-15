import { subDays } from "date-fns";
import { STALE_TOKEN_DAYS } from "./constants";

import prisma from "@models/index.model";

export async function cleanupStaleDeviceTokens(): Promise<void> {
  const cutoff = subDays(new Date(), STALE_TOKEN_DAYS);

  const result = await prisma.deviceToken.updateMany({
    where: {
      isActive: true,
      lastUsedAt: { lt: cutoff },
    },
    data: {
      isActive: false,
    },
  });

  if (result.count > 0) {
    console.info(
      `[cleanup-tokens] Deactivated ${result.count} stale device token(s) (unused for ${STALE_TOKEN_DAYS}+ days)`
    );
  } else {
    console.debug("[cleanup-tokens] No stale device tokens found");
  }
}
