import React from "react";
import type { ArticleStatus } from "@/types";
import { ArticleStatusLabel, type ArticlePreview } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { cn } from "cn";
import { Archive, CircleDashedCheck, StickyNote } from "lucide-react";

type Props = {
  title: string;
  content: string;
  renderContent?: () => React.ReactNode;
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;
};

const getArticlePrimaryDate = (
  status: ArticleStatus,
  createdAt: string,
  updatedAt: string | null,
  publishedAt: string | null,
) => {
  let date = new Date(createdAt);
  if (status === "DRAFT" && updatedAt) {
    date = new Date(updatedAt);
  } else if (updatedAt && publishedAt) {
    const updatedAtDate = new Date(updatedAt);
    const publishedAtDate = new Date(publishedAt);
    date = updatedAtDate > publishedAtDate ? updatedAtDate : publishedAtDate;
  }
  return date;
};

const StatusIconMap: { [k in ArticleStatus]: React.ReactNode } = {
  DRAFT: <StickyNote />,
  PUBLISHED: <CircleDashedCheck />,
  ARCHIVED: <Archive />,
};

export default function ArticlePreview({
  title,
  content,
  renderContent,
  status,
  createdAt,
  updatedAt,
  publishedAt,
}: Props) {
  return (
    <div className="max-h-44 flex flex-col">
      <span className="font-light text-base">{title}</span>
      {renderContent ? (
        renderContent()
      ) : (
        <p className="text-muted-foreground line-clamp-6">{content}</p>
      )}
      <div className="mt-auto flex items-center gap-1.5">
        <div
          title={ArticleStatusLabel[status]}
          className={cn(
            "flex items-center gap-1",
            status === "DRAFT" && "text-orange-300",
            status === "PUBLISHED" && "text-emerald-300",
            status === "ARCHIVED" && "text-neutral-400",
          )}
        >
          {StatusIconMap[status]}
          <span>{ArticleStatusLabel[status]}</span>
        </div>
        <span>&bull;</span>
        <span className="text-xs">
          {formatDistanceToNow(
            getArticlePrimaryDate(status, createdAt, updatedAt, publishedAt),
          )}
        </span>
      </div>
    </div>
  );
}
