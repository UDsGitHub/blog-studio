import { Skeleton } from "@/components/ui/skeleton";

export default function ArticlesListLoader() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 10 }).map((_, index) => (
        <div className="flex flex-col gap-2" key={index}>
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-3/4 h-6" />
          <Skeleton className="w-full h-20" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="w-22 h-4" />
            <span className="text-secondary">&bull;</span>
            <Skeleton className="w-28 h-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
