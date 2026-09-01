import prisma from "../../loaders/prisma.js";
import { getProviderForConfig } from "../../providers/index.js";
import { runInBackground } from "../utils/runInBackground.js";

/**
 * Create an external parcel (Ameex, etc.) and store the tracking number.
 * Skips if this BL already has a tracking number (dedup for retries).
 */
export const createColisJob = async ({
  advancedBLId,
  providerConfigId,
  payload,
}) => {
  const existing = await prisma.bonLivraison.findUnique({
    where: { id: advancedBLId },
    select: { colisTrackingNumber: true, colisSync: true },
  });

  if (existing?.colisTrackingNumber) {
    console.log(
      `[ColisSync] skipped advancedBLId ${advancedBLId} — already has tracking ${existing.colisTrackingNumber}`,
    );
    return;
  }

  const provider = await getProviderForConfig(providerConfigId);
  const result = await provider.createColis(payload);

  await prisma.bonLivraison.update({
    where: { id: advancedBLId },
    data: {
      colisTrackingNumber: result.parcelCode,
      colisSync: "CREATED",
    },
  });

  console.log(
    `[ColisSync] SUCCESS — advancedBLId: ${advancedBLId}, parcelCode: ${result.parcelCode}`,
  );
};

/**
 * Schedule colis creation after the HTTP/DB work finishes.
 * Runs in the same Node process as the API (no separate worker).
 */
export const enqueueCreateColis = (
  advancedBLId,
  _providerCode,
  providerConfigId,
  payload,
) => {
  runInBackground(
    () => createColisJob({ advancedBLId, providerConfigId, payload }),
    {
      attempts: 5,
      delayMs: 30_000,
      label: `ColisSync:${advancedBLId}`,
      onFinalFailure: async () => {
        await prisma.bonLivraison.update({
          where: { id: advancedBLId },
          data: { colisSync: "FAILED" },
        });
        console.error(
          `[ColisSync] CRITICAL — marked FAILED for advancedBLId: ${advancedBLId}`,
        );
      },
    },
  );
};
