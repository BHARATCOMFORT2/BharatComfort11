import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700",
        className
      )}
    >
      {children}
    </span>
  );
}
