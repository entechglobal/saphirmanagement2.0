import { useParams } from "react-router-dom";
import { useQuery } from "@/shared/lib/query";
import { agencesApi } from "../api/agences.api";
import { AgenceForm } from "./AgenceForm";
import { SectionLoader } from "@/shared/components/loadersCollections/SectionLoader";

export const AgenceFormEdit = () => {
  const { id } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["agence", id],
    queryFn: () => agencesApi.getById(id),
    enabled: !!id,
  });

  if (isLoading) return <SectionLoader />;

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">Erreur</h2>
          <p className="text-slate-600 dark:text-slate-400">
            {error?.message || "Impossible de charger l'agence"}
          </p>
        </div>
      </div>
    );
  }

  return <AgenceForm id={id} initialValues={data} mode="edit" />;
};
