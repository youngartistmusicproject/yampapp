import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { triggerConfettiFromElement } from "@/lib/confetti";

interface CircularCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const iconSizes = {
  sm: "w-2.5 h-2.5",
  md: "w-3 h-3",
  lg: "w-3.5 h-3.5",
};

const ringSizes = {
  sm: "w-6 h-6",
  md: "w-7 h-7",
  lg: "w-8 h-8",
};

export function CircularCheckbox({
  checked,
  onCheckedChange,
  className,
  size = "md",
}: CircularCheckboxProps) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Ripple effect on completion */}
      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 1.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
              "absolute rounded-full bg-primary/30",
              ringSizes[size]
            )}
          />
        )}
      </AnimatePresence>
      
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={(e) => {
          e.stopPropagation();
          if (!checked) {
            triggerConfettiFromElement(e.currentTarget);
          }
          onCheckedChange(!checked);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "relative rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200",
          checked
            ? "border-primary bg-primary"
            : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10",
          sizeClasses[size],
          className
        )}
      >
        <AnimatePresence mode="wait">
          {checked && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 25,
                duration: 0.2 
              }}
            >
              <Check className={cn(iconSizes[size], "text-primary-foreground stroke-[3]")} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
