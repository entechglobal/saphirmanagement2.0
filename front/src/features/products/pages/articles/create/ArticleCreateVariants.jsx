import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, CheckCircle2, Package, Layers, ChevronRight } from "lucide-react";
import { ParentArticleForm } from "../components/ParentArticleVariantsForm";
import { VariantsManager } from "../components/VariantsForm";
import { useLocation, useNavigate, Link, useBlocker } from "react-router-dom";
import { useArticle } from "../../../hooks/useArticles";
import { useTranslation } from "react-i18next";
import { FormPageHeader } from "../../../../../shared/components/FormPageHeader";
import { SectionLoader } from "../../../../../shared/components/loadersCollections/SectionLoader";
import { ConfirmationModal } from "../../../../../shared/components/ConfirmationModal";

export const VariantsFlow = () => {

  const { t } = useTranslation("articles");

  // React Router hooks to access current URL and navigate programmatically
  const location = useLocation();
  const navigate = useNavigate();

  // ---------------------------------------------
  // STEP 1: Read parentId from query params
  // ---------------------------------------------
  // Example URL: /articles/create/variants?parentId=25
  // If parentId exists → we are in the "Variants Step" of the wizard
  const searchParams = new URLSearchParams(location.search);
  const parentId = searchParams.get("parentId");

  // Boolean flag to detect if we are creating variants
  // (Step 2 of article creation wizard)
  const isVariantsStep = !!parentId;

  const returnTo = searchParams.get("returnTo");

  const formDirtyRef = useRef(false);
  const finishingRef = useRef(false);
  const blockNavigation = useCallback(
    ({ currentLocation, nextLocation }) =>
      (formDirtyRef.current || isVariantsStep) &&
      !finishingRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
    [isVariantsStep]
  );
  const blocker = useBlocker(blockNavigation);

  // ---------------------------------------------
  // STEP 2: Protect Variants Step (Wizard Guard)
  // ---------------------------------------------
  // Only allow access to variants step if user
  // previously created the parent article in this session.
  //
  // We use sessionStorage as a temporary "wizard lock".
  // If the key doesn't exist → redirect back to articles page.
  useEffect(() => {
    if (!isVariantsStep) return;

    // Check if parent article was legitimately created
    const isLegit = sessionStorage.getItem(`wizard_article_${parentId}`);

    // If no session key → user accessed URL manually → redirect
    if (!isLegit) {
      navigate("/articles", { replace: true });
      return;
    }

    // Cleanup:
    // When user leaves this step, remove the wizard session key
    // to prevent re-accessing variants page directly later.
    return () => {
      sessionStorage.removeItem(`wizard_article_${parentId}`);
    };
  }, [isVariantsStep, parentId]);

  // ---------------------------------------------
  // STEP 3: Fetch Parent Article Data
  // ---------------------------------------------
  // If parentId exists, fetch the parent article
  // so we can display its data while creating variants
  const { data: parentArticle, isLoading, isError } = useArticle(parentId);

  // Extract actual article data safely
  const article = parentArticle?.data || {};
  const hasVariants = (article.variants?.length ?? 0) > 0;

  // ---------------------------------------------
  // STEP 4: After Parent Article Creation
  // ---------------------------------------------
  // When Step 1 (simple article) is successfully created,
  // navigate to variants step and pass parentId in URL.
  const handleParentArticleCreate = (article) => {
    navigate(`/articles/create/variants?parentId=${article.id}`);
  };


  return (
    <>
    <div className="-m-4 lg:-m-6 px-3 pt-3">

        {/* --- HEADER --- */}


        <FormPageHeader
          entityName={t("title")}
          backPath={returnTo || "/articles"}
          isEdit={isVariantsStep}
          data={article}
          createTitle={t("variants.header.create_article")}
          editTitle={t("variants.header.add_variants")}
          backLabel={t("variants.header.back")}
        />



        {/* --- ROUNDED STEPPER --- */}
        <div className="mb-2 flex">
          <div className="flex items-center justify-start space-x-2 sm:space-x-4">

            {/* Step 1: Article Creation */}
            <div className="flex items-center group">
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 ${isVariantsStep
                ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-[#C86AAC] text-white shadow-lg shadow-[#C86AAC]/20 ring-4 ring-[#C86AAC]/20 dark:ring-[#C86AAC]/30 ring-offset-2 dark:ring-offset-slate-950"
                }`}>
                {isVariantsStep ? <CheckCircle2 size={18} /> : <Package size={18} />}
              </div>
              <div className="ml-3">
                <p className={`text-[10px] font-bold uppercase tracking-wider leading-none mb-1 ${isVariantsStep ? 'text-green-600 dark:text-green-400' : 'text-[#C86AAC]'}`}>
                  {t("variants.steps.step_1")}
                </p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none">
                  {t("variants.steps.article")}
                </p>
              </div>
            </div>

            {/* Separator Arrow */}
            <div className="px-1 sm:px-4 text-slate-300 dark:text-slate-700 flex-shrink-0">
              <ChevronRight size={18} strokeWidth={3} />
            </div>

            {/* Step 2: Variants Management */}
            <div className="flex items-center">
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${isVariantsStep
                ? "bg-[#C86AAC] text-white shadow-lg shadow-[#C86AAC]/20 ring-4 ring-[#C86AAC]/20 dark:ring-[#C86AAC]/30 ring-offset-2 dark:ring-offset-slate-950"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                }`}>
                <Layers size={18} />
              </div>
              <div className="ml-3">
                <p className={`text-[10px] font-bold uppercase tracking-wider leading-none mb-1 ${isVariantsStep ? 'text-[#C86AAC]' : 'text-slate-400 dark:text-slate-500'}`}>
                  {t("variants.steps.step_2")}
                </p>
                <p className={`text-sm font-bold leading-none ${isVariantsStep ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                  {t("variants.steps.variants")}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* --- CONTENT AREA --- */}
        <main className="transition-all duration-500">
          {!isVariantsStep ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ParentArticleForm
                onCreateAndContinue={handleParentArticleCreate}
                variants={true}
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

              {parentArticle && (
                <VariantsManager
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
      message={
        isVariantsStep && !hasVariants
          ? t("leave_modal.no_variants_message")
          : t("leave_modal.message")
      }
      confirmText={t("leave_modal.confirm")}
      cancelText={t("leave_modal.cancel")}
      variant="danger"
    />
    </>
  );
};