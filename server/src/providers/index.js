/**
 * Delivery provider registry.
 *
 * Maps the lowercase livreur name (as stored in Delivery.name) to its
 * provider code. Add a new carrier here and implement its module —
 * no other file needs to change.
 *
 * provider code → must match the case used in getProvider() and ColisSync.
 */
export const PROVIDER_BY_NAME = {
  ameex: "AMEEX",
  amana: "AMANA",
  // nextcarrier: "NEXTCARRIER",
};

/**
 * Returns a provider instance built with credentials resolved from DB.
 * This is the production path — credentials are per-providerConfigId.
 */
export const getProviderForConfig = async (providerConfigId) => {
  const { resolveCredentials } =
    await import("../api/services/deliveryProviderConfigService.js");
  const { provider, apiId, apiKey } =
    await resolveCredentials(providerConfigId);

  return _buildProvider(provider, apiId, apiKey);
};

/**
 * Fallback factory that reads credentials from environment variables.
 * Used in development or when no providerConfigId is available.
 */
export const getProvider = async (providerCode) => {
  return _buildProvider(
    providerCode,
    process.env.AMEEX_API_ID,
    process.env.AMEEX_API_KEY,
  );
};

const _buildProvider = async (providerCode, apiId, apiKey) => {
  switch (providerCode.toUpperCase()) {
    case "AMEEX": {
      const { buildAmeexProvider } = await import("./ameex.js");
      return buildAmeexProvider(apiId, apiKey);
    }
    case "AMANA":
      throw new Error("AMANA provider not yet implemented");
    default:
      throw new Error(`Unknown delivery provider: ${providerCode}`);
  }
};
