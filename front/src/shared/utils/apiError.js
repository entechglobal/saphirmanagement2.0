export const getApiError = (err, fallback = "") => {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors[0]?.msg || fallback;
  }
  return fallback;
};
