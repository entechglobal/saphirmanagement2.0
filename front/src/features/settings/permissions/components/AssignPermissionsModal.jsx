import { useState, useEffect, useMemo } from "react"
import { Search, Shield, ChevronLeft, ChevronRight, Lock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { BaseModal } from "../../../../shared/components/BaseModal"
import { usePermissions } from "../hooks/usePermissions"
import { getPermissionLabel } from "../../../../shared/utils/permissions"

const MODAL_LIMIT = 10
// Fetched once, unfiltered, then searched/paginated client-side so the
// search box can match the French labels shown to the user (the backend
// only knows the raw English/snake_case permission names).
const ALL_PERMISSIONS_LIMIT = 200

// Strips combining diacritical marks (U+0300–U+036F) left behind by NFD
// normalization, e.g. "Créer".normalize("NFD") -> "Cre" + combining acute.
const stripDiacritics = (str) =>
  Array.from(str)
    .filter((ch) => {
      const code = ch.codePointAt(0)
      return code < 0x0300 || code > 0x036f
    })
    .join("")

const normalize = (str) => (str ? stripDiacritics(str.normalize("NFD")).toLowerCase().trim() : "")

export const AssignPermissionsModal = ({
  isOpen,
  onClose,
  mode,
  targetName,
  currentAssignedIds,
  roleInheritedIds,
  onSave,
  isSaving,
}) => {
  const { t } = useTranslation("permissions")

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState(new Set())

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(currentAssignedIds))
      setSearch("")
      setDebouncedSearch("")
      setPage(1)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch the whole catalog once (no server-side keyword) so we can search
  // against the French labels shown in the UI rather than the raw backend names.
  const { data, isLoading } = usePermissions(1, ALL_PERMISSIONS_LIMIT, "")
  const allPermissions = data?.data ?? []

  const filteredPermissions = useMemo(() => {
    const q = normalize(debouncedSearch)
    if (!q) return allPermissions
    return allPermissions.filter(
      (p) => normalize(getPermissionLabel(p.name)).includes(q) || normalize(p.name).includes(q)
    )
  }, [allPermissions, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(filteredPermissions.length / MODAL_LIMIT))
  const permissions = filteredPermissions.slice((page - 1) * MODAL_LIMIT, page * MODAL_LIMIT)

  const toggle = (id) => {
    if (mode === "user" && roleInheritedIds?.has(id)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toAdd    = [...selectedIds].filter((id) => !currentAssignedIds.has(id))
  const toRemove = [...currentAssignedIds].filter((id) => !selectedIds.has(id))
  const pendingCount = toAdd.length + toRemove.length

  const handleSave = () => { if (pendingCount === 0) return; onSave(toAdd, toRemove) }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={isSaving ? undefined : onClose}
      disableClose={isSaving}
      title={mode === "role" ? t("modal_title_role") : t("modal_title_user")}
      subtitle={targetName}
      subtitleUppercase
      icon={<Shield size={18} className="text-blue-500" />}
      iconBg="bg-blue-50 dark:bg-blue-900/20"
      maxWidth="max-w-xl"
      bodyClassName="flex-1 overflow-hidden flex flex-col"
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs">
            {pendingCount > 0 ? (
              <span className="font-semibold text-amber-500">
                {t("modal_pending", { count: pendingCount })}
              </span>
            ) : (
              <span className="text-slate-400">{t("modal_no_changes")}</span>
            )}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-50"
            >
              {t("modal_cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || pendingCount === 0}
              className="px-5 py-2 text-sm font-bold bg-[#B12B89] hover:bg-[#B05596] text-white rounded-xl transition disabled:opacity-50 shadow-sm"
            >
              {isSaving ? t("modal_saving") : t("modal_save")}
            </button>
          </div>
        </div>
      }
    >
      {/* Search bar */}
      <div className="px-6 pt-4 pb-3 flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("modal_search_placeholder")}
            className="w-full ps-9 pe-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#B12B89] transition"
          />
        </div>
        {mode === "user" && (
          <p className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
            <Lock size={9} />
            {t("modal_inherited_hint")}
          </p>
        )}
      </div>

      {/* Permission list */}
      <div className="flex-1 overflow-y-auto px-2">
        {isLoading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50 px-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="py-3 flex items-center justify-between animate-pulse">
                <div className="h-6 w-44 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                <div className="h-6 w-11 bg-slate-100 dark:bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : permissions.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            {t("modal_no_results")}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50 px-4">
            {permissions.map((perm) => {
              const isInherited = mode === "user" && roleInheritedIds?.has(perm.id)
              const isChecked = isInherited ? false : selectedIds.has(perm.id)
              return (
                <div
                  key={perm.id}
                  onClick={() => !isInherited && toggle(perm.id)}
                  className={`py-3 flex items-center justify-between gap-3 rounded-xl transition ${
                    isInherited
                      ? "opacity-50 cursor-default"
                      : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-2 px-2"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400 px-2.5 py-1 rounded-lg text-xs font-semibold truncate max-w-[280px]">
                      {getPermissionLabel(perm.name)}
                    </span>
                    {isInherited && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Lock size={8} />
                        {t("badge_via_role")}
                      </span>
                    )}
                  </div>
                  <div
                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
                      isChecked ? "bg-[#B12B89]" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        isChecked ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          <span className="text-xs text-slate-400">
            {t("modal_page", { page, total: totalPages })}
          </span>
          <div dir="ltr" className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30 transition"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                    page === pageNum
                      ? "bg-[#B12B89] text-white"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            {totalPages > 5 && <span className="text-xs text-slate-400 px-1">…</span>}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </BaseModal>
  )
}
