import { RecurrenceSettings as RecurrenceSettingsType } from "@/types";
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
    <div className={compact ? "space-y-4" : "space-y-4 rounded-lg border p-4"}>
      <div className="flex items-center justify-between">
        <Label htmlFor="recurring" className="font-medium">
          Repeating Task
        </Label>
        <Switch
          id="recurring"
          checked={isRecurring}
          onCheckedChange={handleToggleRecurring}
        />
      </div>

      {isRecurring && recurrence && (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Repeat Every</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={recurrence.interval}
                  onChange={(e) =>
                    updateRecurrence({ interval: parseInt(e.target.value) || 1 })
                  }
                  className="w-20"
                />
                <Select
                  value={recurrence.frequency}
                  onValueChange={(v) =>
                    updateRecurrence({
                      frequency: v as RecurrenceSettingsType["frequency"],
                    })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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

            <div className="space-y-2">
              <Label>End Date (Optional)</Label>
              <Input
                type="date"
                value={
                  recurrence.endDate
                    ? recurrence.endDate.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  updateRecurrence({
                    endDate: e.target.value
                      ? new Date(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>

          {recurrence.frequency === "weekly" && (
            <div className="space-y-2">
              <Label>Repeat On</Label>
              <ToggleGroup
                type="multiple"
                value={(recurrence.daysOfWeek || []).map(String)}
                onValueChange={handleDaysOfWeekChange}
                className="justify-start"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <ToggleGroupItem
                    key={day.value}
                    value={String(day.value)}
                    aria-label={day.label}
                    className="w-9 h-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {day.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          {recurrence.frequency === "monthly" && (
            <div className="space-y-2">
              <Label>Day of Month</Label>
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
                className="w-20"
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {getRecurrenceDescription(recurrence)}
          </p>
        </div>
      )}
    </div>
  );
}

function getRecurrenceDescription(recurrence: RecurrenceSettingsType): string {
  const { frequency, interval, daysOfWeek, dayOfMonth, endDate } = recurrence;

  let description = "Repeats ";

  if (interval === 1) {
    description += frequency.replace("ly", "");
  } else {
    description += `every ${interval} ${frequency.replace("ly", "")}s`;
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
