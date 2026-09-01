import { useQuery } from "@tanstack/react-query";
import { planningLivraisonApi } from "../api/planningLivraison.api";

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const planningKeys = {
  all: ["planning-livraison"],
  filtered: (filters) => ["planning-livraison", filters],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const usePlanningLivraison = ({ startDate, endDate, livreurId } = {}) =>
  useQuery({
    queryKey: planningKeys.filtered({ startDate, endDate, livreurId }),
    queryFn: () =>
      planningLivraisonApi.getPlanning({ startDate, endDate, livreurId }),
    enabled: !!startDate && !!endDate,
  
  });
