import { z } from "zod";
import { optionalString, optionalNumber } from "../../../shared/schemas/fields";
export const SocieteSchema = z.object({
  raisonSocial: z.string().min(3, "Raison sociale obligatoire"),

  // 1. Logo is optional: only validate if it exists
  logo: z.any().optional().nullable(),

  address: optionalString,
  tel: z.string().optional().or(z.literal("")),

  // 2. Fixed Phone logic to handle already-formatted numbers
  phone: z.string().min(1, "Téléphone obligatoire"),

  email: optionalString,
  siteWeb: optionalString,

  // 3. ICE: Only validate if there is actually a value
  ice: optionalString.refine((val) => !val || /^\d{15}$/.test(val), {
    message: "L'ICE doit contenir 15 chiffres",
  }),
  if: optionalString,
  rc: optionalString,
  tp: optionalString,

  // 4. fixedStructure: Allow it to be optional/null
  fixedStructure: z.any().optional().nullable(),
});
