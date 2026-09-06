import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/shared/utils/toast";
import { openPdfPreview } from "../../../shared/utils/pdfPreviewStore";
import {
  Search,
  Loader2,
  Building2,
  FileText,
  CheckSquare,
  Square,
  AlertCircle,
  BadgeCheck,
  Banknote,
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
} from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import {
  useCreateReglementFournisseur,
  useUnpaidBRs,
  useRFFournisseurs,
  useRFBanques,
  usePrintReglementFournisseur,
} from "../hooks/useReglementFournisseur";
import {
  MODE_REGLEMENT_OPTIONS,
  MODES_WITH_REF,
  MODES_WITH_BANQUE,
  reglementFournisseurApi,
} from "../api/reglementFournisseur.api";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { FormCard, FormFieldGrid, FormShell } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { FormDatePicker } from "../../../shared/FormDatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { BaseModal } from "../../../shared/components/BaseModal";
import useAuthStore from "../../auth/store/authStore";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─────── SelectFrsModal ─────── */
const SelectFrsModal = ({ isOpen, onClose, onSelect }) => {
  const { t } = useTranslation("reglementFournisseur");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const timerRef = useRef(null);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setDebounced(val); setPage(1); }, 350);
  };

  const { data, isLoading } = useRFFournisseurs({ keyword: debounced });
  const fournisseurs = data?.data ?? [];
  const LIMIT = 8;
  const paginated = fournisseurs.slice((page - 1) * LIMIT, page * LIMIT);
  const totalPages = Math.ceil(fournisseurs.length / LIMIT) || 1;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("select_frs_title", "Sélectionner un fournisseur")}
      subtitle={`${fournisseurs.length} fournisseur(s) disponible(s)`}
      icon={<Building2 className="w-5 h-5 text-[#B12B89]" />}
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
              Page {page} / {totalPages}
            </span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed transition">
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
          <button onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-[#2e2e2e] text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-[#222222] transition font-semibold text-sm">
            {t("btn_cancel")}
          </button>
        </div>
      }
    >
      {/* Search */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2e2e2e] flex-shrink-0">
        <div className="relative">
          {isLoading
            ? <Loader2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
            : <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          }
          <input
            autoFocus
            type="text"
            placeholder="Rechercher par nom, téléphone, ICE..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-xl focus:ring-2 focus:ring-[#B12B89] outline-none text-sm dark:text-slate-100 transition"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Building2 className="w-8 h-8 mb-2" />
            <p className="text-sm">Aucun fournisseur trouvé</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-[#222222]/50 border-b border-slate-100 dark:border-[#2e2e2e]">
                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Réf.</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Nom</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Téléphone</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-[#2e2e2e]">
              {paginated.map((frs) => (
                <tr key={frs.id} onClick={() => onSelect(frs)}
                  className="cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-900/10 transition-colors">
                  <td className="px-6 py-3.5">
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-[#222222] px-2 py-0.5 rounded">
                      #{frs.id}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{frs.name}</p>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Phone className="w-3 h-3" />
                      {frs.phone || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {frs.type || "—"}
                    </span>
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

/* ─────── AdvancesSelector ─────── */
const AdvancesSelector = ({ advances, selectedIds, onChange }) => {
  const { t } = useTranslation("reglementFournisseur");

  const totalSelected = advances
    .filter((a) => selectedIds.includes(a.id))
    .reduce((sum, a) => sum + parseFloat(a.montantRegle ?? 0), 0);

  const options = advances.map((adv) => ({
    value: adv.id,
    label: `${fmt(adv.montantRegle)} MAD`,
    subLabel: `${adv.modeReglement} · ${adv.date}`,
  }));

  const renderValue = (selected) => {
    if (!Array.isArray(selected) || selected.length === 0) {
      return <span style={{ opacity: 0.5 }}>{t("select_advances")}</span>;
    }
    return (
      <span className="font-semibold text-[#B12B89] dark:text-blue-400">
        {selected.length} avance(s) · {fmt(totalSelected)} MAD
      </span>
    );
  };

  return (
    <SelectDropDown
      label={t("advances_label")}
      placeholder={t("select_advances")}
      multiple
      value={selectedIds}
      options={options}
      renderValue={renderValue}
      onChange={(e) => {
        const val = e.target.value;
        onChange(typeof val === "string" ? val.split(",").map(Number) : val);
      }}
    />
  );
};

/* ─────── SelectBRModal ─────── */
const SelectBRModal = ({ isOpen, unpaidDocs = [], initialSelectedBRs = [], onClose, onConfirm }) => {
  const { t } = useTranslation("reglementFournisseur");
  const [pendingSelected, setPendingSelected] = useState(initialSelectedBRs);

  useEffect(() => { setPendingSelected(initialSelectedBRs); }, [initialSelectedBRs]);

  const toggleBR = (documentNumber) => {
    setPendingSelected((prev) =>
      prev.includes(documentNumber)
        ? prev.filter((n) => n !== documentNumber)
        : [...prev, documentNumber]
    );
  };

  const allSelected = unpaidDocs.length > 0 && unpaidDocs.every((d) => pendingSelected.includes(d.documentNumber));
  const handleToggleAll = () => {
    setPendingSelected(allSelected ? [] : unpaidDocs.map((d) => d.documentNumber));
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("select_br_title")}
      subtitle={t("br_selected_count", { count: pendingSelected.length })}
      icon={<FileText className="w-5 h-5 text-[#B12B89]" />}
      iconBg="bg-blue-100 dark:bg-blue-900/30"
      maxWidth="max-w-xl"
      bodyClassName="flex flex-col overflow-hidden p-0 min-h-0"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 dark:border-[#2e2e2e] text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-[#222222] transition font-semibold text-sm">
            {t("btn_cancel")}
          </button>
          <button onClick={() => onConfirm(pendingSelected)} disabled={pendingSelected.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#B12B89] hover:bg-[#B05596] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition font-semibold text-sm">
            <BadgeCheck className="w-4 h-4" />
            {t("btn_confirm")} ({pendingSelected.length})
          </button>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        {unpaidDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <FileText className="w-8 h-8 mb-2" />
            <p className="text-sm">{t("no_br")}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-[#222222]/50 border-b border-slate-100 dark:border-[#2e2e2e]">
                <th className="px-6 py-3 w-12">
                  <div className="flex flex-col items-center gap-1 mx-auto">
                    <button onClick={handleToggleAll}
                      className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100 transition">
                      {allSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </button>
                    <span className="text-[10px] text-slate-500">{t("select_all")}</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("col_br_ref")}</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("col_date")}</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("col_br_amount")}</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("col_reste")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-[#2e2e2e]">
              {unpaidDocs.map((doc) => {
                const selected = pendingSelected.includes(doc.documentNumber);
                return (
                  <tr key={doc.documentNumber} onClick={() => toggleBR(doc.documentNumber)}
                    className={`cursor-pointer transition-colors ${selected ? "bg-blue-50/70 dark:bg-blue-900/10" : "hover:bg-slate-50 dark:hover:bg-[#222222]/30"}`}>
                    <td className="px-6 py-3.5">
                      {selected
                        ? <CheckSquare className="w-5 h-5 text-blue-500" />
                        : <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">{doc.documentNumber}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {doc.documentDate ? dayjs(doc.documentDate).format("DD/MM/YYYY") : "—"}
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

const RF_DRAFT_KEY = "rf_create_draft_state";

/* ─────── ReglementFournisseurForm ─────── */
export const ReglementFournisseurForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createMutation = useCreateReglementFournisseur();
  const { t } = useTranslation("reglementFournisseur");
  const user = useAuthStore((s) => s.user);

  const [date, setDate] = useState(dayjs());
  const [selectedFrs, setSelectedFrs] = useState(null);
  const [modeReglement, setModeReglement] = useState("ESPECE");
  const [montantRegle, setMontantRegle] = useState("");
  const [refDocument, setRefDocument] = useState("");
  const [dateEcheance, setDateEcheance] = useState("");
  const [selectedBRs, setSelectedBRs] = useState([]);
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState([]);
  const [selectedBanque, setSelectedBanque] = useState(null);
  const [showFrsModal, setShowFrsModal] = useState(false);
  const [showBRModal, setShowBRModal] = useState(false);

  /* Draft restore */
  useEffect(() => {
    const saved = sessionStorage.getItem(RF_DRAFT_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      if (draft.date) setDate(dayjs(draft.date));
      if (draft.selectedFrs) setSelectedFrs(draft.selectedFrs);
      if (draft.modeReglement) setModeReglement(draft.modeReglement);
      if (draft.montantRegle !== undefined) setMontantRegle(draft.montantRegle);
      if (draft.refDocument !== undefined) setRefDocument(draft.refDocument);
      if (draft.dateEcheance !== undefined) setDateEcheance(draft.dateEcheance);
      if (draft.selectedBRs) setSelectedBRs(draft.selectedBRs);
      if (draft.selectedAdvanceIds) setSelectedAdvanceIds(draft.selectedAdvanceIds);
      sessionStorage.removeItem(RF_DRAFT_KEY);
    } catch {
      sessionStorage.removeItem(RF_DRAFT_KEY);
    }
  }, []);

  const societeId = selectedFrs?.societeId ?? user?.societeId ?? null;
  const needsRef = MODES_WITH_REF.includes(modeReglement);
  const needsBanque = MODES_WITH_BANQUE.includes(modeReglement);

  const { data: unpaidData, isLoading: unpaidLoading } = useUnpaidBRs({
    fournisseurId: selectedFrs?.id,
    societeId,
  });
  const { data: banquesData, isLoading: banquesLoading } = useRFBanques();

  const unpaidDocs = unpaidData?.data?.unpaidDocuments ?? [];
  const advances = unpaidData?.data?.advances ?? [];
  const banques = banquesData?.data ?? [];

  const totalReste = useMemo(() => {
    return selectedBRs.reduce((sum, docNum) => {
      const doc = unpaidDocs.find((d) => d.documentNumber === docNum);
      return sum + (doc ? Number(doc.reste) : 0);
    }, 0);
  }, [selectedBRs, unpaidDocs]);

  const avanceMontant = advances
    .filter((a) => selectedAdvanceIds.includes(a.id))
    .reduce((sum, a) => sum + parseFloat(a.montantRegle ?? 0), 0);

  const totalResteApresAvance = Math.max(0, totalReste - avanceMontant);
  const montantNum = montantRegle === "" ? 0 : Number(montantRegle);
  const solde = selectedBRs.length > 0 ? Math.max(0, totalResteApresAvance - montantNum) : 0;

  useEffect(() => {
    if (selectedBRs.length > 0) {
      setMontantRegle(totalResteApresAvance.toFixed(2));
    }
  }, [totalResteApresAvance, selectedBRs.length]);

  useEffect(() => {
    if (!needsBanque) setSelectedBanque(null);
  }, [needsBanque]);

  const handleSelectFrs = (frs) => {
    setSelectedFrs(frs);
    setSelectedBRs([]);
    setSelectedAdvanceIds([]);
    setMontantRegle("");
    setShowFrsModal(false);
  };

  const toggleBR = (docNum) => {
    setSelectedBRs((prev) =>
      prev.includes(docNum) ? prev.filter((d) => d !== docNum) : [...prev, docNum]
    );
  };

  const handleBRConfirm = (newSelected) => {
    setSelectedBRs(newSelected);
    setShowBRModal(false);
  };

  const handleSubmit = async (withPrint = false) => {
    if (!selectedFrs) { toast.error(t("err_select_fournisseur")); return; }
    if (!date?.isValid()) { toast.error(t("err_date_required")); return; }
    if (!modeReglement) { toast.error(t("err_mode_required")); return; }
    if (montantRegle === "") { toast.error(t("err_montant_required")); return; }
    if (needsRef && !refDocument) { toast.error(t("err_ref_required")); return; }
    if (needsBanque && !selectedBanque) { toast.error(t("err_banque_required")); return; }

    const payload = {
      date: date?.isValid() ? date.format("YYYY-MM-DDTHH:mm:ss") : undefined,
      fournisseurId: selectedFrs.id,
      modeReglement,
      montantRegle: montantNum,
      solde,
      documentNumbers: selectedBRs.length > 0 ? selectedBRs : undefined,
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
              const blob = await reglementFournisseurApi.printPDF(res.data.id);
              openPdfPreview({
                blob,
                filename: `reglement-fournisseur-${res.data.id}.pdf`,
                title: "Aperçu — Règlement fournisseur",
              });
            } catch {
              toast.error(t("create_print_error"));
            }
          }
          navigate("/reglements-fournisseur");
        },
        onError: (err) => {
          toast.error(err?.response?.data?.message || t("create_error"));
        },
      }
    );
  };

  const labelClass = "block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 ml-1";
  const canSubmit =
    selectedFrs &&
    date?.isValid() &&
    modeReglement &&
    montantRegle !== "" &&
    (!needsBanque || selectedBanque) &&
    !createMutation.isPending;

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("entity_name")}
        backPath="/reglements-fournisseur"
        isEdit={false}
        createTitle={t("create_title")}
        backLabel={t("back_label")}
      />

      <FormShell>
        <FormCard
          title={t("section_info_title")}
          description={t("section_info_desc")}
          icon={<Building2 />}
        >
          <div className="space-y-5">
            {/* Fournisseur selector */}
            <div>
              <label className={labelClass}>{t("label_fournisseur")} <span className="text-red-500">*</span></label>
              {selectedFrs ? (
                <div
                  className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg cursor-pointer"
                  onClick={() => setShowFrsModal(true)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-[#B12B89] dark:text-blue-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedFrs.name}</p>
                      {selectedFrs.type && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{selectedFrs.type}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowFrsModal(true); }}
                    className="text-xs text-[#B12B89] dark:text-blue-400 hover:underline font-semibold"
                  >
                    {t("btn_change")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowFrsModal(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-[#2e2e2e] rounded-lg text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all text-sm font-semibold"
                >
                  <Building2 className="w-4 h-4" />
                  {t("select_fournisseur_placeholder")}
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

            {/* Ref + Echéance — CHEQUE / EFFET */}
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

            {/* Banque — CARTE_BANCAIRE / VIREMENT */}
            {needsBanque && (
              <div className="p-4 bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-sky-700 dark:text-sky-400 font-semibold">{t("banque_instruction")}</p>
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
                              : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
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

        {selectedFrs && (
          <FormCard>
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border bg-slate-50 dark:bg-[#222222]/50 border-slate-200 dark:border-[#2e2e2e]">
                <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-400">{t("total_br")}</span>
                <p className="text-[11px] font-black text-[#B12B89] dark:text-blue-400 font-mono mt-1">
                  {fmt(unpaidDocs.reduce((sum, d) => sum + Number(d.reste), 0))} MAD
                </p>
              </div>
              <div className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border bg-slate-50 dark:bg-[#222222]/50 border-slate-200 dark:border-[#2e2e2e]">
                <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-400">{t("total_avances")}</span>
                <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                  {fmt(advances.reduce((sum, a) => sum + Number(a.montantRegle), 0))} MAD
                </p>
              </div>
            </div>
          </FormCard>
        )}

        <FormCard
          title={t("section_br_title")}
          description={t("section_br_desc")}
          icon={<FileText />}
          action={
            <button
              type="button"
              onClick={() => {
                if (!selectedFrs) { toast.error(t("err_select_fournisseur_first")); return; }
                setShowBRModal(true);
              }}
              disabled={!selectedFrs || unpaidLoading}
              className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-md bg-[#B12B89] hover:bg-[#9A2478] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {unpaidLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              {t("btn_select_br")}
            </button>
          }
        >

          {selectedBRs.length > 0 ? (
            <div className="space-y-2">
              {selectedBRs.map((docNum) => {
                const doc = unpaidDocs.find((d) => d.documentNumber === docNum);
                return (
                  <div key={docNum} className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-[#222222]/50 border border-slate-200 dark:border-[#2e2e2e] rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">{docNum}</span>
                      {doc?.documentDate && (
                        <span className="text-[10px] text-slate-400">
                          {dayjs(doc.documentDate).format("DD/MM/YYYY")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {doc && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded border border-red-100 dark:border-red-500/20">
                          {t("br_reste", { amount: fmt(doc.reste) })}
                        </span>
                      )}
                      <button onClick={() => toggleBR(docNum)} className="p-1 text-slate-400 hover:text-red-500 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-[#2e2e2e] mt-2">
                <span className="text-xs text-slate-500 font-semibold">{t("total_reste")}</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{fmt(totalReste)} MAD</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 opacity-40">
              <FileText className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">{t("no_br_selected")}</p>
            </div>
          )}
        </FormCard>

        {advances.length > 0 && (
          <FormCard>
            <AdvancesSelector
              advances={advances}
              selectedIds={selectedAdvanceIds}
              onChange={setSelectedAdvanceIds}
            />
            {selectedAdvanceIds.length > 0 && selectedBRs.length > 0 && (
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
              {selectedBRs.length > 0 && (
                <p className="text-[10px] text-slate-400 mt-1 ml-1">
                  {t("total_a_regler")} <span className="font-bold text-slate-600 dark:text-slate-300">{fmt(totalResteApresAvance)} MAD</span>
                </p>
              )}
            </div>

            {selectedBRs.length > 0 && (
              <div className="flex flex-col gap-1 px-4 py-3 rounded-lg border min-w-[180px] bg-slate-50 dark:bg-[#222222]/50 border-slate-200 dark:border-[#2e2e2e]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{t("label_solde_restant")}</span>
                <span className={`text-lg font-black font-mono ${solde > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {fmt(solde)} MAD
                </span>
              </div>
            )}
          </div>
        </FormCard>

        <FormActions
          onCancel={() => navigate("/reglements-fournisseur")}
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

      <SelectFrsModal
        isOpen={showFrsModal}
        onClose={() => setShowFrsModal(false)}
        onSelect={handleSelectFrs}
      />

      <SelectBRModal
        isOpen={showBRModal}
        unpaidDocs={unpaidDocs}
        initialSelectedBRs={selectedBRs}
        onClose={() => setShowBRModal(false)}
        onConfirm={handleBRConfirm}
      />
    </div>
  );
};
