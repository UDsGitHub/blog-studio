import type { ArticleStatus } from "@/types";

export type ArticleFilter = {
  status?: ArticleStatus;
  startDate?: string;
  endDate?: string;
};

export const defaultArticleFilter: ArticleFilter = {
  status: undefined,
  startDate: undefined,
  endDate: undefined,
};
