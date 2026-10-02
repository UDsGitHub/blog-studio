import { useLazyBrowseArticlesQuery } from "@/api/articlesApi";
import type { BrowseArticlesRequest } from "@/api/types";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { defaultArticleFilters, type ArticleFilters } from "./filter";
import { type ArticlePreview, type ArticleStatus } from "@/types";

export const useArticlesState = () => {
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | undefined>(
    undefined,
  );
  const [filters, setFilters] = useState<ArticleFilters>(defaultArticleFilters);
  const [fetchArticles, { data: articleData, isLoading, isFetching, error }] =
    useLazyBrowseArticlesQuery();
  const [articles, setArticles] = useState<ArticlePreview[]>(
    articleData?.data ?? [],
  );
  const [hasMore, setHasMore] = useState<boolean>(
    articleData?.hasMore ?? false,
  );
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

  const handleStatusFilterChange = (value?: ArticleStatus) =>
    setStatusFilter(value);
  const handleFilterChange = (value: Partial<ArticleFilters>) =>
    setFilters((prev) => ({ ...prev, ...value }));

  return {
    articles,
    hasMore,
    isLoading,
    isFetching,
    error,
    infiniteScrollRef,
    fetchMore,
    statusFilter,
    handleStatusFilterChange,
    filters,
    handleFilterChange
  };
};
