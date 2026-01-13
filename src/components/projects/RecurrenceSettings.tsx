import { RecurrenceSettings as RecurrenceSettingsType } from "@/types";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const parseInputDate = (value: string): Date => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

interface RecurrenceSettingsProps {
  isRecurring: boolean;
  onIsRecurringChange: (value: boolean) => void;
  recurrence: RecurrenceSettingsType | undefined;
  onRecurrenceChange: (settings: RecurrenceSettingsType | undefined) => void;
  compact?: boolean; // Remove border/padding for use in popovers
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Su" },
  { value: 1, label: "Mo" },
  { value: 2, label: "Tu" },
  { value: 3, label: "We" },
  { value: 4, label: "Th" },
  { value: 5, label: "Fr" },
  { value: 6, label: "Sa" },
];

export function RecurrenceSettings({
  isRecurring,
  onIsRecurringChange,
  recurrence,
  onRecurrenceChange,
  compact = false,
}: RecurrenceSettingsProps) {
  const handleToggleRecurring = (value: boolean) => {
    onIsRecurringChange(value);
    if (value && !recurrence) {
      onRecurrenceChange({
        frequency: "weekly",
        interval: 1,
      });
    } else if (!value) {
      onRecurrenceChange(undefined);
    }
  };

  const updateRecurrence = (updates: Partial<RecurrenceSettingsType>) => {
    if (recurrence) {
      onRecurrenceChange({ ...recurrence, ...updates });
    }
  };

  const handleDaysOfWeekChange = (days: string[]) => {
    updateRecurrence({ daysOfWeek: days.map(Number) });
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4 rounded-lg border p-4"}>
      <div className="flex items-center justify-between">
        <Label htmlFor="recurring" className={compact ? "text-xs font-medium" : "font-medium"}>
          Repeating Task
        </Label>
        <Switch
          id="recurring"
          checked={isRecurring}
          onCheckedChange={handleToggleRecurring}
        />
      </div>

      {isRecurring && recurrence && (
        <div className={compact ? "space-y-3 pt-2 border-t" : "space-y-4 pt-2"}>
          {/* Frequency row */}
          <div className="space-y-1.5">
            <Label className={compact ? "text-xs text-muted-foreground" : ""}>Repeat Every</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                max={99}
                value={recurrence.interval}
                onChange={(e) =>
                  updateRecurrence({ interval: parseInt(e.target.value) || 1 })
                }
                className={compact ? "w-14 h-8 text-xs" : "w-20"}
              />
              <Select
                value={recurrence.frequency}
                onValueChange={(v) =>
                  updateRecurrence({
                    frequency: v as RecurrenceSettingsType["frequency"],
                  })
                }
              >
                <SelectTrigger className={compact ? "flex-1 h-8 text-xs" : "flex-1"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="daily">
                    {recurrence.interval === 1 ? "Day" : "Days"}
                  </SelectItem>
                  <SelectItem value="weekly">
                    {recurrence.interval === 1 ? "Week" : "Weeks"}
                  </SelectItem>
                  <SelectItem value="monthly">
                    {recurrence.interval === 1 ? "Month" : "Months"}
                  </SelectItem>
                  <SelectItem value="yearly">
                    {recurrence.interval === 1 ? "Year" : "Years"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Weekly days */}
          {recurrence.frequency === "weekly" && (
            <div className="space-y-1.5">
              <Label className={compact ? "text-xs text-muted-foreground" : ""}>On</Label>
              <ToggleGroup
                type="multiple"
                value={(recurrence.daysOfWeek || []).map(String)}
                onValueChange={handleDaysOfWeekChange}
                className="justify-start gap-1"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <ToggleGroupItem
                    key={day.value}
                    value={String(day.value)}
                    aria-label={day.label}
                    className={compact 
                      ? "w-7 h-7 text-[10px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      : "w-9 h-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    }
                  >
                    {day.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          {/* Monthly day */}
          {recurrence.frequency === "monthly" && (
            <div className="space-y-1.5">
              <Label className={compact ? "text-xs text-muted-foreground" : ""}>Day of Month</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={recurrence.dayOfMonth || 1}
                onChange={(e) =>
                  updateRecurrence({
                    dayOfMonth: parseInt(e.target.value) || 1,
                  })
                }
                className={compact ? "w-14 h-8 text-xs" : "w-20"}
              />
            </div>
          )}

          {/* End date */}
          <div className="space-y-1.5">
            <Label className={compact ? "text-xs text-muted-foreground" : ""}>End Date</Label>
            <Input
              type="date"
              value={recurrence.endDate ? format(recurrence.endDate, "yyyy-MM-dd") : ""}
              onChange={(e) =>
                updateRecurrence({
                  endDate: e.target.value ? parseInputDate(e.target.value) : undefined,
                })
              }
              className={compact ? "h-8 text-xs" : ""}
            />
          </div>

          <p className="text-[10px] text-muted-foreground">
            {getRecurrenceDescription(recurrence)}
          </p>
        </div>
      )}
    </div>
  );
}

function getRecurrenceDescription(recurrence: RecurrenceSettingsType): string {
  const { frequency, interval, daysOfWeek, dayOfMonth, endDate } = recurrence;

  const frequencyLabels: Record<string, { singular: string; plural: string }> = {
    daily: { singular: "day", plural: "days" },
    weekly: { singular: "week", plural: "weeks" },
    monthly: { singular: "month", plural: "months" },
    yearly: { singular: "year", plural: "years" },
  };

  const label = frequencyLabels[frequency] || { singular: frequency, plural: frequency };
  
  let description = "Repeats ";

  if (interval === 1) {
    description += label.singular;
  } else {
    description += `every ${interval} ${label.plural}`;
  }

  if (frequency === "weekly" && daysOfWeek && daysOfWeek.length > 0) {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = daysOfWeek.map((d) => dayNames[d]).join(", ");
    description += ` on ${days}`;
  }

  if (frequency === "monthly" && dayOfMonth) {
    description += ` on day ${dayOfMonth}`;
  }

  if (endDate) {
    description += ` until ${endDate.toLocaleDateString()}`;
  }

  return description;
}
