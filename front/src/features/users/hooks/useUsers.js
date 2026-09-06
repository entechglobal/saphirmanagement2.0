import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import { usersApi } from "../api/users.api";

export const userKeys = {
  all: ["users"],
  detail: (id) => ["user", id],
  statistics: (id) => ["user", id, "statistics"],
  bySociete: (societeId) => ["users", "societe", societeId],
};

// ── READ ──────────────────────────────────────────────────────────
export const useUsers = ({ pageIndex, pageSize, keyword }) =>
  useQuery({
    queryKey: ["users", pageIndex, pageSize, keyword],
    queryFn: () =>
      usersApi.getAll({ page: pageIndex + 1, limit: pageSize, keyword }),
    keepPreviousData: true,
  });

export const useUser = (id) =>
  useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });

export const useCurrentUser = () =>
  useQuery({
    queryKey: ["currentUser"],
    queryFn: () => usersApi.getCurrentUser(),
  });

export const useUsersBySociete = (societeId) =>
  useQuery({
    queryKey: userKeys.bySociete(societeId),
    queryFn: () => usersApi.getBySociete(societeId),
    enabled: !!societeId,
  });

export const useUserStatistics = (id) =>
  useQuery({
    queryKey: userKeys.statistics(id),
    queryFn: () => usersApi.getStatistics(id),
    enabled: !!id,
  });

// ── MUTATIONS ─────────────────────────────────────────────────────
export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["preparateurs"] });
      qc.invalidateQueries({ queryKey: ["livreurs"] });
    },
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => usersApi.update(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["currentUser"] });
      qc.invalidateQueries({ queryKey: ["preparateurs"] });
      qc.invalidateQueries({ queryKey: ["livreurs"] });
    },
  });
};

// PATCH /api/users/:id/password
// Own account → send currentPassword; admin reset → omit it
export const useUpdatePassword = () =>
  useMutation({
    mutationFn: ({ id, currentPassword, newPassword, confirmPassword }) =>
      usersApi.updatePassword(id, {
        currentPassword,
        newPassword,
        confirmPassword,
      }),
  });

export const useDeactivateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => usersApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
};

export const useReactivateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => usersApi.reactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
};

// Hard delete — Super Admin only
export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
};
