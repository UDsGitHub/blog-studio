export type ArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export const ArticleStatusLabel: { [k in ArticleStatus]: string } = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
} as const;

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
