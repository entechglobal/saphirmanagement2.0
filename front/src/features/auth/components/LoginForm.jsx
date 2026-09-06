"use client";

import { useLogin } from "../hooks/useLogin";

import { useState } from "react";
import ToogleControls from "@/shared/components/ToggleControls";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import {LoaderPage} from "../../../shared/components/loadersCollections/LoaderPage"
import { Logo } from "../../../shared/components/Logo";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginForm = ({ bgImage = "/login.jpg" }) => {
  const { mutate: login, isPending, error } = useLogin();
  const { t, ready } = useTranslation("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!email) {
      errors.email = t("errors.email_required");
    } else if (!emailRegex.test(email)) {
      errors.email = t("errors.email_invalid");
    }

    if (!password) {
      errors.password = t("errors.password_required");
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    login({ email, password });
  };

  const getErrorMessage = () => {
    if (!error) return null;
    if (error.response?.data?.message) return error.response.data.message;
    if (error.response?.data?.error) return error.response.data.error;
    if (error.message === 'Network Error') return t("errors.network_error") || "Unable to connect to server";
    if (error.response?.status === 401) return t("errors.invalid_credentials") || "Invalid email or password";
    return error.message || t("errors.generic") || "Login failed. Please try again.";
  };

 if (!ready) return <LoaderPage/>;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">


      {/* Left — image panel (desktop) */}
      <div className="relative hidden lg:flex lg:w-1/2 min-h-screen">
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#B12B89]/70 to-black/30" />
      </div>

      {/* Right — login form */}
      <div className="relative flex w-full lg:w-1/2 min-h-screen items-center justify-center bg-white dark:bg-[#161616] px-6 py-10">
        <ToogleControls />

        <div className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <Logo className="mx-auto h-11 mb-3 w-auto text-[#B12B89]" />
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">{t("title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 px-4">{t("subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* EMAIL */}
            <div className="group">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-2 ml-1">
                {t("email_label")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFormErrors((prev) => ({ ...prev, email: null })); }}
                className={`w-full px-4 h-[46px] text-sm rounded-xl border outline-none transition-all duration-200 leading-none bg-slate-50 dark:bg-[#222222]/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.email ? "border-red-500 ring-4 ring-red-500/5" : "border-slate-200 dark:border-[#2e2e2e] focus:border-[#B12B89] focus:ring-4 focus:ring-[#B12B89]/40 group-hover:border-slate-300 dark:group-hover:border-[#3a3a3a]"}`}
                placeholder={t("email_placeholder")}
                disabled={isPending}
              />
              {formErrors.email && <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">{formErrors.email}</p>}
            </div>

            {/* PASSWORD */}
            <div className="group">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-2 ml-1">
                {t("password_label")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFormErrors((prev) => ({ ...prev, password: null })); }}
                  className={`w-full px-4 pr-10 h-[46px] text-sm rounded-xl border outline-none transition-all duration-200 leading-none bg-slate-50 dark:bg-[#222222]/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.password ? "border-red-500 ring-4 ring-red-500/5" : "border-slate-200 dark:border-[#2e2e2e] focus:border-[#B12B89] focus:ring-4 focus:ring-[#B12B89]/40 group-hover:border-slate-300 dark:group-hover:border-[#3a3a3a]"}`}
                  placeholder={t("password_placeholder")}
                  disabled={isPending}
                />
                <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formErrors.password && <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">{formErrors.password}</p>}
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 rounded-xl text-xs">
                {getErrorMessage()}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 text-sm font-bold rounded-xl text-white shadow-lg shadow-[#B12B89]/25 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              style={{ backgroundColor: "#B12B89" }}
            >
              {isPending ? t("submitting") : t("submit")}
            </button>
          </form>

          <div className="mt-8 text-center text-[10px] text-gray-500 dark:text-gray-400">
            {(() => {
              const start = 2025;
              const current = new Date().getFullYear();
              const range = current > start ? `${start}–${current}` : `${start}`;
              return `© ${range} SaphirCaisse — ${t("allRightsReserved")}`;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
