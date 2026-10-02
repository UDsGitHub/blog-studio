import React from "react";
import { useEffect, useRef, type RefObject } from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  ref: RefObject<HTMLUListElement | null>;
  hasMore: boolean;
  fetchMore: () => Promise<void>;
  isLoading: boolean;
  loader: React.ReactNode;
  itemHeight?: number;
  children: React.ReactElement<React.ComponentProps<"ul">, "ul">;
};

export default function InfiniteScroll({
  ref,
  hasMore,
  fetchMore,
  isLoading,
  loader,
  itemHeight = 100,
  children,
}: Props) {
  const observerRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (isLoading || !hasMore) return;

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
  }, [hasMore, fetchMore, isLoading]);

  return React.cloneElement(children, {
    ref,
    children: (
      <>
        {children.props.children}
        {isLoading && loader}
        <li
          ref={observerRef}
          style={{ height: itemHeight, background: "transparent" }}
        />
      </>
    ),
  });
}
