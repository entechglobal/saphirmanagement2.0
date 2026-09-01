import { z } from "zod";

export const nameSchema = z.string().min(4, "Le nom est obligatoire et doit contenir au moins 4 caractères");

export const phoneSchema = z
  .string()
  .min(1, "Le téléphone est obligatoire")
  .transform((v) => v.replace(/[^\d+]/g, ""))
  .transform((v) => (v.startsWith("0") ? `+212${v.slice(1)}` : v))
  .refine((v) => /^\+212[567]\d{8}$/.test(v), {
    message: "Format invalide. Ex: 0612345678",
  });

export const emailSchema = z
  .string()
  .trim()
  .email("Email invalide")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" ? undefined : v));

export const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

export const optionalNumber = z.preprocess(
  (v) =>
    v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
      ? undefined
      : v,
  z.coerce.number().optional(),
);

export const userpasswordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères");
