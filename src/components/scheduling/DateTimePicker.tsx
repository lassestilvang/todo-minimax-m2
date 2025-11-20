"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Repeat,
  Bell,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar as TodayIcon, // Alias for Today button
} from "lucide-react";

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showTime?: boolean;
}

interface TimePickerProps {
  value?: string; // HH:mm format
  onChange: (time: string | undefined) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface RecurringPickerProps {
  value?: any;
  onChange: (recurring: any) => void;
  label?: string;
  className?: string;
}

interface ReminderPickerProps {
  value?: any[];
  onChange: (reminders: any[]) => void;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Select date",
  className,
  disabled = false,
  minDate,
  maxDate,
  showTime = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(value || new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isDateToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isDateSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const handleDateClick = (date: Date | null) => {
    if (!date || isDateDisabled(date)) return;

    setSelectedDate(date);
    onChange(date);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    onChange(today);
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={cn("relative", className)}>
      {label && (
        <Label className="text-sm font-medium mb-2 block">{label}</Label>
      )}

      <Button
        variant="outline"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full justify-start gap-2"
      >
        <Calendar className="h-4 w-4" />
        {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 bg-background border rounded-lg shadow-lg p-4 min-w-[320px]">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <h3 className="font-semibold">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>

            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="flex-1"
            >
              <TodayIcon className="h-3 w-3 mr-1" />
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Close
            </Button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentDate).map((date, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                disabled={!date || isDateDisabled(date!)}
                onClick={() => handleDateClick(date)}
                className={cn(
                  "h-8 w-8 p-0 text-sm",
                  !date && "invisible",
                  date &&
                    isDateToday(date) &&
                    "bg-primary text-primary-foreground",
                  date &&
                    isDateSelected(date) &&
                    "bg-primary text-primary-foreground",
                  date &&
                    !isDateToday(date) &&
                    !isDateSelected(date) &&
                    "hover:bg-muted"
                )}
              >
                {date?.getDate()}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
  label,
  placeholder = "Select time",
  className,
  disabled = false,
}: TimePickerProps) {
  const [time, setTime] = useState(value || "");

  const timeOptions = [
    { label: "No specific time", value: "" },
    { label: "9:00 AM", value: "09:00" },
    { label: "10:00 AM", value: "10:00" },
    { label: "11:00 AM", value: "11:00" },
    { label: "12:00 PM", value: "12:00" },
    { label: "1:00 PM", value: "13:00" },
    { label: "2:00 PM", value: "14:00" },
    { label: "3:00 PM", value: "15:00" },
    { label: "4:00 PM", value: "16:00" },
    { label: "5:00 PM", value: "17:00" },
    { label: "6:00 PM", value: "18:00" },
    { label: "7:00 PM", value: "19:00" },
    { label: "8:00 PM", value: "20:00" },
    { label: "9:00 PM", value: "21:00" },
  ];

  useEffect(() => {
    setTime(value || "");
  }, [value]);

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    onChange(newTime || undefined);
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className={cn("relative", className)}>
      {label && (
        <Label className="text-sm font-medium mb-2 block">{label}</Label>
      )}

      <select
        value={time}
        onChange={(e) => handleTimeChange(e.target.value)}
        disabled={disabled}
        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
      >
        {timeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RecurringPicker({
  value,
  onChange,
  label,
  className,
}: RecurringPickerProps) {
  const [isRecurring, setIsRecurring] = useState(!!value);
  const [recurrenceType, setRecurrenceType] = useState(value?.type || "none");
  const [interval, setInterval] = useState(value?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState(value?.daysOfWeek || []);
  const [endDate, setEndDate] = useState(
    value?.endDate ? new Date(value.endDate) : undefined
  );
  const [endAfterOccurrences, setEndAfterOccurrences] = useState(
    value?.endAfterOccurrences || ""
  );

  useEffect(() => {
    if (isRecurring && recurrenceType !== "none") {
      const recurringConfig = {
        type: recurrenceType,
        interval,
        daysOfWeek: recurrenceType === "weekly" ? daysOfWeek : undefined,
        endDate: endDate?.toISOString(),
        endAfterOccurrences: endAfterOccurrences
          ? parseInt(endAfterOccurrences)
          : undefined,
      };
      onChange(recurringConfig);
    } else {
      onChange(undefined);
    }
  }, [
    isRecurring,
    recurrenceType,
    interval,
    daysOfWeek,
    endDate,
    endAfterOccurrences,
    onChange,
  ]);

  const recurrenceTypes = [
    { value: "none", label: "Does not repeat" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  const weekDays = [
    { value: 0, label: "Sun" },
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
  ];

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev: any) =>
      prev.includes(day) ? prev.filter((d: any) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is-recurring"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="is-recurring" className="flex items-center gap-2">
          <Repeat className="h-4 w-4" />
          Recurring task
        </Label>
      </div>

      {isRecurring && (
        <Card className="p-4 space-y-4">
          {/* Recurrence Type */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Repeat</Label>
            <select
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              {recurrenceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Interval */}
          {recurrenceType !== "none" && recurrenceType !== "daily" && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Every</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={interval}
                  onChange={(e: any) =>
                    setInterval(parseInt(e.target.value) || 1)
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {recurrenceType === "weekly"
                    ? "week(s)"
                    : recurrenceType === "monthly"
                    ? "month(s)"
                    : "year(s)"}
                </span>
              </div>
            </div>
          )}

          {/* Days of Week (for weekly recurrence) */}
          {recurrenceType === "weekly" && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Repeat on
              </Label>
              <div className="flex gap-2 flex-wrap">
                {weekDays.map((day) => (
                  <Button
                    key={day.value}
                    variant={
                      daysOfWeek.includes(day.value) ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => toggleDay(day.value)}
                    className="w-10 h-8 p-0"
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* End Conditions */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Ends</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="radio" id="no-end" name="end" defaultChecked />
                <Label htmlFor="no-end" className="text-sm">
                  Never
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input type="radio" id="end-date" name="end" />
                <Label htmlFor="end-date" className="text-sm">
                  On date
                </Label>
                <Input
                  type="date"
                  value={endDate?.toISOString().split("T")[0] || ""}
                  onChange={(e: any) =>
                    setEndDate(
                      e.target.value ? new Date(e.target.value) : undefined
                    )
                  }
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <input type="radio" id="end-after" name="end" />
                <Label htmlFor="end-after" className="text-sm">
                  After
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={endAfterOccurrences}
                  onChange={(e: any) => setEndAfterOccurrences(e.target.value)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  occurrences
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export function ReminderPicker({
  value = [],
  onChange,
  className,
}: ReminderPickerProps) {
  const [reminders, setReminders] = useState<any[]>(value);

  const commonReminders = [
    { label: "At time of task", value: 0 },
    { label: "5 minutes before", value: 5 },
    { label: "15 minutes before", value: 15 },
    { label: "30 minutes before", value: 30 },
    { label: "1 hour before", value: 60 },
    { label: "2 hours before", value: 120 },
    { label: "1 day before", value: 1440 },
    { label: "2 days before", value: 2880 },
    { label: "1 week before", value: 10080 },
  ];

  const addReminder = (minutes: number) => {
    const newReminder = {
      id: Date.now(),
      minutesBeforeTask: minutes,
      isEnabled: true,
    };

    const updatedReminders = [...reminders, newReminder];
    setReminders(updatedReminders);
    onChange(updatedReminders);
  };

  const removeReminder = (id: number) => {
    const updatedReminders = reminders.filter((r) => r.id !== id);
    setReminders(updatedReminders);
    onChange(updatedReminders);
  };

  const toggleReminder = (id: number) => {
    const updatedReminders = reminders.map((r) =>
      r.id === id ? { ...r, isEnabled: !r.isEnabled } : r
    );
    setReminders(updatedReminders);
    onChange(updatedReminders);
  };

  const formatReminderTime = (minutes: number) => {
    if (minutes === 0) return "At task time";
    if (minutes < 60) return `${minutes} min before`;
    if (minutes < 1440)
      return `${minutes / 60} hour${minutes / 60 > 1 ? "s" : ""} before`;
    return `${minutes / 1440} day${minutes / 1440 > 1 ? "s" : ""} before`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Label className="text-sm font-medium flex items-center gap-2">
        <Bell className="h-4 w-4" />
        Reminders
      </Label>

      {/* Existing Reminders */}
      {reminders.length > 0 && (
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={reminder.isEnabled}
                onChange={() => toggleReminder(reminder.id)}
              />
              <span className="flex-1 text-sm">
                {formatReminderTime(reminder.minutesBeforeTask)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeReminder(reminder.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Reminder */}
      <div className="space-y-2">
        <Label className="text-sm">Add reminder</Label>
        <div className="grid grid-cols-2 gap-2">
          {commonReminders.map((reminder) => (
            <Button
              key={reminder.value}
              variant="outline"
              size="sm"
              onClick={() => addReminder(reminder.value)}
              disabled={reminders.some(
                (r) => r.minutesBeforeTask === reminder.value
              )}
              className="justify-start text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {reminder.label}
            </Button>
          ))}
        </div>
      </div>

      {reminders.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No reminders set. Add reminders to get notified about your tasks.
        </p>
      )}
    </div>
  );
}
