import { useState, useEffect, useRef } from "react";
import { SelectDropDown } from "./SelectDropDown";

export const PRICE_FIELD_OPTIONS = [
  { value: "prixVente1", label: "Prix Vente 1" },
  { value: "prixVente2", label: "Prix Vente 2" },
  { value: "prixVente3", label: "Prix Vente 3" },
];

const PRICE_STORAGE_KEY = "activePriceFields";
const ALL_VALUES = PRICE_FIELD_OPTIONS.map((o) => o.value);

export const getActivePriceFields = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(PRICE_STORAGE_KEY));
    if (Array.isArray(stored) && stored.length > 0) return stored;
  } catch {}
  return ALL_VALUES;
};

export const setActivePriceFields = (arr) => {
  localStorage.setItem(PRICE_STORAGE_KEY, JSON.stringify(arr));
  window.dispatchEvent(new CustomEvent("priceFieldSettingsChanged"));
};

// Reactive hook — updates instantly when settings change (same tab or cross-tab)
export const useActivePriceOptions = () => {
  const [active, setActive] = useState(getActivePriceFields);
  useEffect(() => {
    const sync = () => setActive(getActivePriceFields());
    window.addEventListener("priceFieldSettingsChanged", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("priceFieldSettingsChanged", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return PRICE_FIELD_OPTIONS.filter((o) => active.includes(o.value));
};

const resolveActiveValue = (preferred) => {
  const active = getActivePriceFields();
  return active.includes(preferred) ? preferred : active[0];
};

export const usePriceField = (isOpen, initialValue = "prixVente1") => {
  const [priceField, setPriceField] = useState(() => resolveActiveValue(initialValue));
  const initialRef = useRef(initialValue);
  initialRef.current = initialValue;

  useEffect(() => {
    if (isOpen) setPriceField(resolveActiveValue(initialRef.current));
  }, [isOpen]);

  return [priceField, setPriceField];
};

export const PriceFieldDropDown = ({
  value,
  onChange,
  label = "",
  placeholder = "Grille de prix",
}) => {
  const options = useActivePriceOptions();
  return (
    <SelectDropDown
      label={label}
      placeholder={placeholder}
      value={value}
      options={options}
      onChange={onChange}
    />
  );
};
