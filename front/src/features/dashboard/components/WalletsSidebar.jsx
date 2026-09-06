import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Crown, Landmark, Search, User, Vault, Wallet } from "lucide-react";
import { useDashboardWallets } from "../hooks/useDashboard";
import { formatMAD } from "./PartnerChartsSection";

const TYPE_META = {
  CENTRAL: {
    icon: Crown,
    accent: "text-[#B12B89] dark:text-pink-300",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20",
    key: "central",
  },
  SOCIETE: {
    icon: Building2,
    accent: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    key: "societe",
  },
  USER: {
    icon: User,
    accent: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    key: "users",
  },
  BANK: {
    icon: Landmark,
    accent: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-900/20",
    key: "banks",
  },
  COFFRE: {
    icon: Vault,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    key: "coffres",
  },
};

const WalletRow = ({ wallet }) => {
  const { t } = useTranslation("dashboard");
  const meta = TYPE_META[wallet.caisseType] ?? TYPE_META.USER;
  const Icon = meta.icon;
  const subtitle =
    wallet.caisseType === "BANK"
      ? wallet.banque?.name || wallet.banque?.RIB
      : wallet.caisseType === "COFFRE"
        ? t("wallets_panel.cash")
        : wallet.caisseType === "CENTRAL"
          ? t("wallets_panel.central_hint")
          : wallet.caisseType === "SOCIETE"
            ? wallet.societe?.raisonSocial || wallet.user?.name
            : wallet.user?.name;

  return (
    <div className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 ${wallet.active ? "" : "opacity-50"}`}>
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
        <Icon className={`h-3.5 w-3.5 ${meta.accent}`} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{wallet.name}</p>
        <p className="truncate text-[11px] text-slate-400">
          {subtitle || "—"}
          {wallet.societe?.raisonSocial ? ` · ${wallet.societe.raisonSocial}` : ""}
        </p>
      </div>
      <p
        className={`shrink-0 text-[13px] font-bold tabular-nums ${
          wallet.currentBalance >= 0 ? "text-slate-800 dark:text-slate-100" : "text-red-500"
        }`}
      >
        {formatMAD(wallet.currentBalance, 2)}
      </p>
    </div>
  );
};

const WalletGroup = ({ title, wallets, emptyLabel, total }) => {
  if (!wallets.length) {
    return (
      <div className="py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold tabular-nums text-slate-600 dark:text-slate-300">
            {formatMAD(total, 2)}
          </span>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-500 dark:bg-[#2e2e2e] dark:text-slate-300">
            {wallets.length}
          </span>
        </div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-[#2e2e2e]/80">
        {wallets.map((w) => (
          <WalletRow key={w.id} wallet={w} />
        ))}
      </div>
    </div>
  );
};

export const WalletsSidebar = () => {
  const { t } = useTranslation("dashboard");
  const { data, isLoading } = useDashboardWallets({ enabled: true });
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (w) => {
      if (!q) return true;
      return [w.name, w.user?.name, w.banque?.name, w.banque?.RIB, w.societe?.raisonSocial]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    };
    return {
      central: (data?.central ?? []).filter(match),
      societe: (data?.societe ?? []).filter(match),
      users: (data?.users ?? []).filter(match),
      banks: (data?.banks ?? []).filter(match),
      coffres: (data?.coffres ?? []).filter(match),
    };
  }, [data, query]);

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c] xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:w-[340px]">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-[#2e2e2e]">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-[#B12B89]" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">{t("wallets_panel.title")}</h2>
        </div>
        <div className="relative mt-2.5">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("wallets_panel.search")}
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pe-3 ps-8 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#B12B89] dark:border-[#3a3a3a] dark:bg-[#1c1c1c]/40 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-2.5 px-2 py-2">
              <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-[#2e2e2e]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-[#2e2e2e]" />
                <div className="h-2.5 w-1/3 rounded bg-slate-100 dark:bg-[#2e2e2e]/70" />
              </div>
            </div>
          ))
        ) : (
          <>
            <WalletGroup
              title={t("wallets_panel.central")}
              wallets={filtered.central}
              total={filtered.central.reduce((s, w) => s + (w.currentBalance ?? 0), 0)}
              emptyLabel={t("wallets_panel.empty")}
            />
            <WalletGroup
              title={t("wallets_panel.societe")}
              wallets={filtered.societe}
              total={filtered.societe.reduce((s, w) => s + (w.currentBalance ?? 0), 0)}
              emptyLabel={t("wallets_panel.empty")}
            />
            <WalletGroup
              title={t("wallets_panel.users")}
              wallets={filtered.users}
              total={filtered.users.reduce((s, w) => s + (w.currentBalance ?? 0), 0)}
              emptyLabel={t("wallets_panel.empty")}
            />
            <WalletGroup
              title={t("wallets_panel.banks")}
              wallets={filtered.banks}
              total={filtered.banks.reduce((s, w) => s + (w.currentBalance ?? 0), 0)}
              emptyLabel={t("wallets_panel.empty")}
            />
            <WalletGroup
              title={t("wallets_panel.coffres")}
              wallets={filtered.coffres}
              total={filtered.coffres.reduce((s, w) => s + (w.currentBalance ?? 0), 0)}
              emptyLabel={t("wallets_panel.empty")}
            />
          </>
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-3 dark:border-[#2e2e2e]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("wallets_panel.total")}
          </span>
          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-50">
            {formatMAD(data?.totals?.grand, 2)} MAD
          </span>
        </div>
      </div>
    </aside>
  );
};
