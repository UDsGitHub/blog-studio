import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "cn";
import { SearchIcon, Plus } from "lucide-react";
import { useEffect, useState } from "react";

export default function AppHeader() {
  const { state: sidebarOpenState, openMobile: sidebarOpenMobile } =
    useSidebar();
  const isMobile = useIsMobile();
  const sidebarOpen =
    (sidebarOpenState === "expanded" && !isMobile) ||
    (isMobile && sidebarOpenMobile);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <header className="p-2 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-10">
      <SidebarTrigger />
      <div className="flex-1 flex justify-center items-center">
        <Button
          variant={"outline"}
          onClick={() => setOpen(true)}
          className={"w-full max-w-80 justify-between"}
        >
          <div className="flex items-center gap-1">
            <SearchIcon className="text-muted-foreground" />
            <span className="text-muted-foreground">Search for articles</span>
          </div>
          <Kbd>⌘K</Kbd>
        </Button>
        <CommandDialog
          open={open}
          onOpenChange={setOpen}
          className={cn(
            "top-[10%] sm:max-w-xl",
            sidebarOpen &&
              "left-[calc(((100%-24rem)*0.5)+24rem)]",
          )}
        >
          <Command>
            <CommandInput />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Search results">
                {Array.from({ length: 4 }).map((_, index) => (
                  <CommandItem key={index} value={`index-${index}`}>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold text-base line-clamp-1">
                        Article Title
                      </span>
                      <p className="text-muted-foreground">
                        Lorem ipsum, dolor sit amet consectetur adipisicing
                        elit. Culpa quisquam laboriosam vel, ut nisi mollitia
                        quaerat architecto quas debitis asperiores?
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </CommandDialog>
        <Button>
          <Plus />
          <span>New</span>
        </Button>
      </div>
    </header>
  );
}
