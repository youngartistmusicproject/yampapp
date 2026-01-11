import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  isAllDay: boolean;
}

function parseCalendarDate(value: string, isAllDay: boolean): Date {
  if (isAllDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function useGoogleCalendar() {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('fetch-google-calendar');

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const parsedEvents: GoogleCalendarEvent[] = data.events.map((event: {
        id: string;
        title: string;
        description?: string;
        start: string;
        end: string;
        location?: string;
        isAllDay: boolean;
      }) => ({
        ...event,
        start: parseCalendarDate(event.start, event.isAllDay),
        end: parseCalendarDate(event.end, event.isAllDay),
      }));

      setEvents(parsedEvents);
    } catch (err) {
      console.error('Error fetching Google Calendar events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    error,
    refetch: fetchEvents,
  };
}
