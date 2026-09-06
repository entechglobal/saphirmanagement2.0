import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import {
  ArrowLeft,
  Clock,
  Square,
  Send,
  Package,
  Banknote,
  Wallet,
} from "lucide-react";
import dayjs from "dayjs";
import {
  TextField,
  MenuItem,
  ListSubheader,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "@/features/auth";
import {
  useDeliveryShift,
  useCloseShift,
  useRemitShift,
} from "../hooks/useShifts";
import { useTransferableCaisses, useMyCaisse } from "@/features/caisse/hooks/useCaisse";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { PERMISSIONS, hasPermission } from "@/shared/utils/permissions";

const formatMAD = (val) =>
  Number(val ?? 0).toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTime = (val) =>
  val ? dayjs(val).format("DD/MM/YYYY HH:mm") : "—";

const TYPE_ORDER = ["USER", "BANK", "CAISSE"];
const TYPE_LABEL_KEYS = {
  USER: "wallet_group_users",
  BANK: "wallet_group_banks",
  CAISSE: "wallet_group_caisses",
};

const walletLabel = (c) => {
  if (c.caisseType === "BANK") return c.banque?.name || c.name;
  if (c.caisseType === "CAISSE") return c.name;
  return c.user?.name || c.name;
};

export const DeliveryShiftDetailPage = () => {
  const { id } = useParams();
  const { t } = useTranslation("shifts");
  const { t: tCaisse } = useTranslation("caisse");
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = hasPermission(user, PERMISSIONS.MANAGE_DELIVERY_SHIFTS);

  const { data, isLoading, isError } = useDeliveryShift(id);
  const shift = data?.data;
  const wallet = shift?.wallet;

  const closeMutation = useCloseShift();
  const remitMutation = useRemitShift();
  const { data: myCaisseData } = useMyCaisse();
  const myCaisse = myCaisseData?.data;

  const { data: transferableData, isLoading: walletsLoading } =
    useTransferableCaisses({
      societeId: shift?.societeId,
      enabled: !!shift && shift.status === "CLOSED" && !shift.remittedAmount,
    });
  const transferable = transferableData?.data ?? [];

  const [closeConfirm, setCloseConfirm] = useState(false);
  const [destinationCaisseId, setDestinationCaisseId] = useState("");
  const [remitAmount, setRemitAmount] = useState("");
  const [remitNote, setRemitNote] = useState("");

  const suggestedAmount = useMemo(() => {
    if (!shift || !wallet) return 0;
    return Math.max(
      0,
      parseFloat(
        (
          parseFloat(wallet.balance || 0) -
          parseFloat(shift.openingBalance || 0)
        ).toFixed(2),
      ),
    );
  }, [shift, wallet]);

  useEffect(() => {
    if (shift?.status === "CLOSED" && remitAmount === "") {
      setRemitAmount(String(suggestedAmount || shift.totalCollected || ""));
    }
  }, [shift, suggestedAmount, remitAmount]);

  const groupedWallets = useMemo(() => {
    const sourceId = myCaisse?.id || wallet?.caisseId;
    const list = (Array.isArray(transferable) ? transferable : []).filter(
      (c) => c.id !== sourceId,
    );
    const groups = {};
    for (const c of list) {
      const type = c.caisseType || "USER";
      if (!groups[type]) groups[type] = [];
      groups[type].push(c);
    }
    return TYPE_ORDER.filter((type) => groups[type]?.length).map((type) => ({
      type,
      items: groups[type],
    }));
  }, [transferable, myCaisse, wallet]);

  const orders = shift?.orders ?? [];

  const handleClose = async () => {
    try {
      await closeMutation.mutateAsync(Number(id));
      toast.success(t("toast.closed"));
      setCloseConfirm(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("toast.close_error"));
    }
  };

  const handleRemit = async () => {
    if (!destinationCaisseId) {
      toast.error(t("remit.err_destination"));
      return;
    }
    const amount = parseFloat(remitAmount);
    if (!amount || amount <= 0) {
      toast.error(t("remit.err_amount"));
      return;
    }
    try {
      const res = await remitMutation.mutateAsync({
        id: Number(id),
        payload: {
          destinationCaisseId: Number(destinationCaisseId),
          amount,
          note: remitNote || undefined,
        },
      });
      const pending = res?.data?.transfer?.pending;
      toast.success(
        pending ? t("toast.remit_pending") : t("toast.remitted"),
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || t("toast.remit_error"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CircularProgress size={32} />
      </div>
    );
  }

  if (isError || !shift) {
    return (
      <div className="p-8 text-center text-slate-500">
        {t("not_found")}
      </div>
    );
  }

  const isOwner = shift.userId === user?.id;
  const showRemit =
    canManage &&
    isOwner &&
    shift.status === "CLOSED" &&
    shift.remittedAmount == null;

  const Stat = ({ icon: Icon, label, value, accent }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Icon className={`h-4 w-4 ${accent || ""}`} />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
        {value}
      </p>
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/delivery-shifts")}
            className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 md:text-2xl">
              {t("detail.title", { id: shift.id })}
            </h1>
            <p className="text-sm text-slate-500">
              {shift.user?.name || shift.delivery?.name} ·{" "}
              {shift.status === "OPEN" ? t("status.open") : t("status.closed")}
            </p>
          </div>
        </div>
        {canManage && isOwner && shift.status === "OPEN" && (
          <button
            type="button"
            onClick={() => setCloseConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
          >
            <Square className="h-3.5 w-3.5" />
            {t("actions.close")}
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Clock}
          label={t("detail.started")}
          value={formatDateTime(shift.startedAt)}
        />
        <Stat
          icon={Package}
          label={t("detail.orders")}
          value={shift.totalOrders || orders.length}
          accent="text-blue-500"
        />
        <Stat
          icon={Banknote}
          label={t("detail.collected")}
          value={`${formatMAD(shift.totalCollected)} MAD`}
          accent="text-emerald-500"
        />
        <Stat
          icon={Wallet}
          label={t("detail.wallet")}
          value={`${formatMAD(wallet?.balance ?? shift.closingBalance)} MAD`}
          accent="text-violet-500"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("detail.summary")}
        </h2>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 border-b border-slate-100 py-2 dark:border-slate-800">
            <span className="text-slate-500">{t("detail.opening_balance")}</span>
            <span className="font-medium tabular-nums">
              {formatMAD(shift.openingBalance)} MAD
            </span>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 py-2 dark:border-slate-800">
            <span className="text-slate-500">{t("detail.closing_balance")}</span>
            <span className="font-medium tabular-nums">
              {shift.closingBalance != null
                ? `${formatMAD(shift.closingBalance)} MAD`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 py-2 dark:border-slate-800">
            <span className="text-slate-500">{t("detail.delivered")}</span>
            <span className="font-medium tabular-nums">
              {shift.deliveredCount}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 py-2 dark:border-slate-800">
            <span className="text-slate-500">{t("detail.paid")}</span>
            <span className="font-medium tabular-nums">{shift.paidCount}</span>
          </div>
          {shift.remittedAmount != null && (
            <div className="flex justify-between gap-4 border-b border-slate-100 py-2 sm:col-span-2 dark:border-slate-800">
              <span className="text-slate-500">{t("detail.remitted")}</span>
              <span className="font-medium tabular-nums">
                {formatMAD(shift.remittedAmount)} MAD
                {!shift.remittanceCompletedAt && (
                  <span className="ml-2 text-amber-600">
                    ({t("status.pending")})
                  </span>
                )}
                {shift.remittanceCaisse && (
                  <span className="ml-2 text-slate-400">
                    → {walletLabel(shift.remittanceCaisse)}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
          {t("orders.title")}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("orders.document")}</th>
                <th className="px-4 py-3">{t("orders.client")}</th>
                <th className="px-4 py-3">{t("orders.status")}</th>
                <th className="px-4 py-3">{t("orders.amount")}</th>
                <th className="px-4 py-3">{t("orders.linked_at")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    —
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-medium">
                      {order.bonLivraison?.document?.documentNumber ||
                        `#${order.bonLivraisonId}`}
                    </td>
                    <td className="px-4 py-3">
                      {order.bonLivraison?.document?.client?.name || "—"}
                    </td>
                    <td className="px-4 py-3">{order.linkedStatus}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatMAD(order.amount)} MAD
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(order.linkedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showRemit && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/30">
          <div className="mb-4 flex items-center gap-2">
            <Send className="h-5 w-5 text-violet-600" />
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-50">
                {t("remit.title")}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t("remit.subtitle", { amount: formatMAD(suggestedAmount) })}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <TextField
              select
              size="small"
              fullWidth
              label={t("remit.destination")}
              value={destinationCaisseId}
              onChange={(e) => setDestinationCaisseId(e.target.value)}
              disabled={walletsLoading || remitMutation.isPending}
            >
              {walletsLoading && (
                <MenuItem disabled value="">
                  {t("remit.loading")}
                </MenuItem>
              )}
              {groupedWallets.map((group) => [
                <ListSubheader key={`h-${group.type}`}>
                  {tCaisse(TYPE_LABEL_KEYS[group.type], group.type)}
                </ListSubheader>,
                ...group.items.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {walletLabel(c)}
                  </MenuItem>
                )),
              ])}
            </TextField>

            <TextField
              size="small"
              fullWidth
              type="number"
              label={t("remit.amount")}
              value={remitAmount}
              onChange={(e) => setRemitAmount(e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              disabled={remitMutation.isPending}
            />

            <TextField
              size="small"
              fullWidth
              label={t("remit.note")}
              value={remitNote}
              onChange={(e) => setRemitNote(e.target.value)}
              className="md:col-span-2"
              disabled={remitMutation.isPending}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleRemit}
              disabled={remitMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {remitMutation.isPending ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {t("remit.submit")}
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={closeConfirm}
        onClose={() => setCloseConfirm(false)}
        onConfirm={handleClose}
        title={t("confirm.close_title")}
        message={t("confirm.close_message")}
        confirmText={t("actions.close")}
        cancelText={t("actions.cancel")}
        isLoading={closeMutation.isPending}
      />
    </div>
  );
};
