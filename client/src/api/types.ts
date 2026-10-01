import type {
  ArticlePreview,
  ArticleSearchPreview,
  ArticleStatus,
} from "../types";

export type BrowseArticlesRequest = {
  cursorId?: string;
  limit: number;
  status?: ArticleStatus;
  startDate?: string;
  endDate?: string;
};

export type BrowseArticlesResponse = {
  data: ArticlePreview[];
  hasMore: boolean;
};

export type SearchArticlesRequest = {
  search: string;
  limit: number;
  status?: ArticleStatus;
  startDate?: string;
  endDate?: string;
};

export type SearchArticlesResponse = {
  data: ArticleSearchPreview[];
};

export type FindArticleByIdRequest = {
  id: string;
};

export type CreateArticleRequest = {
  title: string;
  body: string;
  excerpt?: string;
  status: ArticleStatus;
};

export type UpdateArticleRequest = {
  id: string;
} & Partial<CreateArticleRequest>;

export type DeleteArticleRequest = {
  id: string;
};
