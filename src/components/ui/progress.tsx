import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

// Get progress color based on value
const getProgressColor = (value: number): string => {
  if (value >= 100) return "bg-green-500";
  if (value >= 75) return "bg-emerald-500";
  if (value >= 50) return "bg-amber-500";
  if (value >= 25) return "bg-orange-500";
  return "bg-primary";
};

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    colorByValue?: boolean;
  }
>(({ className, value, colorByValue = false, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 transition-all",
        colorByValue ? getProgressColor(value || 0) : "bg-primary"
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress, getProgressColor };
