import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Package, GitBranch, PlusCircle, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

const BRAND_COLOR = "#C86AAC";

export const ArticleCreateMode = () => {
  const { t } = useTranslation("articles");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(returnTo || "/articles")}
          aria-label={t("back")}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
            {t("create_mode.create_title")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("create_mode.description")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SelectionCard
          to={`simple${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
          title={t("create_mode.simple_title")}
          description={t("create_mode.simple_desc")}
          icon={<Package className="h-5 w-5 text-white" />}
          badge={t("create_mode.simple_badge")}
          cta={t("create_mode.start_creation")}
        />

        <SelectionCard
          to={`variants${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
          title={t("create_mode.variants_title")}
          description={t("create_mode.variants_desc")}
          icon={<GitBranch className="h-5 w-5 text-white" />}
          badge={t("create_mode.variants_badge")}
          cta={t("create_mode.start_creation")}
        />
      </div>
    </div>
  );
};

const SelectionCard = ({ to, title, description, icon, badge, cta }) => (
  <Link
    to={to}
    className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 space-y-4 transition-all duration-200 hover:border-[#C86AAC]/40"
  >
    <div className="flex items-center justify-between gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: BRAND_COLOR }}
      >
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-xl">
        {badge}
      </span>
    </div>

    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#C86AAC] transition-colors">
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>

    <div className="flex items-center gap-2 text-[#C86AAC] font-semibold text-sm">
      <span>{cta}</span>
      <PlusCircle className="w-4 h-4" />
    </div>
  </Link>
);
