import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { Clock, Play } from "lucide-react";
import dayjs from "dayjs";
import { useAuth } from "@/features/auth";
import { PERMISSIONS, hasPermission } from "@/shared/utils/permissions";
import { useMyActiveShift, useStartShift } from "../hooks/useShifts";

/**
 * Compact banner for Livreur users: prompts to start a shift
 * before LIVRE / PAYE actions are allowed.
 */
export const ShiftStatusBanner = () => {
  const { t } = useTranslation("shifts");
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLivreur = user?.role === "Livreur";
  const canManage = hasPermission(user, PERMISSIONS.MANAGE_DELIVERY_SHIFTS);

  const enabled = isLivreur && canManage;
  const { data, isLoading } = useMyActiveShift(enabled);
  const startMutation = useStartShift();

  if (!enabled || isLoading) return null;

  const shift = data?.data?.shift;
  if (shift) {
    return (
      <button
        type="button"
        onClick={() => navigate(`/delivery-shifts/${shift.id}`)}
        className="mb-4 flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-start hover:bg-emerald-100/80 dark:border-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60"
      >
        <Clock className="h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
            {t("banner.active_title")}
          </p>
          <p className="truncate text-xs text-emerald-700/80 dark:text-emerald-400/80">
            {t("banner.active_desc", {
              since: dayjs(shift.startedAt).format("DD/MM/YYYY HH:mm"),
            })}
          </p>
        </div>
      </button>
    );
  }

  const handleStart = async () => {
    try {
      const res = await startMutation.mutateAsync();
      toast.success(t("toast.started"));
      navigate(`/delivery-shifts/${res.data.shift.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("toast.start_error"));
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40">
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {t("banner.inactive_title")}
          </p>
          <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
            {t("banner.inactive_desc")}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleStart}
        disabled={startMutation.isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
      >
        <Play className="h-3.5 w-3.5" />
        {t("actions.start")}
      </button>
    </div>
  );
};
