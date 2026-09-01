import { useNavigate } from "react-router-dom";
import { FamilyForm } from "../../components/FamilyForm";
import { useCreateFamily } from "../../hooks/useFamilies";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";
import { FormPageHeader } from "../../../../shared/components/FormPageHeader";

export const FamilyCreatePage = () => {
  const { t } = useTranslation("families");
  const navigate = useNavigate();
  const createMutation = useCreateFamily();

  const handleSubmit = async (values) => {
    try {
      const res = await createMutation.mutateAsync(values);
      toast.success(
        res?.data?.message || res?.message || t("toast.create_success")
      );
      navigate("/families");
    } catch (error) {
      toast.error(t("toast.create_error"));
      throw error;
    }
  };

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("title")}
        backPath="/families"
        createLabel={t("create")}
        createTitle={t("new_family")}
        backLabel={t("back_to_families")}
      />

      <FamilyForm
        initialValues={{
          name: "",
          categoryId: "",
          manageInStock: true,
          TVA: "0",
          image: "",
          remise: "0",
          visible: true,
        }}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending}
      />
    </div>
  );
};
