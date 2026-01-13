import { useState, useRef, useEffect } from "react";
import * as chrono from "chrono-node";
import { format, nextDay, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { CalendarIcon, X, Repeat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { RecurrenceSettings } from "@/types";

interface NaturalDateInputProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  onRecurrenceChange?: (recurrence: RecurrenceSettings | undefined) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
}

interface ParsedResult {
  date: Date | null;
  recurrence: RecurrenceSettings | null;
  recurrenceText?: string;
}

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function parseRecurrence(text: string): ParsedResult {
  const lowerText = text.toLowerCase().trim();
  
  // Pattern: "every day" or "daily"
  if (/^(every\s+day|daily)$/i.test(lowerText)) {
    return {
      date: new Date(),
      recurrence: { frequency: "daily", interval: 1 },
      recurrenceText: "Repeats every day",
    };
  }

  // Pattern: "every X days"
  const everyXDays = lowerText.match(/^every\s+(\d+)\s+days?$/i);
  if (everyXDays) {
    const interval = parseInt(everyXDays[1]);
    return {
      date: new Date(),
      recurrence: { frequency: "daily", interval },
      recurrenceText: `Repeats every ${interval} days`,
    };
  }

  // Pattern: "every week" or "weekly"
  if (/^(every\s+week|weekly)$/i.test(lowerText)) {
    const today = new Date();
    return {
      date: today,
      recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [today.getDay()] },
      recurrenceText: "Repeats every week",
    };
  }

  // Pattern: "every X weeks"
  const everyXWeeks = lowerText.match(/^every\s+(\d+)\s+weeks?$/i);
  if (everyXWeeks) {
    const interval = parseInt(everyXWeeks[1]);
    const today = new Date();
    return {
      date: today,
      recurrence: { frequency: "weekly", interval, daysOfWeek: [today.getDay()] },
      recurrenceText: `Repeats every ${interval} weeks`,
    };
  }

  // Pattern: "every Monday" or "every Mon"
  const everyDayMatch = lowerText.match(/^every\s+(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:s|nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)$/i);
  if (everyDayMatch) {
    const dayName = everyDayMatch[1].toLowerCase();
    const dayNum = DAY_MAP[dayName];
    if (dayNum !== undefined) {
      const today = new Date();
      const todayDay = today.getDay();
      // Calculate next occurrence of that day
      const daysUntil = (dayNum - todayDay + 7) % 7 || 7;
      const nextDate = addDays(today, daysUntil);
      
      return {
        date: nextDate,
        recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [dayNum] },
        recurrenceText: `Repeats every ${format(nextDate, "EEEE")}`,
      };
    }
  }

  // Pattern: "every Mon, Wed, Fri" or "every Monday and Friday"
  const everyMultipleDays = lowerText.match(/^every\s+(.+)$/i);
  if (everyMultipleDays) {
    const daysText = everyMultipleDays[1];
    const dayMatches = daysText.match(/(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:s|nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)/gi);
    
    if (dayMatches && dayMatches.length > 1) {
      const daysOfWeek = [...new Set(dayMatches.map(d => DAY_MAP[d.toLowerCase()]))].filter(d => d !== undefined).sort((a, b) => a - b);
      
      if (daysOfWeek.length > 0) {
        const today = new Date();
        const todayDay = today.getDay();
        // Find next occurrence
        let nextDayNum = daysOfWeek.find(d => d > todayDay) ?? daysOfWeek[0];
        const daysUntil = (nextDayNum - todayDay + 7) % 7 || 7;
        const nextDate = addDays(today, daysUntil);
        
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const selectedDayNames = daysOfWeek.map(d => dayNames[d]).join(", ");
        
        return {
          date: nextDate,
          recurrence: { frequency: "weekly", interval: 1, daysOfWeek },
          recurrenceText: `Repeats every ${selectedDayNames}`,
        };
      }
    }
  }

  // Pattern: "every month" or "monthly"
  if (/^(every\s+month|monthly)$/i.test(lowerText)) {
    const today = new Date();
    return {
      date: today,
      recurrence: { frequency: "monthly", interval: 1, dayOfMonth: today.getDate() },
      recurrenceText: `Repeats every month on day ${today.getDate()}`,
    };
  }

  // Pattern: "every X months"
  const everyXMonths = lowerText.match(/^every\s+(\d+)\s+months?$/i);
  if (everyXMonths) {
    const interval = parseInt(everyXMonths[1]);
    const today = new Date();
    return {
      date: today,
      recurrence: { frequency: "monthly", interval, dayOfMonth: today.getDate() },
      recurrenceText: `Repeats every ${interval} months on day ${today.getDate()}`,
    };
  }

  // Pattern: "every year" or "yearly" or "annually"
  if (/^(every\s+year|yearly|annually)$/i.test(lowerText)) {
    const today = new Date();
    return {
      date: today,
      recurrence: { frequency: "yearly", interval: 1 },
      recurrenceText: "Repeats every year",
    };
  }

  // Pattern: "every weekday" or "weekdays"
  if (/^(every\s+weekday|weekdays)$/i.test(lowerText)) {
    const today = new Date();
    const todayDay = today.getDay();
    // If today is weekend, find next Monday
    let nextDate = today;
    if (todayDay === 0) nextDate = addDays(today, 1);
    else if (todayDay === 6) nextDate = addDays(today, 2);
    
    return {
      date: nextDate,
      recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [1, 2, 3, 4, 5] },
      recurrenceText: "Repeats every weekday (Mon-Fri)",
    };
  }

  // No recurrence pattern found, try regular date parsing
  return { date: null, recurrence: null };
}

function parseNaturalDate(text: string): Date | null {
  if (!text.trim()) return null;
  
  const results = chrono.parse(text, new Date(), { forwardDate: true });
  if (results.length > 0) {
    return results[0].start.date();
  }
  return null;
}

export function NaturalDateInput({
  value,
  onChange,
  onRecurrenceChange,
  placeholder = "e.g. next friday, every Monday",
  className,
  hasError,
}: NaturalDateInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<Date | null>(null);
  const [recurrencePreview, setRecurrencePreview] = useState<{ recurrence: RecurrenceSettings; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input display with external value
  useEffect(() => {
    if (value && !inputValue) {
      setInputValue(format(value, "MMM d, yyyy"));
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    
    // First try recurrence parsing
    const recurrenceResult = parseRecurrence(text);
    if (recurrenceResult.recurrence) {
      setParsedPreview(recurrenceResult.date);
      setRecurrencePreview({
        recurrence: recurrenceResult.recurrence,
        text: recurrenceResult.recurrenceText || "",
      });
      return;
    }
    
    // Fall back to regular date parsing
    const parsed = parseNaturalDate(text);
    setParsedPreview(parsed);
    setRecurrencePreview(null);
  };

  const handleInputBlur = () => {
    if (parsedPreview) {
      onChange(parsedPreview);
      setInputValue(format(parsedPreview, "MMM d, yyyy"));
      
      if (recurrencePreview && onRecurrenceChange) {
        onRecurrenceChange(recurrencePreview.recurrence);
      }
      
      setParsedPreview(null);
      setRecurrencePreview(null);
    } else if (!inputValue.trim()) {
      onChange(undefined);
      if (onRecurrenceChange) {
        onRecurrenceChange(undefined);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (parsedPreview) {
        onChange(parsedPreview);
        setInputValue(format(parsedPreview, "MMM d, yyyy"));
        
        if (recurrencePreview && onRecurrenceChange) {
          onRecurrenceChange(recurrencePreview.recurrence);
        }
        
        setParsedPreview(null);
        setRecurrencePreview(null);
      }
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setInputValue(value ? format(value, "MMM d, yyyy") : "");
      setParsedPreview(null);
      setRecurrencePreview(null);
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
    setRecurrencePreview(null);
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
        <div className="absolute left-0 right-0 top-full mt-1.5 px-3 py-2 bg-popover border border-border rounded-md shadow-md text-sm text-foreground z-[70]">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">→</span>
            <span>{format(parsedPreview, "EEEE, MMMM d, yyyy")}</span>
          </div>
          {recurrencePreview && (
            <div className="flex items-center gap-2 mt-1 text-xs text-primary">
              <Repeat className="w-3 h-3" />
              <span>{recurrencePreview.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
