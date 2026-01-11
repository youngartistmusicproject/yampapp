import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronDown, RefreshCw, Loader2, MapPin, AlertCircle, CalendarDays, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addMonths, startOfMonth, startOfDay, isSameDay } from "date-fns";
import { useGoogleCalendar, GoogleCalendarEvent } from "@/hooks/useGoogleCalendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const eventColors = [
  "bg-primary",
  "bg-purple-500",
  "bg-green-500",
  "bg-blue-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
];

function getEventColor(eventId: string): string {
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    hash = eventId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return eventColors[Math.abs(hash) % eventColors.length];
}

function formatEventTime(event: GoogleCalendarEvent): string {
  if (event.isAllDay) {
    return "All day";
  }
  return format(event.start, "h:mm a");
}

function getEventEndDay(event: GoogleCalendarEvent): Date {
  return event.isAllDay 
    ? startOfDay(new Date(event.end.getTime() - 86400000)) 
    : startOfDay(event.end);
}

function formatDateDisplay(event: GoogleCalendarEvent): { weekday: string; date: string } {
  const startDay = startOfDay(event.start);
  const endDay = getEventEndDay(event);
  const isMultiDay = endDay > startDay;
  
  if (isMultiDay) {
    const sameMonth = startDay.getMonth() === endDay.getMonth();
    return {
      weekday: `${format(startDay, "EEE")} – ${format(endDay, "EEE")}`,
      date: sameMonth 
        ? `${format(startDay, "MMM d")} – ${format(endDay, "d")}`
        : `${format(startDay, "MMM d")} – ${format(endDay, "MMM d")}`
    };
  }
  
  return {
    weekday: format(event.start, "EEE"),
    date: format(event.start, "MMM d")
  };
}

const EVENTS_PER_PAGE = 15;

// Generate month options for the dropdown (current month + next 12 months)
function generateMonthOptions(): { value: string; label: string }[] {
  const options = [];
  const today = new Date();
  
  for (let i = 0; i < 13; i++) {
    const monthDate = addMonths(startOfMonth(today), i);
    options.push({
      value: monthDate.toISOString(),
      label: format(monthDate, "MMMM yyyy")
    });
  }
  
  return options;
}

export default function CalendarPage() {
  const [startFrom, setStartFrom] = useState<Date>(new Date());
  const [visibleCount, setVisibleCount] = useState(EVENTS_PER_PAGE);
  const { events, isLoading, error, refetch } = useGoogleCalendar();
  
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const today = startOfDay(new Date());
  const isViewingFromToday = isSameDay(startOfDay(startFrom), today);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Track scroll position for floating button
  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 200);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter events from the selected start date onwards
  const upcomingEvents = useMemo(() => {
    const startDayBegin = startOfDay(startFrom);
    return events
      .filter((e) => startOfDay(e.start) >= startDayBegin)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events, startFrom]);

  // Group events by date for headers
  const groupedEvents = useMemo(() => {
    const groups: { date: Date; events: GoogleCalendarEvent[] }[] = [];
    const displayedEvents = upcomingEvents.slice(0, visibleCount);
    
    displayedEvents.forEach((event) => {
      const eventDate = startOfDay(event.start);
      const existingGroup = groups.find((g) => isSameDay(g.date, eventDate));
      
      if (existingGroup) {
        existingGroup.events.push(event);
      } else {
        groups.push({ date: eventDate, events: [event] });
      }
    });
    
    return groups;
  }, [upcomingEvents, visibleCount]);

  const hasMoreEvents = upcomingEvents.length > visibleCount;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + EVENTS_PER_PAGE);
  }, []);

  // Infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !hasMoreEvents) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMoreEvents, loadMore]);

  const handleMonthChange = (value: string) => {
    const selectedDate = new Date(value);
    // If selecting current month, start from today; otherwise start from 1st of month
    const isCurrentMonth = isSameDay(startOfMonth(selectedDate), startOfMonth(today));
    setStartFrom(isCurrentMonth ? today : selectedDate);
    setVisibleCount(EVENTS_PER_PAGE);
  };

  const handleBackToToday = () => {
    setStartFrom(new Date());
    setVisibleCount(EVENTS_PER_PAGE);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Calendar</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Upcoming events</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 w-fit"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {error}. Please check that the Google Calendar is set to public and the calendar ID is correct.
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={startOfMonth(startFrom).toISOString()}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="w-[180px]">
            <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
            <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {upcomingEvents.length} event{upcomingEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Events list */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading && events.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading events...
            </div>
          ) : groupedEvents.length > 0 ? (
            <div>
              {groupedEvents.map((group, groupIndex) => (
                <div key={group.date.toISOString()}>
                  {/* Date header */}
                  <div className={`bg-muted/60 px-4 py-2 border-b ${groupIndex > 0 ? 'border-t' : ''}`}>
                    <span className="text-sm font-semibold text-foreground">
                      {isSameDay(group.date, today) 
                        ? "Today" 
                        : format(group.date, "EEEE, MMMM d")
                      }
                    </span>
                  </div>
                  
                  {/* Events for this date */}
                  <div className="divide-y">
                    {group.events.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-4 hover:bg-secondary/30 active:bg-secondary/40 transition-colors"
                      >
                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${getEventColor(event.id)}`} />
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm lg:text-base text-foreground">
                            {event.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                            <span className="text-xs lg:text-sm text-muted-foreground">
                              {formatEventTime(event)}
                            </span>
                            {event.location && (
                              <span className="text-xs lg:text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate max-w-[200px]">{event.location}</span>
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-xs lg:text-sm text-muted-foreground mt-2 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                        
                        <Badge variant="outline" className="text-xs flex-shrink-0 hidden sm:inline-flex">
                          {event.isAllDay ? "All Day" : "Event"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Infinite scroll sentinel */}
              {hasMoreEvents && (
                <div
                  ref={loadMoreRef}
                  className="flex items-center justify-center py-4"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CalendarDays className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No upcoming events</p>
              {!isViewingFromToday && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleBackToToday}
                  className="mt-2"
                >
                  Back to today
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating "Back to today" button */}
      {(!isViewingFromToday || hasScrolled) && (
        <Button
          onClick={() => {
            handleBackToToday();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg gap-2 px-4"
          size="sm"
        >
          <ArrowUp className="w-4 h-4" />
          {isViewingFromToday ? "Scroll to top" : "Back to today"}
        </Button>
      )}
    </div>
  );
}
