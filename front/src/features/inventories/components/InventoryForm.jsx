import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import {
    Package,
    Plus,
    Trash2,
    TrendingUp,
    TrendingDown,
    Lock
} from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import {
    useCreateInventory,
    useArticlesUnified,
    useDepots,
    useFamilies,
} from "../hooks/useInventories";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { FormDatePicker } from "../../../shared/FormDatePicker";
import { Input } from "../../../shared/components/Input";
import { FormCard, FormFieldGrid, FormGroup, FormShell } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { FORM_CONTROL_DISABLED, FORM_LABEL } from "../../../shared/components/formStyles";
import { SelectInventoryArticlesModal } from "./SelectInventoryArticlesModal";
/* ─────── Composite key ─────── */
const articleKey = (a) => `${a.type}-${a.id}`;

export const InventoryForm = () => {
    const { t } = useTranslation("inventory");
    const navigate = useNavigate();
    const createMutation = useCreateInventory();

    const [inventoryDate, setInventoryDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [selectedDepot, setSelectedDepot] = useState(null);
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
        depotId: selectedDepot?.id,
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

    /* ─────── Only touched articles count for totals/submit ─────── */
    const touchedArticles = selectedArticles.filter((a) => a.isTouched);
    const hasTouchedArticles = touchedArticles.length > 0;

    /* ─────── Écart computations — only touched rows ─────── */
    const totalEcart = touchedArticles.reduce((sum, a) => {
        const mvt = (a.quantityCounted || 0) - a.quantityAvailable;
        return sum + mvt * (a.prixAchat || 0);
    }, 0);
    const positiveEcart = touchedArticles.reduce((sum, a) => {
        const mvt = (a.quantityCounted || 0) - a.quantityAvailable;
        return mvt > 0 ? sum + mvt * (a.prixAchat || 0) : sum;
    }, 0);
    const negativeEcart = touchedArticles.reduce((sum, a) => {
        const mvt = (a.quantityCounted || 0) - a.quantityAvailable;
        return mvt < 0 ? sum + mvt * (a.prixAchat || 0) : sum;
    }, 0);

    const fmt = (n) =>
        n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const handleRemoveArticle = (article) => {
        setSelectedArticles((prev) =>
            prev.filter((a) => articleKey(a) !== articleKey(article))
        );
    };

    const handleQuantityFocus = (article) => {
        setSelectedArticles((prev) =>
            prev.map((a) =>
                articleKey(a) === articleKey(article) && !a.isTouched
                    ? { ...a, isTouched: true }
                    : a
            )
        );
    };

    const handleQuantityBlur = (article) => {
        setSelectedArticles((prev) =>
            prev.map((a) =>
                articleKey(a) === articleKey(article) && a.quantityCounted === ""
                    ? { ...a, quantityCounted: 0 }
                    : a
            )
        );
    };

    const handleQuantityChange = (article, quantity) => {
        if (quantity === "") {
            setSelectedArticles((prev) =>
                prev.map((a) =>
                    articleKey(a) === articleKey(article)
                        ? { ...a, quantityCounted: "", isTouched: true }
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
                    ? { ...a, quantityCounted: numQty, isTouched: true }
                    : a
            )
        );
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!selectedDepot) { toast.error(t("toast.depot_required")); return; }
        if (selectedArticles.length === 0) { toast.error(t("toast.articles_required")); return; }
        if (!hasTouchedArticles) { toast.error(t("toast.quantity_required")); return; }

        const lines = touchedArticles.map((article) => {
            const payload = { quantityCounted: Number(article.quantityCounted) || 0 };
            if (article.type === "variant") payload.variantId = article.id;
            else payload.articleId = article.id;
            return payload;
        });

        createMutation.mutate(
            { depotId: selectedDepot.id, inventoryDate, notes: notes.trim() || undefined, lines },
            {
                onSuccess: (res) => { toast.success(res?.message || t("toast.create_success")); navigate("/inventaires"); },
                onError: (err) => { toast.error(err?.response?.data?.message || t("toast.create_error")); },
            }
        );
    };

    const handleOpenModal = () => {
        if (!selectedDepot) { toast.error(t("toast.depot_required")); return; }
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

    /* ─────── Options for SelectDropDown ─────── */
    const depotOptions = depots.map((d) => ({
        value: d.id,
        label: d.name,
        subLabel: d.societe?.raisonSocial,
    }));

    return (
        <div className="-m-4 lg:-m-6 px-3 pt-3">
            <FormPageHeader
                entityName={"inventories"}
                backPath="/inventaires"
                isEdit={false}
                createTitle={t("create_title")}
                backLabel={t("back_label")}
                editTitleKey="name"
            />

            <FormShell wide>

                <FormCard
                    title={t("informations")}
                    description={t("informations_description")}
                >
                    <div className="space-y-5">
                        <FormGroup>
                            <FormFieldGrid cols={3}>
                                {isDepotLocked ? (
                                    <div>
                                        <label className={FORM_LABEL}>{t("depot_required")}</label>
                                        <div className="relative">
                                            <input
                                                readOnly
                                                value={`${selectedDepot?.name} (${selectedDepot?.societe?.raisonSocial})`}
                                                className={`${FORM_CONTROL_DISABLED} pr-10`}
                                                title={t("select_depot_first")}
                                            />
                                            <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                ) : (
                                    <SelectDropDown
                                        label={t("depot_required")}
                                        placeholder={t("select_depot")}
                                        value={selectedDepot?.id || ""}
                                        options={depotOptions}
                                        isLoading={depotsLoading}
                                        required
                                        onChange={(e) => {
                                            const depot = depots.find((d) => d.id === parseInt(e.target.value));
                                            setSelectedDepot(depot || null);
                                            setSelectedArticles([]);
                                        }}
                                    />
                                )}
                            </FormFieldGrid>
                        </FormGroup>

                        <FormGroup>
                            <FormFieldGrid cols={2}>
                                <FormDatePicker
                                    label={t("inventory_date_required")}
                                    name="inventoryDate"
                                    value={inventoryDate}
                                    onChange={(e) => setInventoryDate(e.target.value)}
                                    showTodayAsDefault
                                    required
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
                            submitLabel={t("create_inventory")}
                            isLoading={createMutation.isPending}
                            disabled={!selectedDepot || selectedArticles.length === 0 || !hasTouchedArticles}
                            extra={selectedArticles.length > 0 && !hasTouchedArticles ? (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mr-auto">
                                    {t("quantity_activation_hint")}
                                </p>
                            ) : null}
                        />
                    </div>
                </FormCard>

                <div className="overflow-x-auto">

                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">{t("selected_articles")}</h3>
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
                              
                                    <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${totalEcart === 0
                                        ? "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                        : totalEcart > 0
                                            ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                                            : "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                        }`}>
                                        {t("total_variance")}: {totalEcart > 0 ? "+" : ""}{fmt(totalEcart)} MAD
                                    </div>
                                </div>
                            )}
                        </div>

                        <button onClick={handleOpenModal} className="flex items-center gap-2 h-10 px-4 bg-[#B12B89] hover:bg-[#9A2478] text-white rounded-md transition-colors font-medium text-sm whitespace-nowrap">
                            <Plus className="w-4 h-4" /> {t("add_articles", "Ajouter des articles")}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead>
                                <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                                    <th className="px-6 py-3.5 text-left font-semibold">{t("article")}</th>
                                    <th className="px-5 py-3.5 text-left font-semibold">{t("barcode")}</th>
                                    <th className="px-5 py-3.5 text-left font-semibold hidden sm:table-cell">{t("family")}</th>
                                    <th className="px-5 py-3.5 text-left font-semibold hidden sm:table-cell">{t("type")}</th>
                                    <th className="px-5 py-3.5 text-center font-semibold">{t("stock")}</th>
                                    <th className="px-5 py-3.5 text-center font-semibold">{t("purchase_price")}</th>
                                    <th className="px-5 py-3.5 text-center font-semibold">{t("actual")}</th>
                                    <th className="px-5 py-3.5 text-center font-semibold">{t("movement")}</th>
                                    <th className="px-6 py-3.5 text-right font-semibold"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {selectedArticles.length > 0 ? (
                                    selectedArticles.map((article) => {
                                        const isTouched = !!article.isTouched;
                                        const qty = article.quantityCounted ?? 0;
                                        const diff = isTouched ? (Number(qty) || 0) - article.quantityAvailable : null;

                                        return (
                                            <tr key={articleKey(article)} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800">
                                                            <Package className="w-4 h-4 text-slate-500" />
                                                        </div>
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
                                                            {article.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                        {article.barcode}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 hidden sm:table-cell">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{article.familyName || "—"}</span>
                                                </td>
                                                <td className="px-5 py-4 hidden sm:table-cell">
                                                    <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${article.type === "variant" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" : "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400"}`}>
                                                        {article.type === "variant" ? t("variant") : t("article_type")}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{article.quantityAvailable}</span>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{fmt(article.prixAchat || 0)}</span>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={qty}
                                                        onFocus={() => handleQuantityFocus(article)}
                                                        onChange={(e) => handleQuantityChange(article, e.target.value)}
                                                        onBlur={() => handleQuantityBlur(article)}
                                                        className="w-20 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-[#B12B89] transition-all dark:text-slate-100"
                                                    />
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    {isTouched ? (
                                                        <span className={`inline-flex items-center justify-center min-w-[3rem] text-sm font-bold px-2 py-0.5 rounded-lg ${diff === 0
                                                            ? "text-slate-400 bg-slate-50 dark:bg-slate-800"
                                                            : diff > 0
                                                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                                                                : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                                                            }`}>
                                                            {diff > 0 ? `+${diff}` : diff}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-slate-300 dark:text-slate-600 font-medium">—</span>
                                                    )}
                                                </td>
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
                                        <td colSpan="9" className="px-6 py-16 text-center">
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

            <SelectInventoryArticlesModal
                isOpen={isModalOpen}
                articles={articles}
                isLoading={articlesLoading || articlesFetching}
                onClose={handleCloseModal}
                onConfirm={handleModalConfirm}
                searchQuery={searchQuery}
                onSearchChange={handleModalSearchChange}
                selectedDepot={selectedDepot}
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

