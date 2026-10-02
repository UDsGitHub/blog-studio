import { useLazyBrowseArticlesQuery } from "@/api/articlesApi";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BookBookmark } from "lucide-react";
import { Link } from "react-router";
import ArticlesListLoader from "./ArticlesListLoader";
import ArticlesEmptyList from "./ArticlesEmptyList";
import { ArticlePreview } from "@/components";
import { toast } from "@/components/ui/toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultArticleFilter, type ArticleFilter } from "./filter";
import type { BrowseArticlesRequest } from "@/api/types";

export default function AppSidebar() {
  const [filter, setFilter] = useState<ArticleFilter>(defaultArticleFilter);
  const [fetchArticles, { data: articleData, isLoading, isFetching, error }] =
    useLazyBrowseArticlesQuery();
  // TODO revisit virtualization - writing infinite loading from scratch would allow you to pass a ref for virtualization as well.
  // TODO build out error handling

  const fetchRequest: BrowseArticlesRequest = useMemo(
    () => ({
      limit: 25,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.startDate ? { startDate: filter.startDate } : {}),
      ...(filter.endDate ? { endDate: filter.endDate } : {}),
    }),
    [filter],
  );

  useEffect(() => {
    fetchArticles(fetchRequest);
  }, [fetchArticles, fetchRequest]);

  const fetchMore = useCallback(async () => {
    if (articleData) {
      fetchArticles({
        ...fetchRequest,
        cursorId: articleData.data[articleData.data.length - 1].id,
      });
    }
  }, [fetchArticles, fetchRequest, articleData]);

  const renderArticles = () => {
    if (isLoading || isFetching) {
      return <ArticlesListLoader />;
    }

    if (!articleData || articleData.data.length === 0) {
      if (error) {
        console.error(error);
        toast.add({
          title: "Error fetching articles.",
          description: "Try again",
          actionProps: {
            children: "Retry",
            onClick() {
              fetchArticles(fetchRequest);
              toast.close();
            },
          },
        });
      }
      return <ArticlesEmptyList />;
    }

    return (
      <InfiniteScroll
        dataLength={articleData?.data.length ?? 0}
        next={fetchMore}
        hasMore={articleData?.hasMore}
        loader={<ArticlesListLoader />}
        className="px-0.5"
      >
        {articleData?.data.map((preview) => {
          return (
            <SidebarMenuItem key={preview.id}>
              <SidebarMenuButton className="h-auto" render={<Link to={"/"} />}>
                <ArticlePreview
                  title={preview.title}
                  content={preview.excerpt ?? ""}
                  status={preview.status}
                  createdAt={preview.createdAt}
                  updatedAt={preview.updatedAt}
                  publishedAt={preview.publishedAt}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </InfiniteScroll>
    );
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="data-[slot=sidebar-menu-button]:p-1.5!">
              <a href="/" className="flex items-center gap-0.5">
                <BookBookmark strokeWidth={3} />
                <span className="text-base font-semibold">Blog Studio.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Articles</SidebarGroupLabel>
          <SidebarMenu></SidebarMenu>
          {renderArticles()}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
