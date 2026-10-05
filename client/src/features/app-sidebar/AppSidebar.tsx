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
import { useArticlesState } from "./useArticlesState";

// TODO revisit virtualization - writing infinite loading from scratch would allow you to pass a ref for virtualization as well.
// TODO build out error handling
export default function AppSidebar() {
  const {
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
    handleFilterChange,
    getVirtualItems,
  } = useArticlesState();

  const renderArticles = () => {
    if (isLoading) {
      return <ArticlesListLoader />;
    }

    if (articles.length === 0) {
      if (error) {
        console.error(error);
      }
      return <ArticlesEmptyList />;
    }

    return (
      <InfiniteScroll
        ref={infiniteScrollRef}
        hasMore={hasMore}
        fetchMore={fetchMore}
        isLoading={isFetching}
        loader={<ArticlesListLoader />}
        className="px-0.5"
      >
        <SidebarMenu className="scroll-fade">
          <SidebarMenuItem className="mb-4">
            <ArticleFilters
              key={JSON.stringify(filters)}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              filters={filters}
              onFiltersChange={handleFilterChange}
            />
          </SidebarMenuItem>
          {getVirtualItems().map((item) => {
            const preview = articles[item.index];
            return (
              <SidebarMenuItem key={preview.id}>
                <SidebarMenuButton
                  className="h-auto"
                  render={<Link to={"/"} />}
                >
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
        </SidebarMenu>
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
