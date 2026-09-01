import ApiError from "./apiError.js";

export const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US"); // formats as MM/DD/YYYY
};

export const parseCSVDate = (dateStr) => {
  if (!dateStr) return new Date();

  // Accepts: M/D/YYYY or MM/DD/YYYY
  const parts = dateStr.split("/");

  if (parts.length !== 3) {
    throw new ApiError(`Invalid date format: ${dateStr}`, 400);
  }

  let [month, day, year] = parts;

  // Normalize to 2 digits
  month = month.padStart(2, "0");
  day = day.padStart(2, "0");

  const isoDate = `${year}-${month}-${day}T00:00:00`;

  const date = new Date(isoDate);

  if (isNaN(date.getTime())) {
    throw new ApiError(`Invalid date value: ${dateStr}`, 400);
  }

  return date;
};
