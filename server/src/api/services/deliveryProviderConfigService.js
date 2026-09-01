import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import { encrypt, decrypt } from "../utils/crypto.js";

const scope = (user, societeId) => (user.isSuperAdmin ? {} : { societeId });

/* ── GET ALL ─────────────────────────────────────────────────────────────── */
export const getAll = async (query, user) => {
  const { provider, active } = query;
  const societeId = user.isSuperAdmin
    ? query.societeId
      ? parseInt(query.societeId)
      : undefined
    : user.societeId;

  const where = {
    ...(societeId !== undefined && { societeId }),
    ...(provider && { provider: provider.toUpperCase() }),
    ...(active !== undefined && {
      active: active === "true" || active === true,
    }),
  };

  const configs = await prisma.deliveryProviderConfig.findMany({
    where,
    select: {
      id: true,
      societeId: true,
      provider: true,
      name: true,
      active: true,
      metadata: true,
    },
    orderBy: [{ provider: "asc" }, { name: "asc" }],
  });

  // Never expose encrypted credentials in list responses
  return configs;
};

/* ── GET BY ID ───────────────────────────────────────────────────────────── */
export const getById = async (id, user) => {
  const config = await prisma.deliveryProviderConfig.findUnique({
    where: { id },
  });
  if (!config) throw new ApiError("Provider config not found", 404);
  if (!user.isSuperAdmin && config.societeId !== user.societeId)
    throw new ApiError("Access denied", 403);

  // Return without decrypted credentials — decryption is internal only
  const { apiId: _a, apiKey: _b, ...safe } = config;
  return safe;
};

/* ── CREATE ──────────────────────────────────────────────────────────────── */
export const create = async (data, user) => {
  const societeId = user.isSuperAdmin
    ? (data.societeId ?? user.societeId)
    : user.societeId;

  if (!societeId) throw new ApiError("societeId is required", 400);

  const { provider, name, apiId, apiKey, active = true, metadata } = data;

  const exist = await prisma.deliveryProviderConfig.findFirst({
    where: { societeId, provider },
  });
  if (exist) {
    throw new ApiError("provider already exist in this societe", 400);
  }

  if (!apiId?.trim() || !apiKey?.trim())
    throw new ApiError("apiId and apiKey are required", 400);

  const config = await prisma.deliveryProviderConfig.create({
    data: {
      societeId,
      provider: provider.toUpperCase(),
      name,
      apiId: encrypt(apiId.trim()),
      apiKey: encrypt(apiKey.trim()),
      active,
      metadata: metadata ?? undefined,
    },
    select: {
      id: true,
      societeId: true,
      provider: true,
      name: true,
      active: true,
    },
  });

  return config;
};

/* ── UPDATE ──────────────────────────────────────────────────────────────── */
export const update = async (id, data, user) => {
  const existing = await prisma.deliveryProviderConfig.findUnique({
    where: { id },
  });
  if (!existing) throw new ApiError("Provider config not found", 404);
  if (!user.isSuperAdmin && existing.societeId !== user.societeId)
    throw new ApiError("Access denied", 403);

  const { name, apiId, apiKey, active, metadata } = data;

  const updated = await prisma.deliveryProviderConfig.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(apiId?.trim() && { apiId: encrypt(apiId.trim()) }),
      ...(apiKey?.trim() && { apiKey: encrypt(apiKey.trim()) }),
      ...(active !== undefined && { active }),
      ...(metadata !== undefined && { metadata }),
    },
    select: {
      id: true,
      societeId: true,
      provider: true,
      name: true,
      active: true,
    },
  });

  return updated;
};

/* ── REMOVE ──────────────────────────────────────────────────────────────── */
export const remove = async (id, user) => {
  const existing = await prisma.deliveryProviderConfig.findUnique({
    where: { id },
    include: { _count: { select: { bonLivraisons: true } } },
  });
  if (!existing) throw new ApiError("Provider config not found", 404);
  if (!user.isSuperAdmin && existing.societeId !== user.societeId)
    throw new ApiError("Access denied", 403);
  if (existing._count.bonLivraisons > 0)
    throw new ApiError(
      "Cannot delete a config that is used by bon livraisons. Deactivate it instead.",
      400,
    );

  await prisma.deliveryProviderConfig.delete({ where: { id } });
  return { message: "Provider config deleted successfully" };
};

/* ── INTERNAL: resolve credentials by config id ─────────────────────────── */
export const resolveCredentials = async (providerConfigId) => {
  const config = await prisma.deliveryProviderConfig.findUnique({
    where: { id: providerConfigId },
  });
  if (!config || !config.active)
    throw new Error(
      `DeliveryProviderConfig ${providerConfigId} not found or inactive`,
    );

  return {
    provider: config.provider,
    apiId: decrypt(config.apiId),
    apiKey: decrypt(config.apiKey),
  };
};
