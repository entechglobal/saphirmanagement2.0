import { useSystemSettings } from "@/features/settings/systemSettings/hooks/useSystemSettings";

export const useOperatingHours = () => {
  const { data } = useSystemSettings();
  return {
    startHour: data?.settings?.systemStartHour ?? null,
    endHour: data?.settings?.systemEndHour ?? null,
  };
};
