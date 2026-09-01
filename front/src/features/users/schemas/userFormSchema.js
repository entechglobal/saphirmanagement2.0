import { z } from "zod";

// ── Schema factories — accept `t` so all messages are translated ──────────────

const makeFields = (t) => ({
  name: z
    .string()
    .min(2, t("validation.name_min"))
    .max(80, t("validation.name_max")),

  email: z.string().email(t("validation.email_invalid")),

  roleId: z
    .union([z.number(), z.string()])
    .transform(Number)
    .refine((val) => [1, 2, 3, 4, 5, 6, 7].includes(val), {
      message: t("validation.role_invalid"),
    }),

  societeId: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .optional()
    .nullable(),

  active: z.boolean().default(true),

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

  password: z.string().min(1, t("validation.password_required")),
});

const withSuperAdminSocieteCheck = (schema, t) =>
  schema.superRefine((data, ctx) => {
    if (Number(data.roleId) !== 1 && !data.societeId) {
      ctx.addIssue({
        path: ["societeId"],
        code: z.ZodIssueCode.custom,
        message: t("validation.societe_required"),
      });
    }
  });

// ── Create schemas ────────────────────────────────────────────────────────────
export const createUserSchemas = (t) => {
  const fields = makeFields(t);
  const { password, ...baseFields } = fields;

  const createBase = z.object({ ...baseFields, password: fields.password });
  const editBase = z.object(baseFields);

  return {
    createUserSchema: withSuperAdminSocieteCheck(createBase, t),
    createUserSchemaNonSuper: createBase,
    editUserSchema: withSuperAdminSocieteCheck(editBase, t),
    editUserSchemaNonSuper: editBase,

    adminChangePasswordSchema: z
      .object({
        newPassword: fields.password,
        confirmPassword: z.string(),
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        path: ["confirmPassword"],
        message: t("validation.passwords_mismatch"),
      }),

    selfChangePasswordSchema: z
      .object({
        currentPassword: z.string().min(1, t("validation.current_password_required")),
        newPassword: fields.password,
        confirmPassword: z.string(),
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        path: ["confirmPassword"],
        message: t("validation.passwords_mismatch"),
      }),
  };
};
