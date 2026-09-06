export const setCssVariables = (theme, prefix = "") => {
  const root = document.documentElement;

  Object.entries(theme).forEach(([key, value]) => {
    const varName = prefix ? `${prefix}-${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      setCssVariables(value, varName);
      return;
    }

    root.style.setProperty(`--${varName}`, value);
  });
};
