import { useLazyBrowseArticlesQuery } from "@/api/articlesApi";
import type { BrowseArticlesRequest } from "@/api/types";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { type ArticlePreview } from "@/types";
import { useArticleFilters } from "./useArticleFilters";
import { toast } from "@/components/ui/toast";
import { getErrorMessage, isErrorWithStatusCode } from "@/api/utils";
import { useNavigate } from "react-router";

export const useArticleListState = () => {
  const navigate = useNavigate();
  const [
    fetchArticles,
    { data: articleData, isLoading, isFetching, error: loadError },
  ] = useLazyBrowseArticlesQuery();
  const [articles, setArticles] = useState<ArticlePreview[]>(
    articleData?.data ?? [],
  );
  const [hasMore, setHasMore] = useState<boolean>(
    articleData?.hasMore ?? false,
  );
  const [fetchMoreError, setFetchMoreError] = useState<unknown>(undefined);
  const {
    statusFilter,
    handleStatusFilterChange,
    filters,
    handleFilterChange,
  } = useArticleFilters();
  const fetchRequest: BrowseArticlesRequest = useMemo(
    () => ({
      limit: 4,
      status: statusFilter,
      ...(filters.startDate ? { startDate: filters.startDate } : {}),
      ...(filters.endDate ? { endDate: filters.endDate } : {}),
    }),
    [statusFilter, filters],
  );
  const infiniteScrollRef = useRef<HTMLUListElement | null>(null);

  const handleError = useCallback(
    async (error: unknown) => {
      console.error(error);
      if (
        isErrorWithStatusCode(error) &&
        (error.status === 401 || error.code === 401)
      ) {
        navigate("/authorize");
        return true;
      }
      return false;
    },
    [navigate],
  );

  useEffect(() => {
    let cancelled = false;

    const trigger = () => {
      setArticles([]);
      setHasMore(false);
      setFetchMoreError(undefined);

      fetchArticles(fetchRequest).then(({ data, error }) => {
        if (cancelled) return;

        if (error) handleError(error);

        if (!data) return;

        setArticles(data.data);
        setHasMore(data.hasMore);
      });
    };

    trigger();
    return () => {
      cancelled = true;
    };
  }, [fetchArticles, fetchRequest, handleError]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || articles.length === 0) return;

    const { data, error: loadMoreError } = await fetchArticles({
      ...fetchRequest,
      cursorId: articles[articles.length - 1].id,
    });

    if (loadMoreError) {
      const redirected = await handleError(loadMoreError);
      if (redirected) return;

      const errorMessage = getErrorMessage(loadMoreError);
      setFetchMoreError(errorMessage);
      toast.add({
        type: "error",
        title: errorMessage.message,
        description: errorMessage.subtext,
      });
      return;
    }

    setFetchMoreError(undefined);
    if (!data) return;

    setArticles((prev) => {
      const seen = new Set(prev.map((a) => a.id));
      return [...prev, ...data.data.filter((a) => !seen.has(a.id))];
    });
    setHasMore(data.hasMore);
  }, [fetchArticles, fetchRequest, articles, hasMore, handleError]);

  const retryInitialFetch = () => {
    fetchArticles(fetchRequest).then(({ data, error }) => {
      if (error) handleError(error);

      if (!data) return;

      setArticles(data.data);
      setHasMore(data.hasMore);
    });
  };

  return {
    articles,
    hasMore,
    isLoading,
    isFetching,
    loadError,
    retryInitialFetch,
    infiniteScrollRef,
    fetchMore,
    fetchMoreError,
    filters: {
      statusFilter,
      handleStatusFilterChange,
      filters,
      handleFilterChange,
    },
  };
};
