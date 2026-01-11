import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Filter, RefreshCw, Loader2, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek, startOfDay } from "date-fns";
import { useGoogleCalendar, GoogleCalendarEvent } from "@/hooks/useGoogleCalendar";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

function isMultiDayEvent(event: GoogleCalendarEvent): boolean {
  const startDay = startOfDay(event.start);
  // For all-day events, end is exclusive, so subtract 1 day to get actual last day
  const endDay = event.isAllDay 
    ? startOfDay(new Date(event.end.getTime() - 86400000)) 
    : startOfDay(event.end);
  return endDay > startDay;
}

function formatEventDateRange(event: GoogleCalendarEvent): string {
  const startDay = startOfDay(event.start);
  const endDay = event.isAllDay 
    ? startOfDay(new Date(event.end.getTime() - 86400000)) 
    : startOfDay(event.end);
  
  if (startDay.getTime() === endDay.getTime()) {
    return format(event.start, "MMM d");
  }
  
  // Same month
  if (startDay.getMonth() === endDay.getMonth()) {
    return `${format(startDay, "MMM d")} – ${format(endDay, "d")}`;
  }
  
  return `${format(startDay, "MMM d")} – ${format(endDay, "MMM d")}`;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  
  // For list view: show events within the visible calendar range (calendarStart to calendarEnd)
  const displayEvents = selectedDate
    ? selectedDateEvents
    : events
        .filter((e) => {
          const eventStart = startOfDay(e.start);
          return eventStart >= startOfDay(calendarStart) && eventStart <= startOfDay(calendarEnd);
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime());
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Calendar</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">View scheduled events</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 flex-1 sm:flex-none"
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
          <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {error}. Please check that the Google Calendar is set to public and the calendar ID is correct.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Calendar Grid - Compact on larger screens */}
        <Card className="lg:col-span-1 shadow-card">
          <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">{format(currentDate, "MMMM yyyy")}</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1 sm:mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <div
                  key={`${day}-${i}`}
                  className="text-center text-xs font-medium text-muted-foreground py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days - compact */}
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      relative min-h-[36px] sm:min-h-[40px] p-1 rounded-md text-center transition-colors
                      ${!isCurrentMonth ? "text-muted-foreground/50" : ""}
                      ${isToday(day) ? "bg-primary/10 ring-1 ring-primary" : ""}
                      ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-secondary/50"}
                    `}
                  >
                    <span className={`text-xs sm:text-sm font-medium ${isToday(day) && !isSelected ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex justify-center gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={`w-1 h-1 rounded-full ${isSelected ? "bg-primary-foreground" : getEventColor(event.id)}`}
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
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="p-4 lg:p-6 border-b">
            <CardTitle className="text-base lg:text-lg flex items-center justify-between">
              <span>
                {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : `Events in ${format(currentDate, "MMMM yyyy")}`}
              </span>
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setSelectedDate(null)}
                >
                  Show all
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && events.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading events...
              </div>
            ) : displayEvents.length > 0 ? (
              <div className="divide-y">
                {displayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 sm:gap-4 p-4 lg:p-5 hover:bg-secondary/30 transition-colors"
                  >
                    {/* Color indicator */}
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${getEventColor(event.id)}`} />
                    
                    {/* Date column - show when viewing all events */}
                    {!selectedDate && (
                      <div className="flex-shrink-0 min-w-[3.5rem] text-center">
                        {isMultiDayEvent(event) ? (
                          <div className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
                            {formatEventDateRange(event)}
                          </div>
                        ) : (
                          <>
                            <div className="text-lg sm:text-xl font-semibold text-foreground">
                              {format(event.start, "d")}
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase">
                              {format(event.start, "MMM")}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Event details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base text-foreground truncate">
                        {event.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {formatEventTime(event)}
                        </span>
                        {event.location && (
                          <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate max-w-[150px] sm:max-w-[200px]">{event.location}</span>
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Badge */}
                    <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0 hidden sm:inline-flex">
                      {event.isAllDay ? "All Day" : "Event"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">
                  {selectedDate ? "No events scheduled for this date" : `No events in ${format(currentDate, "MMMM yyyy")}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
