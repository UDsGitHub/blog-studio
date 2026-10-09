import { Button } from "@/components/ui/button";
import { UNEXPECTED_ERROR_MESSAGE } from "@/constants/error";
import { SearchAlert } from "lucide-react";

type Props = {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
};

export default function ArticleErrorState({
  title = UNEXPECTED_ERROR_MESSAGE,
  subtitle,
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col items-center">
      <SearchAlert className="text-rose-500" size={200} strokeWidth={0.5} />
      <p className="text-center text-base font-semibold text-muted-foreground">
        {title}
      </p>
      {subtitle && (
        <span className="text-center text-sm text-muted-foreground">
          {subtitle}
        </span>
      )}
      <Button
        onClick={onRetry}
        variant={"secondary"}
        className={"mt-3 p-4 w-full rounded-md"}
      >
        Retry
      </Button>
    </div>
  );
}
