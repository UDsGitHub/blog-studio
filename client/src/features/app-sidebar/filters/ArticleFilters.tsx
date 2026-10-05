import type { ArticleFilters as ArticleFiltersType } from "./filter";
import { SlidersHorizontal } from "lucide-react";
import { type ArticleStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import StatusFilters from "./StatusFilters";
import FilterDrawerContent from "./FilterDrawerContent";

type Props = {
  statusFilter: ArticleStatus | undefined;
  onStatusFilterChange: (value: ArticleStatus | undefined) => void;
  filters: ArticleFiltersType;
  onFiltersChange: (value: Partial<ArticleFiltersType>) => void;
};

export default function ArticleFilters({
  statusFilter,
  onStatusFilterChange,
  filters,
  onFiltersChange,
}: Props) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  return (
    <Drawer
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? "down" : "left"}
    >
      <div className="flex items-center gap-2">
        <StatusFilters
          statusFilter={statusFilter}
          onChange={onStatusFilterChange}
        />
        <DrawerTrigger
          render={
            <Button
              variant={"ghost"}
              size={"icon"}
              className={"ml-auto"}
              title="Filters"
              aria-label="Filters"
            >
              <SlidersHorizontal />
            </Button>
          }
        />
        <FilterDrawerContent
          initialValues={filters}
          onSubmit={onFiltersChange}
          onClose={() => setDrawerOpen(false)}
        />
      </div>
    </Drawer>
  );
}
