import React from "react";
import { useEffect, useRef, type RefObject } from "react";
import { Button } from "./ui/button";
import type { ErrorMessage } from "@/types/error";

type BaseProps = React.HTMLAttributes<HTMLDivElement> & {
  ref: RefObject<HTMLUListElement | null>;
  hasMore: boolean;
  fetchMore: () => Promise<void>;
  isLoading: boolean;
  loader: React.ReactNode;
  itemHeight?: number;
  children: React.ReactElement<React.ComponentProps<"ul">, "ul">;
};

type ErrorProps =
  | {
      hasError: true;
      errorMessage: ErrorMessage;
    }
  | {
      hasError: false;
      errorMessage: undefined;
    };

type WithErrorProps = BaseProps & ErrorProps;

export default function InfiniteScroll({
  ref,
  hasMore,
  fetchMore,
  hasError,
  errorMessage,
  isLoading,
  loader,
  itemHeight = 100,
  children,
}: WithErrorProps) {
  const observerRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (isLoading || !hasMore || hasError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMore();
        }
      },
      { threshold: 0.2 },
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, hasError, fetchMore, isLoading]);

  return React.cloneElement(children, {
    ref,
    children: (
      <>
        {children.props.children}
        {isLoading && loader}
        {!isLoading && hasError && (
          <div className="flex flex-col items-center bg-background rounded-lg p-4">
            <p className="text-sm">{errorMessage.message}</p>
            {errorMessage.subtext && (
              <span className="text-muted-foreground text-sm">
                {errorMessage.subtext}
              </span>
            )}
            <Button
              className={"mt-4"}
              variant={"secondary"}
              onClick={fetchMore}
            >
              Retry
            </Button>
          </div>
        )}
        <li
          ref={observerRef}
          style={{ height: itemHeight, background: "transparent" }}
        />
      </>
    ),
  });
}
