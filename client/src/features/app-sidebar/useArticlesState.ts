import { useLazyBrowseArticlesQuery } from "@/api/articlesApi";
import type { BrowseArticlesRequest } from "@/api/types";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { type ArticlePreview } from "@/types";
import { useArticleFilters } from "./useArticleFilters";

export const useArticlesState = () => {
  const [fetchArticles, { data: articleData, isLoading, isFetching, error }] =
    useLazyBrowseArticlesQuery();
  const [articles, setArticles] = useState<ArticlePreview[]>(
    articleData?.data ?? [],
  );
  const [hasMore, setHasMore] = useState<boolean>(
    articleData?.hasMore ?? false,
  );
  const {
    statusFilter,
    handleStatusFilterChange,
    filters,
    handleFilterChange,
  } = useArticleFilters();
  const fetchRequest: BrowseArticlesRequest = useMemo(
    () => ({
      limit: 4,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(filters.startDate ? { startDate: filters.startDate } : {}),
      ...(filters.endDate ? { endDate: filters.endDate } : {}),
    }),
    [statusFilter, filters],
  );
  const infiniteScrollRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchArticles(fetchRequest).then(({ data }) => {
      if (cancelled || !data) return;

      setArticles(data.data);
      setHasMore(data.hasMore);
    });

    return () => {
      cancelled = true;
    };
  }, [fetchArticles, fetchRequest]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || articles.length === 0) return;

    const { data } = await fetchArticles({
      ...fetchRequest,
      cursorId: articles[articles.length - 1].id,
    });

    if (!data) return;

    setArticles((prev) => {
      const seen = new Set(prev.map((a) => a.id));
      return [...prev, ...data.data.filter((a) => !seen.has(a.id))];
    });
    setHasMore(data.hasMore);
  }, [fetchArticles, fetchRequest, articles, hasMore]);

  return {
    articles,
    hasMore,
    isLoading,
    isFetching,
    error,
    infiniteScrollRef,
    fetchMore,
    filters: {
      statusFilter,
      handleStatusFilterChange,
      filters,
      handleFilterChange,
    },
  };
};
