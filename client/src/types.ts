export const ArticleStatusLabel = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export type ArticleStatus =
  (typeof ArticleStatusLabel)[keyof typeof ArticleStatusLabel];

export type Article = {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: ArticleStatus;
  excerpt: string | null;
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;
};

export type ArticlePreview = {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  excerpt: string | null;
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;
};

export type ArticleSearchPreview = {
  title: string;
  id: string;
  slug: string;
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;
  headline: string;
};
