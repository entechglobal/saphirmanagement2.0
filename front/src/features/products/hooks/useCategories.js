import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import { categoriesApi } from "../api/categories.api";

/**
 * Query keys
 */
export const categoryKeys = {
  all: ["categories"],
};

/**
 * GET categories
 */
// export const useCategories = () =>
//   useQuery({
//     queryKey: categoryKeys.all,
//     queryFn: categoriesApi.getAll,
//     // staleTime: 1000 * 60 * 5,
//   })

// OR ALTERNATIVE WITH FORMATTED RETURN VALUE:

// export const useCategories = () => {
//     const {data} = useQuery({
//     queryKey: categoryKeys.all,
//     queryFn: categoriesApi.getAll,
//     // staleTime: 1000 * 60 * 5,
//   })
//   return {
//     categories: data?.data ?? [],
//     pagination: data?.pagination,
//   }
// }

export const useCategories = ({ pageIndex, pageSize, keyword }) => {
  return useQuery({
    queryKey: ["categories", pageIndex, pageSize, keyword],
    queryFn: () =>
      categoriesApi.getAll({
        page: pageIndex,
        limit: pageSize,
        keyword,
      }),
    keepPreviousData: true,
  });
};

/**
 * CREATE category
 */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
};

/**
 * UPDATE category
 */
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => categoriesApi.update(id, payload),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["category", id] });
    },
  });
};

/**
 * DELETE category
 */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
};

export const useCategory = (id) => {
  return useQuery({
    queryKey: ["category", id],
    queryFn: () => categoriesApi.getById(id),
    enabled: !!id,
  });
};

// ======================= CSV =======================

// NEW: Export CSV hook
export const useExportCategoriesCsv = () => {
  return useMutation({
    mutationFn: categoriesApi.exportCsv,
  });
};

// NEW: Import CSV hook

export const useImportCategoriesCsv = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoriesApi.importCsv,
    onSuccess: () => {
      // refresh table data after import
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

// ======================= XLSX =======================

// NEW: Export XLSX hook
export const useExportCategoriesXlsx = () => {
  return useMutation({
    mutationFn: categoriesApi.exportXlsx,
  });
};

// NEW: Import XLSX hook
export const useImportCategoriesXlsx = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoriesApi.importXlsx,
    onSuccess: () => {
      // refresh table data after import
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};
