import { useQuery, useMutation } from "@/shared/lib/query";
import { labelsApi } from "../api/labels.api";

export const useLabelProducts = ({ page = 1, search, priceField, enabled = true } = {}) => {
  return useQuery({
    queryKey: ["label-products", page, search, priceField],
    queryFn: () => labelsApi.searchProducts({ page, limit: 10, search, priceField }),
    keepPreviousData: true,
    staleTime: 30_000,
    enabled: !!enabled,
  });
};

export const useGenerateLabels = () => {
  return useMutation({ mutationFn: labelsApi.generate });
};

export const useGeneratePackLabels = () => {
  return useMutation({ mutationFn: labelsApi.generatePacks });
};
