import { z } from "zod";
import { optionalString, optionalNumber } from "../../../shared/schemas/fields";

export const DepotSchema = z.object({
  societeId: z.union([z.string(), z.number()]).optional(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Téléphone obligatoire"),

  code: optionalString,
  address: optionalString,
  city: optionalString,
  region: optionalString,

  email: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email("Invalid email").optional(),
  ),

  manager: optionalString,
  type: z.enum(["PRINCIPAL", "SECONDARY", "OUTLET"]).optional(),
  surface: optionalString,
  capacity: optionalString,
  active: z.boolean().optional(),
});
