import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export const CreateUserStepper = ({ step }) => {
  const { t } = useTranslation("users");
  const steps = [
    { id: 1, label: t("wizard.step1_label") },
    { id: 2, label: t("wizard.step2_label") },
    { id: 3, label: t("wizard.step3_label") },
  ];

  return (
    <ol className="mb-5 flex items-center gap-2">
      {steps.map((item, index) => {
        const done = step > item.id;
        const current = step === item.id;
        return (
          <li key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done
                  ? "bg-[#B12B89] text-white"
                  : current
                    ? "bg-[#B12B89]/15 text-[#B12B89]"
                    : "bg-slate-100 text-slate-400 dark:bg-[#222222]"
              }`}
            >
              {done ? <Check size={14} /> : item.id}
            </div>
            <span
              className={`truncate text-xs font-semibold ${
                current
                  ? "text-slate-800 dark:text-slate-100"
                  : "text-slate-400"
              }`}
            >
              {item.label}
            </span>
            {index < steps.length - 1 && (
              <span
                className={`mx-1 hidden h-px flex-1 sm:block ${
                  done ? "bg-[#B12B89]" : "bg-slate-200 dark:bg-[#2e2e2e]"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};
