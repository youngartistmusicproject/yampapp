import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Filter, RefreshCw, Loader2, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek } from "date-fns";
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
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // For all-day events, check if date falls within range
      if (event.isAllDay) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return eventStart <= dayEnd && eventEnd > dayStart;
      }
      
      return isSameDay(eventStart, date);
    });

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

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

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Calendar Grid */}
        <Card className="flex-1 shadow-card">
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
            {/* Day headers - abbreviated on mobile */}
            <div className="grid grid-cols-7 mb-1 sm:mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <div
                  key={`${day}-${i}`}
                  className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2 sm:hidden"
                >
                  {day}
                </div>
              ))}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2 hidden sm:block"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days - compact on mobile */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {days.map((day) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      relative min-h-[48px] sm:min-h-[80px] p-1 sm:p-2 rounded-md sm:rounded-lg text-left transition-colors
                      ${!isCurrentMonth ? "text-muted-foreground/50" : ""}
                      ${isToday(day) ? "bg-primary/10 ring-1 ring-primary" : ""}
                      ${isSelected ? "bg-secondary ring-1 ring-primary" : "hover:bg-secondary/50"}
                    `}
                  >
                    <span
                      className={`text-xs sm:text-sm font-medium ${
                        isToday(day) ? "text-primary" : ""
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {/* Events - dots on mobile, pills on desktop */}
                    <div className="mt-0.5 sm:mt-1 space-y-0.5">
                      {/* Mobile: show dots for events */}
                      <div className="flex gap-0.5 sm:hidden flex-wrap">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={`w-1.5 h-1.5 rounded-full ${getEventColor(event.id)}`}
                          />
                        ))}
                      </div>
                      {/* Desktop: show event titles */}
                      <div className="hidden sm:block space-y-0.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={`text-xs px-1.5 py-0.5 rounded truncate text-white ${getEventColor(event.id)}`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground px-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {isLoading && events.length === 0 && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading events...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar - Sheet on mobile, sidebar on desktop */}
        <Card className="w-full lg:w-80 shadow-card">
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-sm lg:text-base">
              {selectedDate
                ? format(selectedDate, "EEEE, MMMM d")
                : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
            {selectedDate ? (
              selectedDateEvents.length > 0 ? (
                <div className="space-y-2 lg:space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-2 lg:gap-3 p-2 lg:p-3 rounded-lg bg-secondary/50"
                    >
                      <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${getEventColor(event.id)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs lg:text-sm">{event.title}</p>
                        <p className="text-[10px] lg:text-xs text-muted-foreground">{formatEventTime(event)}</p>
                        {event.location && (
                          <p className="text-[10px] lg:text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </p>
                        )}
                        {event.description && (
                          <p className="text-[10px] lg:text-xs text-muted-foreground mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        <Badge variant="outline" className="text-[10px] lg:text-xs mt-2">
                          {event.isAllDay ? "All Day" : "Event"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs lg:text-sm text-muted-foreground text-center py-6 lg:py-8">
                  No events scheduled
                </p>
              )
            ) : (
              <p className="text-xs lg:text-sm text-muted-foreground text-center py-6 lg:py-8">
                Click a date to view events
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
