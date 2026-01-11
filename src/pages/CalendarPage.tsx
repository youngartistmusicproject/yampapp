import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, RefreshCw, Loader2, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek, startOfDay } from "date-fns";
import { useGoogleCalendar, GoogleCalendarEvent } from "@/hooks/useGoogleCalendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
    // Multi-day: show weekday range and date range
    const sameMonth = startDay.getMonth() === endDay.getMonth();
    return {
      weekday: `${format(startDay, "EEE")} – ${format(endDay, "EEE")}`,
      date: sameMonth 
        ? `${format(startDay, "MMM d")} – ${format(endDay, "d")}`
        : `${format(startDay, "MMM d")} – ${format(endDay, "MMM d")}`
    };
  }
  
  // Single day
  return {
    weekday: format(event.start, "EEE"),
    date: format(event.start, "MMM d")
  };
}

const EVENTS_PER_PAGE = 10;

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [visibleCount, setVisibleCount] = useState(EVENTS_PER_PAGE);
  const { events, isLoading, error, refetch } = useGoogleCalendar();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date: Date): GoogleCalendarEvent[] =>
    events.filter((event) => {
      const dayStart = startOfDay(date);

      // All-day events from iCal have an exclusive end date (DTEND is the next day)
      if (event.isAllDay) {
        const start = startOfDay(event.start);
        const endExclusive = startOfDay(event.end);
        return dayStart >= start && dayStart < endExclusive;
      }

      return isSameDay(event.start, dayStart);
    });

  // Reference date: selected date or today
  const referenceDate = selectedDate || new Date();
  const referenceDayStart = startOfDay(referenceDate);
  
  // All events from reference date onwards (no upper bound - show all future)
  const allUpcomingEvents = events
    .filter((e) => startOfDay(e.start) >= referenceDayStart)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  
  // Events before reference date (for preview)
  const previousEvents = events
    .filter((e) => startOfDay(e.start) < referenceDayStart)
    .sort((a, b) => b.start.getTime() - a.start.getTime()); // Most recent first
  
  // Paginated display
  const displayEvents = allUpcomingEvents.slice(0, visibleCount);
  const hasMoreEvents = allUpcomingEvents.length > visibleCount;
  
  // Reset visible count when date changes
  const handleDateSelect = (day: Date) => {
    const isAlreadySelected = selectedDate && isSameDay(day, selectedDate);
    setSelectedDate(isAlreadySelected ? null : day);
    setVisibleCount(EVENTS_PER_PAGE);
  };
  
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + EVENTS_PER_PAGE);
  }, []);
  
  // Infinite scroll with IntersectionObserver
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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Calendar</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">View scheduled events</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
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

      {/* Mobile: Stacked layout, Desktop: Side by side */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-1 shadow-card">
          <CardHeader className="pb-2 p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base lg:text-lg">{format(currentDate, "MMMM yyyy")}</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-3"
                  onClick={() => {
                    setCurrentDate(new Date());
                    setSelectedDate(null);
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 lg:p-6 pt-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <div
                  key={`${day}-${i}`}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateSelect(day)}
                    className={`
                      relative min-h-[44px] p-1 rounded-lg text-center transition-colors touch-manipulation
                      ${!isCurrentMonth ? "text-muted-foreground/40" : ""}
                      ${isToday(day) ? "bg-primary/10 ring-1 ring-primary" : ""}
                      ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-secondary/50 active:bg-secondary"}
                    `}
                  >
                    <span className={`text-sm font-medium ${isToday(day) && !isSelected ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex justify-center gap-0.5 mt-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : getEventColor(event.id)}`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {isLoading && events.length === 0 && (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Loading...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events List View */}
        <Card className="lg:col-span-2 shadow-card flex flex-col">
          <CardHeader className="p-4 lg:p-6 border-b flex-shrink-0">
            <CardTitle className="text-base lg:text-lg flex items-center justify-between gap-2">
              <span className="truncate">
                {selectedDate 
                  ? `From ${format(selectedDate, "EEE, MMM d")} onwards` 
                  : "All upcoming events"
                }
              </span>
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground flex-shrink-0"
                  onClick={() => {
                    setSelectedDate(null);
                    setVisibleCount(EVENTS_PER_PAGE);
                  }}
                >
                  Clear filter
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {isLoading && events.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading events...
              </div>
            ) : (
              <div className="divide-y">
                {/* Previous events collapsible section */}
                {previousEvents.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between gap-2 p-4 text-sm text-muted-foreground hover:bg-secondary/30 transition-colors group border-b">
                        <span className="flex items-center gap-2">
                          <ChevronUp className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                          {previousEvents.length} earlier event{previousEvents.length !== 1 ? 's' : ''}
                        </span>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="divide-y bg-muted/30">
                        {previousEvents.slice().reverse().map((event) => (
                          <div
                            key={event.id}
                            className="flex items-start gap-3 p-4 opacity-60"
                          >
                            <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${getEventColor(event.id)}`} />
                            {(() => {
                              const { weekday, date } = formatDateDisplay(event);
                              return (
                                <div className="flex-shrink-0 min-w-[4.5rem] text-left border-r border-border pr-3 mr-1">
                                  <div className="text-sm font-semibold text-foreground">
                                    {weekday}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {date}
                                  </div>
                                </div>
                              );
                            })()}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm text-foreground truncate">
                                {event.title}
                              </h3>
                              <span className="text-xs text-muted-foreground">
                                {formatEventTime(event)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Main events list */}
                {displayEvents.length > 0 ? (
                  <>
                    {displayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-4 lg:p-5 hover:bg-secondary/30 active:bg-secondary/40 transition-colors"
                      >
                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${getEventColor(event.id)}`} />
                        
                        {(() => {
                          const { weekday, date } = formatDateDisplay(event);
                          return (
                            <div className="flex-shrink-0 min-w-[4.5rem] text-left border-r border-border pr-3 mr-1">
                              <div className="text-sm font-semibold text-foreground">
                                {weekday}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {date}
                              </div>
                            </div>
                          );
                        })()}
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm lg:text-base text-foreground truncate">
                            {event.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                            <span className="text-xs lg:text-sm text-muted-foreground">
                              {formatEventTime(event)}
                            </span>
                            {event.location && (
                              <span className="text-xs lg:text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate max-w-[180px]">{event.location}</span>
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-xs lg:text-sm text-muted-foreground mt-2 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                        
                        <Badge variant="outline" className="text-xs flex-shrink-0 hidden lg:inline-flex">
                          {event.isAllDay ? "All Day" : "Event"}
                        </Badge>
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
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <p className="text-sm">
                      {selectedDate 
                        ? `No events from ${format(selectedDate, "MMM d")} onwards` 
                        : "No upcoming events"
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
