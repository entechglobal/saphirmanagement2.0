import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useCreateDelivery,
  useUpdateDelivery,
  useDelivery,
  useSocietes,
} from "../hooks/useDeliveries";
import { FormPageHeader } from "../../../../shared/components/FormPageHeader";
import { FormCard, FormFieldGrid } from "../../../../shared/components/FormCard";
import { FormActions } from "../../../../shared/components/FormActions";
import { Input } from "../../../../shared/components/Input";
import { InputToggle } from "../../../../shared/components/InputToggle";
import { SelectDropDown } from "../../../../shared/components/SelectDropDown";
import { SectionLoader } from "../../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../../shared/components/NotFound";
import { useAuth } from "../../../auth/hooks/useAuth";

const MOROCCO_PHONE_REGEX = /^(?:(?:\+|00)212|0)[5-6-7]\d{8}$/;

export const DeliveryForm = ({ mode = "create" }) => {
  const { t } = useTranslation("deliveries");
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = mode === "edit" && !!id;
  const { user } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;

  const DELIVERY_TYPES = [
    { value: "SOCIETE", label: t("entity_type.societe") },
    { value: "PARTICULIER", label: t("entity_type.particulier") },
  ];

  const validateMoroccoPhone = (value) => {
    if (!value || value.trim() === "") return undefined;
    if (!MOROCCO_PHONE_REGEX.test(value.trim())) return t("form.validation.phone_invalid");
    return undefined;
  };

  const createMutation = useCreateDelivery();
  const updateMutation = useUpdateDelivery();
  const mutation = isEditMode ? updateMutation : createMutation;

  const { data: deliveryData, isLoading: deliveryLoading, isError } = useDelivery(
    isEditMode ? id : null
  );
  const { data: societesData, isLoading: societesLoading } = useSocietes();
  const societes = societesData?.data ?? [];

  const [formData, setFormData] = useState({
    societeId: "",
    name: "",
    entityType: "SOCIETE",
    address: "",
    tel: "",
    active: true,
  });
  const [initialFormData, setInitialFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isEditMode || deliveryLoading || !deliveryData || initialized) return;
    const d = deliveryData?.data ?? deliveryData;
    const initial = {
      societeId: d.societeId ?? "",
      name: d.name ?? "",
      entityType: d.entityType ?? "SOCIETE",
      address: d.address ?? "",
      tel: d.tel ?? "",
      active: d.active ?? true,
    };
    setFormData(initial);
    setInitialFormData(initial);
    setInitialized(true);
  }, [isEditMode, deliveryLoading, deliveryData, initialized]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = t("form.validation.required");
    if (isSuperAdmin && !formData.societeId) e.societeId = t("form.validation.required");
    if (!formData.entityType) e.entityType = t("form.validation.required");
    
    /* Also validate phone at submit time */
    const phoneError = validateMoroccoPhone(formData.tel);
    if (phoneError) e.tel = phoneError;
    
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
        if (val !== initialFormData?.[key]) changed[key] = val;
      });
      if (Object.keys(changed).length === 0) {
        toast.info(t("form.toast.no_changes"));
        return;
      }
      updateMutation.mutate(
        { id, payload: changed },
        {
          onSuccess: () => { toast.success(t("form.toast.update_success")); navigate("/deliveries"); },
          onError: (err) => { toast.error(err?.response?.data?.message || t("form.toast.update_error")); },
        }
      );
    } else {
      const { societeId, ...rest } = formData;
      createMutation.mutate(
        { societeId: isSuperAdmin ? Number(societeId) : undefined, payload: rest },
        {
          onSuccess: () => { toast.success(t("form.toast.create_success")); navigate("/deliveries"); },
          onError: (err) => { toast.error(err?.response?.data?.message || t("form.toast.create_error")); },
        }
      );
    }
  };

  if (isEditMode && deliveryLoading) return <SectionLoader />;
  if (isEditMode && (isError || !deliveryData?.data)) {
    return <NotFound onAction={() => navigate("/deliveries")} />;
  }

  const delivery = deliveryData?.data ?? null;

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("form.entity_name")}
        backPath="/deliveries"
        isEdit={isEditMode}
        data={delivery}
        createTitle={t("form.create_title")}
        editTitle={t("form.edit_title", { name: delivery?.name ?? "" })}
        backLabel={t("form.back_label")}
      />

      <div className="w-full mt-3 space-y-4">

        {/* Main info */}
        <FormCard title={t("form.sections.info")} icon={<Truck className="w-4 h-4" />}>
          <FormFieldGrid>

            {/* Société — super admins only (others are scoped to their own société) */}
            {isSuperAdmin && (
              <div className="md:col-span-2">
                <SelectDropDown
                  label={t("form.fields.societe")}
                  name="societeId"
                  placeholder={t("form.fields.societe_placeholder")}
                  value={formData.societeId}
                  options={societes.map((s) => ({
                    value: s.id,
                    label: s.raisonSocial,
                  }))}
                  isLoading={societesLoading}
                  disabled={isEditMode}
                  error={errors.societeId}
                  onChange={handleChange}
                  required
                />
                {isEditMode && (
                  <p className="text-[10px] text-amber-500 mt-1 ml-1">
                    {t("form.fields.societe_locked")}
                  </p>
                )}
              </div>
            )}

            <Input
              label={t("form.fields.name")}
              name="name"
              placeholder={t("form.fields.name_placeholder")}
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />

            <SelectDropDown
              label={t("form.fields.type")}
              name="entityType"
              value={formData.entityType}
              options={DELIVERY_TYPES}
              error={errors.entityType}
              onChange={handleChange}
            />

            <Input
              label={t("form.fields.phone")}
              name="tel"
              placeholder={t("form.fields.phone_placeholder")}
              value={formData.tel}
              onChange={handleChange}
              error={errors.tel}
              validate={validateMoroccoPhone}
              required
            />

            <Input
              label={t("form.fields.address")}
              name="address"
              placeholder={t("form.fields.address_placeholder")}
              value={formData.address}
              onChange={handleChange}
            />
          </FormFieldGrid>
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
          onCancel={() => navigate("/deliveries")}
          cancelLabel={t("form.actions.cancel")}
          submitType="button"
          onSubmit={handleSubmit}
          isLoading={mutation.isPending}
          submitLabel={
            mutation.isPending
              ? isEditMode ? t("form.actions.saving") : t("form.actions.creating")
              : isEditMode ? t("form.actions.save") : t("form.actions.create")
          }
        />
      </div>
    </div>
  );
};