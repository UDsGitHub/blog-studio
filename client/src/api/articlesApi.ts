import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BrowseArticlesResponse,
  BrowseArticlesRequest,
  SearchArticlesResponse,
  SearchArticlesRequest,
  CreateArticleRequest,
  UpdateArticleRequest,
  FindArticleByIdRequest,
  DeleteArticleRequest,
} from "./types";
import type { Article } from "../types";
import { getUrlQueryParamsFromObject } from "./utils";

export const articlesApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000",
    prepareHeaders: (headers) => {
      const apiKey = localStorage.getItem(
        import.meta.env.VITE_API_STORAGE_KEY ?? "blog-studio-apikey",
      );
      if (apiKey) headers.set("authorization", `ApiKey ${apiKey}`);
      return headers;
    },
  }),
  tagTypes: ["Article"],
  endpoints: (builder) => ({
    browseArticles: builder.query<
      BrowseArticlesResponse,
      BrowseArticlesRequest
    >({
      query: (request) => {
        const params = getUrlQueryParamsFromObject(request);
        return `articles?${params.toString()}`;
      },
      providesTags: (results) =>
        results
          ? [
              ...results.data.map((item) => ({
                type: "Article" as const,
                id: item.id,
              })),
              { type: "Article", id: "list" },
            ]
          : [],
    }),
    searchArticles: builder.query<
      SearchArticlesResponse,
      SearchArticlesRequest
    >({
      query: (request) => {
        const params = getUrlQueryParamsFromObject(request);
        return `articles?${params.toString()}`;
      },
    }),
    findArticleById: builder.query<Article, FindArticleByIdRequest>({
      query: ({ id }) => `articles/id/${id}`,
      providesTags: (_results, _error, args) => [
        { type: "Article", id: args.id },
      ],
    }),
    createArticle: builder.mutation<Article, CreateArticleRequest>({
      query: (body) => ({
        url: "articles",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Article"],
    }),
    updateArticle: builder.mutation<Article, UpdateArticleRequest>({
      query: ({ id, ...patch }) => ({
        url: `articles/${id}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: (_results, _error, args) => [
        { type: "Article", id: args.id },
        { type: "Article", id: "list" },
      ],
    }),
    deleteArticle: builder.mutation<Article, DeleteArticleRequest>({
      query: ({ id }) => ({
        url: `articles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Article"],
    }),
  }),
});

export const {
  useBrowseArticlesQuery,
  useLazyBrowseArticlesQuery,
  useLazySearchArticlesQuery,
  useFindArticleByIdQuery,
  useCreateArticleMutation,
  useUpdateArticleMutation,
  useDeleteArticleMutation,
} = articlesApi;
