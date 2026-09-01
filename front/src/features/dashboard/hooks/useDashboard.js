import { useQuery } from "@tanstack/react-query";
import {
  stockAPI,
  depotsAPI,
  societesAPI,
  clientsAPI,
  fournisseursAPI,
  articlesAPI,
  categoriesAPI,
  familiesAPI,
} from "../api/dashboard.api";

// ─── Stock ────────────────────────────────────────────────────────────────────
export const useStockStats = () =>
  useQuery({
    queryKey: ["stock", "stats"],
    queryFn: () => stockAPI.getStats().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

export const useDepotStats = (depotId) =>
  useQuery({
    queryKey: ["depot", "stats", depotId],
    queryFn: () => stockAPI.getDepotStats(depotId).then((r) => r.data.data),
    enabled: Boolean(depotId),
    staleTime: 5 * 60 * 1000,
  });

// ─── Depots ───────────────────────────────────────────────────────────────────
export const useDepots = () =>
  useQuery({
    queryKey: ["dashboard", "depots"],
    queryFn: () => depotsAPI.getAll().then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
  });

// ─── Societes ─────────────────────────────────────────────────────────────────
export const useSocietes = () =>
  useQuery({
    queryKey: ["societes"],
    queryFn: () => societesAPI.getAll().then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
  });

// ─── Clients ──────────────────────────────────────────────────────────────────
export const useClientsSummary = () =>
  useQuery({
    queryKey: ["clients", "summary"],
    queryFn: () => clientsAPI.getSummary().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

// ─── Fournisseurs ─────────────────────────────────────────────────────────────
export const useFournisseursSummary = () =>
  useQuery({
    queryKey: ["fournisseurs", "summary"],
    queryFn: () => fournisseursAPI.getSummary().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

// ─── Articles ─────────────────────────────────────────────────────────────────
export const useArticles = (params) =>
  useQuery({
    queryKey: ["articles", params],
    queryFn: () => articlesAPI.getAll(params).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

// ─── Categories ───────────────────────────────────────────────────────────────
export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesAPI.getAll().then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
  });

// ─── Families ─────────────────────────────────────────────────────────────────
export const useFamilies = () =>
  useQuery({
    queryKey: ["families"],
    queryFn: () => familiesAPI.getAll().then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
  });
