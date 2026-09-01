import { z } from "zod";
import { personLikeSchema } from "../../../shared/schemas/personLike";

import { optionalString, optionalNumber } from "../../../shared/schemas/fields";

const fiscalIce = optionalString.refine((val) => !val || /^\d{15}$/.test(val), {
  message: "L'ICE doit contenir 15 chiffres",
});

export const clientSchema = personLikeSchema
  .extend({
    type: z.enum(["PARTICULIER", "SOCIETE"]).default("PARTICULIER"),
    address: optionalString,
    region: optionalString,
    website: optionalString,
    ice: fiscalIce,
    if: optionalString,
    rc: optionalString,
    tp: optionalString,
    creditLimit: optionalNumber,
    paymentDeadline: optionalNumber,
    discount: optionalNumber,
    active: z.boolean().default(true),
    societeId: z.union([z.string(), z.number()]).optional(),
  })
  .transform((data) => {
    if (data.type !== "SOCIETE") {
      return { ...data, ice: undefined, if: undefined, rc: undefined, tp: undefined };
    }
    return data;
  });
