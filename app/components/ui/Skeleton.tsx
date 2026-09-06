import { ComponentPropsWithoutRef } from "react";

export interface SkeletonProps extends ComponentPropsWithoutRef<"div"> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: Readonly<SkeletonProps>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/80 dark:bg-muted/50 ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}
