import { useParams, useNavigate } from "react-router-dom";
import { CategoryForm } from "../../components/CategoryForm";
import { useCategory, useUpdateCategory } from "../../hooks/useCategories";
import { SectionLoader } from "../../../../shared/components/loadersCollections/SectionLoader";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";
import { FormPageHeader } from "../../../../shared/components/FormPageHeader";
import { NotFound } from "../../../../shared/components/NotFound";

export const CategoryEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation("categories");

  const { data: category, isLoading, isError } = useCategory(id);
  const updateMutation = useUpdateCategory();

  if (isLoading) return <SectionLoader />;

  if (!category?.data || isError) {
    return <NotFound onAction={() => navigate("/categories")} />;
  }

  const handleSubmit = async (values) => {
    try {
      await updateMutation.mutateAsync({ id, payload: values });
      toast.success(t("toast.update_success"));
      navigate("/categories");
    } catch (error) {
      toast.error(t("toast.update_error"));
      throw error;
    }
  };

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("categories")}
        backPath="/categories"
        isEdit
        data={category?.data}
        editLabel={t("edit")}
        editTitle={t("edit_category")}
        backLabel={t("back_to_categories")}
      />

      <CategoryForm
        initialValues={category}
        onSubmit={handleSubmit}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
};
