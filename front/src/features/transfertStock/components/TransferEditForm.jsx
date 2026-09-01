import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import {
    Calendar,
    Package,
    Trash2,
    Plus,
    Lock,
    Warehouse,
    ArrowRight,
    CheckCircle2,
    Clock,
    ArrowLeftRight
} from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import {
    useTransferById,
    useAddTransferLines,
    useArticlesUnified,
    useFamilies,
} from "../hooks/useTransfers";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { SectionLoader } from "../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../shared/components/NotFound";
import { FormCard, FormFieldGrid, FormGroup, FormShell } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { FORM_CONTROL_DISABLED, FORM_LABEL } from "../../../shared/components/formStyles";
import { SelectTransferArticlesModal } from "./SelectTransferArticlesModal";
/* ─── Composite key ─── */
const articleKey = (a) => `${a.type}-${a.id}`;

/* ─── Transform API line → display row ─── */
const mapLineToRow = (line) => {
    const isVariant = line.variantId !== null;
    const entity = isVariant ? line.variant : line.article;
    const parentArticle = isVariant ? line.variant?.article : line.article;
    return {
        lineId: line.id,
        id: isVariant ? line.variantId : line.articleId,
        type: isVariant ? "variant" : "article",
        name: entity?.name ?? "—",
        barcode: entity?.barcode ?? "—",
        familyName: parentArticle?.family?.name ?? "—",
        prixAchat: parseFloat(parentArticle?.prixAchat ?? 0),
        quantityAvailable: parseFloat(line.quantityAvailable ?? line.quantityTheoretical ?? 0),
        quantityReceived: parseFloat(line.quantityReceived ?? 0),
        locked: true,
    };
};

/* ─── Status Badge ─── */
const StatusBadge = ({ status, t }) => {
    const config = {
        PENDING: { label: t("status_badge.pending"), icon: <Clock className="w-3 h-3" />, className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" },
        COMPLETED: { label: t("status_badge.completed"), icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800" },
    };
    const { label, icon, className } = config[status] ?? { label: status, icon: null, className: "bg-slate-50 text-slate-500 border-slate-200" };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide ${className}`}>
            {icon}{label}
        </span>
    );
};

export const TransferEditForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation("transfer");

    const { data: transferData, isLoading: transferLoading, isError } = useTransferById(id);
    const addLinesMutation = useAddTransferLines();

    const [newArticles, setNewArticles] = useState([]);
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

    const { data: familiesData, isLoading: familiesLoading } = useFamilies();
    const { data: articlesData, isLoading: articlesLoading, isFetching: articlesFetching } = useArticlesUnified({
        depotId: transferData?.data?.sourceDepotId,
        familyId: modalFamilyFilter?.id,
        page: currentPage,
        limit: 10,
        search: debouncedSearch,
        enabled: isModalOpen,
    });

    const transfer = transferData?.data;
    const families = familiesData?.data ?? [];
    const articles = articlesData?.data ?? [];
    const pagination = articlesData?.pagination ?? { totalPages: 1, currentPage: 1, totalItems: 0 };

    const existingRows = useMemo(() => (transfer?.lines ?? []).map(mapLineToRow), [transfer]);
    const allRows = [...existingRows, ...newArticles];

    /* All keys in the table — existing lines + newly added articles */
    const allTableKeys = useMemo(() => new Set(allRows.map(articleKey)), [existingRows, newArticles]);

    const touchedArticles = newArticles.filter((a) => a.isTouched);
    const hasTouchedArticles = touchedArticles.length > 0;

    const totalQuantity = allRows.reduce((sum, a) => sum + (a.quantityReceived || 0), 0);
    const totalValue = allRows.reduce((sum, a) => sum + (a.quantityReceived || 0) * (a.prixAchat || 0), 0);

    const fmt = (n) => Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const handleRemoveNewArticle = (article) => {
        setNewArticles((prev) => prev.filter((a) => articleKey(a) !== articleKey(article)));
    };

    const handleQuantityFocus = (article) => {
        setNewArticles((prev) =>
            prev.map((a) =>
                articleKey(a) === articleKey(article) && !a.isTouched
                    ? { ...a, isTouched: true, quantityReceived: a.quantityReceived === 0 ? 1 : a.quantityReceived }
                    : a
            )
        );
    };

    const handleQuantityBlur = (article) => {
        setNewArticles((prev) =>
            prev.map((a) =>
                articleKey(a) === articleKey(article) && a.quantityReceived === ""
                    ? { ...a, quantityReceived: 0 }
                    : a
            )
        );
    };

    const handleQuantityChange = (article, quantity) => {
        if (quantity === "") {
            setNewArticles((prev) =>
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
        setNewArticles((prev) =>
            prev.map((a) =>
                articleKey(a) === articleKey(article)
                    ? { ...a, quantityReceived: numQty, isTouched: true }
                    : a
            )
        );
    };

    const handleSubmit = async () => {
        if (newArticles.length === 0) { toast.error(t("toast.no_new_articles")); return; }
        if (!hasTouchedArticles) { toast.error(t("toast.enter_quantity_for_article")); return; }
        const lines = touchedArticles.map((article) => {
            const payload = { quantityReceived: Number(article.quantityReceived) || 0 };
            if (article.type === "variant") payload.variantId = article.id;
            else payload.articleId = article.id;
            return payload;
        });
        addLinesMutation.mutate({ id, lines }, {
            onSuccess: (res) => { toast.success(res?.message || t("toast.add_success")); navigate("/transferts"); },
            onError: (err) => { toast.error(err?.response?.data?.message || t("toast.add_error")); },
        });
    };

    /* Modal confirms → merge pending into newArticles */
    const handleModalConfirm = (pendingArticles) => {
        setNewArticles((prev) => {
            const existingKeys = new Set(prev.map(articleKey));
            const toAdd = pendingArticles.filter((a) => !existingKeys.has(articleKey(a)));
            return [...prev, ...toAdd];
        });
        setIsModalOpen(false);
        setSearchQuery("");
        setModalFamilyFilter(null);
        setCurrentPage(1);
    };

    const handleOpenModal = () => setIsModalOpen(true);

    /* X / Annuler — pending discarded inside modal, just close */
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSearchQuery("");
        setModalFamilyFilter(null);
        setCurrentPage(1);
    };

    if (transferLoading) return <SectionLoader />;

    if (!transfer || isError) {
        return (
            <NotFound
                onAction={() => navigate("/transferts")}
            />
        );
    }

    return (
        <div className="-m-4 lg:-m-6 px-3 pt-3">
            <FormPageHeader 
                entityName={"transfers"} 
                backPath="/transferts" 
                isEdit={true} 
                data={transfer} 
                editTitle={t("edit_title")} 
                backLabel={t("back_label")} 
                editTitleKey="transferNumber" 
            />

            <FormShell wide>

                <FormCard
                    title={t("informations")}
                    description={t("informations_readonly")}
                >
                    <div className="space-y-5">
                        <FormGroup>
                            <FormFieldGrid cols={3}>
                                <div>
                                    <label className={FORM_LABEL}>{t("source_depot")}</label>
                                    <div className="relative">
                                        <input readOnly value={`${transfer.sourceDepot?.name ?? "—"} (${transfer.sourceDepot?.societe?.raisonSocial ?? "—"})`} className={`${FORM_CONTROL_DISABLED} pr-10`} />
                                        <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="hidden xl:flex items-end justify-center pb-3">
                                    <ArrowRight className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <label className={FORM_LABEL}>{t("destination_depot")}</label>
                                    <div className="relative">
                                        <input readOnly value={transfer.destinationDepot?.name ?? "—"} className={`${FORM_CONTROL_DISABLED} pr-10`} />
                                        <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </FormFieldGrid>
                        </FormGroup>

                        <FormGroup>
                            <FormFieldGrid cols={3}>
                                <div>
                                    <label className={FORM_LABEL}>{t("transfer_date")}</label>
                                    <div className="relative">
                                        <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input readOnly value={dayjs(transfer.transferDate).format("YYYY-MM-DD")} className={`${FORM_CONTROL_DISABLED} pl-10`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={FORM_LABEL}>{t("status_label")}</label>
                                    <div className={`${FORM_CONTROL_DISABLED} flex items-center`}>
                                        <StatusBadge status={transfer.status} t={t} />
                                    </div>
                                </div>
                                <div>
                                    <label className={FORM_LABEL}>{t("notes")}</label>
                                    <input readOnly value={transfer.notes || ""} className={FORM_CONTROL_DISABLED} />
                                </div>
                            </FormFieldGrid>
                        </FormGroup>

                        <FormActions
                            submitType="button"
                            onSubmit={handleSubmit}
                            submitLabel={`${t("add")}${newArticles.length > 0 ? ` (${newArticles.length})` : ""}`}
                            isLoading={addLinesMutation.isPending}
                            disabled={newArticles.length === 0 || !hasTouchedArticles}
                            extra={newArticles.length > 0 && !hasTouchedArticles ? (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mr-auto">
                                    {t("quantity_activation_hint")}
                                </p>
                            ) : null}
                        />
                    </div>
                </FormCard>

                <div className="overflow-x-auto">

                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">{t("articles_to_transfer")}</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    {existingRows.length} {t("existing")}{existingRows.length !== 1 ? "s" : ""}
                                    {newArticles.length > 0 && (
                                        <span className="ml-1 text-blue-500 font-semibold">
                                            + {newArticles.length} {t("new")}{newArticles.length > 1 ? "x" : ""}
                                            {hasTouchedArticles && <span className="ml-1">· {touchedArticles.length} {t("active")}{touchedArticles.length !== 1 ? "s" : ""}</span>}
                                        </span>
                                    )}
                                </p>
                            </div>
                            {allRows.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="hidden sm:block text-slate-300 dark:text-slate-700 text-sm">|</span>
                                    <div className="flex items-center gap-1 text-xs font-bold text-[#B12B89] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg">
                                        {t("total_quantity")}: {totalQuantity}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
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
                                <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                                    <th className="px-6 py-3.5 text-left font-semibold">{t("article")}</th>
                                    <th className="px-5 py-3.5 text-left font-semibold">{t("barcode")}</th>
                                    <th className="px-5 py-3.5 text-left font-semibold hidden sm:table-cell">{t("type")}</th>
                                    <th className="px-5 py-3.5 text-center font-semibold">{t("purchase_price")}</th>
                                    <th className="px-5 py-3.5 text-center font-semibold">{t("quantity_transferred")}</th>
                                    <th className="px-5 py-3.5 text-center font-semibold">{t("value")}</th>
                                    <th className="px-6 py-3.5 text-right font-semibold"></th>
                                 </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {allRows.length > 0 ? (
                                    allRows.map((article) => {
                                        const locked = article.locked;
                                        const isTouched = !locked && !!article.isTouched;
                                        const qty = article.quantityReceived ?? 0;
                                        const numQty = Number(qty) || 0;
                                        const value = isTouched ? numQty * (article.prixAchat || 0) : null;
                                        const overStock = !locked && isTouched && numQty > article.quantityAvailable;

                                        return (
                                            <tr
                                                key={`${locked ? "existing" : "new"}-${articleKey(article)}`}
                                                className={`group transition-colors ${locked
                                                    ? "bg-slate-50/60 dark:bg-slate-800/20"
                                                    : overStock
                                                        ? "bg-amber-50/30 dark:bg-amber-900/5"
                                                        : "hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                                                    }`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg ${locked ? "bg-slate-200 dark:bg-slate-700" : "bg-slate-100 dark:bg-slate-800"}`}>
                                                            {locked ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <Package className="w-4 h-4 text-slate-500" />}
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[180px] block">{article.name}</span>
                                                            {isTouched && overStock && (
                                                                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                                                                    ⚠ {t("exceeds_available_stock", { available: article.quantityAvailable })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                 </td>
                                                <td className="px-5 py-4">
                                                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{article.barcode}</span>
                                                 </td>
                                                <td className="px-5 py-4 hidden sm:table-cell">
                                                    <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${article.type === "variant" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" : "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400"}`}>
                                                        {article.type === "variant" ? t("variant") : t("article_type")}
                                                    </span>
                                                 </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{fmt(article.prixAchat || 0)}</span>
                                                 </td>
                                                <td className="px-5 py-4 text-center">
                                                    {locked ? (
                                                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{article.quantityReceived}</span>
                                                    ) : (
                                                        <input
                                                            type="number" min="0" value={qty}
                                                            onFocus={() => handleQuantityFocus(article)}
                                                            onChange={(e) => handleQuantityChange(article, e.target.value)}
                                                            onBlur={() => handleQuantityBlur(article)}
                                                            className={`w-24 px-2 py-1.5 border rounded-lg text-center text-sm font-bold outline-none focus:ring-2 transition-all dark:text-slate-100 ${overStock
                                                                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 focus:ring-amber-400"
                                                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-[#B12B89]"
                                                                }`}
                                                        />
                                                    )}
                                                 </td>
                                                <td className="px-5 py-4 text-center">
                                                    {locked ? (
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt((article.quantityReceived || 0) * (article.prixAchat || 0))} MAD</span>
                                                    ) : isTouched ? (
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(value)} MAD</span>
                                                    ) : (
                                                        <span className="text-sm text-slate-300 dark:text-slate-600 font-medium">—</span>
                                                    )}
                                                 </td>
                                                <td className="px-6 py-4 text-right">
                                                    {!locked && (
                                                        <button onClick={() => handleRemoveNewArticle(article)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                 </td>
                                             </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-40">
                                                <Package className="w-10 h-10 mb-3 text-slate-400" />
                                                <p className="text-sm font-semibold text-slate-500">{t("no_articles")}</p>
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
                sourceDepot={transfer.sourceDepot}
                families={families}
                familiesLoading={familiesLoading}
                selectedFamily={modalFamilyFilter}
                onFamilyChange={(family) => { setModalFamilyFilter(family); setCurrentPage(1); }}
                pagination={pagination}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                alreadyInTable={allRows}
                t={t}
            />
        </div>
    );
};

