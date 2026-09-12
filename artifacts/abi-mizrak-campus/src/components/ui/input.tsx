import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[var(--m3-radius-sm)] border border-[hsl(var(--m3-outline-variant))] bg-[hsl(var(--m3-surface))] px-3 py-2 text-base text-[hsl(var(--m3-on-surface))] transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[hsl(var(--m3-on-surface))] placeholder:text-[hsl(var(--m3-on-surface-variant))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--m3-primary))] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 md:text-sm hover:border-[hsl(var(--m3-outline))]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
