export type ArticleFilters = {
  startDate?: string;
  endDate?: string;
};

export const defaultArticleFilters: ArticleFilters = {
  startDate: undefined,
  endDate: undefined,
};
