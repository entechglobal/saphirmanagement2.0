export const fromText = (value) => {
  if (typeof value !== "string") return value;
  if (value.startsWith('="') && value.endsWith('"')) {
    return value.slice(2, -1);
  }
  return value;
};

export const asText = (value) =>
  value !== null && value !== undefined && value !== "" ? `="${value}"` : "";
