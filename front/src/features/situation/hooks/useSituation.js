import { useQuery } from "@tanstack/react-query";
import { situationApi } from "../api/situation.api";

export const situationKeys = {
  client: (params) => ["situation-client", params],
  fournisseur: (params) => ["situation-fournisseur", params],
};

export const useClientSituation = ({
  pageIndex = 0,
  pageSize = 10,
  keyword = "",
  clientId,
  startDate,
  endDate,
  paymentStatus,
} = {}) =>
  useQuery({
    queryKey: situationKeys.client({
      pageIndex,
      pageSize,
      keyword,
      clientId,
      startDate,
      endDate,
      paymentStatus,
    }),
    queryFn: () =>
      situationApi.getClientSituation({
        page: pageIndex + 1,
        limit: pageSize,
        keyword,
        clientId,
        startDate,
        endDate,
        paymentStatus,
      }),
    keepPreviousData: true,
  });

export const useFournisseurSituation = ({
  pageIndex = 0,
  pageSize = 10,
  keyword = "",
  fournisseurId,
  startDate,
  endDate,
} = {}) =>
  useQuery({
    queryKey: situationKeys.fournisseur({
      pageIndex,
      pageSize,
      keyword,
      fournisseurId,
      startDate,
      endDate,
    }),
    queryFn: () =>
      situationApi.getFournisseurSituation({
        page: pageIndex + 1,
        limit: pageSize,
        keyword,
        fournisseurId,
        startDate,
        endDate,
      }),
    keepPreviousData: true,
  });
