import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";
import { Landmark } from "lucide-react";

import { useCreateBanque, useUpdateBanque, useBanque } from "../hooks/useBanques";
import { FormPageHeader } from "../../../../shared/components/FormPageHeader";
import { FormCard, FormFieldGrid } from "../../../../shared/components/FormCard";
import { FormActions } from "../../../../shared/components/FormActions";
import { Input } from "../../../../shared/components/Input";
import { SectionLoader } from "../../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../../shared/components/NotFound";

/* ─── BanqueForm ─── */
export const BanqueForm = ({ mode = "create" }) => {
  const { t } = useTranslation("banques");
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = mode === "edit" && !!id;

  const createMutation = useCreateBanque();
  const updateMutation = useUpdateBanque();
  const mutation = isEditMode ? updateMutation : createMutation;

  /* fetch existing data in edit mode */
  const { data: banqueData, isLoading: banqueLoading, isError } = useBanque(
    isEditMode ? id : null
  );

  const [formData, setFormData] = useState({ name: "", RIB: "", ville: "" });
  const [initialFormData, setInitialFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [initialized, setInitialized] = useState(false);

  /* pre-fill on edit */
  useEffect(() => {
    if (!isEditMode || banqueLoading || !banqueData || initialized) return;
    const d = banqueData?.data ?? banqueData;
    const initial = {
      name: d.name ?? "",
      RIB: d.RIB ?? "",
      ville: d.ville ?? "",
    };
    setFormData(initial);
    setInitialFormData(initial);
    setInitialized(true);
  }, [isEditMode, banqueLoading, banqueData, initialized]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = t("form.validation.required");
    if (!formData.RIB.trim()) e.RIB = t("form.validation.required");
    if (!formData.ville.trim()) e.ville = t("form.validation.required");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error(t("form.validation.fill_required"));
      return;
    }

    if (isEditMode) {
      /* only send changed fields */
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
          onSuccess: () => {
            toast.success(t("form.toast.update_success"));
            navigate("/banque");
          },
          onError: (err) => {
            toast.error(err?.response?.data?.message || t("form.toast.update_error"));
          },
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success(t("form.toast.create_success"));
          navigate("/banque");
        },
        onError: (err) => {
          toast.error(err?.response?.data?.message || t("form.toast.create_error"));
        },
      });
    }
  };

  /* ── loading / error guards ── */
  if (isEditMode && banqueLoading) return <SectionLoader />;
  if (isEditMode && (isError || !banqueData?.data)) {
    return <NotFound onAction={() => navigate("/banque")} />;
  }

  const banque = banqueData?.data ?? null;

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("form.entity_name")}
        backPath="/banque"
        isEdit={isEditMode}
        data={banque}
        createTitle={t("form.create_title")}
        editTitle={`${t("form.edit_title_prefix")}${banque?.name ?? ""}`}
        backLabel={t("form.back_label")}
      />

      <div className="w-full mt-3 space-y-4">
        <FormCard title={t("form.section_info")} icon={<Landmark className="w-4 h-4" />}>
          <FormFieldGrid>
            <Input
              label={t("form.fields.name")}
              name="name"
              placeholder={t("form.fields.name_placeholder")}
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />

            <Input
              label={t("form.fields.ville")}
              name="ville"
              placeholder={t("form.fields.ville_placeholder")}
              value={formData.ville}
              onChange={handleChange}
              error={errors.ville}
              required
            />

            {/* RIB spans full width */}
            <Input
              className="md:col-span-2"
              label={t("form.fields.rib")}
              name="RIB"
              placeholder={t("form.fields.rib_placeholder")}
              value={formData.RIB}
              onChange={handleChange}
              error={errors.RIB}
              required
            />
          </FormFieldGrid>
        </FormCard>

        <FormActions
          onCancel={() => navigate("/banque")}
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
