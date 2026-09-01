import { z } from "zod";
import { nameSchema, phoneSchema, emailSchema } from "./fields";

export const personLikeSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  
});
