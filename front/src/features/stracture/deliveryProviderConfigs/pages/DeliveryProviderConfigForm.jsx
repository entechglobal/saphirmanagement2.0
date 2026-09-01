import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { Plug2, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/features/auth";
import { useSocietes } from "@/features/societes/hooks/useSocietes";
import { useDeliveriesList } from "../../delivries/hooks/useDeliveries";
import {
  useCreateDeliveryProviderConfig,
  useUpdateDeliveryProviderConfig,
  useDeliveryProviderConfig,
} from "../hooks/useDeliveryProviderConfigs";
import { FormPageHeader } from "../../../../shared/components/FormPageHeader";
import { FormCard, FormFieldGrid } from "../../../../shared/components/FormCard";
import { FormActions } from "../../../../shared/components/FormActions";
import { Input } from "../../../../shared/components/Input";
import { InputToggle } from "../../../../shared/components/InputToggle";
import { SelectDropDown } from "../../../../shared/components/SelectDropDown";
import { SectionLoader } from "../../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../../shared/components/NotFound";

export const DeliveryProviderConfigForm = ({ mode = "create" }) => {
  const { t } = useTranslation("deliveryProviderConfigs");
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = mode === "edit" && !!id;

  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin ?? false;

  const createMutation = useCreateDeliveryProviderConfig();
  const updateMutation = useUpdateDeliveryProviderConfig();
  const mutation = isEditMode ? updateMutation : createMutation;

  const { data: configData, isLoading: configLoading, isError } =
    useDeliveryProviderConfig(isEditMode ? id : null);

  const [formData, setFormData] = useState({
    provider: "",
    name: "",
    apiId: "",
    apiKey: "",
    active: true,
    societeId: "",
  });
  const [initialFormData, setInitialFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [initialized, setInitialized] = useState(false);

  const { data: livreursData, isLoading: livreursLoading } = useDeliveriesList({
    pageIndex: 0,
    pageSize: 1000,
    keyword: "",
    societeId: isSuperAdmin && !isEditMode ? formData.societeId || undefined : undefined,
  });
  const providerOptions = (livreursData?.data ?? [])
    .filter((d) => d.entityType === "SOCIETE" && d.type === "EXTERN")
    .map((d) => ({ value: d.name, label: d.name }));

  const { data: societesData, isLoading: societesLoading } = useSocietes({
    pageIndex: 0,
    pageSize: 1000,
    keyword: "",
  });
  const societeOptions = (societesData?.data ?? []).map((s) => ({
    value: s.id,
    label: s.raisonSocial,
  }));

  useEffect(() => {
    if (!isEditMode || configLoading || !configData || initialized) return;
    const d = configData?.data ?? configData;
    const initial = {
      provider: d.provider ?? "",
      name: d.name ?? "",
      apiId: "",
      apiKey: "",
      active: d.active ?? true,
      societeId: d.societeId ?? "",
    };
    setFormData(initial);
    setInitialFormData(initial);
    setInitialized(true);
  }, [isEditMode, configLoading, configData, initialized]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "societeId" && isSuperAdmin ? { provider: "" } : {}),
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!formData.provider) e.provider = t("form.validation.required");
    if (!formData.name.trim()) e.name = t("form.validation.required");
    if (!isEditMode) {
      if (!formData.apiId.trim()) e.apiId = t("form.validation.required");
      if (!formData.apiKey.trim()) e.apiKey = t("form.validation.required");
    }
    if (isSuperAdmin && !isEditMode && !formData.societeId)
      e.societeId = t("form.validation.required");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast.error(t("form.toast.form_errors"));
      return;
    }

    if (isEditMode) {
      const changed = {};
      Object.entries(formData).forEach(([key, val]) => {
        if (key === "apiId" || key === "apiKey") {
          if (val && val.trim()) changed[key] = val;
        } else if (val !== initialFormData?.[key]) {
          changed[key] = val;
        }
      });

      if (Object.keys(changed).length === 0) {
        toast.info(t("form.toast.no_changes"));
        return;
      }

      updateMutation.mutate(
        { id, payload: changed },
        {
          onSuccess: () => {
            toast.success(t("form.toast.update_success"));
            navigate("/delivery-provider-configs");
          },
          onError: (err) => {
            toast.error(
              err?.response?.data?.message || t("form.toast.update_error")
            );
          },
        }
      );
    } else {
      const payload = {
        provider: formData.provider,
        name: formData.name,
        apiId: formData.apiId,
        apiKey: formData.apiKey,
        active: formData.active,
      };
      if (isSuperAdmin && formData.societeId) {
        payload.societeId = Number(formData.societeId);
      }

      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(t("form.toast.create_success"));
          navigate("/delivery-provider-configs");
        },
        onError: (err) => {
          toast.error(err?.response?.data?.errors[0]?.msg ||t("form.toast.create_error"));
        },
      });
    }
  };

  if (isEditMode && configLoading) return <SectionLoader />;
  if (isEditMode && (isError || !configData?.data)) {
    return <NotFound onAction={() => navigate("/delivery-provider-configs")} />;
  }

  const config = configData?.data ?? null;

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("form.entity_name")}
        backPath="/delivery-provider-configs"
        isEdit={isEditMode}
        data={config}
        createTitle={t("form.create_title")}
        editTitle={t("form.edit_title", { name: config?.name ?? "" })}
        backLabel={t("form.back_label")}
      />

      <div className="w-full mt-3 space-y-4">

        {/* Main info */}
        <FormCard
          title={t("form.sections.info")}
          icon={<Plug2 className="w-4 h-4" />}
        >
          <FormFieldGrid>
            {isSuperAdmin && (
              <div className="md:col-span-2">
                <SelectDropDown
                  label={t("form.fields.societe")}
                  name="societeId"
                  placeholder={t("form.fields.societe_placeholder")}
                  value={formData.societeId}
                  options={societeOptions}
                  isLoading={societesLoading}
                  disabled={isEditMode}
                  error={errors.societeId}
                  onChange={handleChange}
                  required={!isEditMode}
                />
                {isEditMode && (
                  <p className="text-[10px] text-amber-500 mt-1 ml-1">
                    {t("form.fields.societe_locked")}
                  </p>
                )}
              </div>
            )}

            <SelectDropDown
              label={t("form.fields.provider")}
              name="provider"
              placeholder={t("form.fields.provider_placeholder")}
              value={formData.provider}
              options={providerOptions}
              isLoading={livreursLoading}
              disabled={isEditMode || (isSuperAdmin && !isEditMode && !formData.societeId)}
              error={errors.provider}
              onChange={handleChange}
              required
              emptyMessage={
                isSuperAdmin && formData.societeId
                  ? t("form.fields.provider_empty")
                  : undefined
              }
            />

            <Input
              label={t("form.fields.name")}
              name="name"
              placeholder={t("form.fields.name_placeholder")}
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
          </FormFieldGrid>
        </FormCard>

        {/* API Credentials */}
        <FormCard
          title={t("form.sections.credentials")}
          icon={<KeyRound className="w-4 h-4" />}
        >
          <FormFieldGrid>
            <Input
              label={t("form.fields.api_id")}
              name="apiId"
              placeholder={t("form.fields.api_id_placeholder")}
              value={formData.apiId}
              onChange={handleChange}
              error={errors.apiId}
              required={!isEditMode}
            />

            <Input
              label={t("form.fields.api_key")}
              name="apiKey"
              type="password"
              placeholder={
                isEditMode
                  ? t("form.fields.api_key_placeholder_edit")
                  : t("form.fields.api_key_placeholder")
              }
              value={formData.apiKey}
              onChange={handleChange}
              error={errors.apiKey}
              required={!isEditMode}
            />
          </FormFieldGrid>
          {isEditMode && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
              {t("form.fields.credentials_edit_hint")}
            </p>
          )}
        </FormCard>

        {/* Status */}
        <FormCard title={t("form.sections.status")}>
          <InputToggle
            label={t("form.fields.active_label")}
            description={t("form.fields.active_desc")}
            name="active"
            checked={formData.active}
            onChange={handleChange}
          />
        </FormCard>

        <FormActions
          onCancel={() => navigate("/delivery-provider-configs")}
          cancelLabel={t("form.actions.cancel")}
          submitType="button"
          onSubmit={handleSubmit}
          isLoading={mutation.isPending}
          submitLabel={
            mutation.isPending
              ? isEditMode
                ? t("form.actions.saving")
                : t("form.actions.creating")
              : isEditMode
              ? t("form.actions.save")
              : t("form.actions.create")
          }
        />
      </div>
    </div>
  );
};
