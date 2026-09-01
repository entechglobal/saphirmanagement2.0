import { useNavigate } from "react-router-dom";
import { CategoryForm } from "../../components/CategoryForm";
import { useCreateCategory } from "../../hooks/useCategories";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";
import { FormPageHeader } from "../../../../shared/components/FormPageHeader";

export const CategoryCreatePage = () => {
  const { t } = useTranslation("categories");
  const navigate = useNavigate();
  const createMutation = useCreateCategory();

  const handleSubmit = async (values) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success(t("toast.create_success"));
      navigate("/categories");
    } catch (error) {
      toast.error(t("toast.create_error"));
      throw error;
    }
  };

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("categories")}
        backPath="/categories"
        createLabel={t("create")}
        createTitle={t("create_category")}
        backLabel={t("back_to_categories")}
      />

      <CategoryForm
        initialValues={{ name: "", image: "", visible: true }}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending}
      />
    </div>
  );
};
