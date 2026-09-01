/**
 * Ameex delivery provider — Add Parcel endpoint.
 *
 * Credentials are injected via buildAmeexProvider(apiId, apiKey)
 * so each société/business entity can use its own Ameex account.
 *
 * Body format: multipart/form-data (required by Ameex, not JSON).
 */

const AMEEX_API_URL = process.env.AMEEX_API_URL ?? "https://api.ameex.app";
const ADD_PARCEL_PATH = "/customer/Delivery/Parcels/Action/Type/Add";

/**
 * Factory — returns a provider instance bound to the given credentials.
 *
 * @param {string} apiId   – Ameex business/account ID
 * @param {string} apiKey  – Ameex secret key
 */
export const buildAmeexProvider = (apiId, apiKey) => ({
  createColis: async (payload) => {
    if (!apiId || !apiKey) {
      throw new Error("Ameex: apiId and apiKey are required");
    }

    const form = new FormData();
    form.append("type", "SIMPLE");
    form.append("business", apiId);
    form.append("receiver", String(payload.receiver ?? ""));
    form.append("phone", String(payload.phone ?? ""));
    form.append("city", String(payload.city ?? ""));
    form.append("address", String(payload.address ?? ""));
    form.append("cod", String(payload.cod ?? 0));
    form.append("open", "NO");
    form.append("fragile", "0");

    if (payload.order_num != null) form.append("order_num", String(payload.order_num));
    if (payload.comment != null)  form.append("comment",   String(payload.comment));
    if (payload.product != null)  form.append("product",   String(payload.product));

    const response = await fetch(`${AMEEX_API_URL}${ADD_PARCEL_PATH}`, {
      method: "POST",
      headers: { "C-Api-Id": apiId, "C-Api-Key": apiKey },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "(no body)");
      throw new Error(`Ameex API error ${response.status}: ${body}`);
    }

    const data = await response.json();

    if (data?.api?.type !== "success") {
      throw new Error(`Ameex API returned non-success: ${JSON.stringify(data)}`);
    }

    const parcelCode = data?.api?.data?.code;
    if (!parcelCode) {
      throw new Error(`Ameex response missing parcel code: ${JSON.stringify(data)}`);
    }

    return { parcelCode: String(parcelCode) };
  },
});

export default { buildAmeexProvider };
