import { useQuery } from "@/shared/lib/query";
import { planningLivraisonApi } from "../api/planningLivraison.api";

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const planningKeys = {
  all: ["planning-livraison"],
  filtered: (filters) => ["planning-livraison", filters],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const usePlanningLivraison = ({ startDate, endDate, livreurId, enabled = true } = {}) =>
  useQuery({
    queryKey: planningKeys.filtered({ startDate, endDate, livreurId }),
    queryFn: () =>
      planningLivraisonApi.getPlanning({ startDate, endDate, livreurId }),
    enabled: enabled && !!startDate && !!endDate,
  });
