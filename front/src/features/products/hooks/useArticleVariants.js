import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { articlesVariantsApi } from "../api/articleVariants";

/**
 * Query keys
 */
export const articleVariantKeys = {
  all: ["article-variants"],
};

/**
 * GET article variants with pagination
 */
export const useArticleVariants = ({ pageIndex, pageSize, keyword }) => {
  return useQuery({
    queryKey: ["article-variants", pageIndex, pageSize, keyword],
    queryFn: () =>
      articlesVariantsApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        keyword,
      }),
    keepPreviousData: true,
  });
};

/**
 * GET single article variant by ID
 */
export const useArticleVariant = (id) => {
  return useQuery({
    queryKey: ["article-variant", id],
    queryFn: () => articlesVariantsApi.getById(id),
    enabled: !!id,
  });
};

/**
 * CREATE article variant
 */
export const useCreateArticleVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ articleId, variants }) =>
      articlesVariantsApi.create({ articleId, variants }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-variants"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article"] });
    },
  });
};

/**
 * UPDATE article variant
 */
export const useUpdateArticleVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => articlesVariantsApi.update(id, payload),
    onSuccess: (_data, variables) => {
      //  Invalidate ALL variant list queries
      queryClient.invalidateQueries({ queryKey: ["article-variants"] });

      // Invalidate specific variant detail
      queryClient.invalidateQueries({
        queryKey: ["article-variant", variables.id],
      });

      // Invalidate article queries (parent article might show these variants)
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article"] });
    },
  });
};



/**
 * DELETE article variant
 */
export const useDeleteArticleVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: articlesVariantsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-variants"] });

      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article"] });
    },
  });
};

export const usePatchArticleVariantAttributes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) =>
      articlesVariantsApi.patch(id, payload),

    onSuccess: (_data, variables) => {
      // Refresh variants list
      queryClient.invalidateQueries({ queryKey: ["article-variants"] });

      // Refresh single variant
      queryClient.invalidateQueries({
        queryKey: ["article-variant", variables.id],
      });

      // Parent article may depend on variant attributes
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article"] });
    },
  });
};