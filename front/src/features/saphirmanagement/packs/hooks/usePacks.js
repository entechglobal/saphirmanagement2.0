// src/features/packs/hooks/usePacks.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { packsApi } from "../api/packs.api";
import { societesApi } from "../../../societes/api/societes.api";

const KEYS = {
  all: ["packs"],
  list: (p) => ["packs", "list", p],
  detail: (id) => ["packs", "detail", id],
  picker: (p) => ["packs", "picker", p],
};

/* ── List ── */
export const usePacks = ({ pageIndex = 0, pageSize = 10, keyword = "" } = {}) =>
  useQuery({
    queryKey: KEYS.list({ pageIndex, pageSize, keyword }),
    queryFn: () =>
      packsApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        search: keyword,
      }),
    keepPreviousData: true,
  });

/* ── Single pack (for edit form) ── */
export const usePackById = (id) =>
  useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => packsApi.getById(id),
    enabled: !!id,
  });

/* ── Societes (for super admin dropdown) ── */
export const useSocietesForPacks = () =>
  useQuery({
    queryKey: ["societes", "all"],
    queryFn: () => societesApi.getAll({ page: 1, limit: 100 }),
  });

/* ── Products picker (articles + variants with selected priceField) ── */
export const useProductsPicker = ({
  priceField = "prixVente1",
  search = "",
  page = 1,
  limit = 50,
  enabled = true,
} = {}) =>
  useQuery({
    queryKey: KEYS.picker({ priceField, search, page, limit }),
    queryFn: () =>
      packsApi.getProductsPicker({ priceField, search, page, limit }),
    enabled,
    keepPreviousData: true,
  });

/* ── Create ── */
export const useCreatePack = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, societeId }) =>
      packsApi.create(payload, societeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
};

/* ── Update ── */
export const useUpdatePack = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => packsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
};

/* ── Delete ── */
export const useDeletePack = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => packsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
};