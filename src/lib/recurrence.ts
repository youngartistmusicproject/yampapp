import { RecurrenceSettings } from '@/types';
import { addDays, addWeeks, addMonths, addYears, setDate, getDay } from 'date-fns';

/**
 * Calculate the next occurrence date based on recurrence settings
 * @param settings - Recurrence settings
 * @param fromDate - The date to calculate from (usually the current due date)
 * @returns The next occurrence date, or null if recurrence has ended
 */
export function getNextRecurrenceDate(
  settings: RecurrenceSettings,
  fromDate: Date
): Date | null {
  const { frequency, interval, daysOfWeek, dayOfMonth, endDate } = settings;
  let nextDate = new Date(fromDate);

  switch (frequency) {
    case 'daily':
      nextDate = addDays(nextDate, interval);
      break;

    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find next matching day of week
        nextDate = findNextDayOfWeek(nextDate, daysOfWeek, interval);
      } else {
        nextDate = addWeeks(nextDate, interval);
      }
      break;

    case 'monthly':
      nextDate = addMonths(nextDate, interval);
      if (dayOfMonth) {
        // Set to specific day, clamping to last day of month if needed
        const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate = setDate(nextDate, Math.min(dayOfMonth, maxDay));
      }
      break;

    case 'yearly':
      nextDate = addYears(nextDate, interval);
      break;
  }

  // Check if past end date
  if (endDate && nextDate > endDate) {
    return null;
  }

  return nextDate;
}

/**
 * Find the next day that matches one of the specified days of the week
 */
function findNextDayOfWeek(
  fromDate: Date,
  daysOfWeek: number[],
  weekInterval: number
): Date {
  const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
  const currentDay = getDay(fromDate);
  
  // First, check if there's another matching day later this week
  const laterThisWeek = sortedDays.find(d => d > currentDay);
  
  if (laterThisWeek !== undefined) {
    const daysToAdd = laterThisWeek - currentDay;
    return addDays(fromDate, daysToAdd);
  }
  
  // Otherwise, go to the first matching day of the next interval week
  const firstDayOfPattern = sortedDays[0];
  const daysToEndOfWeek = 6 - currentDay;
  const daysToFirstDay = firstDayOfPattern;
  const totalDays = daysToEndOfWeek + 1 + ((weekInterval - 1) * 7) + daysToFirstDay;
  
  return addDays(fromDate, totalDays);
}

/**
 * Create a description of the recurrence pattern
 */
export function getRecurrenceDescription(recurrence: RecurrenceSettings): string {
  const { frequency, interval, daysOfWeek, dayOfMonth, endDate } = recurrence;

  let description = 'Repeats ';

  if (interval === 1) {
    description += frequency.replace('ly', '');
  } else {
    description += `every ${interval} ${frequency.replace('ly', '')}s`;
  }

  if (frequency === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = daysOfWeek.map((d) => dayNames[d]).join(', ');
    description += ` on ${days}`;
  }

  if (frequency === 'monthly' && dayOfMonth) {
    description += ` on day ${dayOfMonth}`;
  }

  if (endDate) {
    description += ` until ${endDate.toLocaleDateString()}`;
  }

  return description;
}

/**
 * Convert RecurrenceSettings to database format
 */
export function recurrenceToDb(recurrence: RecurrenceSettings | undefined) {
  if (!recurrence) {
    return {
      recurrence_frequency: null,
      recurrence_interval: null,
      recurrence_end_date: null,
      recurrence_days_of_week: null,
      recurrence_day_of_month: null,
    };
  }

  return {
    recurrence_frequency: recurrence.frequency,
    recurrence_interval: recurrence.interval,
    recurrence_end_date: recurrence.endDate
      ? recurrence.endDate.toISOString().split('T')[0]
      : null,
    recurrence_days_of_week: recurrence.daysOfWeek || null,
    recurrence_day_of_month: recurrence.dayOfMonth || null,
  };
}

/**
 * Convert database fields to RecurrenceSettings
 */
export function dbToRecurrence(dbTask: {
  recurrence_frequency?: string | null;
  recurrence_interval?: number | null;
  recurrence_end_date?: string | null;
  recurrence_days_of_week?: number[] | null;
  recurrence_day_of_month?: number | null;
}): RecurrenceSettings | undefined {
  if (!dbTask.recurrence_frequency) {
    return undefined;
  }

  return {
    frequency: dbTask.recurrence_frequency as RecurrenceSettings['frequency'],
    interval: dbTask.recurrence_interval || 1,
    endDate: dbTask.recurrence_end_date
      ? new Date(dbTask.recurrence_end_date + 'T00:00:00')
      : undefined,
    daysOfWeek: dbTask.recurrence_days_of_week || undefined,
    dayOfMonth: dbTask.recurrence_day_of_month || undefined,
  };
}
