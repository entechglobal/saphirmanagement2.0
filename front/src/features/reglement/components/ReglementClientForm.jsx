import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@/shared/lib/query";
import { toast } from "@/shared/utils/toast";
import { openPdfPreview } from "../../../shared/utils/pdfPreviewStore";
import {
  User,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  CheckSquare,
  Square,
  AlertCircle,
  BadgeCheck,
  Banknote,
  Building2,
  Phone,
  Printer,
  Plus,
} from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";

import { useCreateReglementClient, useRCClients, useUnpaidDocuments, useBanques, usePrintReglementClient } from "../hooks/useReglementClient";
import { MODE_REGLEMENT_OPTIONS, MODES_WITH_REF, MODES_WITH_BANQUE, reglementClientApi } from "../api/reglementClient.api";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { FormCard, FormFieldGrid, FormShell } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { FormDatePicker } from "../../../shared/FormDatePicker";
import { BaseModal } from "../../../shared/components/BaseModal";

/* ─────── helpers ─────── */
const fmt = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─────── AdvancesSelector ─────── */
const AdvancesSelector = ({ advances, selectedIds, onChange, isLoading }) => {
  const { t } = useTranslation("reglement");

  const totalSelected = advances
    .filter((a) => selectedIds.includes(a.id))
    .reduce((sum, a) => sum + parseFloat(a.montantRegle ?? 0), 0);

  const options = advances.map((adv) => ({
    value: adv.id,
    label: `${fmt(adv.montantRegle)} MAD`,
    subLabel: `${adv.modeReglement} · ${adv.date}`,
  }));

  const renderValue = (selected) => {
    if (Array.isArray(selected) && selected.length > 0) {
      if (selected.length === 1) {
        const single = advances.find((a) => a.id === selected[0]);
        return single
          ? `${fmt(single.montantRegle)} MAD`
          : t("advance_one_selected", { count: 1 });
      }
      return t("advances_multiple", { count: selected.length, total: fmt(totalSelected) });
    }
    return t("select_advances");
  };

  return (
    <SelectDropDown
      label={t("advances_label")}
      placeholder={t("select_advances")}
      multiple
      value={selectedIds}
      options={options}
      isLoading={isLoading}
      renderValue={renderValue}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

/* ─────── SelectClientModal ─────── */
const SelectClientModal = ({ isOpen, onClose, onSelect }) => {
  const { t } = useTranslation("reglement");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const timerRef = useRef(null);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setDebounced(val); setPage(1); }, 350);
  };

  const { data, isLoading } = useRCClients({ keyword: debounced });
  const clients = data?.data ?? [];
  const LIMIT = 8;
  const paginated = clients.slice((page - 1) * LIMIT, page * LIMIT);
  const totalPages = Math.ceil(clients.length / LIMIT) || 1;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("select_client_title")}
      subtitle={t("clients_available", { count: clients.length })}
      icon={<User className="w-5 h-5 text-[#B12B89]" />}
      iconBg="bg-blue-100 dark:bg-blue-900/30"
      maxWidth="max-w-2xl"
      bodyClassName="flex flex-col overflow-hidden p-0 min-h-0"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed transition">
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
            <span className="text-xs text-slate-500 tabular-nums min-w-[70px] text-center">
              {t("pagination_page", { page, total: totalPages })}
            </span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed transition">
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
          <button onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-[#2e2e2e] text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-[#222222] transition font-semibold text-sm">
            {t("btn_cancel")}
          </button>
        </div>
      }
    >
      <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2e2e2e] flex-shrink-0">
        <div className="relative">
          {isLoading
            ? <Loader2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
            : <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          }
          <input
            autoFocus
            type="text"
            placeholder={t("search_placeholder")}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-lg focus:ring-2 focus:ring-[#B12B89] outline-none text-sm dark:text-slate-100 transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <User className="w-8 h-8 mb-2" />
            <p className="text-sm">{t("no_clients")}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-[#222222]/50 border-b border-slate-100 dark:border-[#2e2e2e]">
                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("col_ref")}</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("col_name")}</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">{t("col_phone")}</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">{t("col_company")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-[#2e2e2e]">
              {paginated.map((client) => (
                <tr key={client.id} onClick={() => onSelect(client)}
                  className="cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-900/10 transition-colors">
                  <td className="px-6 py-3.5">
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-[#222222] px-2 py-0.5 rounded">
                      #{client.id}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{client.name}</p>
                    <p className="text-[10px] text-slate-400">{client.type}</p>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Phone className="w-3 h-3" />
                      {client.societe?.phone || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {client.societe?.raisonSocial || "—"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </BaseModal>
  );
};

/* ─────── SelectBLModal ─────── */
const SelectBLModal = ({ isOpen, unpaidDocs = [], initialSelectedBLs = [], onClose, onConfirm }) => {
  const { t } = useTranslation("reglement");
  const [pendingSelectedBLs, setPendingSelectedBLs] = useState(initialSelectedBLs);

  useEffect(() => {
    setPendingSelectedBLs(initialSelectedBLs);
  }, [initialSelectedBLs]);

  const toggleBL = (documentNumber) => {
    setPendingSelectedBLs((prev) =>
      prev.includes(documentNumber)
        ? prev.filter((num) => num !== documentNumber)
        : [...prev, documentNumber]
    );
  };

  const allSelected = unpaidDocs.length > 0 && unpaidDocs.every((doc) => pendingSelectedBLs.includes(doc.documentNumber));
  const selectedCount = pendingSelectedBLs.length;

  const handleToggleAll = () => {
    if (allSelected) {
      setPendingSelectedBLs([]);
    } else {
      setPendingSelectedBLs(unpaidDocs.map((doc) => doc.documentNumber));
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("select_bl_title")}
      subtitle={t("bl_selected_count", { count: selectedCount })}
      icon={<FileText className="w-5 h-5 text-[#B12B89]" />}
      iconBg="bg-blue-100 dark:bg-blue-900/30"
      maxWidth="max-w-xl"
      bodyClassName="flex flex-col overflow-hidden p-0 min-h-0"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 dark:border-[#2e2e2e] text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-[#222222] transition font-semibold text-sm">
            {t("btn_cancel")}
          </button>
          <button onClick={() => onConfirm(pendingSelectedBLs)} disabled={selectedCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#B12B89] hover:bg-[#B05596] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition font-semibold text-sm">
            <BadgeCheck className="w-4 h-4" />
            {t("btn_confirm")} ({selectedCount})
          </button>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        {unpaidDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <FileText className="w-8 h-8 mb-2" />
            <p className="text-sm">{t("no_bl")}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-[#222222]/50 border-b border-slate-100 dark:border-[#2e2e2e]">
                <th className="px-6 py-3 w-12">
                  <div className="flex flex-col items-center gap-1 mx-auto">
                    <button onClick={handleToggleAll}
                      className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100 transition"
                      aria-label={allSelected ? t("deselect_all") : t("select_all")}>
                      {allSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </button>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{t("select_all")}</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("col_bl_ref")}</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("col_date")}</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("col_bl_amount")}</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("col_reste")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-[#2e2e2e]">
              {unpaidDocs.map((doc) => {
                const selected = pendingSelectedBLs.includes(doc.documentNumber);
                return (
                  <tr key={doc.documentNumber} onClick={() => toggleBL(doc.documentNumber)}
                    className={`cursor-pointer transition-colors ${selected ? "bg-blue-50/70 dark:bg-blue-900/10" : "hover:bg-slate-50 dark:hover:bg-[#222222]/30"}`}>
                    <td className="px-6 py-3.5">
                      {selected
                        ? <CheckSquare className="w-5 h-5 text-blue-500" />
                        : <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">{doc.documentNumber}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {dayjs(doc.documentDate).format("DD/MM/YYYY")}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {fmt(doc.amountDue)} MAD
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded border border-red-100 dark:border-red-500/20">
                        {fmt(doc.reste)} MAD
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </BaseModal>
  );
};


const RC_DRAFT_KEY = "rc_create_draft_state";

/* ─────── ReglementClientForm ─────── */
export const ReglementClientForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createMutation = useCreateReglementClient();
  const printMutation = usePrintReglementClient();
  const { t } = useTranslation("reglement");

  /* form state */
  const [date, setDate] = useState(dayjs());
  const [selectedClient, setSelectedClient] = useState(null);
  const [modeReglement, setModeReglement] = useState("ESPECE");
  const [montantRegle, setMontantRegle] = useState("");
  const [refDocument, setRefDocument] = useState("");
  const [dateEcheance, setDateEcheance] = useState("");
  const [selectedBLs, setSelectedBLs] = useState([]);
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState([]);
  const [selectedBanque, setSelectedBanque] = useState(null);

  /* modals */
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBLModal, setShowBLModal] = useState(false);

  /* Draft restore (returning from client create) */
  useEffect(() => {
    const saved = sessionStorage.getItem(RC_DRAFT_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      if (draft.date) setDate(dayjs(draft.date));
      if (draft.selectedClient) setSelectedClient(draft.selectedClient);
      if (draft.modeReglement) setModeReglement(draft.modeReglement);
      if (draft.montantRegle !== undefined) setMontantRegle(draft.montantRegle);
      if (draft.refDocument !== undefined) setRefDocument(draft.refDocument);
      if (draft.dateEcheance !== undefined) setDateEcheance(draft.dateEcheance);
      if (draft.selectedBLs) setSelectedBLs(draft.selectedBLs);
      if (draft.selectedAdvanceIds) setSelectedAdvanceIds(draft.selectedAdvanceIds);
      sessionStorage.removeItem(RC_DRAFT_KEY);
      queryClient.invalidateQueries({ queryKey: ["rc-clients"] });
      toast.info(t("draft_restored", "Brouillon restauré"));
    } catch {
      sessionStorage.removeItem(RC_DRAFT_KEY);
    }
  }, []);

  const handleSaveAndNavigateToClient = () => {
    const draft = { date: date?.format("YYYY-MM-DDTHH:mm:ss"), selectedClient, modeReglement, montantRegle, refDocument, dateEcheance, selectedBLs, selectedAdvanceIds };
    sessionStorage.setItem(RC_DRAFT_KEY, JSON.stringify(draft));
    navigate(`/clients/create?returnTo=${encodeURIComponent("/reglements-client/create")}`);
  };

  const societeId = selectedClient?.societeId ?? null;
  const needsRef = MODES_WITH_REF.includes(modeReglement);
  const needsBanque = MODES_WITH_BANQUE.includes(modeReglement);

  const { data: unpaidData, isLoading: unpaidLoading } = useUnpaidDocuments({
    clientId: selectedClient?.id,
    societeId,
  });
  const { data: banquesData, isLoading: banquesLoading } = useBanques();

  const unpaidDocs = unpaidData?.data?.unpaidDocuments ?? [];
  const advances = unpaidData?.data?.advances ?? [];
  const banques = banquesData?.data ?? [];

  /* compute totals */
  const totalReste = useMemo(() => {
    return selectedBLs.reduce((sum, docNum) => {
      const doc = unpaidDocs.find((d) => d.documentNumber === docNum);
      return sum + (doc ? Number(doc.reste) : 0);
    }, 0);
  }, [selectedBLs, unpaidDocs]);

  const avanceMontant = advances
    .filter((a) => selectedAdvanceIds.includes(a.id))
    .reduce((sum, a) => sum + parseFloat(a.montantRegle ?? 0), 0);

  const totalResteApresAvance = Math.max(0, totalReste - avanceMontant);

  const montantNum = montantRegle === "" ? 0 : Number(montantRegle);
  const solde = selectedBLs.length > 0
    ? Math.max(0, totalResteApresAvance - montantNum)
    : 0;

  useEffect(() => {
    if (selectedBLs.length > 0) {
      setMontantRegle(totalResteApresAvance.toFixed(2));
    }
  }, [totalResteApresAvance, selectedBLs.length]);

  useEffect(() => {
    if (!needsBanque) setSelectedBanque(null);
  }, [needsBanque]);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setSelectedBLs([]);
    setSelectedAdvanceIds([]);
    setMontantRegle("");
    setShowClientModal(false);
  };

  const toggleBL = (docNum) => {
    setSelectedBLs((prev) =>
      prev.includes(docNum) ? prev.filter((d) => d !== docNum) : [...prev, docNum]
    );
  };

  const handleBLConfirm = (newSelectedBLs) => {
    setSelectedBLs(newSelectedBLs);
    setShowBLModal(false);
  };

  const handleSubmit = async (withPrint = false) => {
    if (!selectedClient) { toast.error(t("err_select_client")); return; }
    if (!date?.isValid()) { toast.error(t("err_date_required")); return; }
    if (!modeReglement) { toast.error(t("err_mode_required")); return; }
    if (montantRegle === "") { toast.error(t("err_montant_required")); return; }
    if (needsRef && !refDocument) { toast.error(t("err_ref_required")); return; }
    if (needsBanque && !selectedBanque) { toast.error(t("err_banque_required")); return; }

    const payload = {
      date: date?.isValid() ? date.format("YYYY-MM-DDTHH:mm:ss") : undefined,
      clientId: selectedClient.id,
      modeReglement,
      montantRegle: montantNum,
      solde,
      documentNumbers: selectedBLs.length > 0 ? selectedBLs : undefined,
      ...(needsRef && refDocument ? { refDocument } : {}),
      ...(needsRef && dateEcheance ? { dateEcheance } : {}),
      ...(selectedAdvanceIds.length > 0 ? { advanceIds: selectedAdvanceIds } : {}),
      ...(needsBanque && selectedBanque ? { banqueId: selectedBanque.id } : {}),
    };

    createMutation.mutate(
      { societeId, payload },
      {
        onSuccess: async (res) => {
          toast.success(res?.message || t("create_success"));
          if (withPrint && res?.data?.id) {
            try {
              const blob = await reglementClientApi.printPDF(res.data.id);
              openPdfPreview({
                blob,
                filename: `reglement-client-${res.data.id}.pdf`,
                title: "Aperçu — Règlement client",
              });
            } catch {
              toast.error(t("create_print_error"));
            }
          }
          navigate("/reglements-client");
        },
        onError: (err) => {
          toast.error(err?.response?.data?.message || t("create_error"));
        },
      }
    );
  };

  const labelClass = "block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 ml-1";
  const canSubmit =
    selectedClient &&
    date?.isValid() &&
    modeReglement &&
    montantRegle !== "" &&
    (!needsBanque || selectedBanque) &&
    !createMutation.isPending;

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("entity_name")}
        backPath="/reglements-client"
        isEdit={false}
        createTitle={t("create_title")}
        backLabel={t("back_label")}
      />

      <FormShell>
        <FormCard
          title={t("section_info_title")}
          description={t("section_info_desc")}
          icon={<User />}
        >
          <div className="space-y-5">
            {/* Client selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>{t("label_client")} <span className="text-red-500">*</span></label>
                <button
                  type="button"
                  onClick={handleSaveAndNavigateToClient}
                  title={t("create_client", "Créer client")}
                  className="flex-shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-md bg-[#B12B89] hover:bg-[#9A2478] text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {selectedClient ? (
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg cursor-pointer" onClick={() => setShowClientModal(true)}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                      <User className="w-4 h-4 text-[#B12B89] dark:text-blue-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedClient.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {selectedClient.type} · {selectedClient.societe?.raisonSocial}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowClientModal(true)}
                    className="text-xs text-[#B12B89] dark:text-blue-400 hover:underline font-semibold"
                  >
                    {t("btn_change")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClientModal(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-[#2e2e2e] rounded-lg text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all text-sm font-semibold"
                >
                  <User className="w-4 h-4" />
                  {t("btn_select_client")}
                </button>
              )}
            </div>

            <FormFieldGrid>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 ml-1">{t("label_date")} <span className="text-red-500">*</span></label>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    value={date}
                    onChange={(val) => setDate(val)}
                    format="DD/MM/YYYY HH:mm"
                    slotProps={{
                      textField: {
                        size: "small",
                        variant: "outlined",
                        fullWidth: true,
                        sx: (theme) => ({
                          "& .MuiPickersInputBase-root, & .MuiPickersOutlinedInput-root": {
                            backgroundColor: theme.palette.mode === "dark" ? "#222222" : "#ffffff",
                            borderRadius: "10px",
                            height: "46px",
                          },
                          "& .MuiPickersOutlinedInput-notchedOutline": {
                            borderColor: theme.palette.mode === "dark" ? "#2e2e2e" : "#e2e8f0",
                          },
                          "&:hover .MuiPickersOutlinedInput-notchedOutline": { borderColor: "#B12B89" },
                          "& .Mui-focused .MuiPickersOutlinedInput-notchedOutline": { borderColor: "#B12B89" },
                          "& .MuiPickersSectionList-root": { padding: "0 4px", height: "100%", display: "flex", alignItems: "center" },
                          "& .MuiPickersSectionList-section": { color: theme.palette.text.primary },
                          "& .MuiInputLabel-root": { display: "none" },
                        }),
                      },
                    }}
                  />
                </LocalizationProvider>
              </div>
              <SelectDropDown
                label={`${t("label_mode")} *`}
                value={modeReglement}
                options={MODE_REGLEMENT_OPTIONS.map((m) => ({ value: m.value, label: t(`mode_${m.value}`, m.label) }))}
                onChange={(e) => setModeReglement(e.target.value)}
              />
            </FormFieldGrid>

            {/* Ref + Echeance — shown for CHEQUE / EFFET */}
            {needsRef && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-2 sm:col-span-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                    {t("mode_ref_warning", { mode: modeReglement })}
                  </p>
                </div>
                <Input
                  label={`${t("label_ref_doc")} *`}
                  value={refDocument}
                  onChange={(e) => setRefDocument(e.target.value)}
                  placeholder={t("placeholder_ref_doc")}
                />
                <FormDatePicker
                  label={`${t("label_echeance")} *`}
                  name="dateEcheance"
                  value={dateEcheance}
                  onChange={(e) => setDateEcheance(e.target.value)}
                />
              </div>
            )}

            {/* Banque — shown for CARTE_BANCAIRE / VIREMENT */}
            {needsBanque && (
              <div className="p-4 bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-sky-700 dark:text-sky-400 font-semibold">
                    {t("banque_instruction")}
                  </p>
                </div>
                {banquesLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t("banques_loading")}
                  </div>
                ) : banques.length === 0 ? (
                  <p className="text-xs text-slate-400">{t("no_banques")}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {banques.map((banque) => {
                      const isSelected = selectedBanque?.id === banque.id;
                      return (
                        <div
                          key={banque.id}
                          onClick={() => setSelectedBanque(isSelected ? null : banque)}
                          className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-all ${isSelected
                            ? "bg-sky-100 dark:bg-sky-900/30 border-sky-400 dark:border-sky-600"
                            : "bg-white dark:bg-[#222222]/50 border-slate-200 dark:border-[#2e2e2e] hover:border-sky-300"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            {isSelected
                              ? <CheckSquare className="w-4 h-4 text-sky-500 flex-shrink-0" />
                              : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                            }
                            <div>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{banque.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{banque.RIB}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 hidden sm:block">{banque.ville}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </FormCard>

        {selectedClient && (
          <FormCard>
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border bg-slate-50 dark:bg-[#222222]/50 border-slate-200 dark:border-[#2e2e2e]">
                <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-400">{t("total_bl")}</span>
                <p className="text-[11px] font-black text-[#B12B89] dark:text-blue-400 font-mono mt-1">
                  {fmt(unpaidDocs.reduce((sum, doc) => sum + Number(doc.reste), 0))} MAD
                </p>
              </div>
              <div className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border bg-slate-50 dark:bg-[#222222]/50 border-slate-200 dark:border-[#2e2e2e]">
                <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-400">{t("total_avances")}</span>
                <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                  {fmt(advances.reduce((sum, adv) => sum + Number(adv.montantRegle), 0))} MAD
                </p>
              </div>
            </div>
          </FormCard>
        )}

        <FormCard
          title={t("section_bl_title")}
          description={t("section_bl_desc")}
          icon={<FileText />}
          action={
            <button
              type="button"
              onClick={() => {
                if (!selectedClient) { toast.error(t("err_select_client_first")); return; }
                setShowBLModal(true);
              }}
              disabled={!selectedClient || unpaidLoading}
              className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-md bg-[#B12B89] hover:bg-[#9A2478] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {unpaidLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              {t("btn_select_bl")}
            </button>
          }
        >

          {selectedBLs.length > 0 ? (
            <div className="space-y-2">
              {selectedBLs.map((docNum) => {
                const doc = unpaidDocs.find((d) => d.documentNumber === docNum);
                return (
                  <div key={docNum} className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-[#222222]/50 border border-slate-200 dark:border-[#2e2e2e] rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">{docNum}</span>
                      {doc && (
                        <span className="text-[10px] text-slate-400">
                          {dayjs(doc.documentDate).format("DD/MM/YYYY")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {doc && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded border border-red-100 dark:border-red-500/20">
                          {t("bl_reste", { amount: fmt(doc.reste) })}
                        </span>
                      )}
                      <button
                        onClick={() => toggleBL(docNum)}
                        className="p-1 text-slate-400 hover:text-red-500 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Total reste */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-[#2e2e2e] mt-2">
                <span className="text-xs text-slate-500 font-semibold">{t("total_reste")}</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{fmt(totalReste)} MAD</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 opacity-40">
              <FileText className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">{t("no_bl_selected")}</p>
            </div>
          )}
        </FormCard>

        {advances.length > 0 && (
          <FormCard>
            <AdvancesSelector
              advances={advances}
              selectedIds={selectedAdvanceIds}
              onChange={setSelectedAdvanceIds}
              isLoading={unpaidLoading}
            />

            {selectedAdvanceIds.length > 0 && selectedBLs.length > 0 && (
              <div className="mt-5 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between">
                <div className="text-xs text-emerald-700 dark:text-emerald-300">
                  <span className="font-semibold">{t("total_reste_short")}</span> {fmt(totalReste)} MAD
                  <span className="mx-2 text-emerald-400">−</span>
                  <span className="font-semibold">{t("avances_deduction")}</span> {fmt(avanceMontant)} MAD
                </div>
                <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm font-mono">
                  = {fmt(totalResteApresAvance)} MAD
                </span>
              </div>
            )}
          </FormCard>
        )}

        <FormCard>
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <div className="flex-1">
              <label className={labelClass}>{t("label_montant")} <span className="text-red-500">*</span></label>
              <div className="relative">
                <Banknote className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montantRegle}
                  onChange={(e) => setMontantRegle(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 pl-9 pr-4 bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-md focus:ring-2 focus:ring-[#B12B89] outline-none text-sm dark:text-slate-100 font-semibold transition"
                />
              </div>
              {selectedBLs.length > 0 && (
                <p className="text-[10px] text-slate-400 mt-1 ml-1">
                  {t("total_a_regler")} <span className="font-bold text-slate-600 dark:text-slate-300">{fmt(totalResteApresAvance)} MAD</span>
                </p>
              )}
            </div>

            {selectedBLs.length > 0 && (
              <div className="flex flex-col gap-1 px-4 py-3 rounded-lg border min-w-[180px]
                bg-slate-50 dark:bg-[#222222]/50 border-slate-200 dark:border-[#2e2e2e]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{t("label_solde_restant")}</span>
                <span className={`text-lg font-black font-mono ${solde > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {fmt(solde)} MAD
                </span>
              </div>
            )}
          </div>
        </FormCard>

        <FormActions
          onCancel={() => navigate("/reglements-client")}
          cancelLabel={t("btn_cancel")}
          submitLabel={createMutation.isPending ? t("btn_saving") : t("btn_save")}
          isLoading={createMutation.isPending}
          disabled={!canSubmit}
          submitType="button"
          onSubmit={() => handleSubmit(false)}
          extra={
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-md border border-[#B12B89] text-[#B12B89] hover:bg-[#B12B89]/5 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {t("btn_save_print")}
            </button>
          }
        />
      </FormShell>

      <SelectClientModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSelect={handleSelectClient}
      />

      <SelectBLModal
        isOpen={showBLModal}
        unpaidDocs={unpaidDocs}
        initialSelectedBLs={selectedBLs}
        onClose={() => setShowBLModal(false)}
        onConfirm={handleBLConfirm}
      />
    </div>
  );
};
