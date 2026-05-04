import { useMemo, useState } from "react";
import DashboardWidget from "./DashboardWidget";
import { CalendarData, CalendarDateInfo } from "../../services/dashboardApi";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarWidgetProps {
  calendar: CalendarData | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export default function CalendarWidget({
  calendar,
  loading,
  error,
  onRefresh,
}: CalendarWidgetProps) {
  const dates = calendar?.dates ?? {};
  const today = new Date();
  
  // State for showing/hiding event highlights
  const [showEventHighlights, setShowEventHighlights] = useState(true);
  
  // Debug: Log calendar data to help diagnose issues
  if (calendar && Object.keys(dates).length === 0) {
    console.log('CalendarWidget: Received calendar data but no dates:', calendar);
  } else if (calendar && Object.keys(dates).length > 0) {
    const firstDateKey = Object.keys(dates)[0];
    const firstDateValue = dates[firstDateKey];
    console.log('CalendarWidget: Received calendar data with dates:', Object.keys(dates).slice(0, 5), '...');
    console.log('CalendarWidget: Sample date value:', firstDateKey, '=', firstDateValue, 'Type:', typeof firstDateValue);
    if (typeof firstDateValue === 'object' && firstDateValue !== null) {
      console.log('CalendarWidget: Sample date structure:', JSON.stringify(firstDateValue, null, 2));
    }
  }
  
  // State for current displayed month/year
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  
  // Helper to get date info (handles both old number format and new object format)
  const getDateInfo = (dateKey: string | null): { count: number; events: Array<{ id?: string; title: string }> } | null => {
    if (!dateKey || !dates[dateKey]) return null;
    const value = dates[dateKey];
    
    // Handle backward compatibility: if it's a number, convert to new format
    if (typeof value === 'number') {
      return { count: value, events: [] };
    }
    
    // New format with event details
    const dateInfo = value as CalendarDateInfo;
    
    // Ensure events array exists and has the right structure
    if (dateInfo && !dateInfo.events) {
      return { count: dateInfo.count || 0, events: [] };
    }
    
    return dateInfo;
  };

  // Generate calendar grid for displayed month
  const calendarGrid = useMemo(() => {
    const year = displayYear;
    const month = displayMonth;
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Create grid: 7 columns (Sun-Sat), multiple rows
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      
      // Start new week on Sunday
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // Add remaining empty cells
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
    
    return { weeks, year, month };
  }, [displayMonth, displayYear]);

  const hasEvents = Object.keys(dates).length > 0;

  // Navigation functions
  const goToPreviousMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear(displayYear - 1);
    } else {
      setDisplayMonth(displayMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear(displayYear + 1);
    } else {
      setDisplayMonth(displayMonth + 1);
    }
  };

  const goToToday = () => {
    setDisplayMonth(today.getMonth());
    setDisplayYear(today.getFullYear());
  };

  const isCurrentMonth = displayMonth === today.getMonth() && displayYear === today.getFullYear();

  const getDateKey = (day: number | null): string | null => {
    if (day === null) return null;
    const { year, month } = calendarGrid;
    // Create date string in YYYY-MM-DD format directly (matching backend local timezone format)
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  };

  const isToday = (day: number | null): boolean => {
    if (day === null) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      calendarGrid.month === today.getMonth() &&
      calendarGrid.year === today.getFullYear()
    );
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <DashboardWidget title="Calendar" loading={loading} error={error} onRefresh={onRefresh}>
      {!hasEvents && !loading ? (
        <p className="text-xs text-gray-500">
          No upcoming events in your calendar window.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Month/Year Header with Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-gray-600" />
            </button>
            
            <div className="text-xs font-semibold text-gray-900 text-center flex-1">
              {monthNames[calendarGrid.month]} {calendarGrid.year}
            </div>
            
            <button
              onClick={goToNextMonth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>

          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1 text-[10px] text-gray-500 font-medium">
            {dayNames.map((day) => (
              <div key={day} className="text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="space-y-1">
            {calendarGrid.weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIdx) => {
                  const dateKey = getDateKey(day);
                  const dateInfo = getDateInfo(dateKey);
                  const hasEvent = dateInfo !== null;
                  const isTodayDate = isToday(day);
                  const shouldHighlight = hasEvent && showEventHighlights;
                  
                  // Build tooltip with count and event names
                  let tooltipText: string | undefined = undefined;
                  if (dateInfo) {
                    if (dateInfo.events && dateInfo.events.length > 0) {
                      const eventNames = dateInfo.events.map(e => e.title).filter(Boolean).join(', ');
                      tooltipText = `${dateInfo.count} event${dateInfo.count === 1 ? '' : 's'}: ${eventNames}`;
                    } else {
                      tooltipText = `${dateInfo.count} event${dateInfo.count === 1 ? '' : 's'}`;
                    }
                  }
                  
                  return (
                    <div
                      key={`${weekIdx}-${dayIdx}`}
                      className={`
                        relative aspect-square flex items-center justify-center text-[10px] rounded
                        ${day === null ? "text-transparent" : ""}
                        ${isTodayDate ? "bg-primary/10 font-semibold text-primary border border-primary" : ""}
                        ${shouldHighlight && !isTodayDate ? "bg-primary/5 text-primary font-medium border border-primary/20" : ""}
                        ${!shouldHighlight && !isTodayDate && day !== null ? "text-gray-600 hover:bg-gray-50" : ""}
                      `}
                      title={tooltipText}
                    >
                      {day}
                      {shouldHighlight && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary"></span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend and Today Button */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            {/* Legend */}
            {hasEvents && (
              <label className="flex items-center gap-2 text-[10px] text-gray-500 cursor-pointer hover:text-gray-700">
                <input
                  type="checkbox"
                  checked={showEventHighlights}
                  onChange={(e) => setShowEventHighlights(e.target.checked)}
                  className="w-3 h-3 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
                <span>Has events</span>
              </label>
            )}
            
            {/* Today Button */}
            {!isCurrentMonth && (
              <button
                onClick={goToToday}
                className="w-full text-[10px] text-primary hover:text-primary/80 font-medium py-1.5 px-2 rounded hover:bg-primary/5 transition-colors"
              >
                Go to Today
              </button>
            )}
          </div>
        </div>
      )}
    </DashboardWidget>
  );
}


