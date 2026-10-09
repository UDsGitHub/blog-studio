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
import { ArticlePreview, InfiniteScroll } from "@/components";
import ArticleFilters from "./filters/ArticleFilters";
import { useArticleListState } from "./useArticleListState";
import ArticleErrorState from "./ArticleErrorState";
import { getErrorMessage } from "@/api/utils";
import type { ErrorMessage } from "@/types/error";

// TODO revisit virtualization - writing infinite loading from scratch would allow you to pass a ref for virtualization as well.
export default function AppSidebar() {
  const {
    articles,
    hasMore,
    isLoading,
    isFetching,
    loadError,
    retryInitialFetch,
    infiniteScrollRef,
    fetchMore,
    fetchMoreError,
    filters: articleFilters,
  } = useArticleListState();
  const {
    statusFilter,
    handleStatusFilterChange,
    filters,
    handleFilterChange,
  } = articleFilters;

  const renderArticles = () => {
    if (isLoading || (isFetching && articles.length === 0)) {
      return (
        <div>
          <ArticlesListLoader />
        </div>
      );
    }

    if (loadError) {
      if (articles.length === 0) {
        const errorMessage = getErrorMessage(loadError);
        return (
          <ArticleErrorState
            title={errorMessage.message}
            subtitle={errorMessage.subtext}
            onRetry={retryInitialFetch}
          />
        );
      }
    }

    if (articles.length === 0) {
      return <ArticlesEmptyList />;
    }

    return (
      <>
        {articles.map((preview) => {
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
      </>
    );
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="w-fit data-[slot=sidebar-menu-button]:p-1.5!">
              <Link to="/" className="flex items-center gap-0.5">
                <BookBookmark strokeWidth={3} />
                <span className="text-base font-semibold">Blog Studio.</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Articles</SidebarGroupLabel>
          <InfiniteScroll
            ref={infiniteScrollRef}
            hasMore={hasMore}
            fetchMore={fetchMore}
            {...(fetchMoreError
              ? {
                  hasError: true,
                  errorMessage: fetchMoreError as ErrorMessage,
                }
              : { hasError: false, errorMessage: undefined })}
            isLoading={isFetching && articles.length > 0}
            loader={<ArticlesListLoader />}
            className="px-0.5"
          >
            <SidebarMenu className="scroll-fade">
              <ArticleFilters
                key={JSON.stringify(filters)}
                statusFilter={statusFilter}
                onStatusFilterChange={handleStatusFilterChange}
                filters={filters}
                onFiltersChange={handleFilterChange}
              />
              {renderArticles()}
            </SidebarMenu>
          </InfiniteScroll>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
