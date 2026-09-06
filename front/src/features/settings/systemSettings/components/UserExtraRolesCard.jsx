import { useState } from "react";
import { Package, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";
import { useUsers, useUpdateUser } from "@/features/users/hooks/useUsers";
import { getApiError } from "@/shared/utils/apiError";
import {
  isPreparateurMainRole,
  isLivreurMainRole,
} from "@/features/users/components/UserExtraRolesFields";

const PAGE_SIZE = 8;

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    disabled={disabled}
    className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B12B89]/40 ${
      checked ? "bg-[#B12B89]" : "bg-slate-200 dark:bg-[#2e2e2e]"
    } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

export const UserExtraRolesCard = () => {
  const { t } = useTranslation("system-settings");
  const [pageIndex, setPageIndex] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState(null);

  const { data, isLoading } = useUsers({
    pageIndex,
    pageSize: PAGE_SIZE,
    keyword: search,
  });
  const updateUser = useUpdateUser();

  const users = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.numberOfPages ?? 1;

  const saveRoles = (user, next) => {
    setPendingId(user.id);
    updateUser.mutate(
      {
        id: user.id,
        payload: {
          canBePreparateur:
            isPreparateurMainRole(user.roleId, user.role?.name) || next.canBePreparateur,
          canBeLivreur:
            isLivreurMainRole(user.roleId, user.role?.name) || next.canBeLivreur,
        },
      },
      {
        onSuccess: () => toast.success(t("extra_roles.updated")),
        onError: (err) =>
          toast.error(getApiError(err, t("extra_roles.error"))),
        onSettled: () => setPendingId(null),
      }
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#2e2e2e]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/20">
            <Package className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t("extra_roles.title")}
            </h2>
            <p className="text-xs text-slate-500">{t("extra_roles.description")}</p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(keyword);
                setPageIndex(0);
              }
            }}
            onBlur={() => {
              setSearch(keyword);
              setPageIndex(0);
            }}
            placeholder={t("extra_roles.search_placeholder")}
            className="h-9 w-full rounded-lg border border-slate-200 bg-transparent pl-8 pr-3 text-sm outline-none focus:border-[#B12B89] dark:border-[#2e2e2e]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-[#B12B89]" />
        </div>
      ) : users.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          {t("extra_roles.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
                <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  {t("extra_roles.col_user")}
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  {t("extra_roles.col_main_role")}
                </th>
                <th className="px-3.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  {t("extra_roles.col_preparateur")}
                </th>
                <th className="px-3.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  {t("extra_roles.col_livreur")}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const lockedPrep = isPreparateurMainRole(user.roleId, user.role?.name);
                const lockedLiv = isLivreurMainRole(user.roleId, user.role?.name);
                const busy = pendingId === user.id;
                return (
                  <tr
                    key={user.id}
                    className="border-b border-slate-100 last:border-b-0 dark:border-[#2e2e2e]"
                  >
                    <td className="px-3.5 py-3">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{user.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-[13px] text-slate-600 dark:text-slate-300">
                      {user.role?.name?.replace("_", " ") || "—"}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex justify-center">
                        <Toggle
                          checked={lockedPrep || !!user.canBePreparateur}
                          disabled={busy || lockedPrep}
                          onChange={() =>
                            saveRoles(user, {
                              canBePreparateur: !user.canBePreparateur,
                              canBeLivreur: !!user.canBeLivreur,
                            })
                          }
                        />
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex justify-center">
                        <Toggle
                          checked={lockedLiv || !!user.canBeLivreur}
                          disabled={busy || lockedLiv || !user.societeId}
                          onChange={() =>
                            saveRoles(user, {
                              canBePreparateur: !!user.canBePreparateur,
                              canBeLivreur: !user.canBeLivreur,
                            })
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-3 py-2 dark:border-[#2e2e2e]">
          <button
            type="button"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-35 dark:hover:bg-[#222]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[12px] font-semibold text-slate-500">
            {pageIndex + 1}/{totalPages}
          </span>
          <button
            type="button"
            disabled={pageIndex + 1 >= totalPages}
            onClick={() => setPageIndex((p) => p + 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-35 dark:hover:bg-[#222]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
