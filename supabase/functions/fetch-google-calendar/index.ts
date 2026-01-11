import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  isAllDay: boolean;
}

function parseICalDate(dateStr: string): { value: string; isAllDay: boolean } {
  const pad2 = (n: number) => String(n).padStart(2, "0");

  // All-day events: YYYYMMDD (represent as date-only to avoid timezone shifts)
  if (dateStr.length === 8) {
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6));
    const day = parseInt(dateStr.slice(6, 8));

    return { value: `${year}-${pad2(month)}-${pad2(day)}`, isAllDay: true };
  }

  // Date-time events: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(4, 6)) - 1;
  const day = parseInt(dateStr.slice(6, 8));
  const hour = parseInt(dateStr.slice(9, 11)) || 0;
  const minute = parseInt(dateStr.slice(11, 13)) || 0;
  const second = parseInt(dateStr.slice(13, 15)) || 0;

  if (dateStr.endsWith("Z")) {
    return {
      value: new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString(),
      isAllDay: false,
    };
  }

  return {
    value: new Date(year, month, day, hour, minute, second).toISOString(),
    isAllDay: false,
  };
}

function parseICalendar(icalData: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = icalData.replace(/\r\n /g, '').replace(/\r\n\t/g, '').split(/\r\n|\n|\r/);
  
  let currentEvent: Partial<CalendarEvent> | null = null;
  let inEvent = false;
  
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.id && currentEvent.title && currentEvent.start && currentEvent.end) {
        events.push(currentEvent as CalendarEvent);
      }
      currentEvent = null;
      inEvent = false;
    } else if (inEvent && currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const keyPart = line.slice(0, colonIndex);
      const value = line.slice(colonIndex + 1);
      const key = keyPart.split(';')[0];
      
      switch (key) {
        case 'UID':
          currentEvent.id = value;
          break;
        case 'SUMMARY':
          currentEvent.title = value.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, '\n');
          break;
        case 'DESCRIPTION':
          currentEvent.description = value.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, '\n');
          break;
        case 'LOCATION':
          currentEvent.location = value.replace(/\\,/g, ',').replace(/\\;/g, ';');
          break;
        case 'DTSTART': {
          const startResult = parseICalDate(value);
          currentEvent.start = startResult.value;
          currentEvent.isAllDay = startResult.isAllDay;
          break;
        }
        case 'DTEND': {
          const endResult = parseICalDate(value);
          currentEvent.end = endResult.value;
          break;
        }
      }
    }
  }
  
  return events;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
    
    if (!calendarId) {
      throw new Error('Google Calendar ID not configured');
    }

    // Build the public iCal URL for Google Calendar
    const encodedCalendarId = encodeURIComponent(calendarId);
    const icalUrl = `https://calendar.google.com/calendar/ical/${encodedCalendarId}/public/basic.ics`;
    
    console.log('Fetching calendar from:', icalUrl);
    
    const response = await fetch(icalUrl);
    
    if (!response.ok) {
      console.error('Calendar fetch failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
    }
    
    const icalData = await response.text();
    const events = parseICalendar(icalData);
    
    // Sort by start date
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    
    console.log(`Parsed ${events.length} events`);
    
    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error fetching calendar:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
