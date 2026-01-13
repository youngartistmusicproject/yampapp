import { useState, useRef, useEffect } from "react";
import * as chrono from "chrono-node";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface NaturalDateInputProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
}

export function NaturalDateInput({
  value,
  onChange,
  placeholder = "e.g. next friday, Apr 15, in 3 days",
  className,
  hasError,
}: NaturalDateInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<Date | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input display with external value
  useEffect(() => {
    if (value && !inputValue) {
      setInputValue(format(value, "MMM d, yyyy"));
    }
  }, [value]);

  const parseNaturalDate = (text: string): Date | null => {
    if (!text.trim()) return null;
    
    const results = chrono.parse(text, new Date(), { forwardDate: true });
    if (results.length > 0) {
      return results[0].start.date();
    }
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    
    const parsed = parseNaturalDate(text);
    setParsedPreview(parsed);
  };

  const handleInputBlur = () => {
    if (parsedPreview) {
      onChange(parsedPreview);
      setInputValue(format(parsedPreview, "MMM d, yyyy"));
      setParsedPreview(null);
    } else if (!inputValue.trim()) {
      onChange(undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (parsedPreview) {
        onChange(parsedPreview);
        setInputValue(format(parsedPreview, "MMM d, yyyy"));
        setParsedPreview(null);
      }
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setInputValue(value ? format(value, "MMM d, yyyy") : "");
      setParsedPreview(null);
      inputRef.current?.blur();
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    if (date) {
      setInputValue(format(date, "MMM d, yyyy"));
    } else {
      setInputValue("");
    }
    setShowCalendar(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
    setInputValue("");
    setParsedPreview(null);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "h-9 text-sm pr-8 border-border/50 bg-transparent",
              hasError && "border-destructive"
            )}
          />
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[70]" align="end">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleCalendarSelect}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Preview hint */}
      {parsedPreview && inputValue && (
        <div className="absolute left-0 right-0 top-full mt-1 px-2 py-1 bg-muted/80 rounded text-[10px] text-muted-foreground z-10">
          → {format(parsedPreview, "EEEE, MMMM d, yyyy")}
        </div>
      )}
    </div>
  );
}
