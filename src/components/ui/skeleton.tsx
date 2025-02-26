
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

interface TextSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number
}

function TextSkeleton({
  className,
  lines = 1,
  ...props
}: TextSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-4 w-full bg-neutral-200"
        />
      ))}
    </div>
  )
}

function InputSkeleton({ 
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-h-10 w-full flex-col rounded-md border border-input overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="flex-1 p-3 space-y-2">
        <TextSkeleton lines={2} />
      </div>
    </div>
  )
}

export { Skeleton, TextSkeleton, InputSkeleton }
