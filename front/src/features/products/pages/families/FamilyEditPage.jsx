import { useParams, useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { SectionLoader } from "../../../../shared/components/loadersCollections/SectionLoader";
import { FamilyForm } from "../../components/FamilyForm";
import { useFamily, useUpdateFamily } from "../../hooks/useFamilies";
import { useTranslation } from "react-i18next";
import { FormPageHeader } from "../../../../shared/components/FormPageHeader";
import { NotFound } from "../../../../shared/components/NotFound";

export const FamilyEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation("families");

  const { data: family, isLoading, isError } = useFamily(id);
  const updateMutation = useUpdateFamily();

  if (isLoading) return <SectionLoader />;
  if (!family?.data || isError) {
    return <NotFound onAction={() => navigate("/families")} />;
  }

  const initialValues = {
    name: family.data.name ?? "",
    categoryId: family.data.categoryId ?? "",
    manageInStock: Boolean(family.data.manageInStock),
    visible: Boolean(family.data.visible),
    TVA: family.data.TVA ?? "",
    remise: family.data.remise ? Math.round(family.data.remise * 100) : "",
    imagePreview: family.data.image || family.data.imageUrl || "",
  };

  const handleSubmit = async (values) => {
    try {
      if (values instanceof FormData) {
        const res = await updateMutation.mutateAsync({
          id,
          payload: values,
          isFormData: true,
        });
        toast.success(
          res?.data?.message || res?.message || t("toast.update_success")
        );
        navigate("/families");
        return;
      }

      const res = await updateMutation.mutateAsync({ id, payload: values });
      toast.success(
        res?.data?.message || res?.message || t("toast.update_success")
      );
      navigate("/families");
    } catch (error) {
      toast.error(error?.response?.data?.message || t("toast.update_error"));
    }
  };

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("title")}
        backPath="/families"
        isEdit
        data={family.data}
        editLabel={t("edit")}
        editTitle={t("edit_family")}
        backLabel={t("back_to_families")}
      />

      <FamilyForm
        id={id}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
};
