"use client";

import { useState } from "react";
import { useTranslations } from "@/hooks/use-translations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar as CalendarIcon,
  Clock,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Phone,
  Check
} from "lucide-react";
import { EventDialog } from "@/components/ui/event-dialog";

export interface CalendarEvent {
  id: number | string;
  title: string;
  date: Date;
  time: string;
  type: "meeting" | "call" | "task" | string;
  participants: string[];
  company?: string;
  client?: string;
  platform?: string;
  email?: string;
}

interface CalendarComponentProps {
  events: CalendarEvent[];
  title?: string;
  onAddEvent?: (newEvent: Omit<CalendarEvent, 'id'>) => void;
  onViewEvent?: (eventId: number | string) => void;
}

const CalendarComponent = ({
  events,
  title,
  onAddEvent,
  onViewEvent,
}: CalendarComponentProps) => {
  const { t } = useTranslations();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("today");

  const months = String(t("months")).split(",");
  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const goToNextDate = () => {
    const newDate = new Date(currentDate);
    if (calendarView === "today" || calendarView === "day") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (calendarView === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else if (calendarView === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToPrevDate = () => {
    const newDate = new Date(currentDate);
    if (calendarView === "today" || calendarView === "day") {
      newDate.setDate(newDate.getDate() - 1);
    } else if (calendarView === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else if (calendarView === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setCalendarView("today");
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("default", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const getFilteredEvents = () => {
    let filteredEvents: CalendarEvent[] = [];

    if (calendarView === "today") {
      filteredEvents = events.filter(
        (event) => event.date.toDateString() === new Date().toDateString()
      );
    } else if (calendarView === "day") {
      filteredEvents = events.filter(
        (event) => event.date.toDateString() === currentDate.toDateString()
      );
    } else if (calendarView === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      filteredEvents = events.filter(
        (event) => event.date >= startOfWeek && event.date <= endOfWeek
      );
    } else if (calendarView === "month") {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      filteredEvents = events.filter(
        (event) => event.date >= startOfMonth && event.date <= endOfMonth
      );
    }

    return filteredEvents.sort((a, b) => a.date.getTime() - b.date.getTime() || a.time.localeCompare(b.time));
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "meeting":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "call":
        return "bg-green-100 text-green-800 border-green-200";
      case "task":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "meeting":
        return <Users className="h-4 w-4" />;
      case "call":
        return <Phone className="h-4 w-4" />;
      case "task":
        return <Check className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {title || String(t("calendarAndReminders"))}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              {String(t("today"))}
            </Button>
            <div className="flex items-center rounded-md border">
              <Button variant="ghost" size="sm" className="px-2 border-r rounded-r-none" onClick={goToPrevDate}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="px-2 rounded-l-none" onClick={goToNextDate}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center rounded-md border">
              <Button
                variant="ghost"
                size="sm"
                className={`px-3 ${calendarView === "day" ? "bg-fuchsia-600 text-white hover:bg-fuchsia-700" : "hover:bg-fuchsia-50 hover:text-fuchsia-600"}`}
                onClick={() => setCalendarView("day")}
              >
                {String(t("day"))}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`px-3 ${calendarView === "week" ? "bg-fuchsia-600 text-white hover:bg-fuchsia-700" : "hover:bg-fuchsia-50 hover:text-fuchsia-600"}`}
                onClick={() => setCalendarView("week")}
              >
                {String(t("week"))}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`px-3 ${calendarView === "month" ? "bg-fuchsia-600 text-white hover:bg-fuchsia-700" : "hover:bg-fuchsia-50 hover:text-fuchsia-600"}`}
                onClick={() => setCalendarView("month")}
              >
                {String(t("month"))}
              </Button>
            </div>
          </div>
        </div>
        <div className="text-muted-foreground text-sm mt-2">
          {formatDate(currentDate)}
        </div>
      </CardHeader>
      <CardContent>
  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
    {/* Mini calendar (hidden on mobile) */}
    <div className="hidden md:block md:col-span-2 lg:col-span-2">
      <div className="border rounded-md p-3 h-full">
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
          {weekdays.map((day, i) => (
            <div key={i} className="text-muted-foreground">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({ length: 35 }, (_, i) => {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const firstDay = date.getDay();
            const day = i - firstDay + 1;
            date.setDate(day);
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            const hasEvents = events.some(
              event => event.date.toDateString() === date.toDateString()
            );
            return (
              <button
                key={i}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${
                  !isCurrentMonth 
                    ? "text-muted-foreground opacity-40" 
                    : isToday 
                      ? "bg-fuchsia-600 text-white" 
                      : hasEvents 
                        ? "border-2 border-fuchsia-600 font-medium" 
                        : ""
                }`}
                onClick={() => {
                  setCurrentDate(new Date(date));
                  setCalendarView("day");
                }}
                disabled={!isCurrentMonth}
              >
                {day > 0 && day <= new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() ? day : ""}
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">{String(t("upcoming"))}</h4>
          <div className="space-y-2">
            {events
              .filter(event => event.date > new Date())
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .slice(0, 3)
              .map(event => (
                <div key={event.id} className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    event.type === "meeting" ? "bg-blue-500" : 
                    event.type === "call" ? "bg-green-500" : "bg-amber-500"
                  }`} />
                  <div className="text-xs truncate">{event.title}</div>
                </div>
              ))}
          </div>
        </div>

        <div className="mt-4">
          {onAddEvent ? (
            <EventDialog onEventCreate={onAddEvent} selectedDate={currentDate}>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {String(t("newEvent"))}
              </Button>
            </EventDialog>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              disabled
            >
              <Plus className="h-4 w-4 mr-2" />
              {String(t("newEvent"))}
            </Button>
          )}
        </div>
      </div>
    </div>

    {/* Events list */}
    <div className="md:col-span-5 lg:col-span-5">
      <div className="border rounded-md p-3 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">
            {calendarView === "today" 
              ? String(t("todaysSchedule"))
              : calendarView === "day" 
              ? String(t("dailySchedule"))
              : calendarView === "week" 
              ? String(t("weeklySchedule"))
              : String(t("monthlySchedule"))}
          </h3>
          <Button variant="ghost" size="sm" className="md:hidden">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {String(t("viewCalendar"))}
          </Button>
        </div>

        <ScrollArea className="h-[360px] pr-4">
          <div className="space-y-2">
            {getFilteredEvents().length > 0 ? (
              getFilteredEvents().map(event => (
                <div 
                  key={event.id} 
                  className="flex items-start p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-12 h-12 flex flex-col items-center justify-center bg-muted rounded-md">
                      <span className="text-sm font-medium">
                        {event.date.getDate()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {months[event.date.getMonth()]}
                      </span>
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">{event.title}</h4>
                      <Badge className={`${getEventColor(event.type)}`}>
                        {event.type}
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {event.time}
                    </div>
                    {event.client && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Contact: {event.client}
                        {event.email && ` (${event.email})`}
                      </div>
                    )}
                    {event.platform && (
                      <div className="text-xs text-blue-600 mt-1 capitalize">
                        Platform: {event.platform}
                      </div>
                    )}
                    <div className="flex items-center mt-2">
                      <div className="flex -space-x-2 mr-2">
                        {event.participants.map((initials, i) => (
                          <Avatar key={i} className="h-6 w-6 border-2 border-background">
                            <AvatarFallback className="text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {event.participants.length} {String(t("participant"))}
                        {event.participants.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-shrink-0 ml-2"
                    onClick={() => onViewEvent && onViewEvent(event.id)}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
                <h4 className="text-sm font-medium mb-1">
                  {String(t("noEventsScheduled"))}
                </h4>
                <p className="text-xs max-w-md">
                  {String(t("noEventsMessage"))}
                </p>
                {onAddEvent ? (
                  <EventDialog onEventCreate={onAddEvent} selectedDate={currentDate}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {String(t("scheduleEvent"))}
                    </Button>
                  </EventDialog>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    disabled
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {String(t("scheduleEvent"))}
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  </div>
</CardContent>
    </Card>
  );
};

export default CalendarComponent;
