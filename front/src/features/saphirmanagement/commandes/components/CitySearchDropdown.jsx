import React from "react";
import { useTranslation } from "react-i18next";
import { SelectUI } from "@/shared/ui";
import { useCities } from "../hooks/useCommands";
import staticCitiesData from "@/assets/cities.json";

export const CitySearchDropdown = React.forwardRef(
  (
    {
      value,
      onChange,
      label,
      placeholder,
      error,
      required = false,
      disabled = false,
      name = "ville",
    },
    ref,
  ) => {
    const { t } = useTranslation("commands");
    const { data: citiesData, isLoading, isError } = useCities();

    const cities = React.useMemo(() => {
      const source =
        isError || !citiesData?.cities ? staticCitiesData : citiesData;
      if (!source?.cities) return [];
      return Object.entries(source.cities).map(([key, city]) => ({
        id:
          city.ref !== null && city.ref !== undefined
            ? Number(city.ref)
            : Number(key),
        name: city.name,
        lat: city.lat,
        lng: city.lng,
        zone: city.zone,
        relaunch_zone: city.relaunch_zone,
        d_fees: city.d_fees,
        r_fees: city.r_fees,
      }));
    }, [citiesData, isError]);

    const options = React.useMemo(
      () => cities.map((city) => ({ value: city.id, label: city.name })),
      [cities],
    );

    const selectedId = React.useMemo(() => {
      if (value && typeof value === "object") return value.id;
      const match = cities.find((c) => c.name === value);
      return match ? match.id : value ?? "";
    }, [cities, value]);

    const isManualValue =
      Boolean(value) &&
      !cities.some((c) => {
        if (typeof value === "object") return c.id === value.id;
        return c.name === value;
      });

    const displayText =
      typeof value === "object" ? value?.name : value;

    return (
      <SelectUI
        ref={ref}
        name={name}
        label={label}
        value={selectedId}
        options={options}
        placeholder={placeholder || t("city_placeholder")}
        searchPlaceholder={t("city_search")}
        emptyMessage={t("city_not_found")}
        error={error}
        required={required}
        disabled={disabled}
        isLoading={isLoading}
        searchable
        creatable
        onChange={(e) => {
          const next = e.target.value;
          const city = cities.find((c) => String(c.id) === String(next));
          onChange({
            target: {
              name,
              value: city ? { id: city.id, name: city.name } : next,
            },
          });
        }}
        renderValue={() => (
          <span className="flex items-center gap-2 min-w-0">
            <span className="truncate">
              {displayText || placeholder || t("city_placeholder")}
            </span>
            {isManualValue && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 uppercase shrink-0">
                {t("city_manual_badge")}
              </span>
            )}
          </span>
        )}
      />
    );
  },
);

CitySearchDropdown.displayName = "CitySearchDropdown";
