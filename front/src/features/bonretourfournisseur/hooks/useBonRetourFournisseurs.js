import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import {
  bonRetourFournisseursApi,
  brfProductsApi,
} from "../api/bonRetourFournisseurs.api.js";
import { openPdfPreview } from "../../../shared/utils/pdfPreviewStore";
import apiClient from "../../../shared/api/axios";

export const brfKeys = {
  all: ["bon-retour-fournisseurs"],
  one: (id) => ["bon-retour-fournisseur", String(id)],
  nextNumber: (societeId) => ["brf-next-number", societeId],
  receptionsByFrs: (frsId) => ["br-by-frs", frsId],
};

export const useBonRetourFournisseurs = ({
  pageIndex = 0,
  pageSize = 10,
  startDate,
  endDate,
  frsId,
  depotId,
  status,
  keyword = "",
} = {}) =>
  useQuery({
    queryKey: [
      "bon-retour-fournisseurs",
      pageIndex,
      pageSize,
      startDate,
      endDate,
      frsId,
      depotId,
      status,
      keyword,
    ],
    queryFn: () =>
      bonRetourFournisseursApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        startDate,
        endDate,
        frsId,
        depotId,
        status,
        keyword,
      }),
    keepPreviousData: true,
  });

export const useBonRetourFournisseurById = (id) =>
  useQuery({
    queryKey: brfKeys.one(id),
    queryFn: () => bonRetourFournisseursApi.getById(id),
    enabled: !!id,
  });

export const useNextBRFNumber = (societeId) =>
  useQuery({
    queryKey: brfKeys.nextNumber(societeId),
    queryFn: () => bonRetourFournisseursApi.getNextNumber(societeId),
    enabled: !!societeId,
    staleTime: 0,
  });

export const useBonReceptionsByFrs = (frsId) =>
  useQuery({
    queryKey: brfKeys.receptionsByFrs(frsId),
    queryFn: () => bonRetourFournisseursApi.getBonReceptionsByFrs(frsId),
    enabled: !!frsId,
    staleTime: 30_000,
  });

export const useCreateBonRetourFournisseur = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bonRetourFournisseursApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brfKeys.all });
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
  });
};

export const useUpdateBonRetourFournisseur = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      bonRetourFournisseursApi.update(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: brfKeys.all });
      qc.invalidateQueries({ queryKey: brfKeys.one(id) });
    },
  });
};

export const useDeleteBonRetourFournisseur = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bonRetourFournisseursApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brfKeys.all });
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
  });
};

export const useValidateBonRetourFournisseur = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetStatus }) =>
      bonRetourFournisseursApi.validate(id, { targetStatus }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: brfKeys.all });
      qc.invalidateQueries({ queryKey: brfKeys.one(id) });
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
  });
};

export const usePrintBonRetourFournisseur = () =>
  useMutation({
    mutationFn: async ({ id }) => {
      const blob = await bonRetourFournisseursApi.printPDF(id, false);
      openPdfPreview({
        blob,
        filename: `bon-retour-fournisseur-${id}.pdf`,
        title: "Aperçu — Bon de retour fournisseur",
      });
      return blob;
    },
  });

export const useBRFProducts = ({
  depotId,
  search,
  priceField = "prixAchat",
  page = 1,
  enabled = true,
} = {}) =>
  useQuery({
    queryKey: ["brf-products", depotId, priceField, search, page],
    queryFn: () =>
      brfProductsApi.search({ search, depotId, priceField, page, limit: 20 }),
    enabled: enabled && !!depotId,
    keepPreviousData: true,
    staleTime: 30_000,
  });

export const useDepots = ({ pageSize = 100 } = {}) =>
  useQuery({
    queryKey: ["brf-depots", pageSize],
    queryFn: async () => {
      const res = await apiClient.get("/depots", {
        params: { limit: pageSize, page: 1 },
      });
      return res.data;
    },
  });
