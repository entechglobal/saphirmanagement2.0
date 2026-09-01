import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import { useCreateAgence, useUpdateAgence, useSocietesForAgence } from "../hooks/useAgences";
import { FormPageHeader } from "@/shared/components/FormPageHeader";
import { FormCard, FormFieldGrid } from "@/shared/components/FormCard";
import { FormActions } from "@/shared/components/FormActions";
import { Input } from "@/shared/components/Input";
import { InputToggle } from "@/shared/components/InputToggle";
import { SelectDropDown as Select } from "@/shared/components/SelectDropDown";
import { SectionLoader } from "@/shared/components/loadersCollections/SectionLoader";

export const AgenceForm = ({ id, initialValues, mode = "create" }) => {
  const data = initialValues?.data;
  const navigate = useNavigate();
  const { t } = useTranslation("agences");
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPERADMIN" || user?.isSuperAdmin;

  const { data: societesData, isLoading: societesLoading } = useSocietesForAgence();
  const createMutation = useCreateAgence();
  const updateMutation = useUpdateAgence();

  const isEditMode = mode === "edit" && id;
  const societes = societesData?.data ?? [];

  const [formData, setFormData] = useState({
    name: "",
    localisation: "",
    responsable: "",
    active: true,
    societeId: "",
  });

  const [errors, setErrors] = useState({});
  const [initialFormData, setInitialFormData] = useState(null);

  useEffect(() => {
    if (isEditMode && data) {
      const initial = {
        name: data.name || "",
        localisation: data.localisation || "",
        responsable: data.responsable || "",
        active: data.active ?? true,
        societeId: data.societeId || "",
      };
      setFormData(initial);
      setInitialFormData(initial);
    }
  }, [isEditMode, data]);

  const societesOptions = societes.map((s) => ({
    value: s.id,
    label: s.raisonSocial,
  }));

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const e = {};
    if (!formData.name.trim()) e.name = t("form.validation.name_required");
    if (!formData.localisation.trim()) e.localisation = t("form.validation.localisation_required");
    if (!formData.responsable.trim()) e.responsable = t("form.validation.responsable_required");
    if (isSuperAdmin && !formData.societeId) e.societeId = t("form.validation.societe_required");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validateForm()) return toast.error(t("form.validation.fill_required"));

    const payload = {
      name: formData.name,
      localisation: formData.localisation,
      responsable: formData.responsable,
      active: formData.active,
    };

    if (isEditMode && initialFormData) {
      const changed = {};
      Object.keys(payload).forEach((key) => {
        if (payload[key] !== initialFormData[key]) {
          changed[key] = payload[key];
        }
      });

      if (Object.keys(changed).length === 0) {
        toast.info(t("form.validation.no_changes"));
        return;
      }

      try {
        await updateMutation.mutateAsync({ id, payload: changed });
        toast.success(t("toast.update_success"));
        navigate("/agences");
      } catch (error) {
        toast.error(error?.response?.data?.message || t("toast.update_error"));
      }
    } else {
      try {
        const payloadWithSociete = isSuperAdmin
          ? { ...payload, societeId: Number(formData.societeId) }
          : payload;

        await createMutation.mutateAsync({
          payload: payloadWithSociete,
          societeId: isSuperAdmin ? Number(formData.societeId) : undefined,
        });
        toast.success(t("toast.create_success"));
        navigate("/agences");
      } catch (error) {
        toast.error(error?.response?.data?.message || t("toast.create_error"));
      }
    }
  };

  const mutation = isEditMode ? updateMutation : createMutation;

  if (societesLoading) return <SectionLoader />;

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("title")}
        backPath="/agences"
        isEdit={isEditMode}
        data={data}
        createTitle={t("form.buttons.save_new")}
        editTitle={t("form.buttons.save_edit")}
        backLabel={t("back_to_list")}
      />

      <div className="w-full mt-3">
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormCard title={t("form.basic_info")} icon={<MapPin size={20} />}>
            <FormFieldGrid>
              <Input
                label={t("form.fields.name")}
                name="name"
                placeholder={t("form.placeholders.agence_name")}
                value={formData.name}
                onChange={handleInputChange}
                error={errors.name}
                required
              />

              <Input
                label={t("form.fields.localisation")}
                name="localisation"
                placeholder={t("form.placeholders.localisation")}
                value={formData.localisation}
                onChange={handleInputChange}
                error={errors.localisation}
                required
              />

              <Input
                label={t("form.fields.responsable")}
                name="responsable"
                placeholder={t("form.placeholders.responsable")}
                value={formData.responsable}
                onChange={handleInputChange}
                error={errors.responsable}
                required
              />

              {isSuperAdmin && (
                <Select
                  label={t("form.fields.societe")}
                  name="societeId"
                  value={formData.societeId}
                  onChange={handleInputChange}
                  error={errors.societeId}
                  options={societesOptions}
                  required={isSuperAdmin}
                  title={t("form.placeholders.select")}
                />
              )}
            </FormFieldGrid>
          </FormCard>

          <FormCard title={t("form.status_card")}>
            <InputToggle
              label={t("form.fields.active")}
              description={t("form.fields.active_desc")}
              name="active"
              checked={formData.active}
              onChange={handleInputChange}
            />
          </FormCard>

          <FormActions
            onCancel={() => navigate(-1)}
            cancelLabel={t("form.buttons.back")}
            submitType="button"
            onSubmit={handleSubmit}
            isLoading={mutation.isPending}
            submitLabel={
              mutation.isPending
                ? (isEditMode ? t("form.buttons.updating") : t("form.buttons.saving"))
                : (isEditMode ? t("form.buttons.save_edit") : t("form.buttons.save_new"))
            }
          />
        </form>
      </div>
    </div>
  );
};
