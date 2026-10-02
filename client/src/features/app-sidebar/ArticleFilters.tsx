import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ArticleFilter } from "./filter";
import { Bold, Italic, Underline } from "lucide-react";

type Props = {
  filters: ArticleFilter;
  onChange: (value: Partial<ArticleFilter>) => void;
};

export default function ArticleFilters({ filters, onChange }: Props) {
  return (
    <ToggleGroup variant="outline" multiple>
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <Bold />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <Italic />
      </ToggleGroupItem>
      <ToggleGroupItem value="strikethrough" aria-label="Toggle strikethrough">
        <Underline />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
