// frontend/src/pages/CalendarPage.js
import React, { useState, Fragment } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  isSameDay,
  addWeeks,
  subWeeks,
  startOfDay,
  compareAsc,
  differenceInCalendarDays,
} from 'date-fns';
import {
  NumberedListIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Listbox, Transition, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';


function CalendarPage() {
  // Add this near the other state declarations
  const viewOptions = [
    { id: 'month', name: 'Month' },
    { id: 'week', name: 'Week' },
  ];

  // 1) layoutView = 'list' or 'calendar'
  // 2) if layoutView === 'calendar', then viewMode = 'month' or 'week'
  const [layoutView, setLayoutView] = useState('calendar'); 
  const [viewMode, setViewMode] = useState('month');

  // The current date that the calendar “centers” around
  const [currentDate, setCurrentDate] = useState(new Date());

  // Example events (replace with your real data)
  const events = [];

  /* --------------------------------------------------------------------------
      NAVIGATION + VIEW TOGGLES
  -------------------------------------------------------------------------- */
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrev = () => {
    if (layoutView === 'calendar') {
      if (viewMode === 'month') {
        setCurrentDate(subMonths(currentDate, 1));
      } else {
        setCurrentDate(subWeeks(currentDate, 1));
      }
    }
  };

  const handleNext = () => {
    if (layoutView === 'calendar') {
      if (viewMode === 'month') {
        setCurrentDate(addMonths(currentDate, 1));
      } else {
        setCurrentDate(addWeeks(currentDate, 1));
      }
    }
  };

  /* --------------------------------------------------------------------------
      LIST VIEW LOGIC
  -------------------------------------------------------------------------- */
  // Sort events by date ascending
  const sortedEvents = [...events].sort((a, b) => compareAsc(a.date, b.date));
  
  // Group events by date (so we can show “Today,” “Tomorrow,” or “Dec 25”)
  const groupedByDay = sortedEvents.reduce((acc, event) => {
    // Key: midnight of the event’s date
    const dateKey = startOfDay(event.date).getTime();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {});

  const renderListView = () => {
    return (
      <div className="mt-6 space-y-8">
        {Object.keys(groupedByDay).map((dateKey) => {
          const dayDate = new Date(parseInt(dateKey, 10));
          const dayEvents = groupedByDay[dateKey];
          
          // Optional: Create “Today,” “Tomorrow,” etc. labels
          const diff = differenceInCalendarDays(dayDate, startOfDay(new Date()));
          let dateLabel = format(dayDate, 'EEEE, MMMM d'); // e.g. “Monday, December 23”
          if (diff === 0) dateLabel = `Today, ${format(dayDate, 'MMMM d')}`;
          if (diff === 1) dateLabel = `Tomorrow, ${format(dayDate, 'MMMM d')}`;

          return (
            <div key={dateKey}>
              {/* Date label */}
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                {dateLabel}
              </h2>
              {/* List of events for that date */}
              <div className="space-y-4">
                {dayEvents.map((ev, index) => (
                  <div
                    key={index}
                    className="border rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">
                        {format(ev.date, 'p')} {/* e.g. “1:47 PM” */}
                      </span>
                      {/* Possibly a “Publish Now” button or similar */}
                      <button className="text-blue-600 text-sm hover:underline">
                        Publish Now
                      </button>
                    </div>
                    <div className="text-gray-800 font-medium">{ev.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* --------------------------------------------------------------------------
      CALENDAR VIEW LOGIC (Month + Week)
  -------------------------------------------------------------------------- */

  // Helper: do we have an event on a given day (for the monthly grid)
  const isSameDayAsEvent = (eventDate, day) => isSameDay(eventDate, day);

  // Filter events for a day
  const getEventsForDay = (day) => {
    return events.filter((event) => isSameDayAsEvent(event.date, day));
  };

  // Build matrix of days for “month” view
  const generateMonthMatrix = () => {
    const startOfCurMonth = startOfMonth(currentDate);
    const endOfCurMonth = endOfMonth(currentDate);

    // Start and end of the “calendar” grid
    const startDate = startOfWeek(startOfCurMonth, { weekStartsOn: 0 });
    const endDate = endOfWeek(endOfCurMonth, { weekStartsOn: 0 });

    const dayMatrix = [];
    let day = startDate;
    let i = 0;

    while (day <= endDate) {
      dayMatrix[i] = Array(7)
        .fill(null)
        .map((_, idx) => addDays(startDate, i * 7 + idx));
      i++;
      day = addDays(day, 7);
    }
    return dayMatrix;
  };

  const monthMatrix = generateMonthMatrix();

  // Build array of 7 days for “week” view
  const generateWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array(7)
      .fill(null)
      .map((_, i) => addDays(start, i));
  };

  const weekDays = generateWeekDays();

  // Hours displayed in week view: 6 AM .. 11 PM
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  // Filter events for a particular day in “week” view
  const getEventsForWeekDay = (day) => {
    return events.filter((event) => isSameDay(event.date, day));
  };

  // Fix the isPastDay helper function
  const isPastDay = (date) => {
    return compareAsc(startOfDay(date), startOfDay(new Date())) < 0;
  };

  // Update the month view cell rendering
  const renderMonthView = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="text-gray-600 h-10 border-b border-gray-300">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
                <th key={dayName} className="text-center font-medium border-x border-gray-300">
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
                  const isPast = isPastDay(day);
                  const classes = [
                    'p-1 align-top border border-gray-300',
                    'cursor-pointer hover:bg-gray-50 transition-colors',
                    !isCurrentMonth ? 'text-gray-400' : 'text-gray-800',
                    isToday(day) ? 'bg-blue-50' : '',
                    isPast ? 'bg-gray-100' : 'bg-white',
                  ].join(' ');

                  return (
                    <td key={dIndex} className={classes}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">
                          {format(day, 'd')}
                        </span>
                      </div>
                      {dayEvents.map((ev, idx) => (
                        <div key={idx} className={`truncate text-xs ${ev.color}`}>
                          {format(ev.date, 'p')} {ev.title}
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
    );
  };

  // Update the week view cell rendering
  const renderWeekView = () => {
    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-8 border-t border-l border-gray-300 text-sm">
          {/* Empty top-left corner for hours */}
          <div className="border-r border-b border-gray-300 p-2 text-center font-medium text-gray-600"></div>

          {/* Day columns (headers) */}
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`border-r border-b border-gray-300 p-2 text-center font-medium text-gray-700 ${
                isPastDay(day) ? 'bg-gray-100' : 'bg-white'
              }`}
            >
              <div className={isToday(day) ? 'text-blue-600 font-bold' : ''}>
                {format(day, 'EEE d')}
              </div>
            </div>
          ))}

          {/* Hour rows */}
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              {/* Hour label */}
              <div className="border-b border-r border-gray-300 p-2 text-gray-600 text-right align-top">
                {format(new Date().setHours(hour), 'h aa')}
              </div>
              {/* One cell per day for this hour */}
              {weekDays.map((day, dIndex) => {
                const dayEvents = getEventsForWeekDay(day).filter(
                  (ev) => ev.date.getHours() === hour
                );
                const isPast = isPastDay(day);
                
                return (
                  <div
                    key={dIndex}
                    className={`border-b border-r border-gray-300 relative hover:bg-gray-50 min-h-[50px] ${
                      isPast ? 'bg-gray-100' : 'bg-white'
                    }`}
                  >
                    {dayEvents.map((ev, evIndex) => (
                      <div
                        key={evIndex}
                        className={`absolute left-1 right-1 top-1 bottom-1 rounded p-1 text-white ${
                          ev.color.replace('text-', 'bg-')
                        }`}
                      >
                        {format(ev.date, 'p')} {ev.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderCalendarView = () => {
    return (
      <div className="mt-4">
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>
    );
  };

  /* --------------------------------------------------------------------------
      MAIN RENDER
  -------------------------------------------------------------------------- */
  return (
    <div className="px-8 py-6">
      {/* Top bar (heading, navigation, toggles, new post) */}
      <div className="flex items-center justify-between mb-6">
        {/* Left side: Title (e.g. "All Channels" from your screenshot) */}
        <div className="flex items-center space-x-2">
          {/* Example: channel icon + "All Channels" label */}
          <div className="rounded-full w-8 h-8 bg-gray-200 flex items-center justify-center">
            {/* Could put an icon here */}
            <span className="text-sm text-gray-500">All</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">All Channels</h1>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2">
          {/* "List" vs "Calendar" toggle, akin to your screenshot */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              onClick={() => setLayoutView('list')}
              className={`px-3 py-1 text-sm rounded-l-md border border-gray-300 hover:bg-gray-200 flex items-center ${
                layoutView === 'list' ? 'bg-blue-200 font-semibold' : 'text-gray-600'
              }`}
            >
              <NumberedListIcon className="h-4 w-4 mr-1" />
              List
            </button>
            <button
              onClick={() => setLayoutView('calendar')}
              className={`px-3 py-1 text-sm rounded-r-md border border-gray-300 hover:bg-gray-200 flex items-center ${
                layoutView === 'calendar' ? 'bg-blue-200 font-semibold' : 'text-gray-600'
              }`}
            >
              <CalendarDaysIcon className="h-4 w-4 mr-1" />
              Calendar
            </button>
          </div>

          {/* "New Post" button */}
          <button className="ml-2 border border-purple-600 hover:bg-gray-200 text-purple-600 px-4 py-1 rounded inline-flex items-center text-sm transition-colors">
            <PlusIcon className="h-4 w-4 mr-1 text-purple-600" />
            New Post
          </button>
        </div>
      </div>

      {/* Secondary nav row: controls like "Today", next/prev, view toggle, etc. 
          Only show them if layoutView is "calendar" 
      */}
      {layoutView === 'calendar' && (
        <div className="mt-4 flex items-center justify-between">
          {/* Left: Navigation arrows + Month/Year + Month/Week selector */}
          <div className="flex items-center space-x-4">
            {/* Navigation buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrev}
                className="p-1 rounded text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleNext}
                className="p-1 rounded text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Month/Year display */}
            <h2 className="text-lg font-semibold text-gray-700">
              {format(currentDate, 'MMMM yyyy')}
            </h2>

            {/* Today button */}
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Today
            </button>

            {/* View mode selector */}
            <div className="relative">
              <Listbox value={viewMode} onChange={setViewMode}>
                <ListboxButton className="rounded py-1 px-3 text-sm focus:outline-none bg-transparent inline-flex items-center">
                  {viewOptions.find(option => option.id === viewMode)?.name}
                  <ChevronDownIcon className="ml-1 h-4 w-4 text-gray-400" aria-hidden="true" />
                </ListboxButton>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-32 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {viewOptions.map((option) => (
                      <ListboxOption
                        key={option.id}
                        value={option.id}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-2 px-4 ${
                            active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                          }`
                        }
                      >
                        {option.name}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </Transition>
              </Listbox>
            </div>
          </div>

          {/* Remove the center section since we moved Today button */}
          <div></div>
        </div>
      )}

      {/* MAIN CONTENT: List or Calendar */}
      {layoutView === 'list' ? renderListView() : renderCalendarView()}
    </div>
  );
}

export default CalendarPage;
