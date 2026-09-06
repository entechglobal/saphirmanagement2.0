import { useMutation, useQueryClient } from "@/shared/lib/query";
import { documentHeaderApi } from "../api/documentHeader.api";
import { societeKeys } from "@/features/societes/hooks/useSocietes";

export const useUpdateDocumentHeader = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ config, societeId }) =>
      documentHeaderApi.update(config, societeId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: societeKeys.all });
      if (variables?.societeId) {
        queryClient.invalidateQueries({
          queryKey: societeKeys.one(variables.societeId),
        });
      }
    },
  });
};
