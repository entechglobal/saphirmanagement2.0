import { useEffect, useRef, useCallback } from "react";
import { CheckCircle2, Package, Layers, ChevronRight } from "lucide-react";
import { useLocation, useNavigate, useBlocker } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SimpleArticleForm } from "../components/simpleArticle/SimpleArticleForm";
import { StockArticleForm } from "../components/simpleArticle/StockArticleForm";
import { useArticle } from "../../../hooks/useArticles";
import { useStockByArticle } from "../../../hooks/useStocks";
import { FormPageHeader } from "../../../../../shared/components/FormPageHeader";
import { SectionLoader } from "../../../../../shared/components/loadersCollections/SectionLoader";
import { ConfirmationModal } from "../../../../../shared/components/ConfirmationModal";

export const ArticleCreateSimple = () => {
  const { t } = useTranslation("articles");
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const simpleArticlId = searchParams.get("articleId");
  const isStockArticleStep = !!simpleArticlId;

  const { data: simpleArticle, isLoading, isError } = useArticle(simpleArticlId);
  const article = simpleArticle?.data || {};
  const { data: stocksData } = useStockByArticle(isStockArticleStep ? simpleArticlId : null);
  const hasStock = (stocksData?.data?.length ?? 0) > 0;

  const returnTo = searchParams.get("returnTo");

  const formDirtyRef = useRef(false);
  const finishingRef = useRef(false);
  const blockNavigation = useCallback(
    ({ currentLocation, nextLocation }) =>
      (formDirtyRef.current || isStockArticleStep) &&
      !finishingRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
    [isStockArticleStep]
  );
  const blocker = useBlocker(blockNavigation);

  useEffect(() => {
    if (!isStockArticleStep) return;

    // Check if parent article was legitimately created
    const isLegit = sessionStorage.getItem(`wizard_article_${simpleArticlId}`);

    // If no session key → user accessed URL manually → redirect
    if (!isLegit) {
      navigate("/articles", { replace: true });
      return;
    }

    // Cleanup:
    // When user leaves this step, remove the wizard session key
    // to prevent re-accessing variants page directly later.
    return () => {
      sessionStorage.removeItem(`wizard_article_${simpleArticlId}`);
    };
  }, [isStockArticleStep, simpleArticlId]);

  return (
    <>
    <div className="-m-4 lg:-m-6 px-3 pt-3">

        {/* --- HEADER --- */}


        <FormPageHeader
          entityName={t("title")}
          backPath={returnTo || "/articles"}
          isEdit={isStockArticleStep}
          data={article}
          createTitle={t("variants.header.create_article")}
          editTitle={t("variants.header.add_stock")}
          backLabel={t("variants.header.back")}
        />

        {/* --- STEPPER --- */}
        <div className="mb-2">
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Step 1 */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className={`flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                isStockArticleStep
                  ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800"
                  : "bg-[#C86AAC] text-white shadow-lg shadow-[#C86AAC]/20 ring-4 ring-[#C86AAC]/20 dark:ring-[#C86AAC]/30 ring-offset-2 dark:ring-offset-[#161616]"
              }`}>
                {isStockArticleStep ? <CheckCircle2 size={16} /> : <Package size={16} />}
              </div>
              <div className="hidden sm:block min-w-0">
                <p className={`text-[10px] font-bold uppercase tracking-wider leading-none mb-1 truncate ${
                  isStockArticleStep ? "text-green-600 dark:text-green-400" : "text-[#C86AAC]"
                }`}>
                  {t("variants.steps.step_1")}
                </p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none truncate">
                  {t("variants.steps.article")}
                </p>
              </div>
            </div>

            {/* Separator Arrow */}
            <ChevronRight
              size={16}
              strokeWidth={3}
              className="flex-shrink-0 text-slate-300 dark:text-slate-700 rtl:scale-x-[-1]"
            />

            {/* Step 2 */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className={`flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                isStockArticleStep
                  ? "bg-[#C86AAC] text-white shadow-lg shadow-[#C86AAC]/20 ring-4 ring-[#C86AAC]/20 dark:ring-[#C86AAC]/30 ring-offset-2 dark:ring-offset-[#161616]"
                  : "bg-white dark:bg-[#1c1c1c] border-slate-200 dark:border-[#2e2e2e] text-slate-400 dark:text-slate-500"
              }`}>
                <Layers size={16} />
              </div>
              <div className="hidden sm:block min-w-0">
                <p className={`text-[10px] font-bold uppercase tracking-wider leading-none mb-1 truncate ${
                  isStockArticleStep ? "text-[#C86AAC]" : "text-slate-400 dark:text-slate-500"
                }`}>
                  {t("variants.steps.step_2")}
                </p>
                <p className={`text-sm font-bold leading-none truncate ${
                  isStockArticleStep ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"
                }`}>
                  {t("variants.steps.stock")}
                </p>
              </div>
            </div>

          </div>
        </div>
        {/* --- MAIN CONTENT --- */}
        <main className="transition-all duration-500">
          {!isStockArticleStep ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SimpleArticleForm
                createMode={true}
                returnTo={returnTo}
                onDirtyChange={(d) => { formDirtyRef.current = d; }}
              />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {isLoading && (
                <SectionLoader />
              )}

              {isError && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-2xl text-center">
                  <p className="font-bold">{t("variants.messages.error_title")}</p>
                  <p className="text-sm opacity-80">{t("variants.messages.error_desc")}</p>
                </div>
              )}

              {!isLoading && !isError && (
                <StockArticleForm
                  returnTo={returnTo}
                  onBeforeFinish={() => { finishingRef.current = true; }}
                />
              )}
            </div>
          )}
        </main>
    </div>

    <ConfirmationModal
      isOpen={blocker.state === "blocked"}
      onClose={() => blocker.reset?.()}
      onConfirm={() => blocker.proceed?.()}
      title={t("leave_modal.title")}
      message={isStockArticleStep && !hasStock ? t("leave_modal.no_stock_message") : t("leave_modal.message")}
      confirmText={t("leave_modal.confirm")}
      cancelText={t("leave_modal.cancel")}
      variant="danger"
    />

</>
  );
};