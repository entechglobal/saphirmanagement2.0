export const CLIENT_RULES = {
  phoneRegex: /^(\+212|0)?[5-7]\d{8}$/,
  iceRegex: /^\d{15}$/,
  limits: {
    nameMin: 2,
    nameMax: 255,
    addressMax: 1000,
    regionMax: 100,
    codeMax: 20, // for RC, IF, TP
    creditMax: 1000000,
  },
  types: ["PARTICULIER", "SOCIETE"],
};
