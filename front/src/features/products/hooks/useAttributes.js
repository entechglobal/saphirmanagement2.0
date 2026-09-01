import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attributesApi } from "../api/attributes.api";

// Query keys
export const attributeKeys = {
  all: ["attributes"],
  one: (id) => ["attribute", id],
};

// ===================== GET ALL ATTRIBUTES =====================
export const useAttributes = () => {
  return useQuery({
    queryKey: attributeKeys.all,
    queryFn: attributesApi.getAll,
    keepPreviousData: true,
  });
};


// ===================== CREATE ATTRIBUTE =====================
export const useCreateAttribute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attributesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attributeKeys.all }),
  });
};

// ===================== UPDATE ATTRIBUTE =====================
export const useUpdateAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => attributesApi.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: attributeKeys.all });
      queryClient.invalidateQueries({ queryKey: attributeKeys.one(variables.id) });
    },
  });
};

// ===================== DELETE ATTRIBUTE =====================
export const useDeleteAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: attributesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeKeys.all });
    },
  });
};
