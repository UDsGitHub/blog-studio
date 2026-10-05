import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArticleStatusLabel, type ArticleStatus } from "@/types";
import { StickyNote, CircleDashedCheck, Archive } from "lucide-react";

type Props = {
  statusFilter?: ArticleStatus;
  onChange: (value: ArticleStatus | undefined) => void;
};

const toggleGroupItemClass =
  "rounded-full data-pressed:bg-primary data-pressed:text-primary-foreground";

export default function StatusFilters({ statusFilter, onChange }: Props) {
  return (
    <ToggleGroup
      variant="outline"
      value={statusFilter ? [statusFilter] : undefined}
      onValueChange={(value) => onChange(value[0] as ArticleStatus)}
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
  );
}
