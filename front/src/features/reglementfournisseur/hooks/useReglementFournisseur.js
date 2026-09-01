import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reglementFournisseurApi, rfFournisseursApi, rfBanquesApi } from "../api/reglementFournisseur.api.js";
import { openPdfPreview } from "../../../shared/utils/pdfPreviewStore";

export const rfKeys = {
  all: ["reglements-fournisseur"],
  unpaid: (fournisseurId, societeId) => ["rf-unpaid", fournisseurId, societeId],
};

export const rfFrsKeys = {
  all: (keyword, societeId) => ["rf-fournisseurs", keyword, societeId],
};

export const useReglementFournisseurs = ({
  pageIndex = 0,
  pageSize = 10,
  fournisseurId,
  modeReglement,
  startDate,
  endDate,
} = {}) => {
  return useQuery({
    queryKey: [...rfKeys.all, pageIndex, pageSize, fournisseurId, modeReglement, startDate, endDate],
    queryFn: () =>
      reglementFournisseurApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        fournisseurId,
        modeReglement,
        startDate,
        endDate,
      }),
    keepPreviousData: true,
  });
};

export const useCreateReglementFournisseur = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ societeId, payload }) =>
      reglementFournisseurApi.create({ societeId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rfKeys.all });
    },
  });
};

export const useDeleteReglementFournisseur = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => reglementFournisseurApi.remove({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rfKeys.all });
    },
  });
};

export const useUnpaidBRs = ({ fournisseurId, societeId } = {}) => {
  return useQuery({
    queryKey: rfKeys.unpaid(fournisseurId, societeId),
    queryFn: () => reglementFournisseurApi.getUnpaidBRs({ fournisseurId, societeId }),
    enabled: !!fournisseurId && !!societeId,
    staleTime: 0,
  });
};

export const useRFFournisseurs = ({ keyword = "", societeId } = {}) => {
  return useQuery({
    queryKey: rfFrsKeys.all(keyword, societeId),
    queryFn: () => rfFournisseursApi.getAll({ keyword, societeId, limit: 100 }),
    keepPreviousData: true,
    staleTime: 60_000,
  });
};

export const useRFBanques = () => {
  return useQuery({
    queryKey: ["rf-banques"],
    queryFn: () => rfBanquesApi.getAll({ limit: 100 }),
    staleTime: 5 * 60_000,
  });
};

export const usePrintReglementFournisseur = () => {
  return useMutation({
    mutationFn: (id) => reglementFournisseurApi.printPDF(id),
    onSuccess: (blob, id) => {
      openPdfPreview({
        blob,
        filename: `reglement-fournisseur-${id}.pdf`,
        title: "Aperçu — Règlement fournisseur",
      });
    },
  });
};
