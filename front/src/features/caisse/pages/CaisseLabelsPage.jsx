import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import {
  Tag,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useCaisseLabels,
  useCreateCaisseLabel,
  useUpdateCaisseLabel,
  useDeleteCaisseLabel,
} from "../hooks/useCaisseLabel";
import { ConfirmationModal } from "../../../shared/components/ConfirmationModal";
import { BaseModal } from "../../../shared/components/BaseModal";
import { Input } from "../../../shared/components/Input";

// ─── Form Modal ───────────────────────────────────────────────────────────────

const LabelFormModal = ({ isOpen, onClose, label }) => {
  const { t } = useTranslation("caisse");
  const isEdit = !!label;
  const createMutation = useCreateCaisseLabel();
  const updateMutation = useUpdateCaisseLabel();
  const mutation = isEdit ? updateMutation : createMutation;

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm({
    defaultValues: { name: "", active: true },
  });

  useEffect(() => {
    if (isOpen) {
      reset(label ? { name: label.name, active: label.active } : { name: "", active: true });
    }
  }, [isOpen, label, reset]);

  const onSubmit = (values) => {
    const payload = {
      name: values.name.trim(),
      active: values.active === true || values.active === "true",
    };
    const handlers = {
      onSuccess: (res) => {
        toast.success(res?.message || (isEdit ? t("success_label_updated") : t("success_label_created")));
        onClose();
      },
      onError: (err) => {
        const apiErrors = err?.response?.data?.errors;
        if (Array.isArray(apiErrors)) {
          apiErrors.forEach((e) => {
            if (e.path) setError(e.path, { type: "server", message: e.msg });
          });
        }
        toast.error(err?.response?.data?.message || (isEdit ? t("err_label_update") : t("err_label_create")));
      },
    };
    if (isEdit) mutation.mutate({ id: label.id, payload }, handlers);
    else mutation.mutate(payload, handlers);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={mutation.isPending}
      title={isEdit ? t("modal_label_edit_title") : t("modal_label_create_title")}
      subtitle={t("modal_label_subtitle")}
      icon={<Tag size={18} className="text-blue-500" />}
      iconBg="bg-blue-50 dark:bg-blue-900/20"
      maxWidth="max-w-sm"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition disabled:opacity-50"
          >
            {t("btn_cancel")}
          </button>
          <button
            type="submit"
            form="label-form"
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl text-white bg-[#B12B89] hover:bg-[#B05596] shadow-lg shadow-[#B12B89]/30 dark:shadow-none transition disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
            {mutation.isPending ? t("btn_saving") : isEdit ? t("btn_update") : t("btn_create")}
          </button>
        </div>
      }
    >
      <form id="label-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t("field_label_name")}
          {...register("name", { required: t("err_label_name_required") })}
          error={errors.name?.message}
          required
          placeholder={t("placeholder_label_name")}
        />
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("active")}
            defaultChecked
            className="w-4 h-4 rounded accent-blue-500"
          />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t("field_active")}
          </span>
        </label>
      </form>
    </BaseModal>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const CaisseLabelsPage = () => {
  const { t } = useTranslation("caisse");

  const [keyword,    setKeyword]    = useState("");
  const [page,       setPage]       = useState(0);
  const [pageSize,   setPageSize]   = useState(5);
  const [modalTarget, setModalTarget] = useState(undefined);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, isFetching } = useCaisseLabels({
    pageIndex: page,
    pageSize,
    keyword,
  });

  const deleteMutation = useDeleteCaisseLabel();

  const labels     = data?.data ?? [];
  const hasNext    = labels.length === pageSize;
  const hasPrev    = page > 0;

  const openCreate = () => { setModalTarget(undefined); setModalOpen(true); };
  const openEdit   = (row) => { setModalTarget(row); setModalOpen(true); };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: (res) => { toast.success(res?.message || t("success_label_deleted")); setDeleteTarget(null); },
      onError:   (err) => { toast.error(err?.response?.data?.message || t("err_label_delete")); setDeleteTarget(null); },
    });
  };

  const changeKeyword = (val) => { setKeyword(val); setPage(0); };
  const changeSize    = (val) => { setPageSize(Number(val)); setPage(0); };

  return (
    <div>
      <div className="bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2e2e2e] rounded-2xl overflow-hidden shadow-sm">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <Tag size={16} className="text-blue-500" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t("labels_page_title")}
            </h2>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#B12B89] hover:bg-[#B05596] text-white text-xs font-bold transition shadow-md shadow-[#B12B89]/30 dark:shadow-none"
          >
            <Plus size={13} />
            {t("btn_new_label")}
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-50 dark:border-[#2e2e2e]/60">
          <input
            value={keyword}
            onChange={(e) => changeKeyword(e.target.value)}
            placeholder={t("col_name") + "…"}
            className="w-full bg-slate-50 dark:bg-[#222222]/50 border border-slate-200 dark:border-[#2e2e2e] rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />
            Chargement…
          </div>
        ) : labels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Tag size={28} className="mb-2 opacity-40" />
            <p className="text-sm">Aucun libellé trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-[#2e2e2e]/60">
            {labels.map((label) => (
              <div key={label.id} className="flex items-center justify-between px-6 py-3.5 gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {label.name}
                  </p>
                  {label.active ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full flex-shrink-0">
                      <CheckCircle2 size={11} />
                      {t("status_active")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full flex-shrink-0">
                      <XCircle size={11} />
                      {t("status_inactive")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(label)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(label)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400">
              {labels.length > 0
                ? `${page * pageSize + 1}–${page * pageSize + labels.length} résultats`
                : "Aucun résultat"}
            </p>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => changeSize(e.target.value)}
                disabled={isLoading}
                className="appearance-none bg-slate-100 dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-lg px-2.5 py-1 pr-6 text-[11px] font-semibold text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div dir="ltr" className="flex items-center gap-1 bg-slate-100 dark:bg-[#222222] p-1 rounded-xl">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!hasPrev || isLoading}
              className="p-1.5 hover:bg-white dark:hover:bg-[#2e2e2e] rounded-lg transition disabled:opacity-30 text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-[10px] font-bold px-2 text-slate-500 dark:text-slate-400">
              {page + 1}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext || isLoading}
              className="p-1.5 hover:bg-white dark:hover:bg-[#2e2e2e] rounded-lg transition disabled:opacity-30 text-slate-500 dark:text-slate-400"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <LabelFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        label={modalTarget}
      />
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t("delete_label_title")}
        message={t("delete_label_message", { name: deleteTarget?.name })}
        confirmText={t("delete_label_confirm")}
        cancelText={t("btn_cancel")}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
