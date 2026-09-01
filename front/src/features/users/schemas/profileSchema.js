import { z } from "zod";

// ── Profile info schema factory ──────────────────────────────────────────────
export const createProfileInfoSchema = (t) =>
  z.object({
    name: z
      .string()
      .min(2, t("validation.name_min"))
      .max(80, t("validation.name_max")),

    email: z.string().email(t("validation.email_invalid")),

    profile: z
      .instanceof(File)
      .optional()
      .nullable()
      .refine(
        (file) => !file || file.size <= 2 * 1024 * 1024,
        t("validation.image_too_large")
      )
      .refine(
        (file) =>
          !file || ["image/jpeg", "image/png", "image/webp"].includes(file.type),
        t("validation.image_invalid_type")
      ),
  });

// ── Change-password schema factory (requires current password for profile page) ──
export const createProfileChangePasswordSchema = (t) =>
  z
    .object({
      currentPassword: z.string().min(1, t("validation.current_password_required")),
      newPassword: z.string().min(1, t("validation.password_required")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      path: ["confirmPassword"],
      message: t("validation.passwords_mismatch"),
    });
