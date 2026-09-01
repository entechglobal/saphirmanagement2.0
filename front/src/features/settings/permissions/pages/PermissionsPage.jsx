import { useState, useRef } from "react"
import { Shield, Users, Plus, X, Lock, User } from "lucide-react"
import { toast } from "@/shared/utils/toast"
import { useTranslation } from "react-i18next"
import {
  usePermissions,
  useCreatePermission,
  useRolePermissions,
  useAssignRolePermissions,
  useRemoveRolePermissions,
  useUserPermissionDetail,
  useAssignUserPermissions,
  useRemoveUserPermissions,
  useUsers,
} from "../hooks/usePermissions"
import { STATIC_ROLES } from "../api/permissions.api"
import { AssignPermissionsModal } from "../components/AssignPermissionsModal"
import { getPermissionLabel } from "../../../../shared/utils/permissions"

// Turns "view_article" → "View Article", "create_bon_livraison" → "Create Bon Livraison"
const formatName = (str) =>
  str?.replace(/[_.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim() ?? str

// ─── Single permission row with toggle ────────────────────────────────────────
const PermissionRow = ({ permission, onRemove, isRemoving, disabled, badge }) => {
  const { t } = useTranslation("permissions")
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition group">
      <div className="flex items-center gap-2 min-w-0">
        <span className="bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400 px-2.5 py-1 rounded-lg text-xs font-semibold truncate max-w-[260px]">
          {getPermissionLabel(permission.name)}
        </span>
        {badge && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full flex-shrink-0">
            <Lock size={8} />
            {badge}
          </span>
        )}
      </div>
      <button
        onClick={disabled ? undefined : onRemove}
        disabled={disabled || isRemoving}
        title={disabled ? t("tooltip_inherited") : t("tooltip_remove")}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
          disabled
            ? "bg-slate-300 dark:bg-slate-600 cursor-default"
            : "bg-[#B12B89] hover:bg-[#B05596] cursor-pointer"
        } disabled:opacity-60`}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 translate-x-5 ${
            isRemoving ? "opacity-60" : ""
          }`}
        />
      </button>
    </div>
  )
}

// ─── Skeleton rows while loading ──────────────────────────────────────────────
const SkeletonPermRows = ({ count = 4 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center justify-between py-3 px-4 animate-pulse">
        <div className="h-6 w-44 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        <div className="h-6 w-11 bg-slate-100 dark:bg-slate-800 rounded-full" />
      </div>
    ))}
  </>
)

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyHint = ({ icon, text, sub }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-2">
    <div className="text-slate-300 dark:text-slate-600">{icon}</div>
    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{text}</p>
    {sub && <p className="text-xs text-slate-400">{sub}</p>}
  </div>
)

// ─── Page ─────────────────────────────────────────────────────────────────────
export const PermissionsPage = () => {
  const { t } = useTranslation("permissions")
  const [filterMode, setFilterMode] = useState("role")

  const [selectedRole, setSelectedRole] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userSearch, setUserSearch] = useState("")
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const userInputRef = useRef(null)
  const [modalOpen, setModalOpen] = useState(false)

  const [newPermName, setNewPermName] = useState("")
  const { mutate: createPerm, isPending: isCreating } = useCreatePermission()

  const { data: rolePermData, isLoading: rolePermLoading } = useRolePermissions(selectedRole?.id)
  const rolePerms = rolePermData?.data?.permissions ?? []
  const { mutateAsync: assignRoleAsync, isPending: isAssigningRole } = useAssignRolePermissions()
  const {
    mutateAsync: removeRoleAsync,
    isPending: isRemovingRole,
    variables: removeRoleVars,
  } = useRemoveRolePermissions()

  const { data: userPermData, isLoading: userPermLoading } = useUserPermissionDetail(selectedUser?.id)
  const userDetail = userPermData?.data
  const { mutateAsync: assignUserAsync, isPending: isAssigningUser } = useAssignUserPermissions()
  const {
    mutateAsync: removeUserAsync,
    isPending: isRemovingUser,
    variables: removeUserVars,
  } = useRemoveUserPermissions()

  const { data: usersData } = useUsers(1, 20, userSearch)
  const userList = (usersData?.data ?? []).filter((u) => !u.isSuperAdmin)

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleCreate = (e) => {
    e.preventDefault()
    if (!newPermName.trim()) return
    createPerm(
      { name: newPermName.trim() },
      {
        onSuccess: () => { setNewPermName(""); toast.success(t("toast_perm_created")) },
        onError: (err) => toast.error(err?.response?.data?.message ?? t("toast_error_create")),
      }
    )
  }

  const handleRemoveRolePerm = async (permId) => {
    try {
      await removeRoleAsync({ roleId: selectedRole.id, permissionIds: [permId] })
      toast.success(t("toast_perm_removed_role"))
    } catch (err) {
      toast.error(err?.response?.data?.message ?? t("toast_error_remove"))
    }
  }

  const handleRemoveUserPerm = async (permId) => {
    try {
      await removeUserAsync({ userId: selectedUser.id, permissionIds: [permId] })
      toast.success(t("toast_perm_removed"))
    } catch (err) {
      toast.error(err?.response?.data?.message ?? t("toast_error_remove"))
    }
  }

  const handleModalSave = async (toAdd, toRemove) => {
    if (toAdd.length === 0 && toRemove.length === 0) { setModalOpen(false); return }
    try {
      if (filterMode === "role") {
        const ops = []
        if (toAdd.length > 0) ops.push(assignRoleAsync({ roleId: selectedRole.id, permissionIds: toAdd }))
        if (toRemove.length > 0) ops.push(removeRoleAsync({ roleId: selectedRole.id, permissionIds: toRemove }))
        await Promise.all(ops)
      } else {
        const ops = []
        if (toAdd.length > 0) ops.push(assignUserAsync({ userId: selectedUser.id, permissionIds: toAdd }))
        if (toRemove.length > 0) ops.push(removeUserAsync({ userId: selectedUser.id, permissionIds: toRemove }))
        await Promise.all(ops)
      }
      toast.success(t("toast_perms_updated"))
      setModalOpen(false)
    } catch (err) {
      toast.error(err?.response?.data?.message ?? t("toast_error_update"))
    }
  }

  const currentAssignedIds =
    filterMode === "role"
      ? new Set(rolePerms.map((p) => p.id))
      : new Set((userDetail?.extraPermissions ?? []).map((p) => p.id))

  const roleInheritedIds =
    filterMode === "user"
      ? new Set((userDetail?.rolePermissions ?? []).map((p) => p.id))
      : new Set()

  const isSavingModal = isAssigningRole || isRemovingRole || isAssigningUser || isRemovingUser

  const canOpenModal =
    filterMode === "role"
      ? !!selectedRole && !!rolePermData
      : !!selectedUser && !!userPermData

  const labelClass =
    "block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 ml-1"
  const inputClass =
    "w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#B12B89] outline-none transition dark:text-slate-100 text-sm"

  return (
    <div>
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

          {/* Filter mode switcher + selector */}
          <div className="px-6 pt-5 pb-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                {t("card_title")}
              </h3>
              <div className="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  onClick={() => { setFilterMode("role"); setSelectedUser(null); setUserSearch("") }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterMode === "role"
                      ? "bg-white dark:bg-slate-700 text-[#B12B89] shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <Shield size={13} />
                  {t("mode_role")}
                </button>
                <button
                  onClick={() => { setFilterMode("user"); setSelectedRole(null) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterMode === "user"
                      ? "bg-white dark:bg-slate-700 text-[#B12B89] shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <Users size={13} />
                  {t("mode_user")}
                </button>
              </div>
            </div>

            {/* Selector */}
            {filterMode === "role" ? (
              <div>
                <label className={labelClass}>{t("label_target_role")}</label>
                <select
                  value={selectedRole?.id ?? ""}
                  onChange={(e) => {
                    const role = STATIC_ROLES.find((r) => r.id === Number(e.target.value))
                    setSelectedRole(role ?? null)
                  }}
                  className={inputClass}
                >
                  <option value="">{t("placeholder_select_role")}</option>
                  {STATIC_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{formatName(r.name)}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className={labelClass}>{t("label_target_user")}</label>
                {selectedUser ? (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <User size={13} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                          {selectedUser.name}
                        </p>
                        <p className="text-[10px] text-slate-400">{selectedUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-500 px-2 py-0.5 rounded-full">
                        {formatName(selectedUser.role?.name ?? "—")}
                      </span>
                      <button
                        onClick={() => { setSelectedUser(null); setUserSearch("") }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition ml-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      ref={userInputRef}
                      type="text"
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setUserDropdownOpen(true) }}
                      onFocus={() => setUserDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setUserDropdownOpen(false), 180)}
                      placeholder={t("placeholder_search_user")}
                      className={inputClass}
                    />
                    {userDropdownOpen && userList.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-20 overflow-hidden max-h-52 overflow-y-auto">
                        {userList.map((u) => (
                          <button
                            key={u.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setSelectedUser(u); setUserSearch(""); setUserDropdownOpen(false) }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                <User size={11} className="text-blue-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{u.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full flex-shrink-0">
                              {formatName(u.role?.name ?? "—")}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Permissions list body ── */}
          {filterMode === "role" && !selectedRole ? (
            <EmptyHint icon={<Shield size={32} />} text={t("empty_role_text")} sub={t("empty_role_sub")} />
          ) : filterMode === "user" && !selectedUser ? (
            <EmptyHint icon={<Users size={32} />} text={t("empty_user_text")} sub={t("empty_user_sub")} />
          ) : filterMode === "role" ? (
            <>
              <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {rolePermLoading ? "—" : t("role_perm_count", { count: rolePerms.length })}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {t("role_label", { name: formatName(selectedRole.name) })}
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  disabled={!canOpenModal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#B12B89] hover:bg-[#B05596] text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  <Plus size={13} />
                  {t("btn_manage")}
                </button>
              </div>
              <div className="px-2 py-2 min-h-[240px] max-h-[520px] overflow-y-auto">
                {rolePermLoading ? (
                  <SkeletonPermRows />
                ) : rolePerms.length === 0 ? (
                  <EmptyHint icon={<Shield size={28} />} text={t("empty_role_perms_text")} sub={t("empty_role_perms_sub")} />
                ) : (
                  rolePerms.map((p) => (
                    <PermissionRow
                      key={p.id}
                      permission={p}
                      onRemove={() => handleRemoveRolePerm(p.id)}
                      isRemoving={isRemovingRole && removeRoleVars?.permissionIds?.[0] === p.id}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-800">
                {userPermLoading || !userDetail ? (
                  <div className="h-8 w-40 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                ) : (
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {t("effective_count", { count: userDetail.effectivePermissions?.length ?? 0 })}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {t("via_role_extra", {
                        role: userDetail.rolePermissions?.length ?? 0,
                        extra: userDetail.extraPermissions?.length ?? 0,
                      })}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setModalOpen(true)}
                  disabled={!canOpenModal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#B12B89] hover:bg-[#B05596] text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  <Plus size={13} />
                  {t("btn_add_extra")}
                </button>
              </div>

              <div className="px-2 py-2 min-h-[240px] max-h-[520px] overflow-y-auto">
                {userPermLoading || !userDetail ? (
                  <SkeletonPermRows />
                ) : (
                  <>
                    {(userDetail.rolePermissions?.length ?? 0) > 0 && (
                      <>
                        <div className="px-4 pt-2 pb-1">
                          <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
                            {t("section_via_role", { name: formatName(userDetail.role?.name), count: userDetail.rolePermissions.length })}
                          </p>
                        </div>
                        {userDetail.rolePermissions.map((p) => (
                          <PermissionRow
                            key={`role-${p.id}`}
                            permission={p}
                            badge={t("badge_via_role")}
                            disabled
                            onRemove={() => {}}
                          />
                        ))}
                      </>
                    )}

                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
                        {t("section_extra", { count: userDetail.extraPermissions?.length ?? 0 })}
                      </p>
                    </div>
                    {(userDetail.extraPermissions?.length ?? 0) === 0 ? (
                      <div className="px-4 py-4 text-xs text-slate-400 text-center">
                        {t("empty_extra")}
                      </div>
                    ) : (
                      userDetail.extraPermissions.map((p) => (
                        <PermissionRow
                          key={`extra-${p.id}`}
                          permission={p}
                          onRemove={() => handleRemoveUserPerm(p.id)}
                          isRemoving={isRemovingUser && removeUserVars?.permissionIds?.[0] === p.id}
                        />
                      ))
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <AssignPermissionsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={filterMode}
        targetName={filterMode === "role" ? selectedRole?.name : selectedUser?.name}
        currentAssignedIds={currentAssignedIds}
        roleInheritedIds={roleInheritedIds}
        onSave={handleModalSave}
        isSaving={isSavingModal}
      />
    </div>
  )
}
