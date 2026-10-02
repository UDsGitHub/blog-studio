import { Skeleton } from "@/components/ui/skeleton";

export default function ArticlesListLoader() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 10 }).map((_, index) => (
        <div className="flex flex-col gap-2">
          <Skeleton key={index} className="w-full h-10" />
          <Skeleton key={index} className="w-full h-20" />
          <div className="flex items-center gap-1.5">
            <Skeleton key={index} className="w-22 h-full" />
            <span>&bull;</span>
            <Skeleton key={index} className="w-28 h-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
