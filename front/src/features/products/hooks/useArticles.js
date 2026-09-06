import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import { articlesApi } from "../api/articles.api";

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const articleKeys = {
  all: ["articles"],
  one: (id) => ["article", id],
  variants: ["article-variants"],
};

// ─── Queries ──────────────────────────────────────────────────────────────────
export const useArticles = ({ pageIndex, pageSize, keyword }) =>
  useQuery({
    queryKey: [...articleKeys.all, pageIndex, pageSize, keyword],
    queryFn: () =>
      articlesApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        keyword,
      }),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2,
  });

export const useArticle = (id) =>
  useQuery({
    queryKey: articleKeys.one(id),
    queryFn: () => articlesApi.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────
const invalidateAll = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: articleKeys.all });

export const useCreateArticle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.create,
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useUpdateArticle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => articlesApi.update(id, payload),
    onSuccess: (_, { id }) => {
      invalidateAll(queryClient);
      queryClient.invalidateQueries({ queryKey: articleKeys.one(id) });
      queryClient.invalidateQueries({ queryKey: articleKeys.variants });
    },
  });
};

export const useDeleteArticle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.remove,
    onSuccess: () => invalidateAll(queryClient),
  });
};

// ─── CSV ──────────────────────────────────────────────────────────────────────
export const useExportArticlesCsv = () =>
  useMutation({ mutationFn: articlesApi.exportCsv });

export const useImportArticlesCsv = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.importCsv,
    onSuccess: () => invalidateAll(queryClient),
  });
};

// ─── XLSX ─────────────────────────────────────────────────────────────────────
export const useExportArticlesXlsx = () =>
  useMutation({ mutationFn: articlesApi.exportXlsx });

export const useImportArticlesXlsx = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.importXlsx,
    onSuccess: () => invalidateAll(queryClient),
  });
};