import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";

import {
  useCreateClient,
  useUpdateClient,
  useClient,
} from "../hooks/useClients";
import { FormCard, FormFieldGrid, FormShell } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { Input } from "../../../shared/components/Input";
import { InputToggle } from "../../../shared/components/InputToggle";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema } from "./client.schema";
import { useSocietes } from "../../societes/hooks/useSocietes";
import { useAuth } from "../../auth/hooks/useAuth";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { SectionLoader } from "../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../shared/components/NotFound";

export const ClientsForm = () => {
  const { t } = useTranslation("clients");
  const { t: tCommon } = useTranslation("clients"); // Reuse types from clients namespace
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const isEditMode = Boolean(id);
  const { user } = useAuth();

  const CLIENT_TYPES = useMemo(() => [
    { label: tCommon("types.particulier"), value: "PARTICULIER" },
    { label: tCommon("types.societe"), value: "SOCIETE" },
  ], [tCommon]);

  const { data: societesData } = useSocietes({ pageIndex: 0, pageSize: 100 });
  const societes = societesData?.data || [];

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const { data: client, isLoading, isError } = useClient(id, { enabled: isEditMode });

  const methods = useForm({
    mode: "onTouched",
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "", phone: "", email: "", type: "", address: "",
      city: "", region: "", website: "", ice: "", if: "", rc: "",
      tp: "", creditLimit: 0, paymentDeadline: 0, discount: 0,
      active: true, societeId: "",
    }
  });

  const { register, control, handleSubmit, reset, setError, watch, formState: { errors } } = methods;
  const clientType = watch("type");
  const isSociete = clientType === "SOCIETE";

  useEffect(() => {
    if (client?.data) {
      const sanitizedData = Object.entries(client.data).reduce((acc, [key, value]) => {
        acc[key] = value === null ? "" : value;
        return acc;
      }, {});
      reset(sanitizedData);
    }
  }, [client, reset]);

  const mapAndSetErrors = (err) => {
    const apiErrors = err?.response?.data?.errors;
    if (Array.isArray(apiErrors)) {
      apiErrors.forEach((e) => { if (e.path) setError(e.path, { type: "server", message: e.msg }); });
    } else if (typeof apiErrors === "object" && apiErrors !== null) {
      Object.entries(apiErrors).forEach(([field, msg]) => { setError(field, { type: "server", message: msg }); });
    }
  };

  const onSubmit = (formData) => {
    if (user?.isSuperAdmin && !formData.societeId) {
      setError("societeId", { type: "manual", message: t("messages.societe_required") });
      return;
    }

    const mutation = isEditMode ? updateMutation.mutate : createMutation.mutate;
    let payloadValues = { ...formData };
    if (payloadValues.type !== "SOCIETE") {
      // Clear fiscal fields for individuals (don't send empty ICE strings)
      payloadValues = {
        ...payloadValues,
        ice: null,
        if: null,
        rc: null,
        tp: null,
      };
    }
    if (!isEditMode && !user?.isSuperAdmin) delete payloadValues.societeId;

    const payload = isEditMode ? { id, payload: payloadValues } : payloadValues;

    mutation(payload, {
      onSuccess: (res) => {
        toast.success(res?.message || (isEditMode ? t("messages.update_success") : t("messages.create_success")));
        navigate(!isEditMode && returnTo ? decodeURIComponent(returnTo) : "/clients");
      },
      onError: (err) => mapAndSetErrors(err),
    });
  };

  if (isEditMode && isLoading) return (<SectionLoader />);

    if (isEditMode && (!client?.data || isError) ) {
      return (
        <NotFound
         
          onAction={() => navigate("/clients")}
        />
      );
    } 

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("breadcrumb.list")}
        backPath={!isEditMode && returnTo ? decodeURIComponent(returnTo) : "/clients"}
        isEdit={isEditMode}
        data={client?.data}
        createTitle={t("breadcrumb.create")}
        editTitle={t("breadcrumb.edit")}
        backLabel={t("header.back")}
        editTitleKey="name"
      />


      <FormShell>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 lg:col-span-8 space-y-5">
              <FormCard title={t("sections.identification")}>
                <FormFieldGrid>
                  <Input
                    label={t("fields.name.label")}
                    {...register("name")}
                    error={errors.name?.message}
                    placeholder={t("fields.name.placeholder")}
                    required
                  />
                  <Input
                    label={t("fields.phone.label")}
                    {...register("phone")}
                    error={errors.phone?.message}
                    placeholder={t("fields.phone.placeholder")}
                    required
                  />
                  {user?.isSuperAdmin && (
                    <Controller
                      control={control}
                      name="societeId"
                      render={({ field }) => (
                        <SelectDropDown
                          label={t("fields.societe.label")}
                          {...field}
                          options={societes.map((s) => ({ label: s.raisonSocial, value: s.id }))}
                          error={errors.societeId?.message}
                          required
                        />
                      )}
                    />
                  )}
                  <SelectDropDown
                    label={t("fields.type.label")}
                    {...register("type")}
                    options={CLIENT_TYPES}
                    error={errors.type?.message}
                  />
                  <Input
                    label={t("fields.email.label")}
                    type="email"
                    {...register("email")}
                    placeholder={t("fields.email.placeholder")}
                    error={errors.email?.message}
                  />
                  <Input
                    label={t("fields.address.label")}
                    {...register("address")}
                    placeholder={t("fields.address.placeholder")}
                    error={errors.address?.message}
                  />
                  <Input
                    label={t("fields.city.label")}
                    {...register("city")}
                    placeholder={t("fields.city.placeholder")}
                    error={errors.city?.message}
                  />
                  <Input
                    label={t("fields.region.label")}
                    {...register("region")}
                    placeholder={t("fields.region.placeholder")}
                    error={errors.region?.message}
                  />
                  <Input
                    label={t("fields.website.label")}
                    {...register("website")}
                    placeholder={t("fields.website.placeholder")}
                    error={errors.website?.message}
                  />
                </FormFieldGrid>
              </FormCard>

              {isSociete && (
                <FormCard title={t("sections.fiscal")}>
                  <FormFieldGrid>
                    <Input label={t("fields.ice.label")} {...register("ice")} placeholder={t("fields.ice.placeholder")} error={errors.ice?.message} maxLength={15} />
                    <Input label={t("fields.if.label")} {...register("if")} placeholder={t("fields.if.placeholder")} error={errors.if?.message} />
                    <Input label={t("fields.rc.label")} {...register("rc")} placeholder={t("fields.rc.placeholder")} error={errors.rc?.message} />
                    <Input label={t("fields.tp.label")} {...register("tp")} placeholder={t("fields.tp.placeholder")} error={errors.tp?.message} />
                  </FormFieldGrid>
                </FormCard>
              )}
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-5">
              <FormCard title={t("sections.financial")}>
                <div className="space-y-4">
                  <Input label={t("fields.creditLimit.label")} type="number" {...register("creditLimit", { valueAsNumber: true })} error={errors.creditLimit?.message} min={0} />
                  <Input label={t("fields.paymentDeadline.label")} type="number" {...register("paymentDeadline", { valueAsNumber: true })} placeholder={t("fields.paymentDeadline.placeholder")} error={errors.paymentDeadline?.message} min={0} />
                  <Input label={t("fields.discount.label")} type="number" {...register("discount", { valueAsNumber: true })} error={errors.discount?.message} min={0} />
                </div>
              </FormCard>

              <FormCard title={t("sections.status")}>
                  <Controller
                    control={control}
                    name="active"
                    render={({ field }) => (
                      <InputToggle
                        label={t("fields.active.label")}
                        description={t("fields.active.description")}
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    )}
                  />
              </FormCard>
            </div>
          </div>

          <FormActions
            onCancel={() => navigate(!isEditMode && returnTo ? decodeURIComponent(returnTo) : "/clients")}
            cancelLabel={t("actions.cancel")}
            submitType="button"
            onSubmit={handleSubmit(onSubmit)}
            isLoading={createMutation.isPending || updateMutation.isPending}
            submitLabel={
              createMutation.isPending || updateMutation.isPending
                ? t("actions.processing")
                : isEditMode ? t("actions.submit_update") : t("actions.submit_create")
            }
          />
        </form>
      </FormShell>
    </div>
  );
};