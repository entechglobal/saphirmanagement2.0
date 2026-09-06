import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MapPin,
  Package,
  Truck,
  User,
} from "lucide-react";
import { usePlanningLivraison } from "../../plannings/hooks/usePlanningLivraison";

const UNASSIGNED_KEY = "__unassigned__";

const parseDayKey = (dateStr) => {
  // API returns DD/MM/YYYY
  if (!dateStr || typeof dateStr !== "string") return null;
  const [dd, mm, yyyy] = dateStr.split("/");
  if (!dd || !mm || !yyyy) return null;
  return dayjs(`${yyyy}-${mm}-${dd}`);
};

const groupByAssignee = (orders, { preferPreparateur = false } = {}) => {
  const map = new Map();

  for (const order of orders) {
    const id = preferPreparateur
      ? order.preparateurId ?? UNASSIGNED_KEY
      : order.livreurId ?? UNASSIGNED_KEY;
    const name = preferPreparateur
      ? order.preparateurName
      : order.livreurName;

    if (!map.has(id)) {
      map.set(id, {
        id,
        name: name || null,
        orders: [],
      });
    }
    map.get(id).orders.push(order);
  }

  return Array.from(map.values()).sort(
    (a, b) => b.orders.length - a.orders.length,
  );
};

const uniqueCities = (orders) => {
  const set = new Set();
  for (const o of orders) {
    const city = (o.ville || "").trim();
    if (city) set.add(city);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
};

const OrderMiniRow = ({ order, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(order.id)}
    className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-start transition hover:bg-slate-50 dark:hover:bg-[#2a2a2a]"
  >
    <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
        {order.clientName || "—"}
      </p>
      <p className="truncate text-[10px] text-slate-400">
        {[order.documentNumber, order.ville, order.heureLivraison]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  </button>
);

const AssigneeBlock = ({
  group,
  unassignedLabel,
  ordersLabel,
  onOpenOrder,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const displayName = group.name || unassignedLabel;
  const Icon = group.id === UNASSIGNED_KEY ? User : Truck;

  return (
    <div className="rounded-xl border border-slate-100 dark:border-[#2e2e2e]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-start"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#B12B89]/10">
          <Icon className="h-3.5 w-3.5 text-[#B12B89]" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
            {displayName}
          </p>
          <p className="text-[11px] text-slate-400">
            {ordersLabel}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-600 dark:bg-[#2e2e2e] dark:text-slate-300">
          {group.orders.length}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="space-y-0.5 border-t border-slate-100 px-1.5 py-1.5 dark:border-[#2e2e2e]">
          {group.orders.map((order) => (
            <OrderMiniRow key={order.id} order={order} onOpen={onOpenOrder} />
          ))}
        </div>
      )}
    </div>
  );
};

export const PlanningSidebar = ({ roleName, embedded = false }) => {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const normalizedRole = String(roleName ?? "").trim().toLowerCase();
  const preferPreparateur = normalizedRole === "preparateur";
  const isScopedRole =
    normalizedRole === "preparateur" || normalizedRole === "livreur";

  const todayKey = dayjs().format("YYYY-MM-DD");
  const tomorrowKey = dayjs().add(1, "day").format("YYYY-MM-DD");

  const { data, isLoading } = usePlanningLivraison({
    startDate: todayKey,
    endDate: tomorrowKey,
  });

  const { todayOrders, tomorrowOrders } = useMemo(() => {
    const days = data?.data ?? [];
    const today = dayjs(todayKey);
    const tomorrow = dayjs(tomorrowKey);
    const findDay = (d) => {
      const key = d.format("DD/MM/YYYY");
      return (
        days.find((row) => row.date === key)?.advancedBonLivraisons ??
        days.find((row) => {
          const parsed = parseDayKey(row.date);
          return parsed?.isSame(d, "day");
        })?.advancedBonLivraisons ??
        []
      );
    };
    return {
      todayOrders: findDay(today),
      tomorrowOrders: findDay(tomorrow),
    };
  }, [data, todayKey, tomorrowKey]);

  const todayGroups = useMemo(
    () => groupByAssignee(todayOrders, { preferPreparateur }),
    [todayOrders, preferPreparateur],
  );

  const tomorrowCities = useMemo(
    () => uniqueCities(tomorrowOrders),
    [tomorrowOrders],
  );

  const openOrder = (id) => navigate(`/commandes/${id}`);

  const body = (
    <div className={`min-h-0 flex-1 space-y-5 ${embedded ? "px-1 py-1" : "overflow-y-auto px-3 py-3"}`}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-2.5 px-1 py-2">
              <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-[#2e2e2e]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-[#2e2e2e]" />
                <div className="h-2.5 w-1/3 rounded bg-slate-100 dark:bg-[#2e2e2e]/70" />
              </div>
            </div>
          ))
        ) : (
          <>
            {/* Today */}
            <section>
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {t("saphir_planning.today")}
                </p>
                <span className="rounded-full bg-[#B12B89]/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-[#B12B89]">
                  {todayOrders.length}
                </span>
              </div>

              {todayOrders.length === 0 ? (
                <p className="px-1 text-xs text-slate-400">
                  {t("saphir_planning.empty_today")}
                </p>
              ) : isScopedRole ? (
                <div className="space-y-0.5 rounded-xl border border-slate-100 p-1.5 dark:border-[#2e2e2e]">
                  {todayOrders.map((order) => (
                    <OrderMiniRow
                      key={order.id}
                      order={order}
                      onOpen={openOrder}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {todayGroups.map((group, idx) => (
                    <AssigneeBlock
                      key={String(group.id)}
                      group={group}
                      unassignedLabel={t("saphir_planning.unassigned")}
                      ordersLabel={t("saphir_planning.orders_count", {
                        count: group.orders.length,
                      })}
                      onOpenOrder={openOrder}
                      defaultOpen={idx === 0}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Tomorrow */}
            <section>
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {t("saphir_planning.tomorrow")}
                </p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-[#2e2e2e] dark:text-slate-300">
                  {tomorrowOrders.length}
                </span>
              </div>

              {tomorrowOrders.length === 0 ? (
                <p className="px-1 text-xs text-slate-400">
                  {t("saphir_planning.empty_tomorrow")}
                </p>
              ) : (
                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-[#2e2e2e] dark:bg-[#222222]/60">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                    {t("saphir_planning.tomorrow_summary", {
                      count: tomorrowOrders.length,
                    })}
                  </p>

                  {tomorrowCities.length > 0 && (
                    <div>
                      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <MapPin className="h-3 w-3" />
                        {t("saphir_planning.cities")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {tomorrowCities.map((city) => (
                          <span
                            key={city}
                            className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-[#1c1c1c] dark:text-slate-200 dark:ring-[#3a3a3a]"
                          >
                            {city}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-0.5">
                    {tomorrowOrders.slice(0, 6).map((order) => (
                      <OrderMiniRow
                        key={order.id}
                        order={order}
                        onOpen={openOrder}
                      />
                    ))}
                    {tomorrowOrders.length > 6 && (
                      <Link
                        to="/planning-livraison"
                        className="block px-2 py-1.5 text-[11px] font-semibold text-[#B12B89] hover:underline"
                      >
                        {t("saphir_planning.more", {
                          count: tomorrowOrders.length - 6,
                        })}
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
  );

  if (embedded) return body;

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c] xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)]">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-[#2e2e2e]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#B12B89]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">
              {t("saphir_planning.title")}
            </h2>
          </div>
          <Link
            to="/planning-livraison"
            className="text-[11px] font-semibold text-[#B12B89] hover:underline"
          >
            {t("saphir_planning.see_all")}
          </Link>
        </div>
      </div>
      {body}
    </aside>
  );
};
