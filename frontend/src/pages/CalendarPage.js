// frontend/src/pages/CalendarPage.js
import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
         addDays, addMonths, subMonths, isSameMonth, isToday, 
         isSameDay, addWeeks, subWeeks, startOfDay } from 'date-fns';

function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'

  // Example list of events, each event has: title, date/time, color, etc.
  const events = [
    { title: 'Design review', date: new Date(2022, 0, 3, 10, 0), color: 'text-blue-600' },
    { title: 'Sales meeting', date: new Date(2022, 0, 3, 14, 0), color: 'text-green-600' },
    { title: 'Sam\'s birthday party', date: new Date(2022, 0, 12, 14, 0), color: 'text-purple-600' },
    { title: 'Date night', date: new Date(2022, 0, 7, 18, 0), color: 'text-pink-600' },
    { title: 'Breakfast', date: new Date(2022, 0, 12, 6, 0), color: 'text-blue-300' },
    { title: 'Flight to Paris', date: new Date(2022, 0, 12, 7, 30), color: 'text-pink-300' },
    { title: 'Meeting @ Disney', date: new Date(2022, 0, 12, 10, 0), color: 'text-gray-400' },
    { title: 'Maple syrup museum', date: new Date(2022, 0, 22, 15, 0), color: 'text-purple-500' },
    { title: 'Hockey game', date: new Date(2022, 0, 22, 19, 0), color: 'text-blue-500' },
    // Add more events as needed...
  ];

  // Utility: Filter events for a given day (year, month, day)
  const getEventsForDay = (day) => {
    return events.filter(event => 
      isSameDay(event.date, day)
    );
  };

  /* ------------------ MONTH VIEW RENDERING ------------------ */
  // Create a matrix of days for the current month (including leading/trailing days from prev/next month)
  const generateMonthMatrix = () => {
    // Start of month, end of month
    const startOfCurMonth = startOfMonth(currentDate);
    const endOfCurMonth = endOfMonth(currentDate);

    // Start of the *calendar* (Sunday/Monday) for the row containing startOfCurMonth
    const startDate = startOfWeek(startOfCurMonth, { weekStartsOn: 0 }); 
    // End of the *calendar*
    const endDate = endOfWeek(endOfCurMonth, { weekStartsOn: 0 });

    const dayMatrix = [];
    let day = startDate;
    let i = 0;

    while (day <= endDate) {
      dayMatrix[i] = Array(7).fill(null).map((_, idx) => {
        const d = addDays(startDate, i * 7 + idx);
        return d;
      });
      i++;
      day = addDays(day, 7);
    }
    return dayMatrix; // array of weeks, each week is an array of 7 Date objects
  };

  const monthMatrix = generateMonthMatrix();

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  /* ------------------ WEEK VIEW RENDERING ------------------ */
  const generateWeekDays = () => {
    // Start of the current *calendar* week
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    // Build an array of 7 days [Sun..Sat]
    return Array(7).fill(null).map((_, i) => addDays(start, i));
  };

  const weekDays = generateWeekDays();

  // For week view, we’ll show hours from e.g. 6 AM -> 23 PM, adjust as needed
  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // [6,7,8,...,23]

  // Helper: find events for a day that might be pinned to their time
  const getEventsForWeekDay = (day) => {
    return events.filter(event => 
      isSameDay(event.date, day)
    );
  };

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: Month & Year or Week range */}
        <h2 className="text-xl font-bold text-gray-700">
          {format(currentDate, 'MMMM yyyy')}
        </h2>

        {/* Center: Today / Prev / Next */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleToday}
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            Today
          </button>
          <button 
            onClick={handlePrev}
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            &lt;
          </button>
          <button 
            onClick={handleNext}
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            &gt;
          </button>
        </div>

        {/* Right: View selector + Add event */}
        <div className="flex items-center space-x-2">
          {/* View toggle */}
          <div className="relative">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="block w-full bg-white border border-gray-300 rounded py-1 px-3 focus:outline-none"
            >
              <option value="month">Month view</option>
              <option value="week">Week view</option>
            </select>
          </div>
          <button
            className="bg-purple-600 text-white px-4 py-1 rounded hover:bg-purple-700"
          >
            Add event
          </button>
        </div>
      </div>

      {/* Calendar Views */}
      {viewMode === 'month' && (
        <div className="overflow-x-auto">
          {/* Month View */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-gray-600 h-10">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((dayName) => (
                  <th key={dayName} className="text-center font-medium">
                    {dayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthMatrix.map((week, wIndex) => (
                <tr key={wIndex} className="h-24 text-sm">
                  {week.map((day, dIndex) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const dayClasses = [
                      'p-1 align-top transition-colors cursor-pointer border border-transparent hover:border-gray-300',
                      !isCurrentMonth ? 'text-gray-400' : 'text-gray-800',
                      isToday(day) ? 'bg-purple-50 border-purple-200' : '',
                    ].join(' ');

                    return (
                      <td key={dIndex} className={dayClasses}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold">
                            {format(day, 'd')}
                          </span>
                        </div>
                        
                        {/* Render events */}
                        {dayEvents.map((ev, idx) => (
                          <div 
                            key={idx} 
                            className={`truncate text-xs ${ev.color}`}
                          >
                            {format(ev.date, 'h:mm a')} {ev.title}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'week' && (
        <div className="overflow-x-auto">
          {/* Week View */}
          <div className="grid grid-cols-8 border-t border-l text-sm">
            {/* Column headers (days of the week) */}
            <div className="border-r p-2 text-center font-medium text-gray-600 bg-gray-100">
              {/* empty top-left corner for times */}
            </div>
            {weekDays.map((day, index) => (
              <div key={index} className="border-r p-2 text-center font-medium text-gray-700 bg-gray-100">
                <div className={`flex items-center justify-center 
                                ${isToday(day) ? 'text-purple-600 font-bold' : ''}`}>
                  {format(day, 'EEE d')}
                </div>
              </div>
            ))}
            {/* Hours rows */}
            {hours.map((hour) => (
              <React.Fragment key={hour}>
                {/* Time column */}
                <div className="border-b border-r p-2 text-gray-600 text-right align-top">
                  {format(new Date().setHours(hour), 'h aa')}
                </div>
                {/* Each day column for this hour */}
                {weekDays.map((day, dIndex) => {
                  const cellDate = startOfDay(day).setHours(hour);
                  // Filter events that occur at this hour
                  const dayEvents = getEventsForWeekDay(day).filter(ev => {
                    return ev.date.getHours() === hour;
                  });

                  return (
                    <div key={dIndex} className="border-b border-r relative hover:bg-gray-50 min-h-[50px]">
                      {dayEvents.map((ev, evIndex) => (
                        <div
                          key={evIndex}
                          className={`absolute left-1 right-1 top-1 bottom-1 
                                      rounded p-1 text-white 
                                      ${ev.color.replace('text-', 'bg-')}`}
                        >
                          {format(ev.date, 'h:mm a')} {ev.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarPage;
