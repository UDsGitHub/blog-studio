import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArticleStatusLabel, type ArticleStatus } from "@/types";
import { cn } from "cn";
import { StickyNote, CircleDashedCheck, Archive } from "lucide-react";

type Props = {
  statusFilter?: ArticleStatus;
  onChange: (value: ArticleStatus | undefined) => void;
};

const radioGroupItemClass = cn("aspect-auto size-auto");
const radioGroupItemBtnClass = cn("py-1");

export default function StatusFilters({ statusFilter, onChange }: Props) {
  return (
    <RadioGroup
      value={statusFilter}
      onValueChange={(value) => onChange(value as ArticleStatus)}
      className={"flex items-center"}
    >
      <RadioGroupItem
        value={"DRAFT" as const}
        aria-label={ArticleStatusLabel["DRAFT"]}
        className={radioGroupItemClass}
        nativeButton
        render={
          <Button
            variant={statusFilter === "DRAFT" ? "default" : "outline"}
            className={radioGroupItemBtnClass}
          >
            <StickyNote />
            {ArticleStatusLabel["DRAFT"]}
          </Button>
        }
      ></RadioGroupItem>
      <RadioGroupItem
        value={"PUBLISHED" as const}
        aria-label={ArticleStatusLabel["PUBLISHED"]}
        className={radioGroupItemClass}
        nativeButton
        render={
          <Button
            variant={statusFilter === "PUBLISHED" ? "default" : "outline"}
            className={radioGroupItemBtnClass}
          >
            <CircleDashedCheck />
            {ArticleStatusLabel["PUBLISHED"]}
          </Button>
        }
      ></RadioGroupItem>
      <RadioGroupItem
        value={"ARCHIVED" as const}
        aria-label={ArticleStatusLabel["ARCHIVED"]}
        className={radioGroupItemClass}
        nativeButton
        render={
          <Button
            variant={statusFilter === "ARCHIVED" ? "default" : "outline"}
            className={radioGroupItemBtnClass}
          >
            <Archive />
            {ArticleStatusLabel["ARCHIVED"]}
          </Button>
        }
      ></RadioGroupItem>
    </RadioGroup>
  );
}
