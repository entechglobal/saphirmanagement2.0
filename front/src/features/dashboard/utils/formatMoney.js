export const formatMAD = (val, digits = 0) =>
  Number(val ?? 0).toLocaleString("fr-MA", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const compactMAD = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return formatMAD(n);
};
