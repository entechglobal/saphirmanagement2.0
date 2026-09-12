import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Phone,
  Search,
  Truck,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { HeaderTable } from "@/shared/components/HeaderTable";
import { BaseModal } from "@/shared/components/BaseModal";
import { ConfirmationModal } from "@/shared/components/ConfirmationModal";
import { SelectUI } from "@/shared/ui/SelectUI";
import { PayOrderModal } from "../components/PayOrderModal";
import {
  useCommands,
  useSimpleLivreurs,
  useUpdateCommandStatus,
} from "../hooks/useCommands";
import { useCurrentUser } from "../../../users/hooks/useUsers";

const PRIMARY_NEXT = {
  CONFIRME: "PREPARE",
  PREPARE: "COLLECTE",
  COLLECTE: "EN_ROUTE",
  EN_ROUTE: "LIVRE",
  LIVRE: "PAYE",
};

const STATUS_OPTIONS_BY_ROLE = {
  LIVREUR: ["PREPARE", "COLLECTE", "EN_ROUTE", "LIVRE"],
  PREPARATEUR: ["CONFIRME", "PREPARE"],
};

const STATUS_PILL = {
  CONFIRME: "bg-[#E8F2FF] text-[#0A47C1] border-[#3D8BFF]",
  PREPARE: "bg-[#F0EEFF] text-[#3D20C1] border-[#8B6FFF]",
  COLLECTE: "bg-[#FFF0F6] text-[#B3175A] border-[#FF5EA0]",
  EN_ROUTE: "bg-[#FFFBE0] text-[#8A6200] border-[#FFCC00]",
  LIVRE: "bg-[#EEFBE8] text-[#1A6E0A] border-[#4ECC2A]",
  PAYE: "bg-[#E6FBF5] text-[#076647] border-[#00C98A]",
};

const fmtMoney = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const whatsappUrl = (raw) => {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const intl = digits.startsWith("0") ? `212${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
};

const telUrl = (raw) => {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits ? `tel:${digits}` : null;
};

const nextActionKey = (status) => {
  const next = PRIMARY_NEXT[status];
  return next ? `ops.validate_${next}` : null;
};

const ContactMenu = ({ order, t }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const phone = order.whatsapp || order.telephone;
  const wa = whatsappUrl(phone);
  const call = telUrl(phone);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-white transition hover:brightness-110"
      >
        {t("ops.contact")}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute inset-x-0 bottom-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-[#2e2e2e] dark:bg-[#161616]">
          {call && (
            <a
              href={call}
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-[#222]"
            >
              <Phone className="h-3.5 w-3.5" />
              {t("ops.call")}
            </a>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-[#222]"
            >
              <Phone className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}
          {!call && !wa && (
            <p className="px-3 py-2 text-[12px] text-slate-400">{t("ops.no_phone")}</p>
          )}
        </div>
      )}
    </div>
  );
};

const OrderDetailsModal = ({ order, onClose, t }) => {
  const products = order?.products || [];
  return (
    <BaseModal
      isOpen={!!order}
      onClose={onClose}
      title={order?.documentNumber || `#${order?.id}`}
      subtitle={order?.clientName}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 dark:border-[#2e2e2e] dark:bg-[#1c1c1c] dark:text-slate-200"
          >
            {t("ops.close")}
          </button>
        </div>
      }
    >
      {order && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-slate-400">{t("ops.created_by")}</p>
              <p className="mt-0.5 font-medium">{order.createdByName || "—"}</p>
            </div>
            <div>
              <p className="text-slate-400">{t("livreur")}</p>
              <p className="mt-0.5 font-medium">{order.livreurName || "—"}</p>
            </div>
            <div>
              <p className="text-slate-400">{t("preparateur")}</p>
              <p className="mt-0.5 font-medium">{order.preparateurName || "—"}</p>
            </div>
            <div>
              <p className="text-slate-400">{t("ops.phone")}</p>
              <p className="mt-0.5 font-medium">{order.whatsapp || order.telephone || "—"}</p>
            </div>
            <div>
              <p className="text-slate-400">{t("delivery_date")}</p>
              <p className="mt-0.5 font-medium">
                {[order.dateLivraison, order.heureLivraison].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-400">{t("amounts")}</p>
              <p className="mt-0.5 font-medium">{fmtMoney(order.amountDue)} MAD</p>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <p className="text-slate-400">{t("ops.address")}</p>
              <p className="mt-0.5 font-medium">
                {[order.localisation, order.ville].filter(Boolean).join(" — ") || "—"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[#2e2e2e]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
                  <th className="px-3 py-2 text-start">{t("ops.product")}</th>
                  <th className="px-3 py-2 text-end">{t("ops.qty")}</th>
                  <th className="px-3 py-2 text-end">{t("ops.unit")}</th>
                  <th className="px-3 py-2 text-end">{t("ops.total")}</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                      {t("ops.no_products")}
                    </td>
                  </tr>
                ) : (
                  products.map((p, idx) => (
                    <tr key={`${p.kind}-${p.name}-${idx}`} className="border-b border-slate-100 last:border-0 dark:border-[#2e2e2e]">
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2 text-end tabular-nums">{p.quantity}</td>
                      <td className="px-3 py-2 text-end tabular-nums">{fmtMoney(p.unitPrice)}</td>
                      <td className="px-3 py-2 text-end tabular-nums">{fmtMoney(p.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </BaseModal>
  );
};

const OrderCard = ({
  order,
  selected,
  onToggle,
  onView,
  onValidate,
  validating,
  t,
}) => {
  const next = PRIMARY_NEXT[order.commandStatus];
  const address = [order.localisation, order.ville].filter(Boolean).join(" — ");
  return (
    <article className={`flex flex-col rounded-2xl border bg-white p-4 dark:bg-[#1c1c1c] ${
      selected ? "border-primary" : "border-slate-200 dark:border-[#2e2e2e]"
    }`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <label className="flex min-w-0 items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(order.id)}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
            {order.documentNumber || `#${order.id}`}
          </span>
        </label>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PILL[order.commandStatus] || "border-slate-200 text-slate-500"}`}>
          {t(`ops.status_${order.commandStatus}`, order.commandStatus)}
        </span>
      </div>

      <ul className="space-y-1.5 text-[13px] text-slate-600 dark:text-slate-300">
        <li className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-slate-400" />
          {t("ops.created_by")}: {order.createdByName || "—"}
        </li>
        <li className="flex items-center gap-2">
          <Truck className="h-3.5 w-3.5 text-slate-400" />
          {t("livreur")}: {order.livreurName || "—"}
        </li>
        <li className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {[order.dateLivraison, order.heureLivraison].filter(Boolean).join(" · ") || "—"}
        </li>
        <li className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-slate-400" />
          {order.clientName || "—"}
        </li>
        <li className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-slate-400" />
          {order.whatsapp || order.telephone || "—"}
        </li>
        <li className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-slate-400" />
          {fmtMoney(order.amountDue)} MAD
        </li>
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="line-clamp-2">{address || "—"}</span>
        </li>
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onView(order)}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-[13px] font-semibold text-white hover:bg-emerald-600"
        >
          <Eye className="h-3.5 w-3.5" />
          {t("ops.view")}
        </button>
        {next && (
          <button
            type="button"
            disabled={validating}
            onClick={() => onValidate(order)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 text-[13px] font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {t(nextActionKey(order.commandStatus))}
          </button>
        )}
      </div>
      <div className="mt-2">
        <ContactMenu order={order} t={t} />
      </div>
    </article>
  );
};

export const OperationalOrdersPage = () => {
  const { t } = useTranslation("commands");
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: currentUser } = useCurrentUser();
  const roleName = currentUser?.data?.role?.name;
  const upperRole = roleName?.trim().toUpperCase();
  const isLivreur = upperRole === "LIVREUR";
  const isPreparateur = upperRole === "PREPARATEUR";

  const allowedStatuses = STATUS_OPTIONS_BY_ROLE[upperRole] ?? STATUS_OPTIONS_BY_ROLE.PREPARATEUR;
  const defaultStatus = isLivreur ? "PREPARE" : "CONFIRME";
  const statusFromUrl = searchParams.get("status");
  const statusFilter =
    statusFromUrl && allowedStatuses.includes(statusFromUrl)
      ? statusFromUrl
      : defaultStatus;

  const [view, setView] = useState(() => localStorage.getItem("ops-orders-view") || "grid");
  const [search, setSearch] = useState("");
  const [livreurId, setLivreurId] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 12 });
  const [selected, setSelected] = useState(() => new Set());
  const [detailOrder, setDetailOrder] = useState(null);
  const [payOrder, setPayOrder] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [prepareConfirm, setPrepareConfirm] = useState(null);

  const { data: livreurData } = useSimpleLivreurs();
  const updateStatus = useUpdateCommandStatus();

  const { data, isLoading, isFetching } = useCommands({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search,
    livreurId: !isLivreur && livreurId ? Number(livreurId) : undefined,
    commandStatus: statusFilter,
  });

  const rows = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, data?.pagination?.totalPages ?? 1);

  useEffect(() => {
    if (!upperRole) return;
    if (statusFromUrl && allowedStatuses.includes(statusFromUrl)) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("status", defaultStatus);
      return next;
    }, { replace: true });
  }, [upperRole, statusFromUrl, defaultStatus, allowedStatuses, setSearchParams]);

  useEffect(() => {
    localStorage.setItem("ops-orders-view", view);
  }, [view]);

  useEffect(() => {
    setSelected(new Set());
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [statusFilter, livreurId, search]);

  const statusOptions = allowedStatuses.map((value) => ({
    value,
    label: t(`ops.status_${value}`, value),
  }));
  const livreurOptions = (livreurData?.data ?? []).map((l) => ({
    value: String(l.id),
    label: l.name,
  }));

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const selectedStatus = selectedRows[0]?.commandStatus;
  const sameStatus = selectedRows.length > 0 && selectedRows.every((r) => r.commandStatus === selectedStatus);
  const bulkNext = sameStatus ? PRIMARY_NEXT[selectedStatus] : null;

  const setStatus = (value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("status", value);
      return next;
    }, { replace: true });
  };

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (rows.every((r) => prev.has(r.id))) return new Set();
      return new Set(rows.map((r) => r.id));
    });
  };

  const applyStatus = useCallback(
    async (orders, targetStatus, payments) => {
      let ok = 0;
      let failed = 0;
      for (const order of orders) {
        setPendingId(order.id);
        try {
          await updateStatus.mutateAsync({
            commandId: order.id,
            targetStatus,
            payments,
          });
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      setPendingId(null);
      setSelected(new Set());
      if (ok) toast.success(t("ops.toast_bulk_ok", { count: ok }));
      if (failed) toast.error(t("ops.toast_bulk_fail", { count: failed }));
    },
    [t, updateStatus],
  );

  const handleValidate = (order) => {
    const next = PRIMARY_NEXT[order.commandStatus];
    if (!next) return;
    if (next === "PAYE") {
      setPayOrder(order);
      return;
    }
    if (next === "PREPARE") {
      setPrepareConfirm({ orders: [order], targetStatus: next });
      return;
    }
    applyStatus([order], next);
  };

  const handleBulk = () => {
    if (!bulkNext || !selectedRows.length) return;
    if (bulkNext === "PAYE") {
      toast.error(t("ops.toast_pay_single"));
      return;
    }
    if (bulkNext === "PREPARE") {
      setPrepareConfirm({ orders: selectedRows, targetStatus: bulkNext });
      return;
    }
    applyStatus(selectedRows, bulkNext);
  };

  return (
    <div className="min-h-screen p-4 font-sans md:p-8">
      <HeaderTable title={t("title")} />

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <SelectUI
          value={statusFilter}
          options={statusOptions}
          onChange={(e) => setStatus(e.target.value)}
        />
        {!isLivreur ? (
          <SelectUI
            clearable
            searchable
            value={livreurId}
            options={livreurOptions}
            placeholder={t("ops.all_livreurs")}
            onChange={(e) => setLivreurId(e.target.value || "")}
          />
        ) : (
          <div />
        )}
        <div className="flex h-[40px] overflow-hidden rounded-md border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#222222]">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`flex flex-1 items-center justify-center gap-1.5 text-[13px] font-semibold ${
              view === "grid" ? "bg-primary text-white" : "text-slate-500"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            {t("ops.grid")}
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`flex flex-1 items-center justify-center gap-1.5 text-[13px] font-semibold ${
              view === "list" ? "bg-primary text-white" : "text-slate-500"
            }`}
          >
            <List className="h-4 w-4" />
            {t("ops.list")}
          </button>
        </div>
      </div>

      <label className="mb-4 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search_placeholder")}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {t("ops.selected_count", { count: selected.size })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium dark:border-[#2e2e2e]"
            >
              {t("ops.clear_selection")}
            </button>
            {bulkNext && bulkNext !== "PAYE" && (
              <button
                type="button"
                disabled={updateStatus.isPending}
                onClick={handleBulk}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t(nextActionKey(selectedStatus))}
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-[#1c1c1c]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 px-4 py-12 text-center text-sm text-slate-400 dark:border-[#2e2e2e]">
          {t("ops.empty")}
        </p>
      ) : view === "grid" ? (
        <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 ${isFetching ? "opacity-80" : ""}`}>
          {rows.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              selected={selected.has(order.id)}
              onToggle={toggle}
              onView={setDetailOrder}
              onValidate={handleValidate}
              validating={pendingId === order.id}
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#161616]">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[12px] text-slate-500 dark:border-[#2e2e2e]">
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-3 py-3">{t("ops.col_cmd")}</th>
                <th className="px-3 py-3">{t("status")}</th>
                <th className="px-3 py-3">{t("client")}</th>
                <th className="px-3 py-3">{t("ops.phone")}</th>
                <th className="px-3 py-3">{t("ops.address")}</th>
                <th className="px-3 py-3">{t("delivery_date")}</th>
                <th className="px-3 py-3">{t("ops.colis")}</th>
                <th className="px-3 py-3">{t("preparateur")}</th>
                <th className="px-3 py-3">{t("livreur")}</th>
                <th className="px-3 py-3 text-end">{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr key={order.id} className="border-b border-slate-50 last:border-0 dark:border-[#2e2e2e]">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(order.id)}
                      onChange={() => toggle(order.id)}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-3 py-3 font-semibold">{order.documentNumber || order.id}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PILL[order.commandStatus] || ""}`}>
                      {t(`ops.status_${order.commandStatus}`, order.commandStatus)}
                    </span>
                  </td>
                  <td className="px-3 py-3">{order.clientName || "—"}</td>
                  <td className="px-3 py-3">{order.whatsapp || order.telephone || "—"}</td>
                  <td className="max-w-[180px] truncate px-3 py-3">
                    {[order.localisation, order.ville].filter(Boolean).join(" — ") || "—"}
                  </td>
                  <td className="px-3 py-3">{order.dateLivraison || "—"}</td>
                  <td className="px-3 py-3">{order.nombreDeColis ?? 0}</td>
                  <td className="px-3 py-3">{order.preparateurName || "—"}</td>
                  <td className="px-3 py-3">{order.livreurName || "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title={t("ops.view")}
                        onClick={() => setDetailOrder(order)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary dark:hover:bg-[#222]"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {PRIMARY_NEXT[order.commandStatus] && (
                        <button
                          type="button"
                          disabled={pendingId === order.id}
                          onClick={() => handleValidate(order)}
                          className="inline-flex h-8 items-center rounded-lg bg-sky-500 px-2 text-[11px] font-semibold text-white disabled:opacity-50"
                        >
                          {pendingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t(nextActionKey(order.commandStatus))}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-slate-400">{t("ops.page_of", { page: pagination.pageIndex + 1, total: totalPages, count: total })}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.pageIndex === 0}
              onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))}
              className="h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-40 dark:border-[#2e2e2e]"
            >
              {t("ops.prev")}
            </button>
            <button
              type="button"
              disabled={pagination.pageIndex + 1 >= totalPages}
              onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
              className="h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-40 dark:border-[#2e2e2e]"
            >
              {t("ops.next")}
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!prepareConfirm}
        onClose={() => setPrepareConfirm(null)}
        onConfirm={async () => {
          if (!prepareConfirm) return;
          await applyStatus(prepareConfirm.orders, prepareConfirm.targetStatus);
          setPrepareConfirm(null);
        }}
        title={t("ops.confirm_prepare_title")}
        message={t("ops.confirm_prepare_message", { count: prepareConfirm?.orders?.length ?? 1 })}
        confirmText={t("ops.validate_PREPARE")}
        cancelText={t("ops.clear_selection")}
        isLoading={updateStatus.isPending}
        variant="primary"
      />

      <OrderDetailsModal order={detailOrder} onClose={() => setDetailOrder(null)} t={t} />

      <PayOrderModal
        isOpen={!!payOrder}
        order={payOrder}
        isLoading={updateStatus.isPending}
        onClose={() => setPayOrder(null)}
        onConfirm={(payments) => {
          if (!payOrder) return;
          applyStatus([payOrder], "PAYE", payments).then(() => setPayOrder(null));
        }}
      />
    </div>
  );
};
