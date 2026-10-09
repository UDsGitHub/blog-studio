import { Button } from "@/components/ui/button";

export default function ArticlesEmptyList() {
  return (
    <div className="pt-6">
      <div className="flex flex-col gap-4">
        <div className="relative w-70 flex flex-col gap-2 border border-border p-4 rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-background"></div>
          <div className="w-full h-1 bg-secondary relative rounded-md" />
          <div className="w-3/4 h-1 bg-secondary relative rounded-md" />
          <div className="w-full h-8 bg-secondary relative rounded-md" />
          <div className="flex items-center gap-1.5">
            <div className="w-22 h-1 bg-secondary relative rounded-md" />
            <span className="text-secondary">&bull;</span>
            <div className="w-28 h-1 bg-secondary relative rounded-md" />
          </div>
        </div>
        <div className="relative -mt-12 ml-4 w-80 flex flex-col gap-2 bg-background border border-border p-4 rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-background"></div>
          <div className="w-full h-1 bg-secondary relative rounded-md" />
          <div className="w-3/4 h-1 bg-secondary relative rounded-md" />
          <div className="w-full h-8 bg-secondary relative rounded-md" />
          <div className="flex items-center gap-1.5">
            <div className="w-22 h-1 bg-secondary relative rounded-md" />
            <span className="text-secondary">&bull;</span>
            <div className="w-28 h-1 bg-secondary relative rounded-md" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 items-center pt-4">
        <p className="text-muted-foreground text-sm">No Articles found.</p>
        <Button>Create Article</Button>
      </div>
    </div>
  );
}
