import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { stocksApi } from "../api/stocks.api";

/**
 * Query keys
 */
export const stockKeys = {
  all: ["stock"],
  lists: () => [...stockKeys.all, "list"],
  list: (filters) => [...stockKeys.lists(), filters],
  details: () => [...stockKeys.all, "detail"],
  detail: (id) => [...stockKeys.details(), id],
  byArticle: (id) => [...stockKeys.all, "by-article", id],
  byVariant: (id) => [...stockKeys.all, "by-variant", id],
  byFamily: (id) => [...stockKeys.all, "by-family", id],
  byDepot: (id) => [...stockKeys.all, "by-depot", id],
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export const useStocks = ({
  pageIndex,
  pageSize,
  keyword,
  articleId,
  familyId,
  societeId,
  depotId,
} = {}) => {
  return useQuery({
    queryKey: stockKeys.list({
      pageIndex,
      pageSize,
      keyword,
      articleId,
      societeId,
      familyId,
      depotId,
    }),
    queryFn: () =>
      stocksApi.getAll({
        page: pageIndex != null ? pageIndex + 1 : undefined,
        limit: pageSize,
        keyword: keyword || undefined,
        articleId: articleId || undefined,
        familyId: familyId || undefined,
        depotId: depotId || undefined,
        societeId: societeId || undefined,
      }),
    placeholderData: keepPreviousData,
  });
};

export const useStock = (id) => {
  return useQuery({
    queryKey: stockKeys.detail(id),
    queryFn: () => stocksApi.getById(id),
    enabled: !!id,
  });
};

export const useStockByArticle = (id) => {
  return useQuery({
    queryKey: stockKeys.byArticle(id),
    queryFn: () => stocksApi.getByArticleId(id),
    enabled: !!id,
  });
};

export const useStockByVariant = (id) => {
  return useQuery({
    queryKey: stockKeys.byVariant(id),
    queryFn: () => stocksApi.getByVariantId(id),
    enabled: !!id,
  });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreateStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: stocksApi.create,
    onSuccess: async () => {
      // exact: false ensures ALL queries starting with ["stock"] are invalidated
      await queryClient.invalidateQueries({
        queryKey: stockKeys.all,
        exact: false,
      });
    },
  });
};

export const useUpdateStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => stocksApi.update(id, payload),
    onSuccess: async (_data, variables) => {
      // Invalidate all lists
      await queryClient.invalidateQueries({
        queryKey: stockKeys.lists(),
        exact: false,
      });

      // Invalidate the specific detail entry
      if (variables?.id) {
        await queryClient.invalidateQueries({
          queryKey: stockKeys.detail(variables.id),
          exact: false,
        });
        // Also cover by-article and by-variant caches for this same resource
        await queryClient.invalidateQueries({
          queryKey: [...stockKeys.all, "by-article"],
          exact: false,
        });
        await queryClient.invalidateQueries({
          queryKey: [...stockKeys.all, "by-variant"],
          exact: false,
        });
      }
    },
  });
};

export const useDeleteStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: stocksApi.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: stockKeys.all,
        exact: false,
      });
    },
  });
};
