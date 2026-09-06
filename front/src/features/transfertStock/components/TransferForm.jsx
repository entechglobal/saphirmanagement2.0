import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import {
  Package,
  Plus,
  Trash2,
  ArrowRight,
  Warehouse,
  Lock,
} from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import {
  useCreateTransfer,
  useArticlesUnified,
  useDepots,
  useFamilies,
} from "../hooks/useTransfers";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { FormDatePicker } from "../../../shared/FormDatePicker";
import { FormCard, FormFieldGrid, FormGroup, FormShell } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { FORM_CONTROL_DISABLED, FORM_LABEL } from "../../../shared/components/formStyles";
import { SelectTransferArticlesModal } from "./SelectTransferArticlesModal";

/* ─────── Composite key ─────── */
const articleKey = (a) => `${a.type}-${a.id}`;

export const TransferForm = () => {
  const { t } = useTranslation("transfer");
  const navigate = useNavigate();
  const createMutation = useCreateTransfer();

  const [transferDate, setTransferDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [sourceDepot, setSourceDepot] = useState(null);
  const [destinationDepot, setDestinationDepot] = useState(null);
  const [status, setStatus] = useState("PENDING");
  const [notes, setNotes] = useState("");
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modalFamilyFilter, setModalFamilyFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const searchTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(searchTimerRef.current), []);

  const handleModalSearchChange = (value) => {
    setSearchQuery(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1);
    }, 350);
  };

  const { data: depotsData, isLoading: depotsLoading } = useDepots();
  const { data: familiesData, isLoading: familiesLoading } = useFamilies();
  const {
    data: articlesData,
    isLoading: articlesLoading,
    isFetching: articlesFetching,
  } = useArticlesUnified({
    depotId: sourceDepot?.id,
    familyId: modalFamilyFilter?.id,
    page: currentPage,
    limit: 10,
    search: debouncedSearch,
    enabled: isModalOpen,
  });

  const depots = depotsData?.data ?? [];
  const families = familiesData?.data ?? [];
  const articles = articlesData?.data ?? [];
  const pagination = articlesData?.pagination ?? { totalPages: 1, currentPage: 1, totalItems: 0 };

  /* ─────── Depot locked once articles are in the table ─────── */
  const isDepotLocked = selectedArticles.length > 0;

  /* ─────── At least one article must be touched before submit is allowed ─────── */
  const touchedArticles = selectedArticles.filter((a) => a.isTouched);
  const hasTouchedArticles = touchedArticles.length > 0;

  /* ─────── Helpers ─────── */
  const fmt = (n) =>
    Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleRemoveArticle = (article) => {
    setSelectedArticles((prev) => prev.filter((a) => articleKey(a) !== articleKey(article)));
  };

  /* Only mark isTouched on first real interaction (click/focus on input) */
  const handleQuantityFocus = (article) => {
    setSelectedArticles((prev) =>
      prev.map((a) =>
        articleKey(a) === articleKey(article) && !a.isTouched
          ? { ...a, isTouched: true, quantityReceived: a.quantityReceived === 0 ? 1 : a.quantityReceived }
          : a
      )
    );
  };

  const handleQuantityBlur = (article) => {
    setSelectedArticles((prev) =>
      prev.map((a) =>
        articleKey(a) === articleKey(article) && a.quantityReceived === ""
          ? { ...a, quantityReceived: 0 }
          : a
      )
    );
  };

  const handleQuantityChange = (article, quantity) => {
    if (quantity === "") {
      setSelectedArticles((prev) =>
        prev.map((a) =>
          articleKey(a) === articleKey(article)
            ? { ...a, quantityReceived: "", isTouched: true }
            : a
        )
      );
      return;
    }
    const parsed = parseInt(quantity);
    const numQty = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setSelectedArticles((prev) =>
      prev.map((a) =>
        articleKey(a) === articleKey(article)
          ? { ...a, quantityReceived: numQty, isTouched: true }
          : a
      )
    );
  };

  /* ─────── Submit — only touched articles go to backend ─────── */
  const handleSubmit = async () => {
    if (!sourceDepot) { toast.error(t("toast.source_depot_required")); return; }
    if (!destinationDepot) { toast.error(t("toast.destination_depot_required")); return; }
    if (sourceDepot.id === destinationDepot.id) { toast.error(t("toast.depots_must_differ")); return; }
    if (selectedArticles.length === 0) { toast.error(t("toast.select_at_least_one_article")); return; }
    if (!hasTouchedArticles) {
      toast.error(t("toast.enter_quantity_for_article"));
      return;
    }

    const lines = touchedArticles.map((article) => {
      const payload = { quantityReceived: Number(article.quantityReceived) || 0 };
      if (article.type === "variant") payload.variantId = article.id;
      else payload.articleId = article.id;
      return payload;
    });

    createMutation.mutate(
      { sourceDepotId: sourceDepot.id, destinationDepotId: destinationDepot.id, transferDate, status, notes: notes.trim() || undefined, lines },
      {
        onSuccess: (res) => { toast.success(res?.message || t("toast.create_success")); navigate("/transferts"); },
        onError: (err) => { toast.error(err?.response?.data?.message || t("toast.create_error")); },
      }
    );
  };

  const handleOpenModal = () => {
    if (!sourceDepot) { toast.error(t("toast.source_depot_required")); return; }
    if (!destinationDepot) { toast.error(t("toast.destination_depot_required")); return; }
    setIsModalOpen(true);
  };

  const handleModalConfirm = (pendingArticles) => {
    setSelectedArticles((prev) => {
      const existingKeys = new Set(prev.map(articleKey));
      const toAdd = pendingArticles.filter((a) => !existingKeys.has(articleKey(a)));
      return [...prev, ...toAdd];
    });
    setIsModalOpen(false);
    setSearchQuery("");
    setModalFamilyFilter(null);
    setCurrentPage(1);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSearchQuery("");
    setModalFamilyFilter(null);
    setCurrentPage(1);
  };

  /* ─────── Totals — only touched articles count ─────── */
  const totalQuantity = touchedArticles.reduce((sum, a) => sum + (a.quantityReceived || 0), 0);
  const totalValue = touchedArticles.reduce((sum, a) => sum + (a.quantityReceived || 0) * (a.prixAchat || 0), 0);

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={"transfers"}
        backPath="/transferts"
        isEdit={false}
        createTitle={t("create_title")}
        backLabel={t("back_label")}
        editTitleKey="transferNumber"
      />

      <FormShell wide>

        <FormCard
          title={t("informations")}
          description={t("informations_description")}
        >
          <div className="space-y-5">
            <FormGroup>
              <FormFieldGrid cols={3}>
                <div>
                  {isDepotLocked ? (
                    <div>
                      <label className={FORM_LABEL}>{t("source_depot_required")}</label>
                      <div className="relative">
                        <input
                          readOnly
                          value={`${sourceDepot?.name} (${sourceDepot?.societe?.raisonSocial})`}
                          className={`${FORM_CONTROL_DISABLED} pr-10`}
                          title={t("change_depot_hint")}
                        />
                        <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <p className="text-xs text-amber-500 mt-1.5">{t("change_depot_hint")}</p>
                    </div>
                  ) : (
                    <SelectDropDown
                      label={t("source_depot_required")}
                      placeholder={t("select_source_depot")}
                      value={sourceDepot?.id || ""}
                      options={depots.map((d) => ({ value: d.id, label: d.name, subLabel: d.societe?.raisonSocial }))}
                      isLoading={depotsLoading}
                      onChange={(e) => {
                        const depot = depots.find((d) => d.id === parseInt(e.target.value));
                        setSourceDepot(depot || null);
                        if (destinationDepot && destinationDepot.id === depot?.id) setDestinationDepot(null);
                      }}
                    />
                  )}
                </div>

                <div className="hidden xl:flex items-center justify-center pt-7">
                  <ArrowRight className="w-5 h-5 text-blue-400 rtl:scale-x-[-1]" />
                </div>

                <div>
                  {isDepotLocked ? (
                    <div>
                      <label className={FORM_LABEL}>{t("destination_depot_required")}</label>
                      <div className="relative">
                        <input
                          readOnly
                          value={destinationDepot ? `${destinationDepot.name} (${destinationDepot.societe?.raisonSocial})` : ""}
                          className={`${FORM_CONTROL_DISABLED} pr-10`}
                          title={t("change_depot_hint")}
                        />
                        <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <p className="text-xs text-amber-500 mt-1.5">{t("change_depot_hint")}</p>
                    </div>
                  ) : (
                    <SelectDropDown
                      label={t("destination_depot_required")}
                      placeholder={t("select_destination_depot")}
                      value={destinationDepot?.id || ""}
                      options={depots
                        .filter((d) => d.id !== sourceDepot?.id)
                        .map((d) => ({ value: d.id, label: d.name, subLabel: d.societe?.raisonSocial }))}
                      isLoading={depotsLoading}
                      disabled={!sourceDepot}
                      onChange={(e) => {
                        const depot = depots.find((d) => d.id === parseInt(e.target.value));
                        setDestinationDepot(depot || null);
                      }}
                    />
                  )}
                </div>
              </FormFieldGrid>
            </FormGroup>

            <FormGroup>
              <FormFieldGrid cols={3}>
                <FormDatePicker
                  label={t("transfer_date_required")}
                  name="transferDate"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  showTodayAsDefault
                />

                <SelectDropDown
                  label={t("status_label")}
                  value={status}
                  options={[
                    { value: "PENDING", label: t("status_badge.pending") },
                    { value: "COMPLETED", label: t("status_badge.completed") },
                  ]}
                  onChange={(e) => setStatus(e.target.value)}
                />

                <Input
                  label={t("notes")}
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("notes_placeholder")}
                />
              </FormFieldGrid>
            </FormGroup>

            <FormActions
              submitType="button"
              onSubmit={handleSubmit}
              submitLabel={t("create_transfer")}
              isLoading={createMutation.isPending}
              disabled={!sourceDepot || !destinationDepot || selectedArticles.length === 0 || !hasTouchedArticles}
              extra={selectedArticles.length > 0 && !hasTouchedArticles ? (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mr-auto">
                  {t("quantity_activation_hint")}
                </p>
              ) : null}
            />
          </div>
        </FormCard>

        <div className="overflow-x-auto">

          <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2e2e2e] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{t("articles_to_transfer")}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {selectedArticles.length} {t("articles_added")}
                  {hasTouchedArticles && (
                    <span className="ml-1 text-blue-500 font-semibold">
                      · {touchedArticles.length} {t("active")}
                    </span>
                  )}
                </p>
              </div>

              {hasTouchedArticles && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="hidden sm:block text-slate-300 dark:text-slate-700 text-sm">|</span>
                  <div className="flex items-center gap-1 text-xs font-bold text-[#B12B89] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg">
                    {t("total_quantity")}: {totalQuantity}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] px-2.5 py-1 rounded-lg">
                    {t("total_value")}: {fmt(totalValue)} MAD
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleOpenModal} className="flex items-center gap-2 h-10 px-4 bg-[#B12B89] hover:bg-[#9A2478] text-white rounded-md transition-colors font-medium text-sm whitespace-nowrap">
              <Plus className="w-4 h-4" /> {t("add_articles")}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-[#2e2e2e] bg-slate-50/80 dark:bg-[#222222]/50">
                  <th className="px-6 py-3.5 text-left font-semibold">{t("article")}</th>
                  <th className="px-5 py-3.5 text-left font-semibold">{t("barcode")}</th>
                  <th className="px-5 py-3.5 text-left font-semibold hidden sm:table-cell">{t("family")}</th>
                  <th className="px-5 py-3.5 text-left font-semibold hidden sm:table-cell">{t("type")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("purchase_price")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("quantity_to_transfer")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("value")}</th>
                  <th className="px-6 py-3.5 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2e2e2e]">
                {selectedArticles.length > 0 ? (
                  selectedArticles.map((article) => {
                    const isTouched = !!article.isTouched;
                    const qty = article.quantityReceived ?? 0;
                    const numQty = Number(qty) || 0;
                    const value = isTouched ? numQty * (article.prixAchat || 0) : null;
                    const overStock = isTouched && numQty > article.quantityAvailable;

                    return (
                      <tr
                        key={articleKey(article)}
                        className={`group transition-colors ${overStock
                          ? "bg-amber-50/30 dark:bg-amber-900/5"
                          : "hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                          }`}
                      >
                        {/* Article */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#222222]">
                              <Package className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[180px] block">
                                {article.name}
                              </span>
                              {isTouched && overStock && (
                                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                                  ⚠ {t("exceeds_available_stock", { available: article.quantityAvailable })}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Barcode */}
                        <td className="px-5 py-4">
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#222222] px-2 py-1 rounded">
                            {article.barcode}
                          </span>
                        </td>

                        {/* Family */}
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{article.familyName || "—"}</span>
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${article.type === "variant" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" : "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400"}`}>
                            {article.type === "variant" ? t("variant") : t("article_type")}
                          </span>
                        </td>

                        {/* Prix Achat */}
                        <td className="px-5 py-4 text-center">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            {fmt(article.prixAchat || 0)}
                          </span>
                        </td>

                        {/* Qty input — onFocus activates the row */}
                        <td className="px-5 py-4 text-center">
                          <input
                            type="number"
                            min="1"
                            value={qty}
                            onFocus={() => handleQuantityFocus(article)}
                            onChange={(e) => handleQuantityChange(article, e.target.value)}
                            onBlur={() => handleQuantityBlur(article)}
                            className={`w-24 px-2 py-1.5 border rounded-lg text-center text-sm font-bold outline-none focus:ring-2 transition-all dark:text-slate-100 ${overStock
                              ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 focus:ring-amber-400"
                              : "bg-white dark:bg-[#222222] border-slate-200 dark:border-[#2e2e2e] focus:ring-[#B12B89]"
                              }`}
                          />
                        </td>

                        {/* Valeur — dash until touched */}
                        <td className="px-5 py-4 text-center">
                          {isTouched ? (
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                              {fmt(value)} MAD
                            </span>
                          ) : (
                            <span className="text-sm text-slate-300 dark:text-slate-600 font-medium">—</span>
                          )}
                        </td>

                        {/* Delete */}
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleRemoveArticle(article)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <Package className="w-10 h-10 mb-3 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-500">{t("no_articles_selected")}</p>
                        <p className="text-xs text-slate-400 mt-1">{t("click_add_articles")}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FormShell>

      <SelectTransferArticlesModal
        isOpen={isModalOpen}
        articles={articles}
        isLoading={articlesLoading || articlesFetching}
        onClose={handleCloseModal}
        onConfirm={handleModalConfirm}
        searchQuery={searchQuery}
        onSearchChange={handleModalSearchChange}
        sourceDepot={sourceDepot}
        families={families}
        familiesLoading={familiesLoading}
        selectedFamily={modalFamilyFilter}
        onFamilyChange={(family) => { setModalFamilyFilter(family); setCurrentPage(1); }}
        pagination={pagination}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        alreadyInTable={selectedArticles}
        t={t}
      />
    </div>
  );
};

