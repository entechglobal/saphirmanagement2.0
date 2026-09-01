import { useParams, useNavigate } from "react-router-dom";
import { SimpleArticleForm } from "../components/simpleArticle/SimpleArticleForm";
import { useArticle } from "../../../hooks/useArticles";
import { SectionLoader } from "../../../../../shared/components/loadersCollections/SectionLoader";
import { Package, ChevronLeft } from "lucide-react"
import { NotFound } from "../../../../../shared/components/NotFound";
export const ArticleEditPage = () => {
  const { id } = useParams();
  const { data: article, isLoading, isError } = useArticle(id); // Pass id to useArticle hook

  if (isLoading) {
    return (
      <SectionLoader />
    );
  }
  if (!article || isError) {
    return (
      <NotFound
        onAction={() => navigate("/articles")}
      />
    );
  }


  return <SimpleArticleForm mode="edit" initialValues={article} id={id} />;
};