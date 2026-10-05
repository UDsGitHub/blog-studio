import { useState } from "react";
import { defaultArticleFilters, type ArticleFilters } from "./filters/filter";
import type { ArticleStatus } from "@/types";

export const useArticleFilters = () => {
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | undefined>(
    "DRAFT",
  );
  const [filters, setFilters] = useState<ArticleFilters>(defaultArticleFilters);

  const handleStatusFilterChange = (value?: ArticleStatus) =>
    setStatusFilter(value);
  const handleFilterChange = (value: Partial<ArticleFilters>) =>
    setFilters((prev) => ({ ...prev, ...value }));

  return {
    statusFilter,
    handleStatusFilterChange,
    filters,
    handleFilterChange,
  };
};
