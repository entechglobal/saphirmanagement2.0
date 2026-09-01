import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Save, Loader2, Building2, Check } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { useSocietes, useSociete } from "@/features/societes/hooks/useSocietes";
import { useUpdateDocumentHeader } from "../hooks/useDocumentHeader";
import {
  DEFAULT_THEME_ID,
  DOCUMENT_THEME_IDS,
  DOCUMENT_THEMES,
  getThemeId,
  resolveDocumentHeaderConfig,
} from "../documentHeaderConfig";
import {
  DocumentThemeHeader,
  getTableHeaderStyle,
} from "../components/DocumentThemeHeader";

const MiniPreview = ({ themeId, selected, onSelect, label, description }) => {
  const theme = DOCUMENT_THEMES[themeId];
  const L = theme.layout;

  return (
    <button
      type="button"
      onClick={() => onSelect(themeId)}
      className={`overflow-hidden rounded-xl border text-left transition-all ${
        selected
          ? "border-[#B12B89] ring-2 ring-[#B12B89]/25"
          : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="min-w-0">
          <p className={`truncate text-xs font-semibold ${selected ? "text-[#B12B89]" : "text-slate-700 dark:text-slate-200"}`}>
            {label}
          </p>
          <p className="truncate text-[10px] text-slate-400">{description}</p>
        </div>
        {selected && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#B12B89] text-white">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="bg-white p-2">
        <div className="overflow-hidden rounded border border-slate-100 text-[6px]">
          {L === "ledger" && (
            <>
              <div className="flex justify-between p-1.5">
                <span className="font-bold" style={{ color: theme.primaryColor }}>Société</span>
                <span className="font-bold" style={{ color: theme.titleColor }}>DOC</span>
              </div>
              <div className="mx-1.5 mb-1 px-1 py-0.5 text-white" style={{ backgroundColor: theme.primaryColor }}>
                CLIENT
              </div>
            </>
          )}
          {L === "strip" && (
            <>
              <div className="flex justify-between p-1.5">
                <span className="font-bold">Logo</span>
                <span className="font-bold">Invoice</span>
              </div>
              <div className="mx-1 mb-1 grid grid-cols-4 text-white">
                <div className="px-0.5 py-1" style={{ backgroundColor: theme.primaryColor }}>N°</div>
                <div className="px-0.5 py-1" style={{ backgroundColor: theme.primaryColor }}>Date</div>
                <div className="px-0.5 py-1" style={{ backgroundColor: theme.primaryColor }}>Info</div>
                <div className="px-0.5 py-1" style={{ backgroundColor: theme.highlightBg }}>Total</div>
              </div>
            </>
          )}
          {L === "framed" && (
            <>
              <div className="flex justify-between px-1.5 py-2 text-white" style={{ backgroundColor: theme.primaryColor }}>
                <span className="font-bold">INVOICE</span>
                <span>Société</span>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1.5">
                <span>N° / Date</span>
                <span className="text-right">Bill To</span>
              </div>
            </>
          )}
          {L === "wave" && (
            <>
              <div
                className="flex justify-between px-1.5 pb-3 pt-1.5 text-white"
                style={{
                  background: `linear-gradient(120deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
                  borderBottomLeftRadius: "40% 10px",
                  borderBottomRightRadius: "60% 8px",
                }}
              >
                <span className="font-bold">INVOICE</span>
                <span>N°</span>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1.5">
                <span>Bill To</span>
                <span>From</span>
              </div>
            </>
          )}
          {L === "atelier" && (
            <>
              <div className="flex justify-between p-1.5">
                <span className="text-[8px] font-bold" style={{ color: theme.titleColor }}>INVOICE</span>
                <span className="rounded-full bg-slate-300 px-1 text-white">Logo</span>
              </div>
              <div className="mx-1.5 mb-1 h-0.5" style={{ backgroundColor: theme.secondaryColor }} />
              <div className="grid grid-cols-3 gap-1 px-1.5 pb-1.5">
                <span>Bill To</span>
                <span>Ship</span>
                <span className="text-right">Meta</span>
              </div>
            </>
          )}
          <div
            className="mx-1 mb-1 grid grid-cols-3 gap-0.5 px-1 py-1 font-bold"
            style={{
              backgroundColor: theme.tableStyle === "solid" ? theme.tableHeaderBg : "transparent",
              color: theme.tableHeaderText,
              borderBottom: theme.tableStyle === "lined" ? `2px solid ${theme.primaryColor}` : undefined,
            }}
          >
            <span>N°</span>
            <span>Art.</span>
            <span className="text-right">Total</span>
          </div>
        </div>
      </div>
    </button>
  );
};

const LivePreview = ({ themeId, societe }) => {
  const { t } = useTranslation("settings");
  const theme = resolveDocumentHeaderConfig({ themeId });
  const thStyle = getTableHeaderStyle(theme);
  const demoClient = { name: "Client Démo", address: "Casablanca", phone: "05 22 00 00 00" };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
        <Eye className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("doc_header.preview")}
        </span>
      </div>
      <div className="bg-slate-50 p-3 dark:bg-slate-950/40">
        <div className="overflow-hidden rounded-lg border border-slate-200/70 bg-white shadow-sm">
          <DocumentThemeHeader
            title="FACTURE"
            subText="N° FAC-2026-001 | 27/08/2026"
            documentNumber="FAC-2026-001"
            documentDate="27/08/2026"
            societe={societe}
            client={demoClient}
            clientLabel="BILL TO"
            infoBar="Dépôt: Principal"
            theme={theme}
            compact
          />
          <div className="px-2 pb-3">
            <div className="mt-2 grid grid-cols-4 gap-1 px-2 py-1.5 text-[8px] font-bold" style={thStyle}>
              <span>N°</span>
              <span className="col-span-2">Désignation</span>
              <span className="text-right">Total</span>
            </div>
            <div className="grid grid-cols-4 gap-1 border-b border-slate-100 px-2 py-1.5 text-[8px] text-slate-600">
              <span>1</span>
              <span className="col-span-2">Article exemple</span>
              <span className="text-right">100,00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DocumentHeaderSettingsPage = () => {
  const { t } = useTranslation("settings");
  const { data: listRes, isLoading: listLoading } = useSocietes({
    pageIndex: 0,
    pageSize: 200,
  });
  const societes = listRes?.data ?? [];
  const [selectedId, setSelectedId] = useState(null);
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);

  useEffect(() => {
    if (selectedId == null && societes.length > 0) setSelectedId(societes[0].id);
  }, [societes, selectedId]);

  const { data: societeRes, isLoading: societeLoading, isError } = useSociete(
    selectedId,
    { enabled: !!selectedId },
  );
  const societe = societeRes?.data;
  const updateMutation = useUpdateDocumentHeader();

  useEffect(() => {
    if (societe) setThemeId(getThemeId(societe.documentHeaderConfig));
  }, [societe]);

  const handleSave = () => {
    if (!selectedId) return;
    updateMutation.mutate(
      { config: { themeId }, societeId: selectedId },
      {
        onSuccess: () => toast.success(t("doc_header.toast_saved")),
        onError: (err) =>
          toast.error(err?.response?.data?.message || t("doc_header.toast_error")),
      },
    );
  };

  const isLoading = !!selectedId && societeLoading;

  if (listLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#B12B89]" />
      </div>
    );
  }

  if (!societes.length) {
    return (
      <div className="rounded-xl border border-slate-200 px-6 py-10 text-center dark:border-slate-800">
        <Building2 className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm font-semibold">{t("doc_header.no_societe_title")}</p>
        <p className="mt-1 text-xs text-slate-500">{t("doc_header.no_societe_list")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("doc_header.title")}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">{t("doc_header.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[200px] flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t("doc_header.societe_label")}
            </span>
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[#B12B89]/15 dark:border-slate-700"
            >
              {societes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.raisonSocial || `Société #${s.id}`}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending || !selectedId || isLoading}
            className="inline-flex h-[38px] items-center gap-1.5 rounded-lg bg-[#B12B89] px-4 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {t("doc_header.save")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#B12B89]" />
        </div>
      ) : isError || !societe ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-6 text-center text-sm text-rose-700">
          {t("doc_header.load_error")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DOCUMENT_THEME_IDS.map((id) => (
              <MiniPreview
                key={id}
                themeId={id}
                selected={themeId === id}
                onSelect={setThemeId}
                label={t(`doc_header.themes.${id}`)}
                description={t(`doc_header.theme_desc.${id}`)}
              />
            ))}
          </div>
          <LivePreview themeId={themeId} societe={societe} />
        </div>
      )}
    </div>
  );
};
