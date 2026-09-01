// src/features/agences/hooks/useAgences.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agencesApi } from "../api/agences.api";
import { societesApi } from "../../../societes/api/societes.api";

const KEYS = {
  all: ["agences"],
  list: (p) => ["agences", "list", p],
};

/* ── List ── */
export const useAgences = ({ pageIndex = 0, pageSize = 10, keyword = "" } = {}) =>
  useQuery({
    queryKey: KEYS.list({ pageIndex, pageSize, keyword }),
    queryFn: () =>
      agencesApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        search: keyword,
      }),
    keepPreviousData: true,
  });

/* ── Societes (for super admin dropdown) ── */
export const useSocietesForAgence = () =>
  useQuery({
    queryKey: ["societes", "all"],
    queryFn: () => societesApi.getAll({ page: 1, limit: 100 }),
  });

/* ── Create ── */
export const useCreateAgence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, societeId }) =>
      agencesApi.create(payload, societeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
};

/* ── Update ── */
export const useUpdateAgence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => agencesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
};

/* ── Toggle Active ── */
export const useToggleAgenceActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }) => agencesApi.toggleActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
};

/* ── Delete ── */
export const useDeleteAgence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => agencesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
};
