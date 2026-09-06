/** Moroccan phone helpers: local `0612345678` and international `+212612345678`. */

export const digitsOnly = (value) =>
  typeof value === "string" ? value.replace(/\D/g, "") : "";

export const getPhoneSearchVariants = (keyword) => {
  if (!keyword || typeof keyword !== "string") return [];
  const trimmed = keyword.trim();
  if (!trimmed) return [];

  const variants = new Set([trimmed]);
  const digits = digitsOnly(trimmed);
  if (digits.length < 2) return [...variants];

  variants.add(digits);

  if (digits.startsWith("0")) {
    variants.add(`+212${digits.slice(1)}`);
    variants.add(`212${digits.slice(1)}`);
  } else if (digits.startsWith("212")) {
    variants.add(`0${digits.slice(3)}`);
    variants.add(`+${digits}`);
  }

  return [...variants];
};
