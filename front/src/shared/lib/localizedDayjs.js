import dayjs from "dayjs";
import "dayjs/locale/fr";
import "dayjs/locale/en";
import "dayjs/locale/ar";

export const mapDayjsLocale = (lng) => {
  const code = String(lng || "fr").split("-")[0].toLowerCase();
  if (code === "ar" || code === "fr" || code === "en") return code;
  return "fr";
};

export const applyDayjsLocale = (lng) => {
  dayjs.locale(mapDayjsLocale(lng));
};

export const formatWithLocale = (value, template, lng) => {
  const d = dayjs.isDayjs(value) ? value : dayjs(value);
  if (!d.isValid()) return "";
  return d.locale(mapDayjsLocale(lng)).format(template);
};
