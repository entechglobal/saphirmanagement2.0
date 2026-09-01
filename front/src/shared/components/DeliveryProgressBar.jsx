import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart,
  Package,
  Truck,
  MapPin,
  CheckCircle,
  CreditCard,
  Clock,
  CheckCircle2,
  CircleDollarSign,
} from 'lucide-react';

/* ── All possible steps in order ── */
const STEP_ICONS = {
  EN_COURS: ShoppingCart,
  CONFIRME: CheckCircle2,
  PREPARE:  Package,
  COLLECTE: Truck,
  EN_ROUTE: MapPin,
  LIVRE:    CheckCircle,
  PAYE:     CircleDollarSign,
};

/*
  Color logic (position-based, not status-based):
  - EN_COURS            → always green (auto-confirmed)
  - steps before active → green  (done)
  - active step         → orange (in_progress)
  - PAYE confirmed      → green
  - everything else     → grey   (pending/future)
*/
const getColors = (stepKey, stepStatus, isBeforeActive, isActive) => {
  const isPaye = stepKey === 'PAYE';

  if (isPaye) {
    if (stepStatus === 'confirmed' || stepStatus === 'in_progress') return { circle: 'bg-green-500', text: 'text-green-600', line: '#22c55e' };
    
    return { circle: 'bg-gray-300', text: 'text-gray-400', line: '#d1d5db' };
  }

  if (stepKey === 'EN_COURS' || stepStatus === 'confirmed' || stepStatus === 'in_progress') return { circle: 'bg-green-500', text: 'text-green-600', line: '#22c55e' };
  if (isActive)               return { circle: 'bg-orange-500', text: 'text-orange-600', line: '#f97316' };
  if (isBeforeActive)         return { circle: 'bg-green-500', text: 'text-green-600', line: '#22c55e' };
  return { circle: 'bg-gray-300', text: 'text-gray-400', line: '#d1d5db' };
};

export default function DeliveryProgressBar({ steps = [] }) {
  const { t, i18n } = useTranslation("commands");
  const isRTL = i18n.dir() === 'rtl';

  /* Find index of the current in_progress step */
  const activeIndex = steps.findIndex((s) => s.status === 'in_progress');

  return (
    <div className="w-full p-4 md:p-8">

      {/* ══ MOBILE ══ */}
      <div className="flex flex-col md:hidden gap-6">
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[step.key] || ShoppingCart;
          const isLast = index === steps.length - 1;
          const isActive = index === activeIndex;
          const isBeforeActive = activeIndex === -1 ? false : index < activeIndex;
          const { circle, text, line } = getColors(step.key, step.status, isBeforeActive, isActive);

          return (
            <div key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-14 h-14 rounded-full shadow-md ${circle}`}>
                  <Icon size={24} className="text-white" />
                </div>
                {!isLast && (
                  <div className="w-1 h-12 mt-2" style={{ backgroundColor: line }} />
                )}
              </div>

              <div className="flex-1 pt-2">
                <h3 className={`text-sm font-semibold ${text}`}>
                  {t(`timeline_${step.key}`, step.label)}
                </h3>
                {step.user !== '—' && (
                  <div className="mt-1 space-y-1 text-xs text-gray-600">
                    <p className="font-medium">{t("history_by", { user: step.user })}</p>
                    <p className="text-gray-500">{step.datetime}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ DESKTOP ══ */}
      <div className="hidden md:flex gap-0 relative">
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[step.key] || ShoppingCart;
          const isLast = index === steps.length - 1;
          const isActive = index === activeIndex;
          const isBeforeActive = activeIndex === -1 ? false : index < activeIndex;
          const { circle, text, line } = getColors(step.key, step.status, isBeforeActive, isActive);

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {!isLast && (
                <div
                  className="absolute top-7 h-1"
                  style={isRTL ? {
                    right: 'calc(50% + 28px)',
                    left: 'calc(-50% + 28px)',
                    backgroundColor: line,
                  } : {
                    left: 'calc(50% + 28px)',
                    right: 'calc(-50% + 28px)',
                    backgroundColor: line,
                  }}
                />
              )}

              <div className={`relative z-10 flex items-center justify-center w-14 h-14 rounded-full shadow-md ${circle}`}>
                <Icon size={24} className="text-white" />
              </div>

              <div className="mt-5 text-center flex-1">
                <h3 className={`text-sm font-semibold ${text}`}>
                  {t(`timeline_${step.key}`, step.label)}
                </h3>
                {step.user !== '—' && (
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    <p className="font-medium">{t("history_by", { user: step.user })}</p>
                    <p className="text-gray-500">{step.datetime}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}