import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import { societeApi } from "../api/societe.api";
import { useAuth } from "../../auth/hooks/useAuth";

/**
 * Query keys
 */
export const societeKeys = {
  all: ["societes"],
  one: (id) => ["societe", id],
  me: () => ["societes", "me"], // Unique key for "me"
};

export const useSocieteMe = (options = {}) => {
  const { user } = useAuth();
  const { enabled: enabledOption, ...rest } = options;
  const hasSociete = !!user?.societeId && !user?.isSuperAdmin;

  return useQuery({
    queryKey: societeKeys.me(),
    queryFn: () => societeApi.getByme(),
    placeholderData: (previousData) => previousData,
    ...rest,
    enabled: (enabledOption ?? true) && hasSociete,
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
