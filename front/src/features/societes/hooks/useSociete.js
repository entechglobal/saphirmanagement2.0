import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { societeApi } from "../api/societe.api";

/**
 * Query keys
 */
export const societeKeys = {
  all: ["societes"],
  one: (id) => ["societe", id],
  me: () => ["societes", "me"], // Unique key for "me"
};

export const useSocieteMe = (options = {}) => {
  return useQuery({
    // 1. Use a unique key for "me" to avoid cache collisions with specific IDs
    queryKey: societeKeys.me(),

    // 2. Call your new API method
    queryFn: () => societeApi.getByme(),

    // 3. allow callers to pass enabled, etc.
    ...options,

    // 4. Standard React Query 5+ option (replaces keepPreviousData)
    placeholderData: (previousData) => previousData,
  });
};

/**
 * UPDATE societe
 */
export const useUpdateSociete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => societeApi.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: societeKeys.all });
      queryClient.invalidateQueries({
        queryKey: societeKeys.one(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: societeKeys.me() });
    },
  });
};
