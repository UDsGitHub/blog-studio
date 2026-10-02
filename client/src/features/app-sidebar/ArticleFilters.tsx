import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ArticleFilters as ArticleFiltersType } from "./filter";
import {
  Archive,
  CircleDashedCheck,
  SlidersHorizontal,
  StickyNote,
} from "lucide-react";
import { ArticleStatusLabel, type ArticleStatus } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  statusFilter: ArticleStatus | undefined;
  onStatusFilterChange: (value: ArticleStatus | undefined) => void;
  filters: ArticleFiltersType;
  onFiltersChange: (value: Partial<ArticleFiltersType>) => void;
};

const toggleGroupItemClass =
  "rounded-full data-pressed:bg-primary data-pressed:text-primary-foreground";

export default function ArticleFilters({
  statusFilter,
  onStatusFilterChange,
  filters,
  onFiltersChange,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <ToggleGroup
        variant="outline"
        value={statusFilter ? [statusFilter] : undefined}
        onValueChange={(value) =>
          onStatusFilterChange(value[0] as ArticleStatus)
        }
      >
        <ToggleGroupItem
          value={"DRAFT" as const}
          aria-label={ArticleStatusLabel["DRAFT"]}
          className={toggleGroupItemClass}
        >
          <StickyNote />
          <span>{ArticleStatusLabel["DRAFT"]}</span>
        </ToggleGroupItem>
        <ToggleGroupItem
          value={"PUBLISHED" as const}
          aria-label={ArticleStatusLabel["PUBLISHED"]}
          className={toggleGroupItemClass}
        >
          <CircleDashedCheck />
          <span>{ArticleStatusLabel["PUBLISHED"]}</span>
        </ToggleGroupItem>
        <ToggleGroupItem
          value={"ARCHIVED" as const}
          aria-label={ArticleStatusLabel["ARCHIVED"]}
          className={toggleGroupItemClass}
        >
          <Archive />
          <span>{ArticleStatusLabel["ARCHIVED"]}</span>
        </ToggleGroupItem>
      </ToggleGroup>
      <Button
        variant={"ghost"}
        size={"icon"}
        className={"ml-auto"}
        title="Filters"
        aria-label="Filters"
      >
        <SlidersHorizontal />
      </Button>
    </div>
  );
}
